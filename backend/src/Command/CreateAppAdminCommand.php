<?php

declare(strict_types=1);

namespace App\Command;

use App\Entity\AppAdmin;
use App\Repository\AppAdminRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

/**
 * One-time setup command: creates the first super-admin account.
 *
 * Usage: php bin/console app:create-app-admin
 */
#[AsCommand(name: 'app:create-app-admin', description: 'Create a super-admin (AppAdmin) account.')]
class CreateAppAdminCommand extends Command
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly UserPasswordHasherInterface $passwordHasher,
        private readonly AppAdminRepository $adminRepository,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);

        $io->title('Create AppAdmin (Super-Admin)');

        $email = $io->ask('Email');
        if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $io->error('Invalid email address.');
            return Command::FAILURE;
        }

        if ($this->adminRepository->findOneBy(['email' => strtolower($email)]) !== null) {
            $io->error('An AppAdmin with this email already exists.');
            return Command::FAILURE;
        }

        $plainPassword = $io->askHidden('Password (min 8 chars)');
        if ($plainPassword === null || strlen($plainPassword) < 8) {
            $io->error('Password must be at least 8 characters.');
            return Command::FAILURE;
        }

        $firstname = $io->ask('Firstname');
        $lastname  = $io->ask('Lastname');

        if (! is_string($firstname) || trim($firstname) === '' || ! is_string($lastname) || trim($lastname) === '') {
            $io->error('Firstname and lastname are required.');
            return Command::FAILURE;
        }

        $admin = new AppAdmin();
        $admin->setEmail(strtolower($email))
              ->setFirstname(trim($firstname))
              ->setLastname(trim($lastname))
              ->setRoles(['ROLE_SUPER_ADMIN'])
              ->setPassword($this->passwordHasher->hashPassword($admin, $plainPassword));

        $this->em->persist($admin);
        $this->em->flush();

        $io->success(sprintf('AppAdmin created: %s', $admin->getEmail()));

        return Command::SUCCESS;
    }
}
