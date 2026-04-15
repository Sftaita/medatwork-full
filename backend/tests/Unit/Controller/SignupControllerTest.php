<?php

declare(strict_types=1);

namespace App\Tests\Unit\Controller;

use App\Controller\MailerController;
use App\Controller\ManagersAPI\ManagersAPI\ManagersAPIController;
use App\Controller\ResidentsAPI\PublicAPI\PublicAPIController;
use App\Entity\HospitalRequest;
use App\Entity\Manager;
use App\Entity\Resident;
use App\Repository\HospitalRepository;
use App\Repository\ManagerRepository;
use App\Repository\ResidentRepository;
use App\Services\AvatarUploadHelper;
use DateTime;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\RateLimiter\RateLimit;
use Symfony\Component\RateLimiter\RateLimiterFactoryInterface;
use Symfony\Component\RateLimiter\LimiterInterface;
use Symfony\Component\Validator\ConstraintViolationList;
use Symfony\Component\Validator\Validator\ValidatorInterface;

/**
 * Tests for POST /api/create/newResident and POST /api/create/newManager.
 *
 * Covers:
 * - Existing email returns generic 200 (no enumeration)
 * - Token + tokenExpiration are set on the new entity
 * - Token expiration is ~48 h in the future
 * - Mailer failure does not prevent account creation
 */
final class SignupControllerTest extends TestCase
{
    private MailerController $mailer;
    private UserPasswordHasherInterface $hasher;
    private ValidatorInterface $validator;
    private EntityManagerInterface $em;
    private ResidentRepository $residentRepo;
    private ManagerRepository $managerRepo;
    private HospitalRepository $hospitalRepo;
    private RateLimiterFactoryInterface $limiterFactory;
    private AvatarUploadHelper $avatarHelper;

