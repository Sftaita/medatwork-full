<?php

declare(strict_types=1);

namespace App\Tests\Unit\Controller;

use App\Controller\MailerController;
use App\Controller\YearsAPI\ManagersAPI\RealtimeReportController;
use App\Entity\Years;
use App\Repository\ManagerYearsRepository;
use App\Repository\YearsRepository;
use App\Services\NotificationDecisionService;
use App\Services\Realtime\RealtimeManagerService;
use PHPUnit\Framework\TestCase;
use Psr\Log\NullLogger;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\DependencyInjection\Container;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\RateLimiter\LimiterInterface;
use Symfony\Component\RateLimiter\RateLimiterFactoryInterface;
use Symfony\Component\RateLimiter\RateLimit;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;

/**
 * Unit tests for RealtimeReportController.
 *
 * Couverture :
 *   GET  /realtime/{month} :
 *     - mois invalide (0, 13) → 400
 *     - année inconnue        → 404
 *     - accès refusé          → 403
 *     - succès                → 200 + shape attendue
 *   POST /email-managers :
 *     - rate-limit dépassé    → 429
 *     - année inconnue        → 404
 *     - accès refusé          → 403
 *     - body incomplet        → 400
 *     - envoi à N managers    → sent = N
 *     - manager sans email    → ignoré (sent = 0)
 *     - erreur mailer         → errors[] contient l'email
 */
final class RealtimeReportControllerTest extends TestCase
{
    // ── Factories ─────────────────────────────────────────────────────────────

    private function makeController(bool $granted = true): RealtimeReportController
    {
        $token = $this->createMock(TokenInterface::class);

        $tokenStorage = $this->createMock(TokenStorageInterface::class);
        $tokenStorage->method('getToken')->willReturn($token);

        $authChecker = $this->createMock(AuthorizationCheckerInterface::class);
        $authChecker->method('isGranted')->willReturn($granted);

        $container = new Container();
        $container->set('security.token_storage', $tokenStorage);
        $container->set('security.authorization_checker', $authChecker);

        $ctrl = new RealtimeReportController();
        $ctrl->setContainer($container);
        return $ctrl;
    }

    private function makeYear(string $title = 'Bloc A 2024'): Years
    {
        $year = $this->createMock(Years::class);
        $year->method('getTitle')->willReturn($title);
        $year->method('getId')->willReturn(1);
        return $year;
    }

    private function makeSecurity(bool $granted): Security
    {
        $sec = $this->createMock(Security::class);
        $sec->method('isGranted')->willReturn($granted);
        return $sec;
    }

    private function acceptedLimiter(): RateLimiterFactoryInterface
    {
        $rateLimit = new RateLimit(100, new \DateTimeImmutable('+1 hour'), true, 100);

        $limiter = $this->createMock(LimiterInterface::class);
        $limiter->method('consume')->willReturn($rateLimit);

        $factory = $this->createMock(RateLimiterFactoryInterface::class);
        $factory->method('create')->willReturn($limiter);
        return $factory;
    }

    private function rejectedLimiter(): RateLimiterFactoryInterface
    {
        $rateLimit = new RateLimit(0, new \DateTimeImmutable('+0 seconds'), false, 0);

        $limiter = $this->createMock(LimiterInterface::class);
        $limiter->method('consume')->willReturn($rateLimit);

        $factory = $this->createMock(RateLimiterFactoryInterface::class);
        $factory->method('create')->willReturn($limiter);
        return $factory;
    }

    private function makeDecisionService(bool $allows): NotificationDecisionService
    {
        $svc = $this->createMock(NotificationDecisionService::class);
        $svc->method('shouldSend')->willReturn($allows);
        return $svc;
    }

    private function jsonRequest(mixed $data): Request
    {
        return new Request([], [], [], [], [], [], json_encode($data) ?: '{}');
    }

    // ── GET /realtime/{month} ─────────────────────────────────────────────────

