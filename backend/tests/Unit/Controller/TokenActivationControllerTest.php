<?php

declare(strict_types=1);

namespace App\Tests\Unit\Controller;

use App\Controller\MailerController;
use App\Controller\TokenActivationController;
use App\Entity\Manager;
use App\Entity\Resident;
use App\Repository\ManagerRepository;
use App\Repository\ResidentRepository;
use DateTime;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\RateLimiter\RateLimit;
use Symfony\Component\RateLimiter\RateLimiterFactoryInterface;
use Symfony\Component\RateLimiter\LimiterInterface;

final class TokenActivationControllerTest extends TestCase
{
    private MailerController $mailer;
    private ResidentRepository $residentRepo;
    private ManagerRepository $managerRepo;
    private EntityManagerInterface $em;
    private RateLimiterFactoryInterface $limiterFactory;

    protected function setUp(): void
    {
        $this->mailer       = $this->createMock(MailerController::class);
        $this->residentRepo = $this->createMock(ResidentRepository::class);
        $this->managerRepo  = $this->createMock(ManagerRepository::class);
        $this->em           = $this->createMock(EntityManagerInterface::class);

        $rateLimit = $this->createMock(RateLimit::class);
        $rateLimit->method('isAccepted')->willReturn(true);

        $limiter = $this->createMock(LimiterInterface::class);
        $limiter->method('consume')->willReturn($rateLimit);

        $this->limiterFactory = $this->createMock(RateLimiterFactoryInterface::class);
        $this->limiterFactory->method('create')->willReturn($limiter);
    }

    private function buildController(): TokenActivationController
    {
        return new TokenActivationController(
            $this->mailer,
            'https://api.medatwork.be/api/',
            'https://www.medatwork.be',
        );
    }

    private function makeRequest(array $body): Request
    {
        $request = new Request([], [], [], [], [], [], json_encode($body));
        $request->setMethod('POST');
        $request->headers->set('Content-Type', 'application/json');

        return $request;
    }

    // ─── Rate limiting ────────────────────────────────────────────────────────

    public function testRateLimitedRequestReturns429(): void
    {
        $rateLimit = $this->createMock(RateLimit::class);
        $rateLimit->method('isAccepted')->willReturn(false);

        $limiter = $this->createMock(LimiterInterface::class);
        $limiter->method('consume')->willReturn($rateLimit);

        $factory = $this->createMock(RateLimiterFactoryInterface::class);
        $factory->method('create')->willReturn($limiter);

        $this->em->expects($this->never())->method('flush');
        $this->mailer->expects($this->never())->method('sendEmail');

        $response = $this->buildController()->resendActivation(
            $this->makeRequest(['email' => 'test@example.com']),
            $this->residentRepo,
            $this->managerRepo,
            $this->em,
            $factory,
        );

        $this->assertSame(429, $response->getStatusCode());
    }

    // ─── Invalid / unknown email ──────────────────────────────────────────────

    public function testInvalidEmailReturns200WithNoDbOrMailAction(): void
    {
        $this->residentRepo->expects($this->never())->method('findOneBy');
        $this->managerRepo->expects($this->never())->method('findOneBy');
        $this->em->expects($this->never())->method('flush');
        $this->mailer->expects($this->never())->method('sendEmail');

        $response = $this->buildController()->resendActivation(
            $this->makeRequest(['email' => 'not-an-email']),
            $this->residentRepo,
            $this->managerRepo,
            $this->em,
            $this->limiterFactory,
        );

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame(['message' => 'ok'], json_decode((string) $response->getContent(), true));
    }

    public function testUnknownEmailReturns200WithNoFlushOrMail(): void
    {
        $this->residentRepo->method('findOneBy')->willReturn(null);
        $this->managerRepo->method('findOneBy')->willReturn(null);
        $this->em->expects($this->never())->method('flush');
        $this->mailer->expects($this->never())->method('sendEmail');

        $response = $this->buildController()->resendActivation(
            $this->makeRequest(['email' => 'nobody@example.com']),
            $this->residentRepo,
            $this->managerRepo,
            $this->em,
            $this->limiterFactory,
        );

        $this->assertSame(200, $response->getStatusCode());
    }

