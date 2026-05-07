<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\NotificationManager;
use App\Enum\ManagerJob;
use App\Enum\Sexe;
use App\Repository\HospitalAdminRepository;
use App\Repository\ManagerRepository;
use App\Services\AvatarUploadHelper;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Public endpoints for Manager account setup (new managers) and year-invitation acceptance/refusal.
 * All routes are PUBLIC — see security.yaml.
 */
#[Route('/api/managers')]
class ManagerInviteController extends AbstractController
{
    public function __construct(
        private readonly MailerController $mailer,
        private readonly string $frontendUrl,
    ) {
    }

    private function renderPage(string $title, string $message, string $color = '#a439b6'): string
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
                h1 { color: {$color}; font-size: 1.4rem; margin-bottom: 12px; }
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

    // ── Setup (new managers) ──────────────────────────────────────────────────

    /**
     * GET /api/managers/setup/{token}
     * Returns context for the new manager profile completion page.
     */
    #[Route('/setup/{token}', name: 'manager_setup_check', methods: ['GET'])]
    public function checkSetupToken(string $token, ManagerRepository $repo): JsonResponse
    {
        $manager = $repo->findOneBy(['token' => $token]);

        if ($manager === null) {
            return new JsonResponse(['message' => 'Lien invalide'], Response::HTTP_NOT_FOUND);
        }

        if ($manager->getValidatedAt() !== null) {
            return new JsonResponse(['message' => 'Ce lien a déjà été utilisé'], Response::HTTP_GONE);
        }

        if ($manager->getTokenExpiration() === null || $manager->getTokenExpiration() < new \DateTime()) {
            return new JsonResponse(['message' => 'Ce lien a expiré'], Response::HTTP_GONE);
        }

        $hospitalName = null;
        $yearTitle    = null;
        foreach ($manager->getManagerYears() as $my) {
            if ($my->getInvitedAt() !== null) {
                $hospitalName = $my->getYears()?->getHospital()?->getName();
                $yearTitle    = $my->getYears()?->getTitle();
                break;
            }
        }

        return $this->json([
            'firstname'    => $manager->getFirstname(),
            'lastname'     => $manager->getLastname(),
            'email'        => $manager->getEmail(),
            'hospitalName' => $hospitalName,
            'yearTitle'    => $yearTitle,
        ]);
    }