    public function testGetMonthZeroIsInvalid(): void
    {
        $ctrl = $this->makeController();

        $response = $ctrl->getRealtimeData(
            1, 0,
            $this->makeSecurity(true),
            $this->createMock(YearsRepository::class),
            $this->createMock(RealtimeManagerService::class),
        );

        $this->assertSame(400, $response->getStatusCode());
    }

    public function testGetMonth13IsInvalid(): void
    {
        $ctrl = $this->makeController();

        $response = $ctrl->getRealtimeData(
            1, 13,
            $this->makeSecurity(true),
            $this->createMock(YearsRepository::class),
            $this->createMock(RealtimeManagerService::class),
        );

        $this->assertSame(400, $response->getStatusCode());
    }

    public function testGetYearNotFound(): void
    {
        $ctrl      = $this->makeController();
        $yearsRepo = $this->createMock(YearsRepository::class);
        $yearsRepo->method('findOneBy')->willReturn(null);

        $response = $ctrl->getRealtimeData(
            999, 5,
            $this->makeSecurity(true),
            $yearsRepo,
            $this->createMock(RealtimeManagerService::class),
        );

        $this->assertSame(404, $response->getStatusCode());
    }

    public function testGetAccessDenied(): void
    {
        $ctrl      = $this->makeController();
        $yearsRepo = $this->createMock(YearsRepository::class);
        $yearsRepo->method('findOneBy')->willReturn($this->makeYear());

        $response = $ctrl->getRealtimeData(
            1, 5,
            $this->makeSecurity(false),
            $yearsRepo,
            $this->createMock(RealtimeManagerService::class),
        );

        $this->assertSame(403, $response->getStatusCode());
    }

    public function testGetSuccessReturnsExpectedShape(): void
    {
        $ctrl      = $this->makeController();
        $yearsRepo = $this->createMock(YearsRepository::class);
        $yearsRepo->method('findOneBy')->willReturn($this->makeYear());

        $service = $this->createMock(RealtimeManagerService::class);
        $service->method('buildForYear')->willReturn([
            'weeks'     => ['S9', 'S10', 'S11'],
            'maccs'     => [],
            'yearTitle' => 'Bloc A 2024',
        ]);

        $response = $ctrl->getRealtimeData(
            1, 3,
            $this->makeSecurity(true),
            $yearsRepo,
            $service,
        );

        $this->assertSame(200, $response->getStatusCode());
        $data = json_decode($response->getContent(), true);
        $this->assertArrayHasKey('maccs',     $data);
        $this->assertArrayHasKey('weeks',     $data);
        $this->assertArrayHasKey('yearTitle', $data);
        $this->assertSame('Bloc A 2024', $data['yearTitle']);
    }

    // ── POST /email-managers ──────────────────────────────────────────────────

    public function testEmailRateLimitedReturns429(): void
    {
        $ctrl = $this->makeController();

        $response = $ctrl->emailManagers(
            1,
            new Request(),
            $this->makeSecurity(true),
            $this->createMock(YearsRepository::class),
            $this->createMock(ManagerYearsRepository::class),
            $this->createMock(MailerController::class),
            $this->rejectedLimiter(),
            new NullLogger(),
            $this->makeDecisionService(true),
        );

        $this->assertSame(429, $response->getStatusCode());
    }

    public function testEmailYearNotFoundReturns404(): void
    {
        $ctrl      = $this->makeController();
        $yearsRepo = $this->createMock(YearsRepository::class);
        $yearsRepo->method('findOneBy')->willReturn(null);

        $response = $ctrl->emailManagers(
            999,
            new Request(),
            $this->makeSecurity(true),
            $yearsRepo,
            $this->createMock(ManagerYearsRepository::class),
            $this->createMock(MailerController::class),
            $this->acceptedLimiter(),
            new NullLogger(),
            $this->makeDecisionService(true),
        );

        $this->assertSame(404, $response->getStatusCode());
    }

