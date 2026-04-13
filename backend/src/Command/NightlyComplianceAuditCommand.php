<?php

declare(strict_types=1);

namespace App\Command;

use App\Compliance\ResidentWorkComplianceService;
use App\Repository\ManagerYearsRepository;
use App\Repository\YearsResidentRepository;
use App\Services\ManagerMonthValidation\LegalPeriodsCalculator;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

/**
 * Runs the compliance audit for all active residents.
 *
 * Usage:
 *   php bin/console app:compliance:audit
 *   php bin/console app:compliance:audit --year=1
 *
 * Intended to run nightly via cron:
 *   0 2 * * * php /var/www/html/bin/console app:compliance:audit
 */
#[AsCommand(
    name: 'app:compliance:audit',
    description: 'Runs the nightly compliance audit for all active residents.',
)]
final class NightlyComplianceAuditCommand extends Command
{
    public function __construct(
        private readonly ManagerYearsRepository $managerYearsRepository,
        private readonly YearsResidentRepository $yearsResidentRepository,
        private readonly ResidentWorkComplianceService $complianceService,
        private readonly LegalPeriodsCalculator $periodsCalculator,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this->addOption(
            'year',
            null,
            InputOption::VALUE_OPTIONAL,
            'Restrict audit to a specific year ID',
        );
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $io->title('Compliance Audit');

        $yearId = $input->getOption('year');

        $yearsResidents = $yearId !== null
            ? $this->yearsResidentRepository->findBy(['year' => (int) $yearId, 'allowed' => true])
            : $this->yearsResidentRepository->findBy(['allowed' => true]);

        if (count($yearsResidents) === 0) {
            $io->warning('No active residents found.');

            return Command::SUCCESS;
        }

        $io->progressStart(count($yearsResidents));

        $issueCount    = 0;
        $residentCount = 0;
        $errorCount    = 0;

        foreach ($yearsResidents as $yr) {
            $resident = $yr->getResident();
            $year     = $yr->getYear();

            if ($resident === null || $year === null) {
                $io->progressAdvance();
                continue;
            }

            try {
                $periods = $this->periodsCalculator->getLegalPeriods($year, (int) $resident->getId());

                foreach ($periods as $period) {
                    $report = $this->complianceService->auditResident(
                        resident: $resident,
                        periodStart: new \DateTimeImmutable($period['start'] ?? ''),
                        periodEnd: new \DateTimeImmutable($period['end'] ?? ''),
                    );

                    $issueCount += count($report->issues);
                }

                ++$residentCount;
            } catch (\Throwable $e) {
                ++$errorCount;
                $io->error(sprintf(
                    'Error auditing resident %d (%s %s): %s',
                    (int) $resident->getId(),
                    $resident->getFirstname(),
                    $resident->getLastname(),
                    $e->getMessage(),
                ));
            }

            $io->progressAdvance();
        }

        $io->progressFinish();
        $io->success(sprintf(
            'Audit complete. %d residents processed, %d issues detected, %d errors.',
            $residentCount,
            $issueCount,
            $errorCount,
        ));

        return $errorCount > 0 ? Command::FAILURE : Command::SUCCESS;
    }
}
