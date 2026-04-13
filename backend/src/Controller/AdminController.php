<?php

declare(strict_types=1);

namespace App\Controller;

use App\DTO\AdminCreateYearInputDTO;
use App\DTO\CreateHospitalInputDTO;
use Doctrine\DBAL\Exception\UniqueConstraintViolationException;
use App\DTO\InviteHospitalAdminInputDTO;
use App\Entity\Hospital;
use App\Entity\HospitalAdmin;
use App\Entity\HospitalRequest;
use App\Enum\HospitalAdminStatus;
use App\Entity\Years;
use App\Enum\HospitalRequestStatus;
use App\Enum\ManagerStatus;
use App\Repository\HospitalAdminRepository;
use App\Repository\HospitalRepository;
use App\Repository\HospitalRequestRepository;
use App\Repository\ManagerRepository;
use App\Repository\ResidentRepository;
use App\Repository\YearsRepository;
use App\Services\EmailReset\PasswordResetServiceInterface;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Super-admin endpoints. All routes require ROLE_SUPER_ADMIN (enforced in security.yaml).
 */
#[Route('/api/admin')]
class AdminController extends AbstractController
{
    public function __construct(
        private readonly MailerController $mailer,
        private readonly string $apiUrl,
        private readonly string $frontendUrl,
        private readonly PasswordResetServiceInterface $passwordResetService,
    ) {
    }

    // ── Hospitals ──────────────────────────────────────────────────────────────

    #[Route('/hospitals/{id}', name: 'admin_hospital_get', methods: ['GET'])]
    public function getHospital(int $id, HospitalRepository $hospitalRepository): JsonResponse
    {
        $h = $hospitalRepository->find($id);
        if ($h === null) {
            return new JsonResponse(['message' => 'Hospital not found'], Response::HTTP_NOT_FOUND);
        }

        return $this->json([
            'id'       => $h->getId(),
            'name'     => $h->getName(),
            'city'     => $h->getCity(),
            'country'  => $h->getCountry(),
            'isActive' => $h->isActive(),
        ]);
    }

    #[Route('/hospitals/{id}/admins', name: 'admin_hospital_admins_list_by_hospital', methods: ['GET'])]
    public function listHospitalAdminsByHospital(int $id, HospitalRepository $hospitalRepository, HospitalAdminRepository $repo, ManagerRepository $managerRepository): JsonResponse
    {
        $hospital = $hospitalRepository->find($id);
        if ($hospital === null) {
            return new JsonResponse(['message' => 'Hospital not found'], Response::HTTP_NOT_FOUND);
        }

        $result = [];

        // External invites (HospitalAdmin entity)
        foreach ($repo->findBy(['hospital' => $hospital]) as $a) {
            $result[] = [
                'id'        => $a->getId(),
                'email'     => $a->getEmail(),
                'firstname' => $a->getFirstname(),
                'lastname'  => $a->getLastname(),
                'status'    => $a->getStatus()->value,
                'createdAt' => $a->getCreatedAt()->format(\DateTimeInterface::ATOM),
                'type'      => 'invited',
            ];
        }

        // Promoted managers (Manager entity with adminHospital set)
        foreach ($managerRepository->findBy(['adminHospital' => $hospital]) as $m) {
            $result[] = [
                'id'        => $m->getId(),
                'email'     => $m->getEmail(),
                'firstname' => $m->getFirstname(),
                'lastname'  => $m->getLastname(),
                'status'    => 'active',
                'createdAt' => $m->getCreatedAt()?->format(\DateTimeInterface::ATOM) ?? '',
                'type'      => 'promoted',
            ];
        }

        return $this->json($result);
    }

