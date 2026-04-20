<?php

declare(strict_types=1);

namespace App\Controller;

use App\DTO\HospitalAdminSetupInputDTO;
use App\Entity\Hospital;
use App\Entity\HospitalAdmin;
use App\Entity\HospitalAdminAuditLog;
use App\Entity\Manager;
use App\Entity\ManagerYears;
use App\Entity\Resident;
use App\Entity\Years;
use App\Entity\YearsResident;
use App\Enum\HospitalAdminStatus;
use App\Enum\Sexe;
use App\Enum\YearStatus;
use App\Repository\HospitalAdminAuditLogRepository;
use App\Repository\HospitalAdminRepository;
use App\Repository\ManagerRepository;
use App\Repository\ManagerYearsRepository;
use App\Repository\ResidentRepository;
use App\Repository\YearsRepository;
use App\Repository\YearsResidentRepository;
use App\Services\EmailReset\PasswordResetServiceInterface;
use App\Services\HospitalAdminAuditService;
use App\Services\YearForceDeleteService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\RateLimiter\RateLimiterFactory;

/**
 * Public endpoints for HospitalAdmin account activation.
 * These routes are PUBLIC (no JWT required) — see security.yaml.
 */
#[Route('/api/hospital-admin')]
class HospitalAdminController extends AbstractController
{
    public function __construct(
        private readonly MailerController $mailer,
        private readonly PasswordResetServiceInterface $passwordResetService,
        private readonly string $frontendUrl,
        private readonly string $apiUrl,
        private readonly string $uploadsBaseUrl,
        private readonly HospitalAdminAuditService $auditService,
    ) {
    }

    // ── Public setup routes ───────────────────────────────────────────────────

    /**
     * Validate the invite token and return context (email + hospital name).
     * Used by the frontend to pre-fill the activation form.
     */
    #[Route('/setup/{token}', name: 'hospital_admin_setup_check', methods: ['GET'])]
    public function checkSetupToken(string $token, HospitalAdminRepository $repo): JsonResponse
    {
        $admin = $repo->findOneBy(['token' => $token]);

        if ($admin === null) {
            return new JsonResponse(['message' => 'Invalid or expired token'], Response::HTTP_NOT_FOUND);
        }

        if ($admin->getStatus() !== HospitalAdminStatus::Invited) {
            return new JsonResponse(['message' => 'Account already activated'], Response::HTTP_GONE);
        }

        if ($admin->getTokenExpiration() < new \DateTime()) {
            return new JsonResponse(['message' => 'Token has expired'], Response::HTTP_GONE);
        }

        return $this->json([
            'email'        => $admin->getEmail(),
            'hospitalName' => $admin->getHospital()->getName(),
        ]);
    }

