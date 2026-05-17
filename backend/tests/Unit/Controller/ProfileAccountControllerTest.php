<?php

declare(strict_types=1);

namespace App\Tests\Unit\Controller;

use App\Controller\ProfileAPI\ProfileAccountController;
use App\Entity\AppAdmin;
use App\Entity\Hospital;
use App\Entity\HospitalAdmin;
use App\Entity\Manager;
use App\Entity\Resident;
use App\Enum\ManagerJob;
use App\Enum\Sexe;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\Container;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;

/**
 * Tests for ProfileAccountController.
 *
 * Covers:
 * - GET returns correct role-specific fields (no sensitive data)
 * - PATCH refuses unknown / role-forbidden fields
 * - PATCH updates allowed fields and flushes
 * - PATCH password refuses wrong current password
 * - PATCH password refuses mismatched confirmation
 * - PATCH password hashes and persists new password
 * - 401 when unauthenticated
 */
final class ProfileAccountControllerTest extends TestCase
{
    private EntityManagerInterface&MockObject     $em;
    private UserPasswordHasherInterface&MockObject $hasher;

    protected function setUp(): void
    {
        $this->em     = $this->createMock(EntityManagerInterface::class);
        $this->hasher = $this->createMock(UserPasswordHasherInterface::class);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function buildController(?object $user): ProfileAccountController
    {
        $token = $this->createMock(TokenInterface::class);
        $token->method('getUser')->willReturn($user);

        $tokenStorage = $this->createMock(TokenStorageInterface::class);
        $tokenStorage->method('getToken')->willReturn($user !== null ? $token : null);

        $container = new Container();
        $container->set('security.token_storage', $tokenStorage);

        $ctrl = new ProfileAccountController($this->em, $this->hasher);
        $ctrl->setContainer($container);
        return $ctrl;
    }

    private function makeManager(): Manager&MockObject
    {
        $m = $this->createMock(Manager::class);
        $m->method('getFirstname')->willReturn('Alice');
        $m->method('getLastname')->willReturn('Dupont');
        $m->method('getEmail')->willReturn('alice@example.com');
        $m->method('getAvatarPath')->willReturn(null);
        $m->method('getSexe')->willReturn(Sexe::Female);
        $m->method('getJob')->willReturn(ManagerJob::Doctor); // enum, not string
        return $m;
    }

    private function makeResident(): Resident&MockObject
    {
        $r = $this->createMock(Resident::class);
        $r->method('getFirstname')->willReturn('Bob');
        $r->method('getLastname')->willReturn('Martin');
        $r->method('getEmail')->willReturn('bob@example.com');
        $r->method('getAvatarPath')->willReturn(null);
        $r->method('getSexe')->willReturn(Sexe::Male);
        $r->method('getSpeciality')->willReturn('Cardiologie');
        $r->method('getUniversity')->willReturn('UCLouvain');
        $r->method('getDateOfMaster')->willReturn(new \DateTimeImmutable('2022-06-15'));
        return $r;
    }

    private function makeHospitalAdmin(): HospitalAdmin&MockObject
    {
        $hospital = $this->createMock(Hospital::class);
        $hospital->method('getName')->willReturn('CHU Liège');

        $ha = $this->createMock(HospitalAdmin::class);
        $ha->method('getFirstname')->willReturn('Carol');
        $ha->method('getLastname')->willReturn('Lambert');
        $ha->method('getEmail')->willReturn('carol@example.com');
        $ha->method('getAvatarPath')->willReturn(null);
        $ha->method('getHospital')->willReturn($hospital);
        return $ha;
    }

    private function makeAppAdmin(): AppAdmin&MockObject
    {
        $a = $this->createMock(AppAdmin::class);
        $a->method('getFirstname')->willReturn('Dave');
        $a->method('getLastname')->willReturn('Admin');
        $a->method('getEmail')->willReturn('dave@example.com');
        return $a;
    }

    private function makeRequest(array $body = [], string $method = 'GET'): Request
    {
        $content = $body ? json_encode($body) : null;
        return new Request([], [], [], [], [], ['REQUEST_METHOD' => $method], $content);
    }

    private function decodeResponse(\Symfony\Component\HttpFoundation\JsonResponse $response): array
    {
        return json_decode($response->getContent(), true);
    }

    // ── GET — fields returned per role ────────────────────────────────────────

    public function testGetReturns401WhenUnauthenticated(): void
    {
        $ctrl = $this->buildController(null);
        $resp = $ctrl->getAccount($this->makeRequest());
        $this->assertSame(Response::HTTP_UNAUTHORIZED, $resp->getStatusCode());
    }

    public function testGetManagerReturnsExpectedFields(): void
    {
        $ctrl = $this->buildController($this->makeManager());
        $resp = $ctrl->getAccount($this->makeRequest());
        $data = $this->decodeResponse($resp);

        $this->assertSame(Response::HTTP_OK, $resp->getStatusCode());
        $this->assertSame('manager', $data['role']);
        $this->assertSame('Alice', $data['firstname']);
        $this->assertSame('Dupont', $data['lastname']);
        $this->assertSame('alice@example.com', $data['email']);
        $this->assertSame('female', $data['sexe']);
        $this->assertSame('doctor', $data['job']); // backing value of ManagerJob::Doctor
        $this->assertNull($data['avatarUrl']);
    }

    public function testGetResidentReturnsExpectedFields(): void
    {
        $ctrl = $this->buildController($this->makeResident());
        $resp = $ctrl->getAccount($this->makeRequest());
        $data = $this->decodeResponse($resp);

        $this->assertSame('resident', $data['role']);
        $this->assertSame('Bob', $data['firstname']);
        $this->assertSame('male', $data['sexe']);
        $this->assertSame('Cardiologie', $data['speciality']);
        $this->assertSame('UCLouvain', $data['university']);
        $this->assertSame('2022-06-15', $data['dateOfMaster']);
    }

    public function testGetHospitalAdminReturnsHospitalName(): void
    {
        $ctrl = $this->buildController($this->makeHospitalAdmin());
        $resp = $ctrl->getAccount($this->makeRequest());
        $data = $this->decodeResponse($resp);

        $this->assertSame('hospital_admin', $data['role']);
        $this->assertSame('CHU Liège', $data['hospitalName']);
        $this->assertArrayNotHasKey('sexe', $data);
        $this->assertArrayNotHasKey('job', $data);
    }

    public function testGetAppAdminReturnsBaseFieldsOnly(): void
    {
        $ctrl = $this->buildController($this->makeAppAdmin());
        $resp = $ctrl->getAccount($this->makeRequest());
        $data = $this->decodeResponse($resp);

        $this->assertSame('app_admin', $data['role']);
        $this->assertSame('Dave', $data['firstname']);
        $this->assertArrayNotHasKey('sexe', $data);
        $this->assertArrayNotHasKey('job', $data);
        $this->assertArrayNotHasKey('speciality', $data);
        $this->assertArrayNotHasKey('hospitalName', $data);
    }

    // ── GET — no sensitive data ───────────────────────────────────────────────

    public function testGetNeverReturnsSensitiveFields(): void
    {
        foreach ([$this->makeManager(), $this->makeResident(), $this->makeHospitalAdmin()] as $user) {
            $ctrl = $this->buildController($user);
            $resp = $ctrl->getAccount($this->makeRequest());
            $data = $this->decodeResponse($resp);

            $this->assertArrayNotHasKey('password',    $data, 'password must not be returned');
            $this->assertArrayNotHasKey('token',       $data, 'token must not be returned');
            $this->assertArrayNotHasKey('roles',       $data, 'roles must not be returned');
            $this->assertArrayNotHasKey('validatedAt', $data, 'validatedAt must not be returned');
            $this->assertArrayNotHasKey('status',      $data, 'status must not be returned');
            $this->assertArrayNotHasKey('adminHospital', $data);
        }
    }

    // ── PATCH account — field validation ─────────────────────────────────────

    public function testPatchReturns401WhenUnauthenticated(): void
    {
        $ctrl = $this->buildController(null);
        $resp = $ctrl->patchAccount($this->makeRequest(['firstname' => 'X']));
        $this->assertSame(Response::HTTP_UNAUTHORIZED, $resp->getStatusCode());
    }

    public function testPatchRefusesUnknownField(): void
    {
        $ctrl = $this->buildController($this->makeManager());
        $resp = $ctrl->patchAccount($this->makeRequest(['email' => 'hack@example.com']));
        $this->assertSame(Response::HTTP_BAD_REQUEST, $resp->getStatusCode());
        $this->assertStringContainsString('non autorisés', $this->decodeResponse($resp)['message']);
    }

    public function testPatchRefusesResidentFieldForManager(): void
    {
        $ctrl = $this->buildController($this->makeManager());
        $resp = $ctrl->patchAccount($this->makeRequest(['speciality' => 'Cardio']));
        $this->assertSame(Response::HTTP_BAD_REQUEST, $resp->getStatusCode());
    }

    public function testPatchRefusesManagerFieldForResident(): void
    {
        $ctrl = $this->buildController($this->makeResident());
        $resp = $ctrl->patchAccount($this->makeRequest(['job' => 'doctor']));
        $this->assertSame(Response::HTTP_BAD_REQUEST, $resp->getStatusCode());
    }

    public function testPatchUpdatesFirstnameAndLastname(): void
    {
        $manager = $this->makeManager();
        $manager->expects($this->once())->method('setFirstname')->with('Pierre');
        $manager->expects($this->once())->method('setLastname')->with('Dupont');
        $this->em->expects($this->once())->method('flush');

        $ctrl = $this->buildController($manager);
        $resp = $ctrl->patchAccount($this->makeRequest(['firstname' => 'Pierre', 'lastname' => 'Dupont']));
        $this->assertSame(Response::HTTP_OK, $resp->getStatusCode());
    }

    public function testPatchUpdatesManagerSpecificFields(): void
    {
        $manager = $this->makeManager();
        $manager->expects($this->once())->method('setSexe')->with(Sexe::Male);
        // controller converts DTO string → ManagerJob enum before calling setJob()
        $manager->expects($this->once())->method('setJob')->with(ManagerJob::HumanResources);
        $this->em->expects($this->once())->method('flush');

        $ctrl = $this->buildController($manager);
        $resp = $ctrl->patchAccount($this->makeRequest([
            'sexe' => 'male',
            'job'  => 'human resources',
        ]));
        $this->assertSame(Response::HTTP_OK, $resp->getStatusCode());
    }

    public function testPatchUpdatesResidentSpecificFields(): void
    {
        $resident = $this->makeResident();
        $resident->expects($this->once())->method('setSexe')->with(Sexe::Female);
        $resident->expects($this->once())->method('setSpeciality')->with('Neurologie');
        $resident->expects($this->once())->method('setUniversity')->with('ULB');
        $resident->expects($this->once())->method('setDateOfMaster');
        $this->em->expects($this->once())->method('flush');

        $ctrl = $this->buildController($resident);
        $resp = $ctrl->patchAccount($this->makeRequest([
            'sexe'         => 'female',
            'speciality'   => 'Neurologie',
            'university'   => 'ULB',
            'dateOfMaster' => '2023-09-01',
        ]));
        $this->assertSame(Response::HTTP_OK, $resp->getStatusCode());
    }

    public function testPatchClearsNullableResidentFields(): void
    {
        // setSpeciality(string) is non-nullable — sending null skips the setter call.
        // setUniversity(?string) and setDateOfMaster(?\DateTimeInterface) accept null.
        $resident = $this->makeResident();
        $resident->expects($this->never())->method('setSpeciality'); // null → skipped
        $resident->expects($this->once())->method('setUniversity')->with(null);
        $resident->expects($this->once())->method('setDateOfMaster')->with(null);
        $this->em->expects($this->once())->method('flush');

        $ctrl = $this->buildController($resident);
        $resp = $ctrl->patchAccount($this->makeRequest([
            'speciality'   => null,
            'university'   => null,
            'dateOfMaster' => null,
        ]));
        $this->assertSame(Response::HTTP_OK, $resp->getStatusCode());
    }

    public function testPatchReturnsUpdatedData(): void
    {
        $manager = $this->makeManager();
        $manager->method('setFirstname');
        $manager->method('getFirstname')->willReturn('Marie');

        $ctrl = $this->buildController($manager);
        $resp = $ctrl->patchAccount($this->makeRequest(['firstname' => 'Marie']));
        $data = $this->decodeResponse($resp);

        $this->assertArrayHasKey('firstname', $data);
        $this->assertSame(Response::HTTP_OK, $resp->getStatusCode());
    }

    // ── PATCH password ────────────────────────────────────────────────────────

    public function testPatchPasswordReturns401WhenUnauthenticated(): void
    {
        $ctrl = $this->buildController(null);
        $resp = $ctrl->patchPassword($this->makeRequest(
            ['currentPassword' => 'a', 'newPassword' => 'b', 'confirmPassword' => 'b']
        ));
        $this->assertSame(Response::HTTP_UNAUTHORIZED, $resp->getStatusCode());
    }

    public function testPatchPasswordRefusesWrongCurrentPassword(): void
    {
        $this->hasher->method('isPasswordValid')->willReturn(false);

        $ctrl = $this->buildController($this->makeManager());
        $resp = $ctrl->patchPassword($this->makeRequest([
            'currentPassword' => 'wrong',
            'newPassword'     => 'nouveau123',
            'confirmPassword' => 'nouveau123',
        ]));

        $this->assertSame(Response::HTTP_BAD_REQUEST, $resp->getStatusCode());
        $this->assertStringContainsString('actuel incorrect', $this->decodeResponse($resp)['message']);
    }

    public function testPatchPasswordRefusesMismatchedConfirmation(): void
    {
        $ctrl = $this->buildController($this->makeManager());
        $resp = $ctrl->patchPassword($this->makeRequest([
            'currentPassword' => 'ancien',
            'newPassword'     => 'nouveau123',
            'confirmPassword' => 'different',
        ]));

        $this->assertSame(Response::HTTP_BAD_REQUEST, $resp->getStatusCode());
        $this->assertStringContainsString('confirmation', $this->decodeResponse($resp)['message']);
    }

    public function testPatchPasswordRefusesTooShortNewPassword(): void
    {
        $ctrl = $this->buildController($this->makeManager());
        $resp = $ctrl->patchPassword($this->makeRequest([
            'currentPassword' => 'ancien',
            'newPassword'     => 'short',
            'confirmPassword' => 'short',
        ]));

        $this->assertSame(Response::HTTP_BAD_REQUEST, $resp->getStatusCode());
        $this->assertStringContainsString('minimum 8', $this->decodeResponse($resp)['message']);
    }

    public function testPatchPasswordHashesAndPersistsNewPassword(): void
    {
        $manager = $this->makeManager();
        $this->hasher->method('isPasswordValid')->willReturn(true);
        $this->hasher->method('hashPassword')->willReturn('$argon2i$hashed');
        $manager->expects($this->once())->method('setPassword')->with('$argon2i$hashed');
        $this->em->expects($this->once())->method('flush');

        $ctrl = $this->buildController($manager);
        $resp = $ctrl->patchPassword($this->makeRequest([
            'currentPassword' => 'ancien123',
            'newPassword'     => 'nouveau456',
            'confirmPassword' => 'nouveau456',
        ]));

        $this->assertSame(Response::HTTP_NO_CONTENT, $resp->getStatusCode());
    }

    public function testPatchPasswordDoesNotFlushOnValidationError(): void
    {
        $this->em->expects($this->never())->method('flush');

        $ctrl = $this->buildController($this->makeManager());
        $ctrl->patchPassword($this->makeRequest([
            'currentPassword' => 'ancien',
            'newPassword'     => 'short',
            'confirmPassword' => 'short',
        ]));
    }

    public function testPatchPasswordWorksForResident(): void
    {
        $resident = $this->makeResident();
        $this->hasher->method('isPasswordValid')->willReturn(true);
        $this->hasher->method('hashPassword')->willReturn('$argon2i$hashed_resident');
        $resident->expects($this->once())->method('setPassword');
        $this->em->expects($this->once())->method('flush');

        $ctrl = $this->buildController($resident);
        $resp = $ctrl->patchPassword($this->makeRequest([
            'currentPassword' => 'ancien123',
            'newPassword'     => 'nouveau456',
            'confirmPassword' => 'nouveau456',
        ]));

        $this->assertSame(Response::HTTP_NO_CONTENT, $resp->getStatusCode());
    }
}
