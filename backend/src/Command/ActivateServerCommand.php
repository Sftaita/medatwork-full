<?php

declare(strict_types=1);

namespace App\Command;

use App\Repository\ResidentRepository;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

#[AsCommand(name: 'app:activate-server', description: 'Activate the server.')]
class ActivateServerCommand extends Command
{
    public function __construct(
        private readonly ResidentRepository $residentRepository,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this->setHelp('This command allows you to activate the server to improve performance.');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $fetch = $this->residentRepository->findAll();

        $count = 0;
        foreach ($fetch as $resident) {
            $count++;
        }
        $output->writeln("The count of residents is : $count");

        return 0;

    }
}