    // ─── Already-validated accounts ───────────────────────────────────────────

    public function testAlreadyValidatedResidentReturns200WithNoAction(): void
    {
        $resident = $this->createMock(Resident::class);
        $resident->method('getValidatedAt')->willReturn(new DateTime());

        $this->residentRepo->method('findOneBy')->willReturn($resident);
        $this->em->expects($this->never())->method('flush');
        $this->mailer->expects($this->never())->method('sendEmail');

        $response = $this->buildController()->resendActivation(
            $this->makeRequest(['email' => 'validated@example.com']),
            $this->residentRepo,
            $this->managerRepo,
            $this->em,
            $this->limiterFactory,
        );

        $this->assertSame(200, $response->getStatusCode());
    }

    public function testAlreadyValidatedManagerReturns200WithNoAction(): void
    {
        $manager = $this->createMock(Manager::class);
        $manager->method('getValidatedAt')->willReturn(new DateTime());

        $this->residentRepo->method('findOneBy')->willReturn(null);
        $this->managerRepo->method('findOneBy')->willReturn($manager);
        $this->em->expects($this->never())->method('flush');
        $this->mailer->expects($this->never())->method('sendEmail');

        $response = $this->buildController()->resendActivation(
            $this->makeRequest(['email' => 'validated-manager@example.com']),
            $this->residentRepo,
            $this->managerRepo,
            $this->em,
            $this->limiterFactory,
        );

        $this->assertSame(200, $response->getStatusCode());
    }

    // ─── Happy path — resident ────────────────────────────────────────────────

    public function testUnvalidatedResidentGetsNewTokenAndEmail(): void
    {
        $resident = $this->createMock(Resident::class);
        $resident->method('getValidatedAt')->willReturn(null);
        $resident->method('getFirstname')->willReturn('Jean');

        $resident->expects($this->once())
            ->method('setToken')
            ->with($this->matchesRegularExpression('/^[0-9a-f]{64}$/'))
            ->willReturn($resident);

        $resident->expects($this->once())
            ->method('setTokenExpiration')
            ->with($this->isInstanceOf(DateTime::class))
            ->willReturn($resident);

        $this->residentRepo->method('findOneBy')->willReturn($resident);
        $this->em->expects($this->once())->method('flush');
        $this->mailer->expects($this->once())->method('sendEmail');

        $response = $this->buildController()->resendActivation(
            $this->makeRequest(['email' => 'jean@example.com']),
            $this->residentRepo,
            $this->managerRepo,
            $this->em,
            $this->limiterFactory,
        );

        $this->assertSame(200, $response->getStatusCode());
    }

    // ─── Happy path — manager ────────────────────────────────────────────────

    public function testUnvalidatedManagerGetsNewTokenAndEmail(): void
    {
        $manager = $this->createMock(Manager::class);
        $manager->method('getValidatedAt')->willReturn(null);
        $manager->method('getFirstname')->willReturn('Paul');

        $manager->expects($this->once())
            ->method('setToken')
            ->with($this->matchesRegularExpression('/^[0-9a-f]{64}$/'))
            ->willReturn($manager);

        $manager->expects($this->once())
            ->method('setTokenExpiration')
            ->with($this->isInstanceOf(DateTime::class))
            ->willReturn($manager);

        $this->residentRepo->method('findOneBy')->willReturn(null);
        $this->managerRepo->method('findOneBy')->willReturn($manager);
        $this->em->expects($this->once())->method('flush');
        $this->mailer->expects($this->once())->method('sendEmail');

        $response = $this->buildController()->resendActivation(
            $this->makeRequest(['email' => 'paul@example.com']),
            $this->residentRepo,
            $this->managerRepo,
            $this->em,
            $this->limiterFactory,
        );

        $this->assertSame(200, $response->getStatusCode());
    }

    // ─── Token properties ─────────────────────────────────────────────────────

