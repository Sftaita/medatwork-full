<?php

declare(strict_types=1);

namespace App\Tests\Unit\Command;

use App\Command\PurgeOldNotificationsCommand;
use App\Repository\NotificationManagerRepository;
use App\Repository\NotificationResidentRepository;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Console\Application;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Tester\CommandTester;

class PurgeOldNotificationsCommandTest extends TestCase
{
    private NotificationManagerRepository $managerRepo;
    private NotificationResidentRepository $residentRepo;
    private CommandTester $tester;

    protected function setUp(): void
    {
        $this->managerRepo  = $this->createMock(NotificationManagerRepository::class);
        $this->residentRepo = $this->createMock(NotificationResidentRepository::class);

        $command = new PurgeOldNotificationsCommand($this->managerRepo, $this->residentRepo);
        $app     = new Application();
        $app->addCommand($command);

        $this->tester = new CommandTester($app->find('app:notifications:purge'));
    }

    public function testSuccessWithDefaults(): void
    {
        $this->managerRepo->method('purgeOld')->willReturn(5);
        $this->residentRepo->method('purgeOld')->willReturn(3);

        $exitCode = $this->tester->execute([]);

        $this->assertSame(Command::SUCCESS, $exitCode);
        $this->assertStringContainsString('Deleted 8 notification(s)', $this->tester->getDisplay());
        $this->assertStringContainsString('5 manager', $this->tester->getDisplay());
        $this->assertStringContainsString('3 resident', $this->tester->getDisplay());
    }

    public function testPassesCorrectCutoffsForReadNotifications(): void
    {
        $capturedReadCutoff = null;
        $this->managerRepo
            ->method('purgeOld')
            ->willReturnCallback(function (\DateTimeInterface $readCutoff, \DateTimeInterface $unreadCutoff) use (&$capturedReadCutoff) {
                $capturedReadCutoff = $readCutoff;
                return 0;
            });
        $this->residentRepo->method('purgeOld')->willReturn(0);

        $before = new \DateTime('-30 days');
        $this->tester->execute(['--read-days' => '30']);
        $after  = new \DateTime('-30 days');

        // cutoff should be approximately "-30 days"
        $this->assertGreaterThanOrEqual($before->getTimestamp(), $capturedReadCutoff->getTimestamp());
        $this->assertLessThanOrEqual($after->getTimestamp() + 2, $capturedReadCutoff->getTimestamp());
    }

    public function testCustomDaysOptions(): void
    {
        $this->managerRepo->method('purgeOld')->willReturn(10);
        $this->residentRepo->method('purgeOld')->willReturn(7);

        $exitCode = $this->tester->execute([
            '--read-days'   => '60',
            '--unread-days' => '180',
        ]);

        $display = $this->tester->getDisplay();
        $this->assertSame(Command::SUCCESS, $exitCode);
        $this->assertStringContainsString('Deleted 17 notification(s)', $display);
    }

    public function testFailsOnZeroReadDays(): void
    {
        $this->managerRepo->expects($this->never())->method('purgeOld');
        $this->residentRepo->expects($this->never())->method('purgeOld');

        $exitCode = $this->tester->execute(['--read-days' => '0']);

        $this->assertSame(Command::FAILURE, $exitCode);
    }

    public function testFailsOnNegativeUnreadDays(): void
    {
        $this->managerRepo->expects($this->never())->method('purgeOld');

        $exitCode = $this->tester->execute(['--unread-days' => '-1']);

        $this->assertSame(Command::FAILURE, $exitCode);
    }

    public function testBothReposAreCalledExactlyOnce(): void
    {
        $this->managerRepo->expects($this->once())->method('purgeOld')->willReturn(0);
        $this->residentRepo->expects($this->once())->method('purgeOld')->willReturn(0);

        $this->tester->execute([]);
    }

    public function testOutputContainsCutoffDates(): void
    {
        $this->managerRepo->method('purgeOld')->willReturn(0);
        $this->residentRepo->method('purgeOld')->willReturn(0);

        $this->tester->execute(['--read-days' => '30', '--unread-days' => '90']);

        $display = $this->tester->getDisplay();
        $this->assertStringContainsString('30 days', $display);
        $this->assertStringContainsString('90 days', $display);
    }
}
