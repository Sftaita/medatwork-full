<?php

declare(strict_types=1);

namespace App\Command;

use App\Entity\IsEditableInterface;
use App\Repository\AbsenceRepository;
use App\Repository\GardeRepository;
use App\Repository\TimesheetRepository;
use Doctrine\ORM\EntityManagerInterface;
use Exception;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

/**
 * php bin/console app:update-isEditable-Status
 *
 * @package App\Command
 */
#[AsCommand(name: 'app:update-isEditable-Status')]
class UpdateIsEditableStatusCommand extends Command
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly TimesheetRepository $timesheetRepository,
        private readonly GardeRepository $gardeRepository,
        private readonly AbsenceRepository $absenceRepository,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this->setDescription('Update "isEditable" status in database.');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $output->writeln('Starting UpdateIsEditableStatusCommand...');

        try {
            $output->writeln('Starting database transaction...');
            $this->entityManager->beginTransaction();

            $output->writeln('Updating timesheets...');
            $this->updateIsEditableStatus($this->timesheetRepository->findAll());

            $output->writeln('Updating gardes...');
            $this->updateIsEditableStatus($this->gardeRepository->findAll());

            $output->writeln('Updating absences...');
            $this->updateIsEditableStatus($this->absenceRepository->findAll());

            $output->writeln('Committing database transaction...');
            $this->entityManager->commit();

            $output->writeln('Successfully updated "isEditable" statuses.');
            return Command::SUCCESS;

        } catch (Exception $e) {
            $this->entityManager->rollback();
            $output->writeln('Transaction rolled back.');
            $output->writeln('Failure: ' . $e->getMessage());
            return Command::FAILURE;
        }
    }


    /** @param array<int, IsEditableInterface> $entities */
    private function updateIsEditableStatus(array $entities): void
    {
        foreach ($entities as $entity) {
            if ($entity->getIsEditable() === null) {
                $entity->setIsEditable(true);
            }
            $this->entityManager->persist($entity);
        }

        $this->entityManager->flush();
    }
}
