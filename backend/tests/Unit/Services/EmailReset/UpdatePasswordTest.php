<?php

declare(strict_types=1);

namespace App\Tests\Unit\Services\EmailReset;

use App\Entity\Manager;
use App\Entity\Resident;
use App\Repository\ManagerRepository;
use App\Repository\ResidentRepository;
use App\Services\EmailReset\UpdatePassword;
use DateTime;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

final class UpdatePasswordTest extends TestCase
{
    private UserPasswordHasherInterface $encoder;
    private EntityManagerInterface $entityManager;
    private ResidentRepository $residentRepo;
    private ManagerRepository $managerRepo;

    protected function setUp(): void
    {
        $this->encoder       = $this->createMock(UserPasswordHasherInterface::class);
        $this->entityManager = $this->createMock(EntityManagerInterface::class);
        $this->residentRepo  = $this->createMock(ResidentRepository::class);
        $this->managerRepo   = $this->createMock(ManagerRepository::class);
    }

    private function buildService(): UpdatePassword
    {
        return new UpdatePassword(
            $this->encoder,
            $this->entityManager,
            $this->residentRepo,
            $this->managerRepo,
        );
    }

    // -----------------------------------------------------------------------
    // fromToken — RESULT_INVALID
    // -----------------------------------------------------------------------

    public function testReturnsInvalidWhenTokenNotFound(): void
    {
        $this->residentRepo
            ->method('findOneBy')
            ->willReturn(null);

        $this->managerRepo
            ->method('findOneBy')
            ->willReturn(null);

        $result = $this->buildService()->fromToken('no-such-token', 'newPass');

        $this->assertSame(UpdatePassword::RESULT_INVALID, $result);
    }

    public function testReturnsInvalidWhenOnlyManagerNotFound(): void
    {
        $this->residentRepo
            ->method('findOneBy')
            ->willReturn(null);

        $this->managerRepo
            ->method('findOneBy')
            ->willReturn(null);

        $result = $this->buildService()->fromToken('ghost-token', 'newPass');

        $this->assertSame(UpdatePassword::RESULT_INVALID, $result);
    }

    // -----------------------------------------------------------------------
    // fromToken — RESULT_EXPIRED
    // -----------------------------------------------------------------------

    public function testReturnsExpiredWhenTokenExpired(): void
    {
        $resident = $this->createMock(Resident::class);
        $pastDate = new DateTime('-1 hour');

        $this->residentRepo
            ->method('findOneBy')
            ->willReturn($resident);

        $resident
            ->method('getTokenExpiration')
            ->willReturn($pastDate);

        $result = $this->buildService()->fromToken('expired-token', 'newPass');

        $this->assertSame(UpdatePassword::RESULT_EXPIRED, $result);
    }

    // -----------------------------------------------------------------------
    // fromToken — RESULT_OK
    // -----------------------------------------------------------------------

    public function testReturnsOkWhenValidToken(): void
    {
        $resident   = $this->createMock(Resident::class);
        $futureDate = new DateTime('+1 day');

        $this->residentRepo
            ->method('findOneBy')
            ->willReturn($resident);

        $resident->method('getTokenExpiration')->willReturn($futureDate);
        $resident->method('setPassword')->willReturn($resident);
        $resident->method('setToken')->willReturn($resident);
        $resident->method('setTokenExpiration')->willReturn($resident);

        $this->encoder->method('hashPassword')->willReturn('hashed-password');

        $result = $this->buildService()->fromToken('valid-token', 'newPass');

        $this->assertSame(UpdatePassword::RESULT_OK, $result);
    }

    // -----------------------------------------------------------------------
    // updatePassword — side-effects
    // -----------------------------------------------------------------------

