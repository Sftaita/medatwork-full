<?php

declare(strict_types=1);

namespace App\Command;

use App\Entity\Hospital;
use App\Entity\ManagerYears;
use App\Repository\HospitalRepository;
use App\Repository\ManagerRepository;
use App\Repository\ManagerYearsRepository;
use App\Repository\YearsRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

/**
 * Détecte et répare deux types d'années orphelines :
 *
 *   TYPE A — Année sans aucune manager_years (aucun manager n'a accès)
 *   TYPE B — Année sans hospital_id (l'accès HospitalAdmin est impossible)
 *
 * Usage :
 *   php bin/console app:repair-orphan-years                   # dry-run
 *   php bin/console app:repair-orphan-years --fix             # applique Type A + Type B non-ambigus
 *   php bin/console app:repair-orphan-years --map-hospital="41:1,51:3"  # mapping manuel pour Type B ambigus
 */
#[AsCommand(
    name: 'app:repair-orphan-years',
    description: 'Finds and repairs orphan years (missing manager_years or hospital_id).',
)]
class RepairOrphanYearsCommand extends Command
{
    public function __construct(
        private readonly YearsRepository        $yearsRepository,
        private readonly ManagerYearsRepository $managerYearsRepository,
        private readonly ManagerRepository      $managerRepository,
        private readonly HospitalRepository     $hospitalRepository,
        private readonly EntityManagerInterface $em,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addOption('fix', null, InputOption::VALUE_NONE,
                'Apply repairs (default is dry-run)')
            ->addOption('map-hospital', null, InputOption::VALUE_REQUIRED,
                'Comma-separated list of yearId:hospitalId pairs for ambiguous years (e.g. "41:1,51:3")');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io         = new SymfonyStyle($input, $output);
        $fix        = $input->getOption('fix');
        $mapRaw     = $input->getOption('map-hospital') ?? '';
        $manualMap  = $this->parseManualMap($mapRaw, $io);

        $foundA  = 0; $fixedA  = 0; $skippedA = 0;
        $foundB  = 0; $fixedB  = 0; $skippedB = 0;

        $io->title('Audit des années orphelines — Type A (sans manager_years) & Type B (sans hospital_id)');

        // ── TYPE A : Années sans aucun manager_years ──────────────────────────
        $io->section('Type A — Années sans manager_years');

        foreach ($this->yearsRepository->findAll() as $year) {
            if (!empty($this->managerYearsRepository->findBy(['years' => $year]))) {
                continue;
            }

            $foundA++;
            $hospital  = $year->getHospital();
            $candidate = null;

            if ($hospital) {
                $managers = $this->managerRepository->findAllForHospital($hospital);
                foreach ($managers as $m) {
                    if ($m->getAdminHospital()?->getId() === $hospital->getId()) {
                        $candidate = $m;
                        break;
                    }
                }
                if ($candidate === null && !empty($managers)) {
                    $candidate = $managers[0];
                }
            }

            if ($candidate === null) {
                $io->warning(sprintf('[SKIP-A] #%d "%s" — aucun manager candidat pour l\'hôpital "%s"',
                    $year->getId(), $year->getTitle(), $hospital?->getName() ?? 'N/A'));
                $skippedA++;
                continue;
            }

            $io->text(sprintf('[%s-A] #%d "%s" → %s %s (%s)',
                $fix ? 'FIX' : 'DRY',
                $year->getId(), $year->getTitle(),
                $candidate->getFirstname(), $candidate->getLastname(), $candidate->getEmail()));

            if ($fix) {
                $relation = (new ManagerYears())
                    ->setManager($candidate)
                    ->setYears($year)
                    ->setAdmin(true)
                    ->setDataAccess(true)
                    ->setDataValidation(true)
                    ->setDataDownload(true)
                    ->setCanManageAgenda(true)
                    ->setHasAgendaAccess(true);
                $this->em->persist($relation);
                $fixedA++;
            }
        }

        // ── TYPE B : Années sans hospital_id ──────────────────────────────────
        $io->section('Type B — Années sans hospital_id');

        foreach ($this->yearsRepository->findAll() as $year) {
            if ($year->getHospital() !== null) {
                continue;
            }

            $foundB++;
            $resolved = $this->resolveHospital($year->getId(), $manualMap, $io);

            if ($resolved === null) {
                $io->warning(sprintf(
                    '[SKIP-B] #%d "%s" — hôpital non déductible. Utilisez --map-hospital="%d:<hospital_id>"',
                    $year->getId(), $year->getTitle(), $year->getId(),
                ));
                $skippedB++;
                continue;
            }

            $io->text(sprintf('[%s-B] #%d "%s" → hospital #%d "%s" (via: %s)',
                $fix ? 'FIX' : 'DRY',
                $year->getId(), $year->getTitle(),
                $resolved['hospital']->getId(), $resolved['hospital']->getName(),
                $resolved['source']));

            if ($fix) {
                $year->setHospital($resolved['hospital']);
                $this->em->persist($year);
                $fixedB++;
            }
        }

        // ── Flush et bilan ────────────────────────────────────────────────────
        if ($fix && ($fixedA + $fixedB) > 0) {
            $this->em->flush();
        }

        $this->printSummary($io, $fix, $foundA, $fixedA, $skippedA, $foundB, $fixedB, $skippedB);

        return ($skippedA + $skippedB) > 0 ? Command::FAILURE : Command::SUCCESS;
    }