    public function testEmailAccessDeniedReturns403(): void
    {
        $ctrl      = $this->makeController();
        $yearsRepo = $this->createMock(YearsRepository::class);
        $yearsRepo->method('findOneBy')->willReturn($this->makeYear());

        $response = $ctrl->emailManagers(
            1,
            new Request(),
            $this->makeSecurity(false),
            $yearsRepo,
            $this->createMock(ManagerYearsRepository::class),
            $this->createMock(MailerController::class),
            $this->acceptedLimiter(),
            new NullLogger(),
            $this->makeDecisionService(true),
        );

        $this->assertSame(403, $response->getStatusCode());
    }

    public function testEmailMissingPdfBase64Returns400(): void
    {
        $ctrl      = $this->makeController();
        $yearsRepo = $this->createMock(YearsRepository::class);
        $yearsRepo->method('findOneBy')->willReturn($this->makeYear());

        $response = $ctrl->emailManagers(
            1,
            $this->jsonRequest(['month' => 'mai']),
            $this->makeSecurity(true),
            $yearsRepo,
            $this->createMock(ManagerYearsRepository::class),
            $this->createMock(MailerController::class),
            $this->acceptedLimiter(),
            new NullLogger(),
            $this->makeDecisionService(true),
        );

        $this->assertSame(400, $response->getStatusCode());
    }

    public function testEmailMissingMonthReturns400(): void
    {
        $ctrl      = $this->makeController();
        $yearsRepo = $this->createMock(YearsRepository::class);
        $yearsRepo->method('findOneBy')->willReturn($this->makeYear());

        $response = $ctrl->emailManagers(
            1,
            $this->jsonRequest(['pdfBase64' => base64_encode('pdf')]),
            $this->makeSecurity(true),
            $yearsRepo,
            $this->createMock(ManagerYearsRepository::class),
            $this->createMock(MailerController::class),
            $this->acceptedLimiter(),
            new NullLogger(),
            $this->makeDecisionService(true),
        );

        $this->assertSame(400, $response->getStatusCode());
    }

    public function testEmailSentToAllManagersWithValidEmail(): void
    {
        $ctrl  = $this->makeController();
        $year  = $this->makeYear('Bloc A 2024');
        $yearsRepo = $this->createMock(YearsRepository::class);
        $yearsRepo->method('findOneBy')->willReturn($year);

        $managerRepo = $this->createMock(ManagerYearsRepository::class);
        $managerRepo->method('fetchYearManagers')->willReturn([
            ['email' => 'alice@hosp.be', 'firstname' => 'Alice', 'lastname' => 'Dupont', 'managerId' => 1],
            ['email' => 'bob@hosp.be',   'firstname' => 'Bob',   'lastname' => 'Martin', 'managerId' => 2],
            ['email' => '',               'firstname' => 'No',    'lastname' => 'Email',  'managerId' => 3],
        ]);

        $mailer = $this->createMock(MailerController::class);
        $mailer->expects($this->exactly(2))->method('sendEmailWithPdfAttachment');

        $response = $ctrl->emailManagers(
            1,
            $this->jsonRequest(['pdfBase64' => base64_encode('pdf-data'), 'month' => 'mai']),
            $this->makeSecurity(true),
            $yearsRepo,
            $managerRepo,
            $mailer,
            $this->acceptedLimiter(),
            new NullLogger(),
            $this->makeDecisionService(true),
        );

        $this->assertSame(200, $response->getStatusCode());
        $data = json_decode($response->getContent(), true);
        $this->assertSame(2, $data['sent']);
        $this->assertSame(0, $data['skipped']);
        $this->assertEmpty($data['errors']);
    }