    public function testNewTokenIs64CharHex(): void
    {
        $resident = $this->createMock(Resident::class);
        $resident->method('getValidatedAt')->willReturn(null);
        $resident->method('getFirstname')->willReturn('Marie');
        $resident->method('setTokenExpiration')->willReturn($resident);

        $capturedToken = null;
        $resident->method('setToken')
            ->willReturnCallback(function (?string $token) use (&$capturedToken, $resident): Resident {
                $capturedToken = $token;

                return $resident;
            });

        $this->residentRepo->method('findOneBy')->willReturn($resident);

        $this->buildController()->resendActivation(
            $this->makeRequest(['email' => 'marie@example.com']),
            $this->residentRepo,
            $this->managerRepo,
            $this->em,
            $this->limiterFactory,
        );

        $this->assertNotNull($capturedToken);
        $this->assertSame(64, strlen((string) $capturedToken));
        $this->assertTrue(ctype_xdigit((string) $capturedToken));
    }

    public function testExpirationIsApproximately48Hours(): void
    {
        $resident = $this->createMock(Resident::class);
        $resident->method('getValidatedAt')->willReturn(null);
        $resident->method('getFirstname')->willReturn('Marie');
        $resident->method('setToken')->willReturn($resident);

        $capturedExpiration = null;
        $resident->method('setTokenExpiration')
            ->willReturnCallback(function (?\DateTimeInterface $exp) use (&$capturedExpiration, $resident): Resident {
                $capturedExpiration = $exp;

                return $resident;
            });

        $this->residentRepo->method('findOneBy')->willReturn($resident);

        $this->buildController()->resendActivation(
            $this->makeRequest(['email' => 'marie@example.com']),
            $this->residentRepo,
            $this->managerRepo,
            $this->em,
            $this->limiterFactory,
        );

        $this->assertNotNull($capturedExpiration);

        $now   = new DateTime();
        $lower = (clone $now)->modify('+47 hours');
        $upper = (clone $now)->modify('+49 hours');

        $this->assertGreaterThan($lower->getTimestamp(), $capturedExpiration->getTimestamp());
        $this->assertLessThan($upper->getTimestamp(), $capturedExpiration->getTimestamp());
    }

    // ─── Activation link content ──────────────────────────────────────────────

    public function testResidentLinkContainsResidentActivationRoute(): void
    {
        $resident = $this->createMock(Resident::class);
        $resident->method('getValidatedAt')->willReturn(null);
        $resident->method('getFirstname')->willReturn('Jean');
        $resident->method('setToken')->willReturn($resident);
        $resident->method('setTokenExpiration')->willReturn($resident);

        $this->residentRepo->method('findOneBy')->willReturn($resident);

        $capturedLink = null;
        $this->mailer->method('sendEmail')
            ->willReturnCallback(function (string $to, string $subject, string $template, array $params) use (&$capturedLink): void {
                $capturedLink = $params['link'] ?? null;
            });

        $this->buildController()->resendActivation(
            $this->makeRequest(['email' => 'jean@example.com']),
            $this->residentRepo,
            $this->managerRepo,
            $this->em,
            $this->limiterFactory,
        );

        $this->assertStringContainsString('ResidentActivation/', (string) $capturedLink);
    }

    public function testManagerLinkPointsToFrontendSetupPage(): void
    {
        $manager = $this->createMock(Manager::class);
        $manager->method('getValidatedAt')->willReturn(null);
        $manager->method('getFirstname')->willReturn('Paul');
        $manager->method('setToken')->willReturn($manager);
        $manager->method('setTokenExpiration')->willReturn($manager);

        $this->residentRepo->method('findOneBy')->willReturn(null);
        $this->managerRepo->method('findOneBy')->willReturn($manager);

        $capturedLink = null;
        $this->mailer->method('sendEmail')
            ->willReturnCallback(function (string $to, string $subject, string $template, array $params) use (&$capturedLink): void {
                $capturedLink = $params['setupLink'] ?? $params['link'] ?? null;
            });

        $this->buildController()->resendActivation(
            $this->makeRequest(['email' => 'paul@example.com']),
            $this->residentRepo,
            $this->managerRepo,
            $this->em,
            $this->limiterFactory,
        );

        // Manager resend must point to the frontend setup page (password creation),
        // never to the direct-activation API endpoint.
        $this->assertStringContainsString('manager-setup/', (string) $capturedLink);
        $this->assertStringNotContainsString('ManagerActivation/', (string) $capturedLink);
    }