    #[Route('/hospitals/{id}/admins/promoted/{managerId}', name: 'admin_hospital_admins_unpromote', methods: ['DELETE'])]
    public function unpromoteManager(int $id, int $managerId, HospitalRepository $hospitalRepository, ManagerRepository $managerRepository, EntityManagerInterface $em): JsonResponse
    {
        $hospital = $hospitalRepository->find($id);
        if ($hospital === null) {
            return new JsonResponse(['message' => 'Hospital not found'], Response::HTTP_NOT_FOUND);
        }

        $manager = $managerRepository->find($managerId);
        if ($manager === null || $manager->getAdminHospital()?->getId() !== $hospital->getId()) {
            return new JsonResponse(['message' => 'Manager not found or not admin of this hospital'], Response::HTTP_NOT_FOUND);
        }

        $manager->setAdminHospital(null);
        $em->flush();

        return new JsonResponse(null, Response::HTTP_NO_CONTENT);
    }

    #[Route('/hospitals', name: 'admin_hospitals_list', methods: ['GET'])]
    public function listHospitals(HospitalRepository $hospitalRepository): JsonResponse
    {
        $result = [];
        foreach ($hospitalRepository->findAll() as $h) {
            $result[] = [
                'id'       => $h->getId(),
                'name'     => $h->getName(),
                'city'     => $h->getCity(),
                'country'  => $h->getCountry(),
                'isActive' => $h->isActive(),
            ];
        }

        return $this->json($result);
    }

