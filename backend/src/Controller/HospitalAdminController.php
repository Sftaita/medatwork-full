<?php

declare(strict_types=1);

namespace App\Controller;

use App\DTO\HospitalAdminSetupInputDTO;
use App\Entity\Hospital;
use App\Entity\Manager;
use App\Entity\ManagerYears;
use App\Entity\Resident;
use App\Entity\Years;
use App\Entity\YearsResident;
use App\Enum\HospitalAdminStatus;
use App\Enum\Sexe;
use App\Repository\HospitalAdminRepository;
use App\Repository\ManagerRepository;
use App\Repository\ManagerYearsRepository;
use App\Repository\ResidentRepository;
use App\Repository\YearsRepository;
use App\Repository\YearsResidentRepository;
use App\Services\EmailReset\PasswordResetServiceInterface;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Attribute\Route;

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

        // Sort by status priority: retired < pending < incomplete < active
        $priority = ['retired' => 0, 'pending' => 1, 'incomplete' => 2, 'active' => 3];
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

        foreach ($hospitalYrs as $yr) {
            $em->remove($yr);
        }

        if (!$hasOtherLinks) {
            $em->remove($resident);
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

        $priority = ['pending' => 0, 'incomplete' => 1, 'active' => 2];
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

        foreach ($hospitalYrs as $my) {
            $em->remove($my);
        }

        if (!$hasOtherLinks) {
            $em->remove($manager);
        }

        $em->flush();

        return new JsonResponse(null, Response::HTTP_NO_CONTENT);
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
            return 'incomplete';
        }
        // Has a pending token (password reset / invite not yet completed)
        if ($r->getToken() !== null) {
            return 'pending';
        }
        if ($r->getValidatedAt() === null) {
            return 'incomplete';
        }

        return 'active';
    }

    private function sendMaccsInvitation(Resident $resident, Hospital $hospital, EntityManagerInterface $em): void
    {
        $token = bin2hex(random_bytes(32));
        $resident->setToken($token)->setTokenExpiration(new \DateTime('+1 day'));
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

    private function serializeYearsResident(YearsResident $yr, ?Years $year, ?Resident $resident): array
    {
        return [
            'yrId'      => $yr->getId(),
            'residentId' => $resident?->getId(),
            'firstname' => $resident?->getFirstname(),
            'lastname'  => $resident?->getLastname(),
            'email'     => $resident?->getEmail(),
            'yearId'    => $year?->getId(),
            'yearTitle' => $year?->getTitle(),
            'optingOut' => $yr->getOptingOut(),
            'allowed'   => $yr->getAllowed(),
            'status'    => $this->computeStatus($yr),
            'createdAt' => $yr->getCreatedAt()->format(\DateTimeInterface::ATOM),
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
            'dateOfStart'   => $year->getDateOfStart()->format('Y-m-d'),
            'dateOfEnd'     => $year->getDateOfEnd()->format('Y-m-d'),
            'residentCount' => $year->getResidents()->count(),
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
        if ($my->getInvitedAt() !== null) {
            return 'pending';
        }
        $m = $my->getManager();
        if ($m === null || $m->getValidatedAt() === null) {
            return 'incomplete';
        }
        return 'active';
    }

    private function serializeManagerYears(ManagerYears $my, ?Years $year, ?Manager $manager): array
    {
        return [
            'myId'      => $my->getId(),
            'managerId' => $manager?->getId(),
            'firstname' => $manager?->getFirstname(),
            'lastname'  => $manager?->getLastname(),
            'email'     => $manager?->getEmail(),
            'job'       => $manager?->getJob(),
            'yearId'    => $year?->getId(),
            'yearTitle' => $year?->getTitle(),
            'status'    => $this->computeManagerStatus($my),
        ];
    }
}