    /**
     * POST /api/managers/setup/{token}
     * Complete profile for a new manager and accept the year invitation.
     * Body: { password, sexe, job }
     */
    #[Route('/setup/{token}', name: 'manager_setup_complete', methods: ['POST'])]
    public function completeSetup(
        string $token,
        Request $request,
        ManagerRepository $repo,
        EntityManagerInterface $em,
        UserPasswordHasherInterface $passwordHasher,
        AvatarUploadHelper $avatarHelper,
    ): JsonResponse {
        $manager = $repo->findOneBy(['token' => $token]);

        if ($manager === null) {
            return new JsonResponse(['message' => 'Lien invalide'], Response::HTTP_NOT_FOUND);
        }

        if ($manager->getValidatedAt() !== null) {
            return new JsonResponse(['message' => 'Ce lien a déjà été utilisé'], Response::HTTP_GONE);
        }

        if ($manager->getTokenExpiration() === null || $manager->getTokenExpiration() < new \DateTime()) {
            return new JsonResponse(['message' => 'Ce lien a expiré'], Response::HTTP_GONE);
        }

        // Accept both JSON and multipart/form-data
        $isMultipart = str_contains($request->headers->get('Content-Type', ''), 'multipart');
        if ($isMultipart) {
            $data = $request->request->all();
        } else {
            $data = json_decode($request->getContent(), true);
            if (!is_array($data)) {
                return new JsonResponse(['message' => 'JSON invalide'], Response::HTTP_BAD_REQUEST);
            }
        }

        $password = trim((string) ($data['password'] ?? ''));
        $sexeVal  = trim((string) ($data['sexe'] ?? ''));
        $jobVal   = trim((string) ($data['job'] ?? ''));

        if (strlen($password) < 8) {
            return new JsonResponse(['message' => 'Le mot de passe doit contenir au moins 8 caractères'], Response::HTTP_BAD_REQUEST);
        }

        $sexe = Sexe::tryFrom($sexeVal);
        if ($sexe === null) {
            return new JsonResponse(['message' => 'Sexe invalide (male ou female)'], Response::HTTP_BAD_REQUEST);
        }

        $job = ManagerJob::tryFrom($jobVal);
        if ($job === null) {
            $valid = implode(', ', array_column(ManagerJob::cases(), 'value'));
            return new JsonResponse(['message' => "Fonction invalide. Valeurs acceptées : $valid"], Response::HTTP_BAD_REQUEST);
        }

        $manager
            ->setPassword($passwordHasher->hashPassword($manager, $password))
            ->setSexe($sexe)
            ->setJob($job)
            ->setValidatedAt(new \DateTime())
            ->setToken(null)
            ->setTokenExpiration(null);

        foreach ($manager->getManagerYears() as $my) {
            if ($my->getInvitedAt() !== null) {
                $my->setInvitedAt(null);
            }
            // Ajouter le manager à l'hôpital de chaque année (source de vérité pour auto-ajout futur)
            $hospital = $my->getYears()?->getHospital();
            if ($hospital !== null && !$manager->getHospitals()->contains($hospital)) {
                $manager->addHospital($hospital);
            }
        }

        // Optional avatar upload
        $avatarFile = $request->files->get('avatar');
        if ($avatarFile !== null) {
            try {
                $avatarHelper->process($avatarFile, $manager);
            } catch (\InvalidArgumentException $e) {
                return new JsonResponse(['message' => $e->getMessage()], Response::HTTP_UNPROCESSABLE_ENTITY);
            }
        }

        $em->flush();

        return $this->json(['message' => 'Compte activé avec succès'], Response::HTTP_OK);
    }

    // ── Year invitation (existing managers) ───────────────────────────────────

    /**
     * GET /api/managers/accept-year/{token}
     * Accept a year invitation. Returns HTML.
     */
    #[Route('/accept-year/{token}', name: 'manager_accept_year', methods: ['GET'])]
    public function acceptYearInvite(string $token, ManagerRepository $repo, EntityManagerInterface $em): Response
    {
        $manager = $repo->findOneBy(['token' => $token]);

        if ($manager === null || $manager->getTokenExpiration() === null || $manager->getTokenExpiration() < new \DateTime()) {
            return new Response(
                $this->renderPage('Lien invalide', 'Ce lien est invalide ou a expiré. Contactez votre responsable.', '#c0392b'),
                Response::HTTP_GONE,
                ['Content-Type' => 'text/html'],
            );
        }

        foreach ($manager->getManagerYears() as $my) {
            if ($my->getInvitedAt() !== null) {
                $my->setInvitedAt(null);
            }
            // Lier le manager à l'hôpital pour que les prochaines années l'auto-ajoutent
            $hospital = $my->getYears()?->getHospital();
            if ($hospital !== null && !$manager->getHospitals()->contains($hospital)) {
                $manager->addHospital($hospital);
            }
        }

        $manager->setToken(null)->setTokenExpiration(null);
        $em->flush();

        return new Response(
            $this->renderPage('Invitation acceptée !', 'Vous avez rejoint l\'année académique. Connectez-vous à MED@WORK pour accéder à votre espace manager.'),
            Response::HTTP_OK,
            ['Content-Type' => 'text/html'],
        );
    }