    public function testPasswordIsHashedOnSuccess(): void
    {
        $resident   = $this->createMock(Resident::class);
        $futureDate = new DateTime('+1 day');

        $this->residentRepo
            ->method('findOneBy')
            ->willReturn($resident);

        $resident->method('getTokenExpiration')->willReturn($futureDate);
        $resident->method('setPassword')->willReturn($resident);
        $resident->method('setToken')->willReturn($resident);
        $resident->method('setTokenExpiration')->willReturn($resident);

        $this->encoder
            ->expects($this->once())
            ->method('hashPassword')
            ->with($resident, 'newPass123')
            ->willReturn('hashed-value');

        $this->buildService()->fromToken('valid-token', 'newPass123');
    }

    public function testTokenIsClearedOnSuccess(): void
    {
        $resident   = $this->createMock(Resident::class);
        $futureDate = new DateTime('+1 day');

        $this->residentRepo
            ->method('findOneBy')
            ->willReturn($resident);

        $resident->method('getTokenExpiration')->willReturn($futureDate);
        $this->encoder->method('hashPassword')->willReturn('hashed');

        $resident->method('setPassword')->willReturn($resident);

        $resident
            ->expects($this->once())
            ->method('setToken')
            ->with(null)
            ->willReturn($resident);

        $resident
            ->expects($this->once())
            ->method('setTokenExpiration')
            ->with(null)
            ->willReturn($resident);

        $this->buildService()->fromToken('valid-token', 'newPass');
    }

    public function testFlushCalledOnSuccess(): void
    {
        $resident   = $this->createMock(Resident::class);
        $futureDate = new DateTime('+1 day');

        $this->residentRepo
            ->method('findOneBy')
            ->willReturn($resident);

        $resident->method('getTokenExpiration')->willReturn($futureDate);
        $this->encoder->method('hashPassword')->willReturn('hashed');
        $resident->method('setPassword')->willReturn($resident);
        $resident->method('setToken')->willReturn($resident);
        $resident->method('setTokenExpiration')->willReturn($resident);

        $this->entityManager
            ->expects($this->once())
            ->method('flush');

        $this->buildService()->fromToken('valid-token', 'newPass');
    }

    // -----------------------------------------------------------------------
    // Repository resolution order
    // -----------------------------------------------------------------------

    public function testResidentFoundBeforeManager(): void
    {
        $resident   = $this->createMock(Resident::class);
        $futureDate = new DateTime('+1 day');

        $this->residentRepo
            ->expects($this->once())
            ->method('findOneBy')
            ->with(['token' => 'shared-token'])
            ->willReturn($resident);

        // Manager repo must NOT be queried when the resident is found.
        $this->managerRepo
            ->expects($this->never())
            ->method('findOneBy');

        $resident->method('getTokenExpiration')->willReturn($futureDate);
        $this->encoder->method('hashPassword')->willReturn('hashed');
        $resident->method('setPassword')->willReturn($resident);
        $resident->method('setToken')->willReturn($resident);
        $resident->method('setTokenExpiration')->willReturn($resident);

        $result = $this->buildService()->fromToken('shared-token', 'newPass');

        $this->assertSame(UpdatePassword::RESULT_OK, $result);
    }

    public function testManagerUsedWhenResidentNotFound(): void
    {
        $manager    = $this->createMock(Manager::class);
        $futureDate = new DateTime('+1 day');

        $this->residentRepo
            ->expects($this->once())
            ->method('findOneBy')
            ->with(['token' => 'manager-token'])
            ->willReturn(null);

        $this->managerRepo
            ->expects($this->once())
            ->method('findOneBy')
            ->with(['token' => 'manager-token'])
            ->willReturn($manager);

        $manager->method('getTokenExpiration')->willReturn($futureDate);
        $this->encoder->method('hashPassword')->willReturn('hashed');
        $manager->method('setPassword')->willReturn($manager);
        $manager->method('setToken')->willReturn($manager);
        $manager->method('setTokenExpiration')->willReturn($manager);

        $result = $this->buildService()->fromToken('manager-token', 'newPass');

        $this->assertSame(UpdatePassword::RESULT_OK, $result);
    }
}