    public function testManagerLinkUsesFrontendUrl(): void
    {
        $manager = $this->createMock(Manager::class);
        $manager->method('getValidatedAt')->willReturn(null);
        $manager->method('getFirstname')->willReturn('Paul');
        $manager->method('setToken')->willReturn($manager);
        $manager->method('setTokenExpiration')->willReturn($manager);

        $this->residentRepo->method('findOneBy')->willReturn(null);
        $this->managerRepo->method('findOneBy')->willReturn($manager);

        $capturedLink = null;
        $this->mailer->method('sendEmail')
            ->willReturnCallback(function (string $to, string $subject, string $template, array $params) use (&$capturedLink): void {
                $capturedLink = $params['setupLink'] ?? $params['link'] ?? null;
            });

        $this->buildController()->resendActivation(
            $this->makeRequest(['email' => 'paul@example.com']),
            $this->residentRepo,
            $this->managerRepo,
            $this->em,
            $this->limiterFactory,
        );

        $this->assertStringStartsWith('https://www.medatwork.be', (string) $capturedLink);
    }

    public function testManagerEmailUsesSetupTemplate(): void
    {
        $manager = $this->createMock(Manager::class);
        $manager->method('getValidatedAt')->willReturn(null);
        $manager->method('getFirstname')->willReturn('Paul');
        $manager->method('setToken')->willReturn($manager);
        $manager->method('setTokenExpiration')->willReturn($manager);

        $this->residentRepo->method('findOneBy')->willReturn(null);
        $this->managerRepo->method('findOneBy')->willReturn($manager);

        $capturedTemplate = null;
        $this->mailer->method('sendEmail')
            ->willReturnCallback(function (string $to, string $subject, string $template, array $params) use (&$capturedTemplate): void {
                $capturedTemplate = $template;
            });

        $this->buildController()->resendActivation(
            $this->makeRequest(['email' => 'paul@example.com']),
            $this->residentRepo,
            $this->managerRepo,
            $this->em,
            $this->limiterFactory,
        );

        $this->assertStringContainsString('managerSetup', $capturedTemplate);
    }

    public function testResidentLinkStillUsesApiActivationRoute(): void
    {
        $resident = $this->createMock(Resident::class);
        $resident->method('getValidatedAt')->willReturn(null);
        $resident->method('getFirstname')->willReturn('Jean');
        $resident->method('setToken')->willReturn($resident);
        $resident->method('setTokenExpiration')->willReturn($resident);

        $this->residentRepo->method('findOneBy')->willReturn($resident);

        $capturedLink = null;
        $this->mailer->method('sendEmail')
            ->willReturnCallback(function (string $to, string $subject, string $template, array $params) use (&$capturedLink): void {
                $capturedLink = $params['link'] ?? null;
            });

        $this->buildController()->resendActivation(
            $this->makeRequest(['email' => 'jean@example.com']),
            $this->residentRepo,
            $this->managerRepo,
            $this->em,
            $this->limiterFactory,
        );

        $this->assertStringContainsString('ResidentActivation/', (string) $capturedLink);
        $this->assertStringNotContainsString('manager-setup/', (string) $capturedLink);
    }

    // ─── Mailer failure is non-fatal ──────────────────────────────────────────

    public function testMailerFailureDoesNotPreventFlushAndReturns200(): void
    {
        $resident = $this->createMock(Resident::class);
        $resident->method('getValidatedAt')->willReturn(null);
        $resident->method('getFirstname')->willReturn('Jean');
        $resident->method('setToken')->willReturn($resident);
        $resident->method('setTokenExpiration')->willReturn($resident);

        $this->residentRepo->method('findOneBy')->willReturn($resident);
        $this->em->expects($this->once())->method('flush');
        $this->mailer->method('sendEmail')->willThrowException(new \RuntimeException('SMTP failure'));

        $response = $this->buildController()->resendActivation(
            $this->makeRequest(['email' => 'jean@example.com']),
            $this->residentRepo,
            $this->managerRepo,
            $this->em,
            $this->limiterFactory,
        );

        $this->assertSame(200, $response->getStatusCode());
    }
}