    /**
     * GET /api/managers/refuse-year/{token}
     * Refuse a year invitation. Returns HTML.
     */
    #[Route('/refuse-year/{token}', name: 'manager_refuse_year', methods: ['GET'])]
    public function refuseYearInvite(
        string $token,
        ManagerRepository $repo,
        HospitalAdminRepository $hospitalAdminRepo,
        EntityManagerInterface $em,
    ): Response {
        $manager = $repo->findOneBy(['token' => $token]);

        if ($manager === null || $manager->getTokenExpiration() === null || $manager->getTokenExpiration() < new \DateTime()) {
            return new Response(
                $this->renderPage('Lien invalide', 'Ce lien est invalide ou a expiré.', '#c0392b'),
                Response::HTTP_GONE,
                ['Content-Type' => 'text/html'],
            );
        }

        $isNew      = $manager->getValidatedAt() === null;
        $allYrs     = $manager->getManagerYears()->toArray();
        $pendingYrs = array_filter($allYrs, fn ($my) => $my->getInvitedAt() !== null);
        $activeYrs  = array_filter($allYrs, fn ($my) => $my->getInvitedAt() === null);

        // Collect info for admin notifications before removing the pending years
        $refusedSummary = [];
        foreach ($pendingYrs as $my) {
            $hospital = $my->getYears()?->getHospital();
            if ($hospital !== null) {
                $refusedSummary[] = [
                    'hospital'  => $hospital,
                    'yearTitle' => $my->getYears()?->getTitle() ?? '—',
                ];
            }
            $em->remove($my);
        }

        if ($isNew && empty($activeYrs)) {
            $em->remove($manager);
        } else {
            $manager->setToken(null)->setTokenExpiration(null);
        }

        $em->flush();

        // Notify hospital admins for each refused year
        $managerName = trim(($manager->getFirstname() ?? '') . ' ' . ($manager->getLastname() ?? ''));
        foreach ($refusedSummary as ['hospital' => $hospital, 'yearTitle' => $yearTitle]) {
            $subject = sprintf('%s a refusé l\'invitation à l\'année "%s"', $managerName, $yearTitle);
            $body    = sprintf(
                '%s a refusé votre invitation à rejoindre l\'année "%s" de l\'hôpital %s.',
                $managerName,
                $yearTitle,
                $hospital->getName(),
            );

            // Notify HospitalAdmin entities (email only — no in-app for HospitalAdmin entity)
            foreach ($hospitalAdminRepo->findBy(['hospital' => $hospital]) as $ha) {
                try {
                    $this->mailer->sendEmail(
                        $ha->getEmail(),
                        $subject,
                        'email/managerRefusedYear.html.twig',
                        [
                            'adminFirstname' => $ha->getFirstname() ?? '',
                            'managerName'    => $managerName,
                            'yearTitle'      => $yearTitle,
                            'hospitalName'   => $hospital->getName(),
                        ],
                    );
                } catch (\Throwable) { /* email non bloquant */ }
            }

            // Notify Manager-type hospital admins (email + in-app notification)
            foreach ($hospital->getManagers() as $adminManager) {
                if ($adminManager->getAdminHospital()?->getId() !== $hospital->getId()) {
                    continue;
                }
                try {
                    $this->mailer->sendEmail(
                        $adminManager->getEmail(),
                        $subject,
                        'email/managerRefusedYear.html.twig',
                        [
                            'adminFirstname' => $adminManager->getFirstname() ?? '',
                            'managerName'    => $managerName,
                            'yearTitle'      => $yearTitle,
                            'hospitalName'   => $hospital->getName(),
                        ],
                    );
                } catch (\Throwable) { /* email non bloquant */ }

                $notif = (new NotificationManager())
                    ->setManager($adminManager)
                    ->setObject('Invitation refusée')
                    ->setBody($body)
                    ->setType('invitation_refused')
                    ->setCreatedAt(new \DateTime())
                    ->setIsRead(false);
                $em->persist($notif);
            }
        }

        $em->flush();

        return new Response(
            $this->renderPage('Invitation refusée', 'Vous avez refusé l\'invitation. Votre accès a été annulé.'),
            Response::HTTP_OK,
            ['Content-Type' => 'text/html'],
        );
    }
}