    /**
     * Activate the account: set password + name, mark as active.
     */
    #[Route('/setup/{token}', name: 'hospital_admin_setup_activate', methods: ['POST'])]
    public function activateAccount(
        string $token,
        Request $request,
        HospitalAdminRepository $repo,
        EntityManagerInterface $em,
        UserPasswordHasherInterface $passwordHasher,
    ): JsonResponse {
        $admin = $repo->findOneBy(['token' => $token]);

        if ($admin === null) {
            return new JsonResponse(['message' => 'Invalid or expired token'], Response::HTTP_NOT_FOUND);
        }

        if ($admin->getStatus() !== HospitalAdminStatus::Invited) {
            return new JsonResponse(['message' => 'Account already activated'], Response::HTTP_GONE);
        }

        if ($admin->getTokenExpiration() < new \DateTime()) {
            return new JsonResponse(['message' => 'Token has expired'], Response::HTTP_GONE);
        }

        try {
            $dto = HospitalAdminSetupInputDTO::fromRequest($request);
        } catch (\InvalidArgumentException $e) {
            return new JsonResponse(['message' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
        }

        $admin
            ->setPassword($passwordHasher->hashPassword($admin, $dto->password))
            ->setFirstname($dto->firstname)
            ->setLastname($dto->lastname)
            ->setStatus(HospitalAdminStatus::Active)
            ->setToken(null)
            ->setTokenExpiration(null)
            ->setValidatedAt(new \DateTime());

        $em->flush();

        return $this->json(['message' => 'Account activated'], Response::HTTP_OK);
    }

    /**
     * Refuse a promotion invitation: deletes the HospitalAdmin record and shows a confirmation page.
     * Public endpoint — no auth required.
     */
    #[Route('/refuse/{token}', name: 'hospital_admin_refuse_invite', methods: ['GET'])]
    public function refuseInvitation(string $token, HospitalAdminRepository $repo, EntityManagerInterface $em): Response
    {
        $admin = $repo->findOneBy(['token' => $token]);

        if ($admin === null || $admin->getStatus() !== HospitalAdminStatus::Invited) {
            return new Response(
                $this->renderConfirmationPage('Lien invalide', 'Ce lien est invalide ou a déjà été utilisé.'),
                Response::HTTP_GONE,
                ['Content-Type' => 'text/html'],
            );
        }

        $em->remove($admin);
        $em->flush();

        return new Response(
            $this->renderConfirmationPage('Invitation refusée', 'Vous avez refusé l\'invitation. Votre accès administrateur a été annulé.'),
            Response::HTTP_OK,
            ['Content-Type' => 'text/html'],
        );
    }

    private function renderConfirmationPage(string $title, string $message): string
    {
        return <<<HTML
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>{$title} — MED@WORK</title>
            <style>
                body { font-family: sans-serif; display: flex; align-items: center; justify-content: center;
                       min-height: 100vh; margin: 0; background: #f5f5f5; color: #333; }
                .card { background: #fff; border-radius: 12px; padding: 40px 48px; text-align: center;
                        box-shadow: 0 2px 12px rgba(0,0,0,.1); max-width: 420px; }
                h1 { color: #a439b6; font-size: 1.4rem; margin-bottom: 12px; }
                p { font-size: 1rem; line-height: 1.6; }
                a { color: #a439b6; }
            </style>
        </head>
        <body>
            <div class="card">
                <h1>{$title}</h1>
                <p>{$message}</p>
                <p style="margin-top:24px;font-size:.9rem;">
                    <a href="https://www.medatwork.be">Retour au site</a>
                </p>
            </div>
        </body>
        </html>
        HTML;
    }

    // ── Authenticated hospital-admin endpoints (ROLE_HOSPITAL_ADMIN) ──────────

    /**
     * List years for the authenticated hospital admin's hospital.
     */
    #[Route('/years', name: 'hospital_admin_years_list', methods: ['GET'])]
    public function listYears(YearsRepository $yearsRepository): JsonResponse
    {
        $hospital = $this->resolveHospital();

        $result = [];
        foreach ($yearsRepository->findBy(['hospital' => $hospital], ['dateOfStart' => 'DESC']) as $year) {
            $result[] = $this->serializeYear($year);
        }

        return $this->json($result);
    }

    /**
     * List residents enrolled in a given year (must belong to this admin's hospital).
     */
    #[Route('/years/{id}/residents', name: 'hospital_admin_year_residents', methods: ['GET'])]
    public function listYearResidents(int $id, YearsRepository $yearsRepository): JsonResponse
    {
        $year = $yearsRepository->find($id);

        if ($year === null) {
            return new JsonResponse(['message' => 'Year not found'], Response::HTTP_NOT_FOUND);
        }

        $hospital = $this->resolveHospital();
        if ($year->getHospital()?->getId() !== $hospital->getId()) {
            return new JsonResponse(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
        }

        $result = [];
        foreach ($year->getResidents() as $yr) {
            $resident = $yr->getResident();
            if ($resident === null) {
                continue;
            }
            $result[] = [
                'id'        => $resident->getId(),
                'firstname' => $resident->getFirstname(),
                'lastname'  => $resident->getLastname(),
                'email'     => $resident->getEmail(),
            ];
        }

        return $this->json($result);
    }

    // ── MACCS management endpoints ────────────────────────────────────────────

    /**
     * List all MACCS for the hospital, filtered by mode (current or history).
     * GET /api/hospital-admin/residents?mode=current|history
     */
    #[Route('/residents', name: 'hospital_admin_residents_list', methods: ['GET'])]
    public function listResidents(Request $request, YearsRepository $yearsRepository): JsonResponse
    {
        $hospital = $this->resolveHospital();
        $mode     = $request->query->get('mode', 'current');
        $today    = new \DateTime();

        $result = [];
        foreach ($yearsRepository->findBy(['hospital' => $hospital]) as $year) {
            $isCurrent = $year->getDateOfEnd() >= $today;
            if ($mode === 'history' && $isCurrent) {
                continue;
            }
            if ($mode !== 'history' && !$isCurrent) {
                continue;
            }

            foreach ($year->getResidents() as $yr) {
                $resident = $yr->getResident();
                if ($resident === null) {
                    continue;
                }
                $result[] = $this->serializeYearsResident($yr, $year, $resident);
            }
        }

        // Sort by status priority: active first, then pending, not_registered, retired last
        $priority = ['active' => 0, 'pending' => 1, 'not_registered' => 2, 'retired' => 3];
        usort($result, fn($a, $b) => ($priority[$a['status']] ?? 99) <=> ($priority[$b['status']] ?? 99));

        return $this->json($result);
    }

    /**
     * Add a MACCS to a year.
     * POST /api/hospital-admin/residents
     * Body: {firstname, lastname, email, optingOut, yearId}
     */
    #[Route('/residents', name: 'hospital_admin_residents_add', methods: ['POST'])]
    public function addResident(
        Request $request,
        YearsRepository $yearsRepository,
        ResidentRepository $residentRepository,
        YearsResidentRepository $yearsResidentRepository,
        EntityManagerInterface $em,
        UserPasswordHasherInterface $passwordHasher,
    ): JsonResponse {
        $hospital = $this->resolveHospital();
        $data     = json_decode($request->getContent(), true);

        if (!is_array($data)) {
            return new JsonResponse(['message' => 'Invalid JSON'], Response::HTTP_BAD_REQUEST);
        }

        $email     = trim((string) ($data['email'] ?? ''));
        $firstname = trim((string) ($data['firstname'] ?? ''));
        $lastname  = trim((string) ($data['lastname'] ?? ''));
        $yearId    = isset($data['yearId']) && is_numeric($data['yearId']) ? (int) $data['yearId'] : 0;
        $optingOut = (bool) ($data['optingOut'] ?? false);


        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return new JsonResponse(['message' => 'Email invalide'], Response::HTTP_BAD_REQUEST);
        }
        if ($firstname === '' || $lastname === '') {
            return new JsonResponse(['message' => 'Nom et prénom obligatoires'], Response::HTTP_BAD_REQUEST);
        }
        if ($yearId <= 0) {
            return new JsonResponse(['message' => 'yearId obligatoire'], Response::HTTP_BAD_REQUEST);
        }

        $year = $yearsRepository->find($yearId);
        if ($year === null || $year->getHospital()?->getId() !== $hospital->getId()) {
            return new JsonResponse(['message' => 'Année introuvable pour cet hôpital'], Response::HTTP_NOT_FOUND);
        }
        if ($year->getStatus() === YearStatus::Closed || $year->getStatus() === YearStatus::Archived) {
            return new JsonResponse(['message' => 'Cette année est fermée et n\'accepte plus de nouveaux résidents'], Response::HTTP_CONFLICT);
        }

        $resident  = $residentRepository->findOneBy(['email' => $email]);
        $isNew     = $resident === null;

        // Check duplicate only for existing residents (new ones can't have a link yet)
        if (!$isNew && $yearsResidentRepository->checkLink($resident, $year)) {
            return new JsonResponse(['message' => 'Ce MACCS est déjà rattaché à cette année'], Response::HTTP_CONFLICT);
        }

        if ($isNew) {
            $resident = (new Resident())
                ->setEmail($email)
                ->setFirstname($firstname)
                ->setLastname($lastname)
                ->setRole('resident')
                ->setRoles(['ROLE_RESIDENT'])
                ->setSexe(Sexe::Male)
                ->setDateOfMaster(new \DateTime('1900-01-01'))
                ->setPassword($passwordHasher->hashPassword(new Resident(), bin2hex(random_bytes(16))))
                ->setCreatedAt(new \DateTime());
            $em->persist($resident);
        }

        $yr = (new YearsResident())
            ->setYear($year)
            ->setResident($resident)
            ->setAllowed(true)
            ->setOptingOut($optingOut)
            ->setCreatedAt(new \DateTime());

        $em->persist($yr);
        $em->flush();

        // Send email
        try {
            if ($isNew) {
                $this->sendMaccsInvitation($resident, $hospital, $em);
            } else {
                $this->mailer->sendEmail(
                    $email,
                    'Vous avez été ajouté à une année — MED@WORK',
                    'email/maccsAddedToYear.html.twig',
                    [
                        'firstname' => $resident->getFirstname(),
                        'yearTitle' => $year->getTitle(),
                        'loginUrl'  => rtrim($this->frontendUrl, '/') . '/login',
                    ],
                );
            }
        } catch (\Throwable) {
            // Email failure must not block the operation
        }

        $actor = $this->getUser();
        if ($actor instanceof HospitalAdmin || $actor instanceof Manager) {
            $this->auditService->log($actor, $hospital, 'create_maccs', 'resident', $resident->getId(), sprintf('MACCS %s %s (%s) ajouté à "%s"', $firstname, $lastname, $email, $year->getTitle()));
            $em->flush();
        }

        return $this->json($this->serializeYearsResident($yr, $year, $resident), Response::HTTP_CREATED);
    }

    /**
     * Edit a YearsResident (optingOut only).
     * PATCH /api/hospital-admin/years-residents/{yrId}
     */
    #[Route('/years-residents/{yrId}', name: 'hospital_admin_yr_edit', methods: ['PATCH'])]
    public function editYearsResident(
        int $yrId,
        Request $request,
        YearsResidentRepository $yearsResidentRepository,
        EntityManagerInterface $em,
    ): JsonResponse {
        $yr = $this->resolveYearsResident($yrId, $yearsResidentRepository);
        if ($yr instanceof JsonResponse) {
            return $yr;
        }

        $data = json_decode($request->getContent(), true);
        if (isset($data['optingOut'])) {
            $yr->setOptingOut((bool) $data['optingOut']);
        }

        $em->flush();

        return $this->json($this->serializeYearsResident($yr, $yr->getYear(), $yr->getResident()));
    }

    /**
     * Retire a MACCS from a year (soft delete — sets allowed=false).
     * DELETE /api/hospital-admin/years-residents/{yrId}
     */
    #[Route('/years-residents/{yrId}', name: 'hospital_admin_yr_retire', methods: ['DELETE'])]
    public function retireResident(
        int $yrId,
        YearsResidentRepository $yearsResidentRepository,
        EntityManagerInterface $em,
    ): JsonResponse {
        $yr = $this->resolveYearsResident($yrId, $yearsResidentRepository);
        if ($yr instanceof JsonResponse) {
            return $yr;
        }

        $yr->setAllowed(false);
        $em->flush();

        return new JsonResponse(null, Response::HTTP_NO_CONTENT);
    }

    /**
     * Move a MACCS to another year within the same hospital.
     * POST /api/hospital-admin/years-residents/{yrId}/change-year
     * Body: {newYearId}
     */
    #[Route('/years-residents/{yrId}/change-year', name: 'hospital_admin_yr_change_year', methods: ['POST'])]
    public function changeResidentYear(
        int $yrId,
        Request $request,
        YearsResidentRepository $yearsResidentRepository,
        YearsRepository $yearsRepository,
        EntityManagerInterface $em,
    ): JsonResponse {
        $hospital = $this->resolveHospital();
        $yr       = $this->resolveYearsResident($yrId, $yearsResidentRepository);
        if ($yr instanceof JsonResponse) {
            return $yr;
        }

        $data      = json_decode($request->getContent(), true);
        $newYearId = isset($data['newYearId']) && is_numeric($data['newYearId']) ? (int) $data['newYearId'] : 0;

        if ($newYearId <= 0) {
            return new JsonResponse(['message' => 'newYearId obligatoire'], Response::HTTP_BAD_REQUEST);
        }

        $newYear = $yearsRepository->find($newYearId);
        if ($newYear === null || $newYear->getHospital()?->getId() !== $hospital->getId()) {
            return new JsonResponse(['message' => 'Année introuvable pour cet hôpital'], Response::HTTP_NOT_FOUND);
        }

        $resident = $yr->getResident();
        if ($resident === null) {
            return new JsonResponse(['message' => 'Resident introuvable'], Response::HTTP_NOT_FOUND);
        }

        // Retire from current year
        $yr->setAllowed(false);

        // Create new YearsResident in new year
        $newYr = (new YearsResident())
            ->setYear($newYear)
            ->setResident($resident)
            ->setAllowed(true)
            ->setOptingOut($yr->getOptingOut() ?? false)
            ->setCreatedAt(new \DateTime());

        $em->persist($newYr);
        $em->flush();

        return $this->json($this->serializeYearsResident($newYr, $newYear, $resident), Response::HTTP_CREATED);
    }

    /**
     * Resend the invitation to a MACCS with pending status.
     * POST /api/hospital-admin/years-residents/{yrId}/resend-invite
     */
    #[Route('/years-residents/{yrId}/resend-invite', name: 'hospital_admin_yr_resend_invite', methods: ['POST'])]
    public function resendResidentInvite(
        int $yrId,
        YearsResidentRepository $yearsResidentRepository,
        EntityManagerInterface $em,
    ): JsonResponse {
        $yr = $this->resolveYearsResident($yrId, $yearsResidentRepository);
        if ($yr instanceof JsonResponse) {
            return $yr;
        }

        $resident = $yr->getResident();
        if ($resident === null) {
            return new JsonResponse(['message' => 'Resident introuvable'], Response::HTTP_NOT_FOUND);
        }

        if ($this->computeStatus($yr) !== 'pending') {
            return new JsonResponse(['message' => 'Ce MACCS n\'a pas de statut "Invitation en attente"'], Response::HTTP_CONFLICT);
        }

        $hospital = $this->resolveHospital();

        try {
            $this->sendMaccsInvitation($resident, $hospital, $em);
        } catch (\Throwable) {
            return new JsonResponse(['message' => 'Erreur lors de l\'envoi de l\'email'], Response::HTTP_INTERNAL_SERVER_ERROR);
        }

        return new JsonResponse(['message' => 'Invitation renvoyée'], Response::HTTP_OK);
    }

    /**
     * Supprimer un MACCS de l'hôpital.
     * Supprime toutes ses liaisons YearsResident dans cet hôpital,
     * et supprime l'entité Resident si elle n'a plus aucune autre liaison.
     * DELETE /api/hospital-admin/residents/{residentId}
     */
    #[Route('/residents/{residentId}', name: 'hospital_admin_residents_delete', methods: ['DELETE'])]
    public function deleteResident(
        int $residentId,
        ResidentRepository $residentRepository,
        YearsResidentRepository $yearsResidentRepository,
        EntityManagerInterface $em,
    ): JsonResponse {
        $hospital = $this->resolveHospital();
        $resident = $residentRepository->find($residentId);

        if ($resident === null) {
            return new JsonResponse(['message' => 'Résident introuvable'], Response::HTTP_NOT_FOUND);
        }

        $allYrs      = $yearsResidentRepository->findBy(['resident' => $resident]);
        $hospitalYrs = [];
        $hasOtherLinks = false;

        foreach ($allYrs as $yr) {
            if ($yr->getYear()?->getHospital()?->getId() === $hospital->getId()) {
                $hospitalYrs[] = $yr;
            } else {
                $hasOtherLinks = true;
            }
        }

        if (empty($hospitalYrs)) {
            return new JsonResponse(['message' => 'Ce MACCS n\'appartient pas à cet hôpital'], Response::HTTP_FORBIDDEN);
        }

        $residentName  = $resident->getFirstname() . ' ' . $resident->getLastname();
        $residentEmail = $resident->getEmail();

        foreach ($hospitalYrs as $yr) {
            $em->remove($yr);
        }

        if (!$hasOtherLinks) {
            $em->remove($resident);
        }

        $actor = $this->getUser();
        if ($actor instanceof HospitalAdmin || $actor instanceof Manager) {
            $this->auditService->log($actor, $hospital, 'delete_maccs', 'resident', $residentId, sprintf('MACCS %s (%s) supprimé', $residentName, $residentEmail));
        }

        $em->flush();

        return new JsonResponse(null, Response::HTTP_NO_CONTENT);
    }

    /**
     * Import MACCS from CSV.
     * POST /api/hospital-admin/residents/import
     * Query: ?preview=true to validate without persisting
     * Body: multipart/form-data with file field "csv"
     * CSV columns: prenom,nom,email,opting_out,year_title
     */
    #[Route('/residents/import', name: 'hospital_admin_residents_import', methods: ['POST'])]
    public function importResidents(
        Request $request,
        YearsRepository $yearsRepository,
        ResidentRepository $residentRepository,
        YearsResidentRepository $yearsResidentRepository,
        EntityManagerInterface $em,
        UserPasswordHasherInterface $passwordHasher,
    ): JsonResponse {
        $hospital = $this->resolveHospital();
        $preview  = filter_var($request->query->get('preview', 'false'), FILTER_VALIDATE_BOOLEAN);

        $file = $request->files->get('csv');
        if ($file === null) {
            return new JsonResponse(['message' => 'Fichier CSV manquant (champ "csv")'], Response::HTTP_BAD_REQUEST);
        }

        $lines   = array_filter(array_map('trim', file($file->getPathname())));
        $headers = array_map('trim', str_getcsv(array_shift($lines)));
        $required = ['prenom', 'nom', 'email', 'opting_out', 'year_title'];
        foreach ($required as $col) {
            if (!in_array($col, $headers, true)) {
                return new JsonResponse(['message' => "Colonne manquante : {$col}"], Response::HTTP_BAD_REQUEST);
            }
        }

        // Cache years by title for this hospital
        $yearsByTitle = [];
        foreach ($yearsRepository->findBy(['hospital' => $hospital]) as $year) {
            $yearsByTitle[$year->getTitle()] = $year;
        }

        $created      = [];
        $attached     = [];
        $errors       = [];
        $newResidents = [];

        foreach ($lines as $i => $line) {
            $row = array_combine($headers, array_map('trim', str_getcsv($line)));
            if ($row === false) {
                $errors[] = ['line' => $i + 2, 'reason' => 'Ligne malformée'];
                continue;
            }

            $email     = $row['email'] ?? '';
            $firstname = $row['prenom'] ?? '';
            $lastname  = $row['nom'] ?? '';
            $yearTitle = $row['year_title'] ?? '';
            $optingOut = in_array(strtolower($row['opting_out'] ?? ''), ['1', 'true', 'oui', 'yes'], true);

            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $errors[] = ['line' => $i + 2, 'email' => $email, 'reason' => 'Email invalide'];
                continue;
            }
            if ($firstname === '' || $lastname === '') {
                $errors[] = ['line' => $i + 2, 'email' => $email, 'reason' => 'Nom ou prénom manquant'];
                continue;
            }
            if (!isset($yearsByTitle[$yearTitle])) {
                $errors[] = ['line' => $i + 2, 'email' => $email, 'reason' => "Année introuvable : {$yearTitle}"];
                continue;
            }

            $year     = $yearsByTitle[$yearTitle];
            $resident = $residentRepository->findOneBy(['email' => $email]);
            $isNew    = $resident === null;

            if (!$isNew && $yearsResidentRepository->checkLink($resident, $year)) {
                $errors[] = ['line' => $i + 2, 'email' => $email, 'reason' => 'Déjà rattaché à cette année'];
                continue;
            }

            if ($preview) {
                if ($isNew) {
                    $created[] = ['email' => $email, 'firstname' => $firstname, 'lastname' => $lastname, 'yearTitle' => $yearTitle];
                } else {
                    $attached[] = ['email' => $email, 'firstname' => $resident->getFirstname(), 'lastname' => $resident->getLastname(), 'yearTitle' => $yearTitle];
                }
                continue;
            }

            // Persist
            if ($isNew) {
                $resident = (new Resident())
                    ->setEmail($email)
                    ->setFirstname($firstname)
                    ->setLastname($lastname)
                    ->setRole('resident')
                    ->setRoles(['ROLE_RESIDENT'])
                    ->setSexe(Sexe::Male)
                    ->setDateOfMaster(new \DateTime('1900-01-01'))
                    ->setPassword($passwordHasher->hashPassword(new Resident(), bin2hex(random_bytes(16))))
                    ->setCreatedAt(new \DateTime());
                $em->persist($resident);
                $created[]      = ['email' => $email, 'firstname' => $firstname, 'lastname' => $lastname, 'yearTitle' => $yearTitle];
                $newResidents[] = $resident;
            } else {
                $attached[] = ['email' => $email, 'firstname' => $resident->getFirstname(), 'lastname' => $resident->getLastname(), 'yearTitle' => $yearTitle];
            }

            $yr = (new YearsResident())
                ->setYear($year)
                ->setResident($resident)
                ->setAllowed(true)
                ->setOptingOut($optingOut)
                ->setCreatedAt(new \DateTime());
            $em->persist($yr);
        }

        if (!$preview) {
            $em->flush();

            // Send invite emails after flush (IDs and tokens are now persisted)
            foreach ($newResidents as $newResident) {
                try {
                    $this->sendMaccsInvitation($newResident, $hospital, $em);
                } catch (\Throwable) {
                }
            }
        }

        return $this->json([
            'preview'  => $preview,
            'created'  => $created,
            'attached' => $attached,
            'errors'   => $errors,
        ], $preview ? Response::HTTP_OK : Response::HTTP_CREATED);
    }

    // ── Manager management endpoints ──────────────────────────────────────────

    /**
     * List all managers for the hospital, filtered by mode (current or history).
     * GET /api/hospital-admin/managers?mode=current|history
     */
    #[Route('/managers', name: 'hospital_admin_managers_list', methods: ['GET'])]
    public function listManagers(Request $request, YearsRepository $yearsRepository): JsonResponse
    {
        $hospital = $this->resolveHospital();
        $mode     = $request->query->get('mode', 'current');
        $today    = new \DateTime();

        $result = [];
        foreach ($yearsRepository->findBy(['hospital' => $hospital]) as $year) {
            $isCurrent = $year->getDateOfEnd() >= $today;
            if ($mode === 'history' && $isCurrent) {
                continue;
            }
            if ($mode !== 'history' && !$isCurrent) {
                continue;
            }

            foreach ($year->getManagers() as $my) {
                $manager = $my->getManager();
                if ($manager === null) {
                    continue;
                }
                $result[] = $this->serializeManagerYears($my, $year, $manager);
            }
        }

        $priority = ['active' => 0, 'pending' => 1, 'not_registered' => 2];
        usort($result, fn ($a, $b) => ($priority[$a['status']] ?? 99) <=> ($priority[$b['status']] ?? 99));

        return $this->json($result);
    }

    /**
     * Add/invite a manager to a year.
     * POST /api/hospital-admin/managers
     * Body: {email, firstname, lastname, yearId}
     */
    #[Route('/managers', name: 'hospital_admin_managers_add', methods: ['POST'])]
    public function addManager(
        Request $request,
        YearsRepository $yearsRepository,
        ManagerRepository $managerRepository,
        ManagerYearsRepository $managerYearsRepository,
        EntityManagerInterface $em,
        UserPasswordHasherInterface $passwordHasher,
    ): JsonResponse {
        $hospital = $this->resolveHospital();
        $data     = json_decode($request->getContent(), true);

        if (!is_array($data)) {
            return new JsonResponse(['message' => 'Invalid JSON'], Response::HTTP_BAD_REQUEST);
        }

        $email     = trim((string) ($data['email'] ?? ''));
        $firstname = trim((string) ($data['firstname'] ?? ''));
        $lastname  = trim((string) ($data['lastname'] ?? ''));
        $yearId    = isset($data['yearId']) && is_numeric($data['yearId']) ? (int) $data['yearId'] : 0;

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return new JsonResponse(['message' => 'Email invalide'], Response::HTTP_BAD_REQUEST);
        }
        if ($firstname === '' || $lastname === '') {
            return new JsonResponse(['message' => 'Nom et prénom obligatoires'], Response::HTTP_BAD_REQUEST);
        }
        if ($yearId <= 0) {
            return new JsonResponse(['message' => 'yearId obligatoire'], Response::HTTP_BAD_REQUEST);
        }

        $year = $yearsRepository->find($yearId);
        if ($year === null || $year->getHospital()?->getId() !== $hospital->getId()) {
            return new JsonResponse(['message' => 'Année introuvable pour cet hôpital'], Response::HTTP_NOT_FOUND);
        }

        $manager = $managerRepository->findOneBy(['email' => $email]);
        $isNew   = $manager === null;

        if (!$isNew && $managerYearsRepository->checkRelation($manager, $year)) {
            return new JsonResponse(['message' => 'Ce manager est déjà rattaché à cette année'], Response::HTTP_CONFLICT);
        }

        if ($isNew) {
            $manager = (new Manager())
                ->setEmail($email)
                ->setFirstname($firstname)
                ->setLastname($lastname)
                ->setRole('manager')
                ->setRoles(['ROLE_MANAGER'])
                ->setSexe(\App\Enum\Sexe::Male)
                ->setJob('')
                ->setPassword($passwordHasher->hashPassword(new Manager(), bin2hex(random_bytes(16))))
                ->setCreatedAt(new \DateTime());
            $em->persist($manager);
        }

        $my = (new ManagerYears())
            ->setManager($manager)
            ->setYears($year)
            ->setOwner(false)
            ->setAdmin(false)
            ->setDataAccess(true)
            ->setDataValidation(false)
            ->setDataDownload(true)
            ->setInvitedAt(new \DateTimeImmutable());
        $em->persist($my);
        $em->flush();

        $token = bin2hex(random_bytes(32));
        $manager->setToken($token)->setTokenExpiration(new \DateTime('+48 hours'));
        $em->flush();

        try {
            if ($isNew) {
                $this->mailer->sendEmail(
                    $email,
                    'Vous avez été invité à rejoindre MED@WORK',
                    'email/managerSetup.html.twig',
                    [
                        'firstname'    => $manager->getFirstname(),
                        'hospitalName' => $hospital->getName(),
                        'yearTitle'    => $year->getTitle(),
                        'setupLink'    => rtrim($this->frontendUrl, '/') . '/manager-setup/' . $token,
                        'refuseLink'   => rtrim($this->apiUrl, '/') . '/api/managers/refuse-year/' . $token,
                    ],
                );
            } else {
                $this->mailer->sendEmail(
                    $email,
                    'Invitation à rejoindre une année — MED@WORK',
                    'email/managerYearInvite.html.twig',
                    [
                        'firstname'    => $manager->getFirstname(),
                        'hospitalName' => $hospital->getName(),
                        'yearTitle'    => $year->getTitle(),
                        'acceptLink'   => rtrim($this->apiUrl, '/') . '/api/managers/accept-year/' . $token,
                        'refuseLink'   => rtrim($this->apiUrl, '/') . '/api/managers/refuse-year/' . $token,
                    ],
                );
            }
        } catch (\Throwable) {
            // Email failure must not block the operation
        }

        return $this->json($this->serializeManagerYears($my, $year, $manager), Response::HTTP_CREATED);
    }

    /**
     * Remove a manager from a specific year.
     * DELETE /api/hospital-admin/manager-years/{myId}
     */
    #[Route('/manager-years/{myId}', name: 'hospital_admin_manager_year_remove', methods: ['DELETE'])]
    public function removeManagerYear(
        int $myId,
        ManagerYearsRepository $managerYearsRepository,
        EntityManagerInterface $em,
    ): JsonResponse {
        $my = $this->resolveManagerYears($myId, $managerYearsRepository);
        if ($my instanceof JsonResponse) {
            return $my;
        }

        $em->remove($my);
        $em->flush();

        return new JsonResponse(null, Response::HTTP_NO_CONTENT);
    }

    /**
     * Resend invitation to a pending manager.
     * POST /api/hospital-admin/manager-years/{myId}/resend-invite
     */
    #[Route('/manager-years/{myId}/resend-invite', name: 'hospital_admin_manager_year_resend', methods: ['POST'])]
    public function resendManagerInvite(
        int $myId,
        ManagerYearsRepository $managerYearsRepository,
        EntityManagerInterface $em,
    ): JsonResponse {
        $my = $this->resolveManagerYears($myId, $managerYearsRepository);
        if ($my instanceof JsonResponse) {
            return $my;
        }

        $manager = $my->getManager();
        if ($manager === null) {
            return new JsonResponse(['message' => 'Manager introuvable'], Response::HTTP_NOT_FOUND);
        }

        if ($my->getInvitedAt() === null) {
            return new JsonResponse(['message' => 'Ce manager a déjà accepté l\'invitation'], Response::HTTP_CONFLICT);
        }

        $hospital = $this->resolveHospital();
        $year     = $my->getYears();
        $isNew    = $manager->getValidatedAt() === null;

        $token = bin2hex(random_bytes(32));
        $manager->setToken($token)->setTokenExpiration(new \DateTime('+48 hours'));
        $em->flush();

        try {
            if ($isNew) {
                $this->mailer->sendEmail(
                    $manager->getEmail(),
                    'Vous avez été invité à rejoindre MED@WORK',
                    'email/managerSetup.html.twig',
                    [
                        'firstname'    => $manager->getFirstname(),
                        'hospitalName' => $hospital->getName(),
                        'yearTitle'    => $year?->getTitle(),
                        'setupLink'    => rtrim($this->frontendUrl, '/') . '/manager-setup/' . $token,
                        'refuseLink'   => rtrim($this->apiUrl, '/') . '/api/managers/refuse-year/' . $token,
                    ],
                );
            } else {
                $this->mailer->sendEmail(
                    $manager->getEmail(),
                    'Invitation à rejoindre une année — MED@WORK',
                    'email/managerYearInvite.html.twig',
                    [
                        'firstname'    => $manager->getFirstname(),
                        'hospitalName' => $hospital->getName(),
                        'yearTitle'    => $year?->getTitle(),
                        'acceptLink'   => rtrim($this->apiUrl, '/') . '/api/managers/accept-year/' . $token,
                        'refuseLink'   => rtrim($this->apiUrl, '/') . '/api/managers/refuse-year/' . $token,
                    ],
                );
            }
        } catch (\Throwable) {
            return new JsonResponse(['message' => 'Erreur lors de l\'envoi de l\'email'], Response::HTTP_INTERNAL_SERVER_ERROR);
        }

        return new JsonResponse(['message' => 'Invitation renvoyée'], Response::HTTP_OK);
    }

    /**
     * Remove a manager from all hospital years (hard delete of ManagerYears, optionally Manager).
     * DELETE /api/hospital-admin/managers/{managerId}
     */
    #[Route('/managers/{managerId}', name: 'hospital_admin_managers_delete', methods: ['DELETE'])]
    public function deleteManager(
        int $managerId,
        ManagerRepository $managerRepository,
        ManagerYearsRepository $managerYearsRepository,
        EntityManagerInterface $em,
    ): JsonResponse {
        $hospital = $this->resolveHospital();
        $manager  = $managerRepository->find($managerId);

        if ($manager === null) {
            return new JsonResponse(['message' => 'Manager introuvable'], Response::HTTP_NOT_FOUND);
        }

        $allYrs        = $managerYearsRepository->findBy(['manager' => $manager]);
        $hospitalYrs   = [];
        $hasOtherLinks = false;

        foreach ($allYrs as $my) {
            if ($my->getYears()?->getHospital()?->getId() === $hospital->getId()) {
                $hospitalYrs[] = $my;
            } else {
                $hasOtherLinks = true;
            }
        }

        if (empty($hospitalYrs)) {
            return new JsonResponse(['message' => 'Ce manager n\'appartient pas à cet hôpital'], Response::HTTP_FORBIDDEN);
        }

        $managerName  = $manager->getFirstname() . ' ' . $manager->getLastname();
        $managerEmail = $manager->getEmail();

        foreach ($hospitalYrs as $my) {
            $em->remove($my);
        }

        if (!$hasOtherLinks) {
            // Soft-delete: keep the manager record for audit trail
            $manager->setIsDeleted(true)->setDeletedAt(new \DateTime());
        }

        $actor = $this->getUser();
        if ($actor instanceof HospitalAdmin || $actor instanceof Manager) {
            $this->auditService->log($actor, $hospital, 'delete_manager', 'manager', $manager->getId(), sprintf('Manager %s (%s) supprimé', $managerName, $managerEmail));
        }

        $em->flush();

        return new JsonResponse(null, Response::HTTP_NO_CONTENT);
    }

    /**
     * Toggle can-create-year right for a manager linked to this hospital.
     * PATCH /api/hospital-admin/managers/{managerId}/can-create-year
     * Body: {"canCreateYear": true|false}
     */
    #[Route('/managers/{managerId}/can-create-year', name: 'hospital_admin_managers_can_create_year', methods: ['PATCH'])]
    public function setCanCreateYear(
        int $managerId,
        Request $request,
        ManagerRepository $managerRepository,
        ManagerYearsRepository $managerYearsRepository,
        EntityManagerInterface $em,
    ): JsonResponse {
        $hospital = $this->resolveHospital();
        $manager  = $managerRepository->find($managerId);

        if ($manager === null) {
            return new JsonResponse(['message' => 'Manager introuvable'], Response::HTTP_NOT_FOUND);
        }

        // Verify the manager is linked to this hospital
        $linked = false;
        foreach ($managerYearsRepository->findBy(['manager' => $manager]) as $my) {
            if ($my->getYears()?->getHospital()?->getId() === $hospital->getId()) {
                $linked = true;
                break;
            }
        }

        if (!$linked) {
            return new JsonResponse(['message' => 'Ce manager n\'appartient pas à cet hôpital'], Response::HTTP_FORBIDDEN);
        }

        $data = json_decode($request->getContent(), true);
        if (!is_array($data) || !isset($data['canCreateYear']) || !is_bool($data['canCreateYear'])) {
            return new JsonResponse(['message' => 'canCreateYear (boolean) requis'], Response::HTTP_BAD_REQUEST);
        }

        $manager->setCanCreateYear($data['canCreateYear']);

        $actor = $this->getUser();
        if ($actor instanceof HospitalAdmin || $actor instanceof Manager) {
            $action = $data['canCreateYear'] ? 'grant_create_year' : 'revoke_create_year';
            $this->auditService->log($actor, $hospital, $action, 'manager', $manager->getId(), sprintf('Droit "créer une année" %s pour %s %s', $data['canCreateYear'] ? 'accordé' : 'révoqué', $manager->getFirstname(), $manager->getLastname()));
        }

        $em->flush();

        return new JsonResponse(['canCreateYear' => $manager->isCanCreateYear()]);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function resolveHospital(): Hospital
    {
        $user = $this->getUser();
        if ($user instanceof \App\Entity\HospitalAdmin) {
            return $user->getHospital();
        }
        if ($user instanceof Manager && $user->getAdminHospital() !== null) {
            return $user->getAdminHospital();
        }
        throw new \LogicException('No hospital admin context for current user');
    }

    /**
     * Resolve a YearsResident by ID and verify it belongs to the current hospital.
     * Returns the entity or a 404/403 JsonResponse.
     */
    private function resolveYearsResident(int $yrId, YearsResidentRepository $repo): YearsResident|JsonResponse
    {
        $yr = $repo->find($yrId);
        if ($yr === null) {
            return new JsonResponse(['message' => 'YearsResident introuvable'], Response::HTTP_NOT_FOUND);
        }

        $hospital = $this->resolveHospital();
        if ($yr->getYear()?->getHospital()?->getId() !== $hospital->getId()) {
            return new JsonResponse(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
        }

        return $yr;
    }

    private function computeStatus(YearsResident $yr): string
    {
        if (!$yr->getAllowed()) {
            return 'retired';
        }
        $r = $yr->getResident();
        if ($r === null) {
            // No Resident entity linked — invitation was never sent or data is orphaned
            return 'not_registered';
        }
        // Invite sent but password not yet set
        if ($r->getToken() !== null) {
            return 'pending';
        }

        // token === null means the resident has a working password (either via invite
        // or manual validation) → treat as active regardless of validatedAt
        return 'active';
    }

    private function sendMaccsInvitation(Resident $resident, Hospital $hospital, EntityManagerInterface $em): void
    {
        $token = bin2hex(random_bytes(32));
        $resident->setToken($token)->setTokenExpiration(new \DateTime('+7 days'));
        $em->flush();

        $this->mailer->sendEmail(
            $resident->getEmail(),
            'Vous avez été invité à rejoindre MED@WORK',
            'email/maccsInvited.html.twig',
            [
                'firstname'    => $resident->getFirstname(),
                'hospitalName' => $hospital->getName(),
                'setupLink'    => rtrim($this->frontendUrl, '/') . '/maccs-setup/' . $token,
            ],
        );
    }

    private function buildAvatarUrl(?string $avatarPath): ?string
    {
        if ($avatarPath === null) {
            return null;
        }
        $token = pathinfo($avatarPath, PATHINFO_FILENAME);
        return rtrim($this->uploadsBaseUrl, '/') . '/api/profile/avatar/' . $token;
    }

    private function serializeYearsResident(YearsResident $yr, ?Years $year, ?Resident $resident): array
    {
        return [
            'yrId'       => $yr->getId(),
            'residentId' => $resident?->getId(),
            'firstname'  => $resident?->getFirstname(),
            'lastname'   => $resident?->getLastname(),
            'email'      => $resident?->getEmail(),
            'avatarUrl'  => $this->buildAvatarUrl($resident?->getAvatarPath()),
            'yearId'     => $year?->getId(),
            'yearTitle'  => $year?->getTitle(),
            'optingOut'  => $yr->getOptingOut(),
            'allowed'    => $yr->getAllowed(),
            'status'     => $this->computeStatus($yr),
            'createdAt'  => $yr->getCreatedAt()->format(\DateTimeInterface::ATOM),
        ];
    }

    private function serializeYear(Years $year): array
    {
        return [
            'id'            => $year->getId(),
            'title'         => $year->getTitle(),
            'period'        => $year->getPeriod(),
            'location'      => $year->getLocation(),
            'speciality'    => $year->getSpeciality(),
            'comment'       => $year->getComment(),
            'status'        => $year->getStatus()->value,
            'dateOfStart'   => $year->getDateOfStart()->format('Y-m-d'),
            'dateOfEnd'     => $year->getDateOfEnd()->format('Y-m-d'),
            'residentCount' => $year->getResidents()->count(),
            'managerCount'  => $year->getManagers()->count(),
            'token'         => $year->getToken(),
            'residents'     => array_values(array_filter(array_map(
                fn ($yr) => $yr->getResident()
                    ? ['firstname' => $yr->getResident()->getFirstname(), 'lastname' => $yr->getResident()->getLastname()]
                    : null,
                $year->getResidents()->toArray()
            ))),
            'managers'      => array_values(array_filter(array_map(
                fn ($my) => $my->getManager()
                    ? ['firstname' => $my->getManager()->getFirstname(), 'lastname' => $my->getManager()->getLastname()]
                    : null,
                $year->getManagers()->toArray()
            ))),
        ];
    }

    private function resolveManagerYears(int $myId, ManagerYearsRepository $repo): ManagerYears|JsonResponse
    {
        $my = $repo->find($myId);
        if ($my === null) {
            return new JsonResponse(['message' => 'ManagerYears introuvable'], Response::HTTP_NOT_FOUND);
        }

        $hospital = $this->resolveHospital();
        if ($my->getYears()?->getHospital()?->getId() !== $hospital->getId()) {
            return new JsonResponse(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
        }

        return $my;
    }

    private function computeManagerStatus(ManagerYears $my): string
    {
        $m = $my->getManager();
        if ($m === null) {
            return 'not_registered';
        }
        // Token set → invite sent but account not yet activated
        if ($m->getToken() !== null) {
            return 'pending';
        }
        // token === null → account is functional (manual or normal activation)
        return 'active';
    }

    private function serializeManagerYears(ManagerYears $my, ?Years $year, ?Manager $manager): array
    {
        return [
            'myId'          => $my->getId(),
            'managerId'     => $manager?->getId(),
            'firstname'     => $manager?->getFirstname(),
            'lastname'      => $manager?->getLastname(),
            'email'         => $manager?->getEmail(),
            'avatarUrl'     => $this->buildAvatarUrl($manager?->getAvatarPath()),
            'job'           => $manager?->getJob(),
            'yearId'        => $year?->getId(),
            'yearTitle'     => $year?->getTitle(),
            'status'        => $this->computeManagerStatus($my),
            'canCreateYear' => $manager?->isCanCreateYear() ?? false,
        ];
    }

    // ── Year CRUD endpoints ───────────────────────────────────────────────────

    /**
     * Create a new year for the authenticated hospital admin's hospital.
     * POST /api/hospital-admin/years
     */
    #[Route('/years', name: 'hospital_admin_years_create', methods: ['POST'])]
    public function createYear(Request $request, EntityManagerInterface $em): JsonResponse
    {
        $hospital = $this->resolveHospital();
        $data     = json_decode($request->getContent(), true) ?? [];

        $errors = $this->validateYearInput($data);
        if ($errors !== []) {
            return new JsonResponse(['errors' => $errors], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $year = (new Years())
            ->setTitle(trim($data['title']))
            ->setLocation(trim($data['location']))
            ->setPeriod(trim($data['period'] ?? ''))
            ->setDateOfStart(new \DateTime($data['dateOfStart']))
            ->setDateOfEnd(new \DateTime($data['dateOfEnd']))
            ->setSpeciality(isset($data['speciality']) ? trim($data['speciality']) : null)
            ->setComment(isset($data['comment']) ? trim($data['comment']) : null)
            ->setStatus(YearStatus::from($data['status'] ?? 'active'))
            ->setHospital($hospital)
            ->setCreatedAt(new \DateTime())
            ->setToken(bin2hex(random_bytes(5)));

        $em->persist($year);

        $actor = $this->getUser();
        if ($actor instanceof HospitalAdmin || $actor instanceof Manager) {
            $this->auditService->log($actor, $hospital, 'create_year', 'year', null, sprintf('Année "%s" créée (%s → %s)', $year->getTitle(), $data['dateOfStart'], $data['dateOfEnd']));
        }

        $em->flush();

        return $this->json($this->serializeYear($year), Response::HTTP_CREATED);
    }

    /**
     * Update an existing year (must belong to this admin's hospital).
     * PATCH /api/hospital-admin/years/{id}
     */
    #[Route('/years/{id}', name: 'hospital_admin_years_update', methods: ['PATCH'])]
    public function updateYear(int $id, Request $request, YearsRepository $yearsRepository, EntityManagerInterface $em): JsonResponse
    {
        $hospital = $this->resolveHospital();
        $year     = $yearsRepository->find($id);

        if ($year === null) {
            return new JsonResponse(['message' => 'Année introuvable'], Response::HTTP_NOT_FOUND);
        }
        if ($year->getHospital()?->getId() !== $hospital->getId()) {
            return new JsonResponse(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
        }
        if (!$year->isEditable()) {
            return new JsonResponse(['message' => 'Cette année est archivée et ne peut plus être modifiée'], Response::HTTP_CONFLICT);
        }

        $data = json_decode($request->getContent(), true) ?? [];

        if (isset($data['title']))       { $year->setTitle(trim($data['title'])); }
        if (isset($data['location']))    { $year->setLocation(trim($data['location'])); }
        if (isset($data['period']))      { $year->setPeriod(trim($data['period'])); }
        // Empty string → null for nullable fields
        if (array_key_exists('speciality', $data)) {
            $s = is_string($data['speciality']) ? trim($data['speciality']) : '';
            $year->setSpeciality($s !== '' ? $s : null);
        }
        if (array_key_exists('comment', $data)) {
            $c = is_string($data['comment']) ? trim($data['comment']) : '';
            $year->setComment($c !== '' ? $c : null);
        }
        if (isset($data['dateOfStart'])) { $year->setDateOfStart(new \DateTime($data['dateOfStart'])); }
        if (isset($data['dateOfEnd']))   { $year->setDateOfEnd(new \DateTime($data['dateOfEnd'])); }
        if (isset($data['status'])) {
            try {
                $year->setStatus(YearStatus::from($data['status']));
            } catch (\ValueError) {
                return new JsonResponse(['message' => 'Statut invalide (draft|active|closed|archived)'], Response::HTTP_UNPROCESSABLE_ENTITY);
            }
        }

        $actor = $this->getUser();
        if ($actor instanceof HospitalAdmin || $actor instanceof Manager) {
            $this->auditService->log($actor, $hospital, 'update_year', 'year', $year->getId(), sprintf('Année "%s" modifiée', $year->getTitle()));
        }

        $em->flush();

        return $this->json($this->serializeYear($year));
    }

    /**
     * Delete a year (only if no residents/managers are linked).
     * DELETE /api/hospital-admin/years/{id}
     */
    #[Route('/years/{id}', name: 'hospital_admin_years_delete', methods: ['DELETE'])]
    public function deleteYear(int $id, YearsRepository $yearsRepository, EntityManagerInterface $em): JsonResponse
    {
        $hospital = $this->resolveHospital();
        $year     = $yearsRepository->find($id);

        if ($year === null) {
            return new JsonResponse(['message' => 'Année introuvable'], Response::HTTP_NOT_FOUND);
        }
        if ($year->getHospital()?->getId() !== $hospital->getId()) {
            return new JsonResponse(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
        }
        if ($year->getResidents()->count() > 0 || $year->getManagers()->count() > 0) {
            return new JsonResponse(['message' => 'Impossible de supprimer une année avec des résidents ou managers liés'], Response::HTTP_CONFLICT);
        }

        $actor = $this->getUser();
        if ($actor instanceof HospitalAdmin || $actor instanceof Manager) {
            $this->auditService->log($actor, $hospital, 'delete_year', 'year', $year->getId(), sprintf('Année "%s" supprimée', $year->getTitle()));
        }

        $em->remove($year);
        $em->flush();

        return new JsonResponse(null, Response::HTTP_NO_CONTENT);
    }

    /**
     * Force-delete a year with all associated data.
     * Sends email notifications to linked residents, managers and hospital admins.
     * DELETE /api/hospital-admin/years/{id}/force
     */
    #[Route('/years/{id}/force', name: 'hospital_admin_years_force_delete', methods: ['DELETE'])]
    public function forceDeleteYear(
        int $id,
        YearsRepository $yearsRepository,
        YearsResidentRepository $yrRepo,
        EntityManagerInterface $em,
        YearForceDeleteService $service,
    ): JsonResponse {
        $hospital = $this->resolveHospital();
        $year     = $yearsRepository->find($id);

        if ($year === null) {
            return new JsonResponse(['message' => 'Année introuvable'], Response::HTTP_NOT_FOUND);
        }
        if ($year->getHospital()?->getId() !== $hospital->getId()) {
            return new JsonResponse(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
        }

        $actor = $this->getUser();
        $service->execute(
            $year,
            $hospital,
            $yrRepo,
            $em,
            ($actor instanceof HospitalAdmin || $actor instanceof Manager) ? $actor : null,
        );

        return new JsonResponse(null, Response::HTTP_NO_CONTENT);
    }

    // ── Dashboard stats endpoint ──────────────────────────────────────────────

    /**
     * GET /api/hospital-admin/dashboard/stats
     */
    #[Route('/dashboard/stats', name: 'hospital_admin_dashboard_stats', methods: ['GET'])]
    public function dashboardStats(YearsRepository $yearsRepository): JsonResponse
    {
        $hospital = $this->resolveHospital();
        $today    = new \DateTime();

        $maccsActive = $maccsPending = $maccsIncomplete = $maccsRetired = 0;
        $managersActive = $managersPending = $managersIncomplete = 0;
        $pendingInvites = 0;
        $totalYears = 0;
        $activeYears = [];

        foreach ($yearsRepository->findBy(['hospital' => $hospital]) as $year) {
            $totalYears++;
            $isCurrent = $year->getDateOfEnd() >= $today;

            foreach ($year->getResidents() as $yr) {
                if ($yr->getResident() === null) { continue; }
                $status = $this->computeStatus($yr);
                if ($status === 'active')     { $maccsActive++; }
                elseif ($status === 'pending')    { $maccsPending++; $pendingInvites++; }
                elseif ($status === 'incomplete') { $maccsIncomplete++; }
                elseif ($status === 'retired')    { $maccsRetired++; }
            }

            foreach ($year->getManagers() as $my) {
                if ($my->getManager() === null) { continue; }
                $status = $this->computeManagerStatus($my);
                if ($status === 'active')     { $managersActive++; }
                elseif ($status === 'pending')    { $managersPending++; $pendingInvites++; }
                elseif ($status === 'incomplete') { $managersIncomplete++; }
            }

            if ($isCurrent) {
                $activeYears[] = [
                    'id'       => $year->getId(),
                    'title'    => $year->getTitle(),
                    'status'   => $year->getStatus()->value,
                    'dateEnd'  => $year->getDateOfEnd()->format('Y-m-d'),
                    'maccs'    => $year->getResidents()->count(),
                    'managers' => $year->getManagers()->count(),
                ];
            }
        }

        return $this->json([
            'maccs' => [
                'active'     => $maccsActive,
                'pending'    => $maccsPending,
                'incomplete' => $maccsIncomplete,
                'retired'    => $maccsRetired,
                'total'      => $maccsActive + $maccsPending + $maccsIncomplete + $maccsRetired,
            ],
            'managers' => [
                'active'     => $managersActive,
                'pending'    => $managersPending,
                'incomplete' => $managersIncomplete,
                'total'      => $managersActive + $managersPending + $managersIncomplete,
            ],
            'pendingInvites' => $pendingInvites,
            'totalYears'     => $totalYears,
            'activeYears'    => $activeYears,
        ]);
    }

    // ── Audit log endpoint ────────────────────────────────────────────────────

    /**
     * GET /api/hospital-admin/audit-log?limit=50&offset=0
     */
    #[Route('/audit-log', name: 'hospital_admin_audit_log', methods: ['GET'])]
    public function auditLog(Request $request, HospitalAdminAuditLogRepository $logRepo): JsonResponse
    {
        $hospital = $this->resolveHospital();
        $limit    = min((int) $request->query->get('limit', 50), 200);
        $offset   = (int) $request->query->get('offset', 0);

        $logs  = $logRepo->findByHospital($hospital->getId() ?? 0, $limit, $offset);
        $total = $logRepo->countByHospital($hospital->getId() ?? 0);

        $result = array_map(fn (HospitalAdminAuditLog $l) => [
            'id'          => $l->getId(),
            'adminName'   => $l->getAdminName(),
            'action'      => $l->getAction(),
            'entityType'  => $l->getEntityType(),
            'entityId'    => $l->getEntityId(),
            'description' => $l->getDescription(),
            'createdAt'   => $l->getCreatedAt()->format(\DateTimeInterface::ATOM),
        ], $logs);

        return $this->json(['total' => $total, 'logs' => $result]);
    }

    // ── Bulk edit MACCS ───────────────────────────────────────────────────────

    /**
     * Bulk edit MACCS: update optingOut or move to another year.
     * POST /api/hospital-admin/residents/bulk-edit
     */
    #[Route('/residents/bulk-edit', name: 'hospital_admin_residents_bulk_edit', methods: ['POST'])]
    public function bulkEditResidents(
        Request $request,
        YearsResidentRepository $yrRepo,
        YearsRepository $yearsRepository,
        EntityManagerInterface $em,
    ): JsonResponse {
        $hospital = $this->resolveHospital();
        $data     = json_decode($request->getContent(), true) ?? [];
        $yrIds    = $data['yrIds'] ?? [];
        $changes  = $data['changes'] ?? [];

        if (empty($yrIds) || !is_array($yrIds)) {
            return new JsonResponse(['message' => 'yrIds requis'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $updated = 0;
        foreach ($yrIds as $yrId) {
            $yr = $yrRepo->find((int) $yrId);
            if ($yr === null || $yr->getYear()?->getHospital()?->getId() !== $hospital->getId()) {
                continue;
            }

            if (array_key_exists('optingOut', $changes)) {
                $yr->setOptingOut((bool) $changes['optingOut']);
            }

            $updated++;
        }

        $actor = $this->getUser();
        if ($updated > 0 && ($actor instanceof HospitalAdmin || $actor instanceof Manager)) {
            $this->auditService->log($actor, $hospital, 'bulk_edit', 'resident', null, sprintf('%d MACCS modifiés en masse', $updated), $changes);
        }

        $em->flush();

        return $this->json(['updated' => $updated]);
    }

    // ── Export MACCS ──────────────────────────────────────────────────────────

    /**
     * Export MACCS as CSV.
     * GET /api/hospital-admin/residents/export?mode=current|history&yearId=
     */
    #[Route('/residents/export', name: 'hospital_admin_residents_export', methods: ['GET'])]
    public function exportResidents(Request $request, YearsRepository $yearsRepository): StreamedResponse
    {
        $hospital = $this->resolveHospital();
        $mode     = $request->query->get('mode', 'current');
        $yearId   = $request->query->get('yearId');
        $today    = new \DateTime();

        $rows = [];
        foreach ($yearsRepository->findBy(['hospital' => $hospital]) as $year) {
            if ($yearId !== null && (string) $year->getId() !== (string) $yearId) {
                continue;
            }
            $isCurrent = $year->getDateOfEnd() >= $today;
            if ($mode === 'history' && $isCurrent) { continue; }
            if ($mode !== 'history' && !$isCurrent) { continue; }

            foreach ($year->getResidents() as $yr) {
                $resident = $yr->getResident();
                if ($resident === null) { continue; }
                $rows[] = [
                    $year->getTitle(),
                    $resident->getFirstname(),
                    $resident->getLastname(),
                    $resident->getEmail(),
                    $this->computeStatus($yr),
                    $yr->getOptingOut() ? 'oui' : 'non',
                    $yr->getCreatedAt()->format('Y-m-d'),
                ];
            }
        }

        $response = new StreamedResponse(function () use ($rows): void {
            $handle = fopen('php://output', 'w');
            if ($handle === false) { return; }
            fputcsv($handle, ['Année', 'Prénom', 'Nom', 'Email', 'Statut', 'Opting Out', 'Ajouté le'], ';');
            foreach ($rows as $row) {
                fputcsv($handle, $row, ';');
            }
            fclose($handle);
        });

        $filename = 'maccs-export-' . date('Y-m-d') . '.csv';
        $response->headers->set('Content-Type', 'text/csv; charset=UTF-8');
        $response->headers->set('Content-Disposition', 'attachment; filename="' . $filename . '"');

        return $response;
    }

    // ── serializeYear override with status ───────────────────────────────────

    private function validateYearInput(array $data): array
    {
        $errors = [];
        if (empty(trim($data['title'] ?? ''))) {
            $errors[] = 'Le titre est requis';
        }
        if (empty(trim($data['location'] ?? ''))) {
            $errors[] = 'Le lieu est requis';
        }
        if (empty($data['dateOfStart'] ?? '')) {
            $errors[] = 'La date de début est requise';
        }
        if (empty($data['dateOfEnd'] ?? '')) {
            $errors[] = 'La date de fin est requise';
        }
        if (!empty($data['dateOfStart']) && !empty($data['dateOfEnd'])
            && new \DateTime($data['dateOfStart']) >= new \DateTime($data['dateOfEnd'])) {
            $errors[] = 'La date de fin doit être après la date de début';
        }
        if (isset($data['status'])) {
            try {
                YearStatus::from($data['status']);
            } catch (\ValueError) {
                $errors[] = 'Statut invalide (draft|active|closed|archived)';
            }
        }
        return $errors;
    }
}