    #[Route('/hospitals', name: 'admin_hospitals_create', methods: ['POST'])]
    public function createHospital(Request $request, EntityManagerInterface $em): JsonResponse
    {
        try {
            $dto = CreateHospitalInputDTO::fromRequest($request);
        } catch (\InvalidArgumentException $e) {
            return new JsonResponse(['message' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
        }

        $hospital = (new Hospital())
            ->setName($dto->name)
            ->setCity($dto->city)
            ->setCountry($dto->country);

        $em->persist($hospital);

        try {
            $em->flush();
        } catch (UniqueConstraintViolationException) {
            return new JsonResponse(['message' => 'Un hôpital avec ce nom existe déjà'], Response::HTTP_CONFLICT);
        }

        return $this->json(['id' => $hospital->getId(), 'name' => $hospital->getName()], Response::HTTP_CREATED);
    }

    #[Route('/hospitals/{id}', name: 'admin_hospitals_update', methods: ['PUT'])]
    public function updateHospital(int $id, Request $request, HospitalRepository $hospitalRepository, EntityManagerInterface $em): JsonResponse
    {
        $hospital = $hospitalRepository->find($id);
        if ($hospital === null) {
            return new JsonResponse(['message' => 'Hospital not found'], Response::HTTP_NOT_FOUND);
        }

        try {
            $dto = CreateHospitalInputDTO::fromRequest($request);
        } catch (\InvalidArgumentException $e) {
            return new JsonResponse(['message' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
        }

        $hospital->setName($dto->name)->setCity($dto->city)->setCountry($dto->country);
        $em->flush();

        return $this->json(['id' => $hospital->getId(), 'name' => $hospital->getName()]);
    }

    #[Route('/hospitals/{id}/toggle', name: 'admin_hospitals_toggle', methods: ['PATCH'])]
    public function toggleHospital(int $id, HospitalRepository $hospitalRepository, EntityManagerInterface $em): JsonResponse
    {
        $hospital = $hospitalRepository->find($id);
        if ($hospital === null) {
            return new JsonResponse(['message' => 'Hospital not found'], Response::HTTP_NOT_FOUND);
        }

        $hospital->setIsActive(! $hospital->isActive());
        $em->flush();

        return $this->json(['isActive' => $hospital->isActive()]);
    }

    // ── Hospital Years ─────────────────────────────────────────────────────────

    #[Route('/hospitals/{id}/years', name: 'admin_hospital_years_list', methods: ['GET'])]
    public function listHospitalYears(int $id, HospitalRepository $hospitalRepository, YearsRepository $yearsRepository): JsonResponse
    {
        $hospital = $hospitalRepository->find($id);
        if ($hospital === null) {
            return new JsonResponse(['message' => 'Hospital not found'], Response::HTTP_NOT_FOUND);
        }

        $result = [];
        foreach ($yearsRepository->findBy(['hospital' => $hospital], ['dateOfStart' => 'DESC']) as $year) {
            $result[] = $this->serializeYear($year);
        }

        return $this->json($result);
    }

    #[Route('/hospitals/{id}/years', name: 'admin_hospital_years_create', methods: ['POST'])]
    public function createHospitalYear(int $id, Request $request, HospitalRepository $hospitalRepository, EntityManagerInterface $em): JsonResponse
    {
        $hospital = $hospitalRepository->find($id);
        if ($hospital === null) {
            return new JsonResponse(['message' => 'Hospital not found'], Response::HTTP_NOT_FOUND);
        }

        try {
            $dto = AdminCreateYearInputDTO::fromRequest($request);
        } catch (\InvalidArgumentException $e) {
            return new JsonResponse(['message' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
        }

        $year = (new Years())
            ->setTitle($dto->title)
            ->setLocation($dto->location)
            ->setPeriod($dto->period)
            ->setDateOfStart(new \DateTime($dto->dateOfStart))
            ->setDateOfEnd(new \DateTime($dto->dateOfEnd))
            ->setCreatedAt(new \DateTime())
            ->setToken(bin2hex(random_bytes(5)))
            ->setHospital($hospital);

        if ($dto->comment !== null) {
            $year->setComment($dto->comment);
        }

        if ($dto->speciality !== null) {
            $year->setSpeciality($dto->speciality);
        }

        $em->persist($year);
        $em->flush();

        return $this->json($this->serializeYear($year), Response::HTTP_CREATED);
    }

    #[Route('/years/{yearId}/hospital', name: 'admin_year_assign_hospital', methods: ['PATCH'])]
    public function assignYearToHospital(int $yearId, Request $request, YearsRepository $yearsRepository, HospitalRepository $hospitalRepository, EntityManagerInterface $em): JsonResponse
    {
        $year = $yearsRepository->find($yearId);
        if ($year === null) {
            return new JsonResponse(['message' => 'Year not found'], Response::HTTP_NOT_FOUND);
        }

        $data = json_decode($request->getContent(), true);
        if (! is_array($data) || ! isset($data['hospitalId'])) {
            return new JsonResponse(['message' => 'Missing required field: hospitalId'], Response::HTTP_BAD_REQUEST);
        }

        if (! is_int($data['hospitalId']) || $data['hospitalId'] <= 0) {
            return new JsonResponse(['message' => 'hospitalId must be a positive integer'], Response::HTTP_BAD_REQUEST);
        }

        $hospital = $hospitalRepository->find($data['hospitalId']);
        if ($hospital === null) {
            return new JsonResponse(['message' => 'Hospital not found'], Response::HTTP_NOT_FOUND);
        }

        $year->setHospital($hospital);
        $em->flush();

        return $this->json($this->serializeYear($year));
    }

    /** @return array<string, mixed> */
    private function serializeYear(Years $year): array
    {
        return [
            'id'            => $year->getId(),
            'title'         => $year->getTitle(),
            'period'        => $year->getPeriod(),
            'location'      => $year->getLocation(),
            'speciality'    => $year->getSpeciality(),
            'dateOfStart'   => $year->getDateOfStart()->format('Y-m-d'),
            'dateOfEnd'     => $year->getDateOfEnd()->format('Y-m-d'),
            'residentCount' => $year->getResidents()->count(),
            'hospital'      => $year->getHospital() !== null
                ? ['id' => $year->getHospital()->getId(), 'name' => $year->getHospital()->getName()]
                : null,
        ];
    }

    // ── Hospital Requests ──────────────────────────────────────────────────────

    #[Route('/hospital-requests', name: 'admin_hospital_requests_list', methods: ['GET'])]
    public function listRequests(HospitalRequestRepository $requestRepository): JsonResponse
    {
        $result = [];
        foreach ($requestRepository->findPending() as $req) {
            $result[] = [
                'id'           => $req->getId(),
                'hospitalName' => $req->getHospitalName(),
                'requestedBy'  => [
                    'id'        => $req->getRequestedBy()->getId(),
                    'firstname' => $req->getRequestedBy()->getFirstname(),
                    'lastname'  => $req->getRequestedBy()->getLastname(),
                    'email'     => $req->getRequestedBy()->getEmail(),
                ],
                'createdAt' => $req->getCreatedAt()->format(\DateTimeInterface::ATOM),
            ];
        }

        return $this->json($result);
    }

    #[Route('/hospital-requests/{id}/approve', name: 'admin_hospital_requests_approve', methods: ['POST'])]
    public function approveRequest(int $id, HospitalRequestRepository $requestRepository, HospitalRepository $hospitalRepository, EntityManagerInterface $em): JsonResponse
    {
        $req = $requestRepository->find($id);
        if ($req === null || $req->getStatus() !== HospitalRequestStatus::Pending) {
            return new JsonResponse(['message' => 'Request not found or already processed'], Response::HTTP_NOT_FOUND);
        }

        // Reuse existing hospital if name matches, otherwise create one
        $hospital = $hospitalRepository->findOneBy(['name' => $req->getHospitalName()]);
        if ($hospital === null) {
            $hospital = (new Hospital())->setName($req->getHospitalName());
            $em->persist($hospital);
        }

        $req->setStatus(HospitalRequestStatus::Approved)
            ->setReviewedAt(new \DateTime())
            ->setHospital($hospital);

        $manager = $req->getRequestedBy();
        $manager->addHospital($hospital);
        $manager->setStatus(\App\Enum\ManagerStatus::Active);

        $em->flush();

        try {
            $this->mailer->sendEmail(
                $manager->getEmail(),
                'Votre demande a été approuvée — Medatwork',
                'email/hospitalRequestApproved.html.twig',
                [
                    'firstname'    => $manager->getFirstname(),
                    'hospitalName' => $hospital->getName(),
                    'loginUrl'     => 'https://www.medatwork.be/login',
                ],
            );
        } catch (\Throwable) {
            // Email failure must not block the approval
        }

        return $this->json(['message' => 'approved', 'hospitalId' => $hospital->getId()]);
    }

    #[Route('/hospital-requests/{id}/reject', name: 'admin_hospital_requests_reject', methods: ['POST'])]
    public function rejectRequest(int $id, HospitalRequestRepository $requestRepository, EntityManagerInterface $em): JsonResponse
    {
        $req = $requestRepository->find($id);
        if ($req === null || $req->getStatus() !== HospitalRequestStatus::Pending) {
            return new JsonResponse(['message' => 'Request not found or already processed'], Response::HTTP_NOT_FOUND);
        }

        $req->setStatus(HospitalRequestStatus::Rejected)->setReviewedAt(new \DateTime());
        $em->flush();

        $manager = $req->getRequestedBy();
        try {
            $this->mailer->sendEmail(
                $manager->getEmail(),
                'Votre demande n\'a pas été retenue — Medatwork',
                'email/hospitalRequestRejected.html.twig',
                [
                    'firstname'    => $manager->getFirstname(),
                    'hospitalName' => $req->getHospitalName(),
                ],
            );
        } catch (\Throwable) {
            // Email failure must not block the rejection
        }

        return $this->json(['message' => 'rejected']);
    }

    // ── Hospital Admins ────────────────────────────────────────────────────────

    #[Route('/hospitals/{id}/admins/from-manager', name: 'admin_hospital_admins_promote_manager', methods: ['POST'])]
    public function promoteManagerToAdmin(int $id, Request $request, HospitalRepository $hospitalRepository, ManagerRepository $managerRepository, EntityManagerInterface $em): JsonResponse
    {
        $hospital = $hospitalRepository->find($id);
        if ($hospital === null) {
            return new JsonResponse(['message' => 'Hospital not found'], Response::HTTP_NOT_FOUND);
        }

        $data = json_decode($request->getContent(), true);
        if (!is_array($data) || !isset($data['managerId']) || !is_int($data['managerId'])) {
            return new JsonResponse(['message' => 'Missing required field: managerId'], Response::HTTP_BAD_REQUEST);
        }

        $manager = $managerRepository->find($data['managerId']);
        if ($manager === null) {
            return new JsonResponse(['message' => 'Manager not found'], Response::HTTP_NOT_FOUND);
        }

        if ($manager->getAdminHospital() !== null) {
            return new JsonResponse(['message' => 'Ce manager est déjà administrateur d\'un hôpital'], Response::HTTP_CONFLICT);
        }

        $manager->setAdminHospital($hospital);
        $em->flush();

        try {
            $this->mailer->sendEmail(
                $manager->getEmail(),
                'Félicitations — Administrateur hôpital MED@WORK',
                'email/hospitalAdminPromote.html.twig',
                ['hospitalName' => $hospital->getName()],
            );
        } catch (\Throwable) {
            // Email failure must not block the operation
        }

        return $this->json(['message' => 'ok'], Response::HTTP_CREATED);
    }

    #[Route('/hospitals/{id}/managers', name: 'admin_hospital_managers_list', methods: ['GET'])]
    public function listHospitalManagers(int $id, HospitalRepository $hospitalRepository): JsonResponse
    {
        $hospital = $hospitalRepository->find($id);
        if ($hospital === null) {
            return new JsonResponse(['message' => 'Hospital not found'], Response::HTTP_NOT_FOUND);
        }

        $result = [];
        foreach ($hospital->getManagers() as $m) {
            $result[] = [
                'id'        => $m->getId(),
                'email'     => $m->getEmail(),
                'firstname' => $m->getFirstname(),
                'lastname'  => $m->getLastname(),
                'status'    => $m->getStatus()->value,
            ];
        }

        return $this->json($result);
    }

    #[Route('/hospitals/{id}/managers', name: 'admin_hospital_managers_add', methods: ['POST'])]
    public function addManagerToHospital(int $id, Request $request, HospitalRepository $hospitalRepository, ManagerRepository $managerRepository, EntityManagerInterface $em): JsonResponse
    {
        $hospital = $hospitalRepository->find($id);
        if ($hospital === null) {
            return new JsonResponse(['message' => 'Hospital not found'], Response::HTTP_NOT_FOUND);
        }

        $data = json_decode($request->getContent(), true);
        if (!is_array($data) || !isset($data['managerId']) || !is_int($data['managerId'])) {
            return new JsonResponse(['message' => 'Missing required field: managerId'], Response::HTTP_BAD_REQUEST);
        }

        $manager = $managerRepository->find($data['managerId']);
        if ($manager === null) {
            return new JsonResponse(['message' => 'Manager not found'], Response::HTTP_NOT_FOUND);
        }

        $manager->addHospital($hospital);

        if ($manager->getStatus() === ManagerStatus::PendingHospital) {
            $manager->setStatus(ManagerStatus::Active);
        }

        $em->flush();

        return $this->json(['message' => 'ok']);
    }

    #[Route('/hospitals/{id}/managers/{managerId}', name: 'admin_hospital_managers_remove', methods: ['DELETE'])]
    public function removeManagerFromHospital(int $id, int $managerId, HospitalRepository $hospitalRepository, ManagerRepository $managerRepository, EntityManagerInterface $em): JsonResponse
    {
        $hospital = $hospitalRepository->find($id);
        if ($hospital === null) {
            return new JsonResponse(['message' => 'Hospital not found'], Response::HTTP_NOT_FOUND);
        }

        $manager = $managerRepository->find($managerId);
        if ($manager === null) {
            return new JsonResponse(['message' => 'Manager not found'], Response::HTTP_NOT_FOUND);
        }

        $manager->removeHospital($hospital);
        $em->flush();

        return new JsonResponse(null, Response::HTTP_NO_CONTENT);
    }

    #[Route('/hospitals/{id}/admins', name: 'admin_hospital_admins_invite', methods: ['POST'])]
    public function inviteHospitalAdmin(int $id, Request $request, HospitalRepository $hospitalRepository, HospitalAdminRepository $adminRepository, EntityManagerInterface $em): JsonResponse
    {
        $hospital = $hospitalRepository->find($id);
        if ($hospital === null) {
            return new JsonResponse(['message' => 'Hospital not found'], Response::HTTP_NOT_FOUND);
        }

        try {
            $dto = InviteHospitalAdminInputDTO::fromRequest($request);
        } catch (\InvalidArgumentException $e) {
            return new JsonResponse(['message' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
        }

        if ($adminRepository->findOneBy(['email' => $dto->email]) !== null) {
            // Generic response to prevent email enumeration
            return $this->json(['message' => 'ok']);
        }

        $token      = bin2hex(random_bytes(32));
        $expiration = (new \DateTime())->modify('+7 days');

        $admin = (new HospitalAdmin())
            ->setEmail($dto->email)
            ->setHospital($hospital)
            ->setToken($token)
            ->setTokenExpiration($expiration);

        $em->persist($admin);
        $em->flush();

        try {
            $this->mailer->sendEmail(
                $dto->email,
                'Invitation — Espace administrateur hôpital',
                'email/hospitalAdminInvite.html.twig',
                [
                    'hospitalName' => $hospital->getName(),
                    'setupLink'    => $this->frontendUrl . '/hospital-admin/setup/' . $token,
                ],
            );
        } catch (\Throwable) {
            // Email failure must not block the invite — token is already persisted
        }

        return $this->json(['message' => 'ok'], Response::HTTP_CREATED);
    }

    // ── Users overview ─────────────────────────────────────────────────────────

    #[Route('/users/managers', name: 'admin_users_managers', methods: ['GET'])]
    public function listManagers(ManagerRepository $managerRepository): JsonResponse
    {
        $managers = $managerRepository->findAll();
        usort($managers, fn ($a, $b) => strcasecmp($a->getLastname(), $b->getLastname()));

        $result = [];
        foreach ($managers as $m) {
            $hospitals = [];
            foreach ($m->getHospitals() as $h) {
                $hospitals[] = ['id' => $h->getId(), 'name' => $h->getName()];
            }
            $result[] = [
                'id'          => $m->getId(),
                'email'       => $m->getEmail(),
                'firstname'   => $m->getFirstname(),
                'lastname'    => $m->getLastname(),
                'status'      => $m->getStatus()->value,
                'validatedAt' => $m->getValidatedAt()?->format(\DateTimeInterface::ATOM),
                'hospitals'   => $hospitals,
            ];
        }

        return $this->json($result);
    }

    #[Route('/users/managers/{id}/activate', name: 'admin_users_managers_activate', methods: ['POST'])]
    public function activateManager(int $id, ManagerRepository $managerRepository, EntityManagerInterface $em): JsonResponse
    {
        $manager = $managerRepository->find($id);
        if ($manager === null) {
            return new JsonResponse(['message' => 'Manager introuvable'], Response::HTTP_NOT_FOUND);
        }

        $manager->setValidatedAt(new \DateTime());
        if ($manager->getStatus() !== ManagerStatus::Active) {
            $manager->setStatus(ManagerStatus::Active);
        }
        $em->flush();

        return $this->json(['message' => 'Compte activé manuellement']);
    }

    #[Route('/users/managers/{id}/status', name: 'admin_users_managers_toggle_status', methods: ['PATCH'])]
    public function toggleManagerStatus(int $id, ManagerRepository $managerRepository, EntityManagerInterface $em): JsonResponse
    {
        $manager = $managerRepository->find($id);
        if ($manager === null) {
            return new JsonResponse(['message' => 'Manager not found'], Response::HTTP_NOT_FOUND);
        }

        $currentStatus = $manager->getStatus();

        if ($currentStatus === ManagerStatus::PendingHospital) {
            return new JsonResponse(
                ['message' => 'Ce manager n\'a pas encore de rattachement hôpital'],
                Response::HTTP_BAD_REQUEST,
            );
        }

        $newStatus = $currentStatus === ManagerStatus::Active ? ManagerStatus::Inactive : ManagerStatus::Active;
        $manager->setStatus($newStatus);
        $em->flush();

        return $this->json(['status' => $newStatus->value]);
    }

    #[Route('/users/managers/{id}', name: 'admin_users_managers_delete', methods: ['DELETE'])]
    public function deleteManager(int $id, ManagerRepository $managerRepository, EntityManagerInterface $em): JsonResponse
    {
        $manager = $managerRepository->find($id);
        if ($manager === null) {
            return new JsonResponse(['message' => 'Manager not found'], Response::HTTP_NOT_FOUND);
        }

        $em->remove($manager);
        $em->flush();

        return new JsonResponse(null, Response::HTTP_NO_CONTENT);
    }

    #[Route('/users/managers/{id}/reset-password', name: 'admin_users_managers_reset_password', methods: ['POST'])]
    public function resetManagerPassword(int $id, ManagerRepository $managerRepository): JsonResponse
    {
        $manager = $managerRepository->find($id);
        if ($manager === null) {
            return new JsonResponse(['message' => 'Manager not found'], Response::HTTP_NOT_FOUND);
        }

        try {
            $this->passwordResetService->requestReset($manager->getEmail());
        } catch (\Throwable) {
            // Email failure must not block the reset initiation
        }

        return $this->json(['message' => 'ok']);
    }

    #[Route('/stats/managers', name: 'admin_stats_managers', methods: ['GET'])]
    public function getManagerStats(ManagerRepository $managerRepository): JsonResponse
    {
        $all     = $managerRepository->findAll();
        $total   = count($all);
        $active  = 0;
        $inactive     = 0;
        $pending      = 0;
        $notActivated = 0;

        foreach ($all as $m) {
            if ($m->getValidatedAt() === null) {
                $notActivated++;
            }
            match ($m->getStatus()) {
                ManagerStatus::Active          => $active++,
                ManagerStatus::Inactive        => $inactive++,
                ManagerStatus::PendingHospital => $pending++,
            };
        }

        return $this->json([
            'total'        => $total,
            'active'       => $active,
            'inactive'     => $inactive,
            'pending'      => $pending,
            'notActivated' => $notActivated,
        ]);
    }

    #[Route('/users/residents', name: 'admin_users_residents', methods: ['GET'])]
    public function listResidents(ResidentRepository $residentRepository): JsonResponse
    {
        $result = [];
        foreach ($residentRepository->findAll() as $r) {
            $result[] = [
                'id'          => $r->getId(),
                'email'       => $r->getEmail(),
                'firstname'   => $r->getFirstname(),
                'lastname'    => $r->getLastname(),
                'validatedAt' => $r->getValidatedAt()?->format(\DateTimeInterface::ATOM),
            ];
        }

        return $this->json($result);
    }

    #[Route('/users/residents/{id}/activate', name: 'admin_users_residents_activate', methods: ['POST'])]
    public function activateResident(int $id, ResidentRepository $residentRepository, EntityManagerInterface $em): JsonResponse
    {
        $resident = $residentRepository->find($id);
        if ($resident === null) {
            return new JsonResponse(['message' => 'Résident introuvable'], Response::HTTP_NOT_FOUND);
        }

        $resident->setValidatedAt(new \DateTime());
        $em->flush();

        return $this->json(['message' => 'Compte activé manuellement']);
    }

    #[Route('/users/residents/{id}/reset-password', name: 'admin_users_residents_reset_password', methods: ['POST'])]
    public function resetResidentPassword(int $id, ResidentRepository $residentRepository): JsonResponse
    {
        $resident = $residentRepository->find($id);
        if ($resident === null) {
            return new JsonResponse(['message' => 'Résident introuvable'], Response::HTTP_NOT_FOUND);
        }

        try {
            $this->passwordResetService->requestReset($resident->getEmail());
        } catch (\Throwable) {
            // Email failure must not block the reset initiation
        }

        return $this->json(['message' => 'ok']);
    }

    // ── Years (global list) ────────────────────────────────────────────────────

    #[Route('/years', name: 'admin_years_list', methods: ['GET'])]
    public function listAllYears(YearsRepository $yearsRepository): JsonResponse
    {
        $result = [];
        foreach ($yearsRepository->findAll() as $year) {
            $result[] = $this->serializeYear($year);
        }

        return $this->json($result);
    }

    // ── Hospital Admins ────────────────────────────────────────────────────────

    #[Route('/hospital-admins', name: 'admin_hospital_admins_list', methods: ['GET'])]
    public function listHospitalAdmins(HospitalAdminRepository $repo): JsonResponse
    {
        $result = [];
        foreach ($repo->findAll() as $a) {
            $result[] = [
                'id'        => $a->getId(),
                'email'     => $a->getEmail(),
                'firstname' => $a->getFirstname(),
                'lastname'  => $a->getLastname(),
                'status'    => $a->getStatus()->value,
                'hospital'  => ['id' => $a->getHospital()->getId(), 'name' => $a->getHospital()->getName()],
                'createdAt' => $a->getCreatedAt()->format(\DateTimeInterface::ATOM),
            ];
        }

        return $this->json($result);
    }

    #[Route('/hospital-admins/{id}', name: 'admin_hospital_admins_delete', methods: ['DELETE'])]
    public function deleteHospitalAdmin(int $id, HospitalAdminRepository $repo, EntityManagerInterface $em): JsonResponse
    {
        $admin = $repo->find($id);
        if ($admin === null) {
            return new JsonResponse(['message' => 'Hospital admin not found'], Response::HTTP_NOT_FOUND);
        }

        $em->remove($admin);
        $em->flush();

        return new JsonResponse(null, Response::HTTP_NO_CONTENT);
    }

    #[Route('/hospital-admins/{id}/reinvite', name: 'admin_hospital_admins_reinvite', methods: ['POST'])]
    public function reinviteHospitalAdmin(int $id, HospitalAdminRepository $repo, EntityManagerInterface $em): JsonResponse
    {
        $admin = $repo->find($id);
        if ($admin === null) {
            return new JsonResponse(['message' => 'Hospital admin not found'], Response::HTTP_NOT_FOUND);
        }

        $token      = bin2hex(random_bytes(32));
        $expiration = (new \DateTime())->modify('+7 days');

        $admin->setToken($token)->setTokenExpiration($expiration);
        $em->flush();

        $hospitalName = $admin->getHospital()->getName();
        $isPromoted   = $admin->getFirstname() !== null;

        try {
            if ($isPromoted) {
                $this->mailer->sendEmail(
                    $admin->getEmail(),
                    'Félicitations — Administrateur hôpital MED@WORK',
                    'email/hospitalAdminPromote.html.twig',
                    ['hospitalName' => $hospitalName],
                );
            } else {
                $this->mailer->sendEmail(
                    $admin->getEmail(),
                    'Invitation — Espace administrateur hôpital',
                    'email/hospitalAdminInvite.html.twig',
                    [
                        'hospitalName' => $hospitalName,
                        'setupLink'    => $this->frontendUrl . '/hospital-admin/setup/' . $token,
                    ],
                );
            }
        } catch (\Throwable) {
            // Email failure must not block the operation
        }

        return $this->json(['message' => 'ok']);
    }
}
