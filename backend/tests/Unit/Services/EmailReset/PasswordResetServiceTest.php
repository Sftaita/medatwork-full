<?php

declare(strict_types=1);

namespace App\Tests\Unit\Services\EmailReset;

use App\Controller\MailerController;
use App\Entity\Manager;
use App\Entity\Resident;
use App\Repository\ManagerRepository;
use App\Repository\ResidentRepository;
use App\Services\EmailReset\PasswordResetService;
use DateTime;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;

final class PasswordResetServiceTest extends TestCase
{
    private ResidentRepository $residentRepo;
    private ManagerRepository $managerRepo;
    private EntityManagerInterface $entityManager;
    private MailerController $mailer;

    protected function setUp(): void
    {
        $this->residentRepo  = $this->createMock(ResidentRepository::class);
        $this->managerRepo   = $this->createMock(ManagerRepository::class);
        $this->entityManager = $this->createMock(EntityManagerInterface::class);
        $this->mailer        = $this->createMock(MailerController::class);
    }

    private function buildService(string $frontendUrl = 'http://localhost:3000'): PasswordResetService
    {
        return new PasswordResetService(
            $this->residentRepo,
            $this->managerRepo,
            $this->entityManager,
            $this->mailer,
            $frontendUrl,
        );
    }

    public function testUnknownEmailDoesNothing(): void
    {
        $this->residentRepo
            ->method('findOneBy')
            ->willReturn(null);

        $this->managerRepo
            ->method('findOneBy')
            ->willReturn(null);

        $this->entityManager
            ->expects($this->never())
            ->method('flush');

        $this->mailer
            ->expects($this->never())
            ->method('sendEmail');

        $this->buildService()->requestReset('unknown@example.com');
    }

    public function testKnownResidentGetsTokenSet(): void
    {
        $resident = $this->createMock(Resident::class);

        $this->residentRepo
            ->method('findOneBy')
            ->willReturn($resident);

        $this->managerRepo
            ->expects($this->never())
            ->method('findOneBy');

        $resident
            ->expects($this->once())
            ->method('setToken')
            ->with($this->matchesRegularExpression('/^[0-9a-f]{64}$/'))
            ->willReturn($resident);

        $resident
            ->expects($this->once())
            ->method('setTokenExpiration')
            ->with($this->isInstanceOf(DateTime::class))
            ->willReturn($resident);

        $this->entityManager
            ->expects($this->once())
            ->method('flush');

        $this->mailer
            ->expects($this->once())
            ->method('sendEmail');

        $this->buildService()->requestReset('resident@example.com');
    }

    public function testKnownManagerGetsTokenSet(): void
    {
        $manager = $this->createMock(Manager::class);

        $this->residentRepo
            ->method('findOneBy')
            ->willReturn(null);

        $this->managerRepo
            ->method('findOneBy')
            ->willReturn($manager);

        $manager
            ->expects($this->once())
            ->method('setToken')
            ->with($this->matchesRegularExpression('/^[0-9a-f]{64}$/'))
            ->willReturn($manager);

        $manager
            ->expects($this->once())
            ->method('setTokenExpiration')
            ->with($this->isInstanceOf(DateTime::class))
            ->willReturn($manager);

        $this->entityManager
            ->expects($this->once())
            ->method('flush');

        $this->mailer
            ->expects($this->once())
            ->method('sendEmail');

        $this->buildService()->requestReset('manager@example.com');
    }

    public function testTokenIs64CharHex(): void
    {
        $resident = $this->createMock(Resident::class);

        $this->residentRepo
            ->method('findOneBy')
            ->willReturn($resident);

        $capturedToken = null;

        $resident
            ->method('setToken')
            ->willReturnCallback(function (?string $token) use (&$capturedToken, $resident): Resident {
                $capturedToken = $token;

                return $resident;
            });

        $resident
            ->method('setTokenExpiration')
            ->willReturn($resident);

        $this->buildService()->requestReset('resident@example.com');

        $this->assertNotNull($capturedToken);
        $this->assertSame(64, strlen((string) $capturedToken));
        $this->assertTrue(ctype_xdigit((string) $capturedToken));
    }

    public function testExpirationIsApproximately1Day(): void
    {
        $resident = $this->createMock(Resident::class);

        $this->residentRepo
            ->method('findOneBy')
            ->willReturn($resident);

        $capturedExpiration = null;

        $resident
            ->method('setToken')
            ->willReturn($resident);

        $resident
            ->method('setTokenExpiration')
            ->willReturnCallback(function (?\DateTimeInterface $exp) use (&$capturedExpiration, $resident): Resident {
                $capturedExpiration = $exp;

                return $resident;
            });

        $this->buildService()->requestReset('resident@example.com');

        $this->assertNotNull($capturedExpiration);

        $now      = new DateTime('now');
        $lowerBound = (clone $now)->modify('+23 hours');
        $upperBound = (clone $now)->modify('+25 hours');

        $this->assertGreaterThan(
            $lowerBound->getTimestamp(),
            $capturedExpiration->getTimestamp(),
            'Expiration should be more than 23 hours from now',
        );

        $this->assertLessThan(
            $upperBound->getTimestamp(),
            $capturedExpiration->getTimestamp(),
            'Expiration should be less than 25 hours from now',
        );
    }

    public function testFrontendUrlTrimsTrailingSlash(): void
    {
        $resident = $this->createMock(Resident::class);

        $this->residentRepo
            ->method('findOneBy')
            ->willReturn($resident);

        $resident->method('setToken')->willReturn($resident);
        $resident->method('setTokenExpiration')->willReturn($resident);

        $capturedParams = null;

        $this->mailer
            ->expects($this->once())
            ->method('sendEmail')
            ->willReturnCallback(
                function (string $to, string $subject, string $template, array $params) use (&$capturedParams): void {
                    $capturedParams = $params;
                },
            );

        $this->buildService('http://localhost:3000/')->requestReset('resident@example.com');

        $this->assertNotNull($capturedParams);
        $this->assertSame('http://localhost:3000/passwordUpdatePage/', $capturedParams['link']);
    }

    public function testEmailSubjectAndTemplate(): void
    {
        $resident = $this->createMock(Resident::class);

        $this->residentRepo
            ->method('findOneBy')
            ->willReturn($resident);

        $resident->method('setToken')->willReturn($resident);
        $resident->method('setTokenExpiration')->willReturn($resident);

        $capturedSubject  = null;
        $capturedTemplate = null;

        $this->mailer
            ->expects($this->once())
            ->method('sendEmail')
            ->willReturnCallback(
                function (string $to, string $subject, string $template, array $params) use (&$capturedSubject, &$capturedTemplate): void {
                    $capturedSubject  = $subject;
                    $capturedTemplate = $template;
                },
            );

        $this->buildService()->requestReset('resident@example.com');

        $this->assertSame('Réinitialisation de votre compte', $capturedSubject);
        $this->assertSame('email/resetTokenEmail.html.twig', $capturedTemplate);
    }
}