    protected function setUp(): void
    {
        $this->mailer        = $this->createMock(MailerController::class);
        $this->hasher        = $this->createMock(UserPasswordHasherInterface::class);
        $this->validator     = $this->createMock(ValidatorInterface::class);
        $this->em            = $this->createMock(EntityManagerInterface::class);
        $this->residentRepo  = $this->createMock(ResidentRepository::class);
        $this->managerRepo   = $this->createMock(ManagerRepository::class);
        $this->hospitalRepo  = $this->createMock(HospitalRepository::class);
        $this->avatarHelper  = $this->createMock(AvatarUploadHelper::class);

        // Hasher always returns a dummy hash
        $this->hasher->method('hashPassword')->willReturn('$hashed');

        // Validator returns no violations by default
        $this->validator->method('validate')->willReturn(new ConstraintViolationList());

        // Rate limiter always accepts
        $rateLimit = $this->createMock(RateLimit::class);
        $rateLimit->method('isAccepted')->willReturn(true);

        $limiter = $this->createMock(LimiterInterface::class);
        $limiter->method('consume')->willReturn($rateLimit);

        $this->limiterFactory = $this->createMock(RateLimiterFactoryInterface::class);
        $this->limiterFactory->method('create')->willReturn($limiter);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private function buildResidentController(): PublicAPIController
    {
        return new PublicAPIController(
            $this->mailer,
            $this->hasher,
            $this->validator,
            'https://api.medatwork.be/api/',
        );
    }

    private function buildManagerController(): ManagersAPIController
    {
        return new ManagersAPIController(
            $this->mailer,
            $this->hasher,
            $this->validator,
            'https://api.medatwork.be/api/',
        );
    }

    private function makeResidentRequest(array $overrides = []): Request
    {
        $body = array_merge([
            'email'        => 'maccs@example.com',
            'password'     => 'Secret123!',
            'firstname'    => 'Jean',
            'lastname'     => 'Dupont',
            'role'         => 'resident',
            'sexe'         => 'male',
            'speciality'   => 'vasc',
            'dateOfMaster' => '2024-09-01',
        ], $overrides);

        return new Request([], [], [], [], [], [], json_encode($body));
    }

    private function makeManagerRequest(array $overrides = []): Request
    {
        $body = array_merge([
            'email'     => 'manager@example.com',
            'password'  => 'Secret123!',
            'firstname' => 'Paul',
            'lastname'  => 'Martin',
            'sexe'      => 'male',
            'job'       => 'medical supervisor',
        ], $overrides);

        return new Request([], [], [], [], [], [], json_encode($body));
    }

    // ─── User enumeration prevention ─────────────────────────────────────────

    public function testResidentSignupWithExistingEmailReturns200(): void
    {
        $existing = $this->createMock(Resident::class);
        $this->residentRepo->method('findOneBy')->willReturn($existing);

        // No DB write, no email
        $this->em->expects($this->never())->method('persist');
        $this->mailer->expects($this->never())->method('sendEmail');

        $response = $this->buildResidentController()->createNewResident(
            $this->makeResidentRequest(),
            $this->em,
            $this->residentRepo,
            $this->managerRepo,
            $this->limiterFactory,
            $this->avatarHelper,
        );

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame(['message' => 'ok'], json_decode((string) $response->getContent(), true));
    }

    public function testManagerSignupWithExistingEmailReturns200(): void
    {
        $existing = $this->createMock(Manager::class);
        $this->managerRepo->method('findOneBy')->willReturn($existing);
        $this->residentRepo->method('findOneBy')->willReturn(null);

        $this->em->expects($this->never())->method('persist');
        $this->mailer->expects($this->never())->method('sendEmail');

        $response = $this->buildManagerController()->createNewManager(
            $this->makeManagerRequest(),
            $this->em,
            $this->residentRepo,
            $this->managerRepo,
            $this->hospitalRepo,
            $this->limiterFactory,
            $this->avatarHelper,
        );

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame(['message' => 'ok'], json_decode((string) $response->getContent(), true));
    }

    // ─── Token expiration is set ──────────────────────────────────────────────

    public function testNewResidentHasTokenExpirationSet(): void
    {
        $this->residentRepo->method('findOneBy')->willReturn(null);
        $this->managerRepo->method('findOneBy')->willReturn(null);

        $capturedExpiration = null;

        $this->em->method('persist')
            ->willReturnCallback(function (object $entity) use (&$capturedExpiration): void {
                if ($entity instanceof Resident) {
                    $capturedExpiration = $entity->getTokenExpiration();
                }
            });

        $this->buildResidentController()->createNewResident(
            $this->makeResidentRequest(),
            $this->em,
            $this->residentRepo,
            $this->managerRepo,
            $this->limiterFactory,
            $this->avatarHelper,
        );

        $this->assertNotNull($capturedExpiration, 'tokenExpiration must be set on new resident');

        $now   = new DateTime();
        $lower = (clone $now)->modify('+47 hours');
        $upper = (clone $now)->modify('+49 hours');

        $this->assertGreaterThan($lower->getTimestamp(), $capturedExpiration->getTimestamp());
        $this->assertLessThan($upper->getTimestamp(), $capturedExpiration->getTimestamp());
    }

    public function testNewManagerHasTokenExpirationSet(): void
    {
        $this->residentRepo->method('findOneBy')->willReturn(null);
        $this->managerRepo->method('findOneBy')->willReturn(null);

        $capturedExpiration = null;

        $this->em->method('persist')
            ->willReturnCallback(function (object $entity) use (&$capturedExpiration): void {
                if ($entity instanceof Manager) {
                    $capturedExpiration = $entity->getTokenExpiration();
                }
            });

        $this->buildManagerController()->createNewManager(
            $this->makeManagerRequest(),
            $this->em,
            $this->residentRepo,
            $this->managerRepo,
            $this->hospitalRepo,
            $this->limiterFactory,
            $this->avatarHelper,
        );

        $this->assertNotNull($capturedExpiration, 'tokenExpiration must be set on new manager');

        $now   = new DateTime();
        $lower = (clone $now)->modify('+47 hours');
        $upper = (clone $now)->modify('+49 hours');

        $this->assertGreaterThan($lower->getTimestamp(), $capturedExpiration->getTimestamp());
        $this->assertLessThan($upper->getTimestamp(), $capturedExpiration->getTimestamp());
    }

    // ─── Token format ─────────────────────────────────────────────────────────

    public function testNewResidentTokenIs64CharHex(): void
    {
        $this->residentRepo->method('findOneBy')->willReturn(null);
        $this->managerRepo->method('findOneBy')->willReturn(null);

        $capturedToken = null;
        $this->em->method('persist')
            ->willReturnCallback(function (object $entity) use (&$capturedToken): void {
                if ($entity instanceof Resident) {
                    $capturedToken = $entity->getToken();
                }
            });

        $this->buildResidentController()->createNewResident(
            $this->makeResidentRequest(),
            $this->em,
            $this->residentRepo,
            $this->managerRepo,
            $this->limiterFactory,
            $this->avatarHelper,
        );

        $this->assertNotNull($capturedToken);
        $this->assertSame(64, strlen((string) $capturedToken));
        $this->assertTrue(ctype_xdigit((string) $capturedToken));
    }

    public function testNewManagerTokenIs64CharHex(): void
    {
        $this->residentRepo->method('findOneBy')->willReturn(null);
        $this->managerRepo->method('findOneBy')->willReturn(null);

        $capturedToken = null;
        $this->em->method('persist')
            ->willReturnCallback(function (object $entity) use (&$capturedToken): void {
                if ($entity instanceof Manager) {
                    $capturedToken = $entity->getToken();
                }
            });

        $this->buildManagerController()->createNewManager(
            $this->makeManagerRequest(),
            $this->em,
            $this->residentRepo,
            $this->managerRepo,
            $this->hospitalRepo,
            $this->limiterFactory,
            $this->avatarHelper,
        );

        $this->assertNotNull($capturedToken);
        $this->assertSame(64, strlen((string) $capturedToken));
        $this->assertTrue(ctype_xdigit((string) $capturedToken));
    }

    // ─── hospitalName → HospitalRequest created ───────────────────────────────

    public function testManagerSignupWithHospitalNameCreatesPendingRequest(): void
    {
        $this->residentRepo->method('findOneBy')->willReturn(null);
        $this->managerRepo->method('findOneBy')->willReturn(null);

        $persisted = [];
        $this->em->method('persist')->willReturnCallback(function (object $obj) use (&$persisted): void {
            $persisted[] = $obj;
        });

        $this->buildManagerController()->createNewManager(
            $this->makeManagerRequest(['hospitalName' => 'Nouvelle Clinique']),
            $this->em,
            $this->residentRepo,
            $this->managerRepo,
            $this->hospitalRepo,
            $this->limiterFactory,
            $this->avatarHelper,
        );

        $requestEntities = array_filter($persisted, fn ($o) => $o instanceof HospitalRequest);
        $this->assertCount(1, $requestEntities, 'A HospitalRequest must be persisted when hospitalName is provided');

        $req = array_values($requestEntities)[0];
        $this->assertSame('Nouvelle Clinique', $req->getHospitalName());
    }

    public function testManagerSignupWithHospitalIdDoesNotCreateRequest(): void
    {
        $this->residentRepo->method('findOneBy')->willReturn(null);
        $this->managerRepo->method('findOneBy')->willReturn(null);

        $hospital = $this->createMock(\App\Entity\Hospital::class);
        $this->hospitalRepo->method('find')->willReturn($hospital);

        $persisted = [];
        $this->em->method('persist')->willReturnCallback(function (object $obj) use (&$persisted): void {
            $persisted[] = $obj;
        });

        $this->buildManagerController()->createNewManager(
            $this->makeManagerRequest(['hospitalId' => 1]),
            $this->em,
            $this->residentRepo,
            $this->managerRepo,
            $this->hospitalRepo,
            $this->limiterFactory,
            $this->avatarHelper,
        );

        $requestEntities = array_filter($persisted, fn ($o) => $o instanceof HospitalRequest);
        $this->assertCount(0, $requestEntities, 'No HospitalRequest must be created when hospitalId is used');
    }

    // ─── Mailer failure is non-fatal ──────────────────────────────────────────

    public function testResidentSignupReturns200EvenIfMailerFails(): void
    {
        $this->residentRepo->method('findOneBy')->willReturn(null);
        $this->managerRepo->method('findOneBy')->willReturn(null);

        $this->mailer->method('sendEmail')->willThrowException(new \RuntimeException('SMTP failure'));

        $response = $this->buildResidentController()->createNewResident(
            $this->makeResidentRequest(),
            $this->em,
            $this->residentRepo,
            $this->managerRepo,
            $this->limiterFactory,
            $this->avatarHelper,
        );

        $this->assertSame(200, $response->getStatusCode());
    }

    public function testManagerSignupReturns200EvenIfMailerFails(): void
    {
        $this->residentRepo->method('findOneBy')->willReturn(null);
        $this->managerRepo->method('findOneBy')->willReturn(null);

        $this->mailer->method('sendEmail')->willThrowException(new \RuntimeException('SMTP failure'));

        $response = $this->buildManagerController()->createNewManager(
            $this->makeManagerRequest(),
            $this->em,
            $this->residentRepo,
            $this->managerRepo,
            $this->hospitalRepo,
            $this->limiterFactory,
            $this->avatarHelper,
        );

        $this->assertSame(200, $response->getStatusCode());
    }
}
