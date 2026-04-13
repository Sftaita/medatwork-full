<?php

declare(strict_types=1);

namespace App\Command;

use App\Entity\YearsWeekIntervals;
use App\Repository\YearsRepository;
use App\Services\YearsManagement\WeekIntervals;
use DateTime;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

/**
 * The GenerateYearIntervalsCommand class is a Symfony command used to generate
 * week intervals for each existing year in the database.
 * This command is useful to ensure all years have the correct week intervals set up,
 * even those that were created before the week intervals generation logic was put in place.
 *
 * To run this command, use the following command in the Symfony console:
 *
 *     php bin/console app:generate-year-intervals
 *
 * This command iterates over each year in the database and generates week intervals
 * for the years that do not already have them.
 *
 * @package App\Command
 */
#[AsCommand(name: 'app:generate-year-intervals')]
class GenerateYearIntervalsCommand extends Command
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly WeekIntervals $weekIntervals,
        private readonly YearsRepository $yearsRepository,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this->setDescription('Generates week intervals for each existing year in the database.');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $output->writeln('Generating week intervals for each year...');

        // Récupérer toutes les années de la base de données
        $years = $this->yearsRepository->findAll();

        foreach ($years as $year) {
            // Vérifier si l'année a déjà des intervalles de semaines
            if (count($year->getYearsWeekIntervals()) > 0) {
                continue;
            }

            // Créer les intervalles de semaines pour l'année
            $dateOfStart = $year->getDateOfStart();
            $dateOfEnd   = $year->getDateOfEnd();

            if ($dateOfStart === null || $dateOfEnd === null) {
                continue;
            }

            $weekIntervalsArray = $this->weekIntervals->createWeekIntervals(
                DateTime::createFromInterface($dateOfStart),
                DateTime::createFromInterface($dateOfEnd),
            );

            foreach ($weekIntervalsArray as $weekInterval) {
                $yearWeekInterval = new YearsWeekIntervals();
                $yearWeekInterval->setDateOfStart(new DateTime($weekInterval['dateOfStart']));
                $yearWeekInterval->setDateOfEnd(new DateTime($weekInterval['dateOfEnd']));
                $yearWeekInterval->setWeekNumber($weekInterval['weekNumber']);
                $yearWeekInterval->setMonthNumber($weekInterval['monthNumber']);
                $yearWeekInterval->setYearNumber($weekInterval['yearNumber']);
                $yearWeekInterval->setDeleted($weekInterval['deleted']);
                $yearWeekInterval->setYear($year);

                $year->addYearsWeekInterval($yearWeekInterval);
                $this->entityManager->persist($yearWeekInterval);
            }

            // Enregistrer les modifications dans la base de données
            $this->entityManager->flush();
        }

        $output->writeln('Done!');

        return Command::SUCCESS;
    }
}