    public function testEmailManagerWithNullEmailIsSkipped(): void
    {
        $ctrl  = $this->makeController();
        $year  = $this->makeYear();
        $yearsRepo = $this->createMock(YearsRepository::class);
        $yearsRepo->method('findOneBy')->willReturn($year);

        $managerRepo = $this->createMock(ManagerYearsRepository::class);
        $managerRepo->method('fetchYearManagers')->willReturn([
            ['email' => null, 'firstname' => 'No', 'lastname' => 'Email', 'managerId' => 1],
        ]);

        $mailer = $this->createMock(MailerController::class);
        $mailer->expects($this->never())->method('sendEmailWithPdfAttachment');

        $response = $ctrl->emailManagers(
            1,
            $this->jsonRequest(['pdfBase64' => 'abc', 'month' => 'mars']),
            $this->makeSecurity(true),
            $yearsRepo,
            $managerRepo,
            $mailer,
            $this->acceptedLimiter(),
            new NullLogger(),
            $this->makeDecisionService(true),
        );

        $data = json_decode($response->getContent(), true);
        $this->assertSame(0, $data['sent']);
        $this->assertSame(0, $data['skipped']);
        $this->assertEmpty($data['errors']);
    }

    public function testEmailMailerFailureIsRecordedInErrors(): void
    {
        $ctrl  = $this->makeController();
        $year  = $this->makeYear();
        $yearsRepo = $this->createMock(YearsRepository::class);
        $yearsRepo->method('findOneBy')->willReturn($year);

        $managerRepo = $this->createMock(ManagerYearsRepository::class);
        $managerRepo->method('fetchYearManagers')->willReturn([
            ['email' => 'fail@hosp.be', 'firstname' => 'Fail', 'lastname' => 'User', 'managerId' => 1],
            ['email' => 'ok@hosp.be',   'firstname' => 'Ok',   'lastname' => 'User', 'managerId' => 2],
        ]);

        $mailer = $this->createMock(MailerController::class);
        $mailer->method('sendEmailWithPdfAttachment')
            ->willReturnCallback(static function (string $to): void {
                if ($to === 'fail@hosp.be') {
                    throw new \RuntimeException('SMTP error');
                }
            });

        $response = $ctrl->emailManagers(
            1,
            $this->jsonRequest(['pdfBase64' => 'abc', 'month' => 'avril']),
            $this->makeSecurity(true),
            $yearsRepo,
            $managerRepo,
            $mailer,
            $this->acceptedLimiter(),
            new NullLogger(),
            $this->makeDecisionService(true),
        );

        $data = json_decode($response->getContent(), true);
        $this->assertSame(1, $data['sent']);
        $this->assertSame(0, $data['skipped']);
        $this->assertSame(['fail@hosp.be'], $data['errors']);
    }

    // ── Préférences email ─────────────────────────────────────────────────────

    public function testManagerWithEmailDisabledGloballyIsSkipped(): void
    {
        $ctrl  = $this->makeController();
        $year  = $this->makeYear();
        $yearsRepo = $this->createMock(YearsRepository::class);
        $yearsRepo->method('findOneBy')->willReturn($year);

        $managerRepo = $this->createMock(ManagerYearsRepository::class);
        $managerRepo->method('fetchYearManagers')->willReturn([
            ['email' => 'no-email@hosp.be', 'firstname' => 'Alice', 'lastname' => 'Dupont', 'managerId' => 1],
        ]);

        $mailer = $this->createMock(MailerController::class);
        $mailer->expects($this->never())->method('sendEmailWithPdfAttachment');

        $response = $ctrl->emailManagers(
            1,
            $this->jsonRequest(['pdfBase64' => 'abc', 'month' => 'mai']),
            $this->makeSecurity(true),
            $yearsRepo,
            $managerRepo,
            $mailer,
            $this->acceptedLimiter(),
            new NullLogger(),
            $this->makeDecisionService(false),
        );

        $data = json_decode($response->getContent(), true);
        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame(0, $data['sent']);
        $this->assertSame(1, $data['skipped']);
        $this->assertEmpty($data['errors']);
    }