    // ── Résolution d'hôpital pour Type B ─────────────────────────────────────

    /**
     * Tente de résoudre l'hôpital d'une année sans hospital_id.
     *
     * Seul le mapping manuel (--map-hospital) est supporté — le champ `location`
     * a été supprimé, la correspondance automatique n'est plus possible.
     *
     * @param array<int,int> $manualMap yearId → hospitalId
     * @return array{hospital: Hospital, source: string}|null
     */
    private function resolveHospital(int $yearId, array $manualMap, SymfonyStyle $io): ?array
    {
        if (!isset($manualMap[$yearId])) {
            return null;
        }

        $hospital = $this->hospitalRepository->find($manualMap[$yearId]);
        if ($hospital === null) {
            $io->error(sprintf('--map-hospital: hospital_id %d introuvable pour l\'année #%d',
                $manualMap[$yearId], $yearId));
            return null;
        }

        return ['hospital' => $hospital, 'source' => 'manual'];
    }

    /**
     * @param array<string, string> $manualMap
     * @return array<int, int>
     */
    private function parseManualMap(string $raw, SymfonyStyle $io): array
    {
        if ($raw === '') {
            return [];
        }

        $map = [];
        foreach (explode(',', $raw) as $pair) {
            $parts = explode(':', trim($pair));
            if (count($parts) !== 2 || !is_numeric($parts[0]) || !is_numeric($parts[1])) {
                $io->error(sprintf('Format invalide pour --map-hospital : "%s". Attendu : "yearId:hospitalId"', $pair));
                continue;
            }
            $map[(int) $parts[0]] = (int) $parts[1];
        }

        return $map;
    }

    private function printSummary(
        SymfonyStyle $io,
        bool $fix,
        int $foundA, int $fixedA, int $skippedA,
        int $foundB, int $fixedB, int $skippedB,
    ): void {
        if ($foundA === 0 && $foundB === 0) {
            $io->success('Aucune année orpheline trouvée.');
            return;
        }

        if ($fix) {
            $io->success(sprintf(
                'Type A : %d réparée(s), %d ignorée(s) | Type B : %d réparée(s), %d ignorée(s).',
                $fixedA, $skippedA, $fixedB, $skippedB,
            ));
        } else {
            if ($foundA > 0) {
                $io->note(sprintf('Type A : %d année(s) sans manager_years.', $foundA));
            }
            if ($foundB > 0) {
                $io->note(sprintf('Type B : %d année(s) sans hospital_id (%d ambiguës → --map-hospital requis).',
                    $foundB, $skippedB));
            }
            $io->note('Mode dry-run — relancez avec --fix pour appliquer.');
        }
    }
}
