<?php

declare(strict_types=1);

namespace App\Command;

use App\Repository\NotificationManagerRepository;
use App\Repository\NotificationResidentRepository;
use DateTime;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

/**
 * Deletes stale notifications from the database.
 *
 * Usage:
 *   php bin/console app:notifications:purge
 *   php bin/console app:notifications:purge --read-days=60 --unread-days=180
 *
 * Defaults:
 *   --read-days=30   Delete read notifications older than 30 days (readAt)
 *   --unread-days=90 Delete unread notifications older than 90 days (createdAt)
 */
#[AsCommand(
    name: 'app:notifications:purge',
    description: 'Delete stale manager and resident notifications.',
)]
class PurgeOldNotificationsCommand extends Command
{
    public function __construct(
        private readonly NotificationManagerRepository $managerRepo,
        private readonly NotificationResidentRepository $residentRepo,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addOption(
                'read-days',
                null,
                InputOption::VALUE_REQUIRED,
                'Delete read notifications whose readAt is older than this many days.',
                30,
            )
            ->addOption(
                'unread-days',
                null,
                InputOption::VALUE_REQUIRED,
                'Delete unread notifications whose createdAt is older than this many days.',
                90,
            );
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);

        $readDays   = (int) $input->getOption('read-days');
        $unreadDays = (int) $input->getOption('unread-days');

        if ($readDays <= 0 || $unreadDays <= 0) {
            $io->error('--read-days and --unread-days must be positive integers.');
            return Command::FAILURE;
        }

        $readCutoff   = new DateTime("-{$readDays} days");
        $unreadCutoff = new DateTime("-{$unreadDays} days");

        $io->title('Purging old notifications');
        $io->text([
            "Read cutoff   : older than {$readDays} days ({$readCutoff->format('Y-m-d')})",
            "Unread cutoff : older than {$unreadDays} days ({$unreadCutoff->format('Y-m-d')})",
        ]);

        $deletedManagers  = $this->managerRepo->purgeOld($readCutoff, $unreadCutoff);
        $deletedResidents = $this->residentRepo->purgeOld($readCutoff, $unreadCutoff);
        $total            = $deletedManagers + $deletedResidents;

        $io->success(sprintf(
            'Deleted %d notification(s): %d manager, %d resident.',
            $total,
            $deletedManagers,
            $deletedResidents,
        ));

        return Command::SUCCESS;
    }
}