    public function testManagerWithYearPrefDisabledIsSkipped(): void
    {
        $ctrl  = $this->makeController();
        $year  = $this->makeYear();
        $yearsRepo = $this->createMock(YearsRepository::class);
        $yearsRepo->method('findOneBy')->willReturn($year);

        $managerRepo = $this->createMock(ManagerYearsRepository::class);
        $managerRepo->method('fetchYearManagers')->willReturn([
            ['email' => 'opt-out@hosp.be', 'firstname' => 'Bob', 'lastname' => 'Martin', 'managerId' => 2],
        ]);

        $mailer = $this->createMock(MailerController::class);
        $mailer->expects($this->never())->method('sendEmailWithPdfAttachment');

        $response = $ctrl->emailManagers(
            1,
            $this->jsonRequest(['pdfBase64' => 'abc', 'month' => 'juin']),
            $this->makeSecurity(true),
            $yearsRepo,
            $managerRepo,
            $mailer,
            $this->acceptedLimiter(),
            new NullLogger(),
            $this->makeDecisionService(false),
        );

        $data = json_decode($response->getContent(), true);
        $this->assertSame(0, $data['sent']);
        $this->assertSame(1, $data['skipped']);
        $this->assertEmpty($data['errors']);
    }

    public function testMixOneSentOneSkipped(): void
    {
        $ctrl  = $this->makeController();
        $year  = $this->makeYear();
        $yearsRepo = $this->createMock(YearsRepository::class);
        $yearsRepo->method('findOneBy')->willReturn($year);

        $managerRepo = $this->createMock(ManagerYearsRepository::class);
        $managerRepo->method('fetchYearManagers')->willReturn([
            ['email' => 'alice@hosp.be', 'firstname' => 'Alice', 'lastname' => 'Dupont', 'managerId' => 1],
            ['email' => 'bob@hosp.be',   'firstname' => 'Bob',   'lastname' => 'Martin', 'managerId' => 2],
        ]);

        // alice (id=1) autorisée, bob (id=2) a désactivé
        $decisionSvc = $this->createMock(NotificationDecisionService::class);
        $decisionSvc->method('shouldSend')
            ->willReturnCallback(static fn(string $type, int $id): bool => $id === 1);

        $mailer = $this->createMock(MailerController::class);
        $mailer->expects($this->once())->method('sendEmailWithPdfAttachment');

        $response = $ctrl->emailManagers(
            1,
            $this->jsonRequest(['pdfBase64' => 'abc', 'month' => 'juillet']),
            $this->makeSecurity(true),
            $yearsRepo,
            $managerRepo,
            $mailer,
            $this->acceptedLimiter(),
            new NullLogger(),
            $decisionSvc,
        );

        $data = json_decode($response->getContent(), true);
        $this->assertSame(1, $data['sent']);
        $this->assertSame(1, $data['skipped']);
        $this->assertEmpty($data['errors']);
    }

    public function testSkippedIsNotCountedInErrors(): void
    {
        $ctrl  = $this->makeController();
        $year  = $this->makeYear();
        $yearsRepo = $this->createMock(YearsRepository::class);
        $yearsRepo->method('findOneBy')->willReturn($year);

        $managerRepo = $this->createMock(ManagerYearsRepository::class);
        $managerRepo->method('fetchYearManagers')->willReturn([
            ['email' => 'opt-out@hosp.be', 'firstname' => 'X', 'lastname' => 'Y', 'managerId' => 5],
        ]);

        $response = $ctrl->emailManagers(
            1,
            $this->jsonRequest(['pdfBase64' => 'abc', 'month' => 'mars']),
            $this->makeSecurity(true),
            $yearsRepo,
            $managerRepo,
            $this->createMock(MailerController::class),
            $this->acceptedLimiter(),
            new NullLogger(),
            $this->makeDecisionService(false),
        );

        $data = json_decode($response->getContent(), true);
        $this->assertArrayHasKey('skipped', $data);
        $this->assertArrayHasKey('errors',  $data);
        $this->assertSame(1, $data['skipped']);
        $this->assertEmpty($data['errors'], 'Un refus de préférence ne doit jamais apparaître dans errors[]');
    }
}
