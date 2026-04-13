<?php

declare(strict_types=1);

namespace App\Tests\Unit\Services\ManagerMonthValidation;

use App\Entity\Manager;
use App\Entity\PeriodValidation;
use App\Entity\Years;
use App\Repository\PeriodValidationRepository;
use App\Repository\YearsRepository;
use App\Security\Voter\YearAccessVoter;
use App\Services\ManagerMonthValidation\UpdateMonthStatus;
use App\Services\Notifications\ValidationNotifications;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;
use Symfony\Component\Security\Core\Exception\AccessDeniedException;

class UpdateMonthStatusTest extends TestCase
{
    /** @var PeriodValidationRepository&MockObject */
    private PeriodValidationRepository $periodRepo;

    /** @var YearsRepository&MockObject */
    private YearsRepository $yearsRepo;

    /** @var EntityManagerInterface&MockObject */
    private EntityManagerInterface $em;

    /** @var ValidationNotifications&MockObject */
    private ValidationNotifications $notifications;

    /** @var AuthorizationCheckerInterface&MockObject */
    private AuthorizationCheckerInterface $authChecker;

    private UpdateMonthStatus $service;

    protected function setUp(): void
    {
        $this->periodRepo    = $this->createMock(PeriodValidationRepository::class);
        $this->yearsRepo     = $this->createMock(YearsRepository::class);
        $this->em            = $this->createMock(EntityManagerInterface::class);
        $this->notifications = $this->createMock(ValidationNotifications::class);
        $this->authChecker   = $this->createMock(AuthorizationCheckerInterface::class);

        $this->service = new UpdateMonthStatus(
            $this->periodRepo,
            $this->yearsRepo,
            $this->em,
            $this->notifications,
            $this->authChecker,
        );
    }

    private function makeManager(): Manager&MockObject
    {
        return $this->createMock(Manager::class);
    }

    private function withAuthorized(): void
    {
        $year = $this->createMock(Years::class);
        $this->yearsRepo->method('findOneBy')->willReturn($year);
        $this->authChecker->method('isGranted')->willReturn(true);
    }

    // ─── updateValidationStatus ───────────────────────────────────────────────

    public function testThrowsWhenPeriodNotFound(): void
    {
        $this->periodRepo->method('findOneBy')->willReturn(null);

        $this->expectException(\Exception::class);
        $this->service->updateValidationStatus(99, true, $this->makeManager());
    }

    public function testThrowsAccessDeniedWhenNoRights(): void
    {
        $period = new PeriodValidation();
        $year   = $this->createMock(Years::class);

        $this->periodRepo->method('findOneBy')->willReturn($period);
        $this->yearsRepo->method('findOneBy')->willReturn($year);
        $this->authChecker->method('isGranted')->willReturn(false);

        $this->expectException(AccessDeniedException::class);
        $this->service->updateValidationStatus(1, true, $this->makeManager());
    }

    public function testValidateSetsValidatedTrue(): void
    {
        $period  = new PeriodValidation();
        $manager = $this->makeManager();

        $this->periodRepo->method('findOneBy')->willReturn($period);
        $this->withAuthorized();

        $this->service->updateValidationStatus(1, true, $manager);

        $this->assertTrue($period->getValidated());
        $this->assertSame($manager, $period->getValidatedBy());
        $this->assertNotNull($period->getValidatedAt());
    }

    public function testInvalidateSetsValidatedFalse(): void
    {
        $period  = new PeriodValidation();
        $manager = $this->makeManager();

        $this->periodRepo->method('findOneBy')->willReturn($period);
        $this->withAuthorized();

        $this->service->updateValidationStatus(1, false, $manager);

        $this->assertFalse($period->getValidated());
        $this->assertSame($manager, $period->getValidatedBy());
        $this->assertNotNull($period->getUnvalidatedAt());
    }

    public function testValidateSendsAcceptedNotification(): void
    {
        $period  = new PeriodValidation();
        $manager = $this->makeManager();

        $this->periodRepo->method('findOneBy')->willReturn($period);
        $this->withAuthorized();
        $this->notifications->expects($this->once())->method('notifyAcceptedPeriodValidation')->with($period, $manager);

        $this->service->updateValidationStatus(1, true, $manager);
    }

    public function testInvalidateSendsUnvalidatedNotification(): void
    {
        $period  = new PeriodValidation();
        $manager = $this->makeManager();

        $this->periodRepo->method('findOneBy')->willReturn($period);
        $this->withAuthorized();
        $this->notifications->expects($this->once())->method('notifyUnvalidatedPeriodValidation')->with($period, $manager);

        $this->service->updateValidationStatus(1, false, $manager);
    }

    public function testNotificationExceptionIsSilentlySwallowed(): void
    {
        $period  = new PeriodValidation();
        $manager = $this->makeManager();

        $this->periodRepo->method('findOneBy')->willReturn($period);
        $this->withAuthorized();
        $this->notifications->method('notifyAcceptedPeriodValidation')->willThrowException(new \Exception('mail error'));

        // Should not throw
        $this->service->updateValidationStatus(1, true, $manager);
        $this->assertTrue($period->getValidated());
    }

    public function testFlushIsCalledOnSuccess(): void
    {
        $period = new PeriodValidation();

        $this->periodRepo->method('findOneBy')->willReturn($period);
        $this->withAuthorized();
        $this->em->expects($this->once())->method('flush');

        $this->service->updateValidationStatus(1, true, $this->makeManager());
    }
}
