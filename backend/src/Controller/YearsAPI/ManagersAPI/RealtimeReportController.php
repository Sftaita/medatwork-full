<?php

declare(strict_types=1);

namespace App\Controller\YearsAPI\ManagersAPI;

use App\Controller\MailerController;
use App\Repository\ManagerYearsRepository;
use App\Repository\YearsRepository;
use App\Security\Voter\YearAccessVoter;
use App\Services\NotificationDecisionService;
use App\Services\Realtime\RealtimeManagerService;
use Psr\Log\LoggerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\RateLimiter\RateLimiterFactoryInterface;
use Symfony\Component\Routing\Attribute\Route;

class RealtimeReportController extends AbstractController
{
    /**
     * Données temps réel pour tous les MACCS d'une année, pour un mois donné.
     *
     * Retourne la forme { weeks: string[], maccs: MaccsEntry[], yearTitle: string }
     * attendue par le composant React RealtimeTab.
     */
    #[Route('/api/manager/years/{yearId}/realtime/{month}', name: 'manager_realtime_data', methods: ['GET'])]
    public function getRealtimeData(
        int $yearId,
        int $month,
        Security $security,
        YearsRepository $yearsRepository,
        RealtimeManagerService $service,
    ): JsonResponse {
        if ($month < 1 || $month > 12) {
            return $this->json(['error' => 'Mois invalide (attendu 1–12).'], 400);
        }

        $year = $yearsRepository->findOneBy(['id' => $yearId]);
        if ($year === null) {
            return $this->json(['error' => 'Année introuvable.'], 404);
        }

        if (! $security->isGranted(YearAccessVoter::VIEW, $year)) {
            return $this->json(['error' => 'Accès refusé.'], 403);
        }

        return $this->json($service->buildForYear($year, $month));
    }

    /**
     * Envoie le rapport de présentation PDF aux managers liés à l'année.
     *
     * Body attendu : { pdfBase64: string, month: string }
     * Seuls les managers (ManagerYears) reçoivent l'email — jamais les MACCS.
     */
    #[Route('/api/manager/years/{yearId}/realtime-report/email-managers', name: 'manager_realtime_email', methods: ['POST'])]
    public function emailManagers(
        int $yearId,
        Request $request,
        Security $security,
        YearsRepository $yearsRepository,
        ManagerYearsRepository $managerYearsRepository,
        MailerController $mailer,
        RateLimiterFactoryInterface $managerMutationLimiter,
        LoggerInterface $logger,
        NotificationDecisionService $notificationDecision,
    ): JsonResponse {
        $limiter = $managerMutationLimiter->create($request->getClientIp());
        if (! $limiter->consume(1)->isAccepted()) {
            return $this->json(['error' => 'Trop de requêtes. Réessayez plus tard.'], 429);
        }

        $year = $yearsRepository->findOneBy(['id' => $yearId]);
        if ($year === null) {
            return $this->json(['error' => 'Année introuvable.'], 404);
        }

        if (! $security->isGranted(YearAccessVoter::VIEW, $year)) {
            return $this->json(['error' => 'Accès refusé.'], 403);
        }

        /** @var array{pdfBase64?: mixed, month?: mixed}|null $body */
        $body      = json_decode($request->getContent(), true);
        $pdfBase64 = isset($body['pdfBase64']) && is_string($body['pdfBase64']) ? $body['pdfBase64'] : null;
        $monthStr  = isset($body['month'])     && is_string($body['month'])     ? trim($body['month']) : null;

        if ($pdfBase64 === null || $monthStr === null || $monthStr === '') {
            return $this->json(['error' => 'Champs pdfBase64 et month requis.'], 400);
        }

        $managers = $managerYearsRepository->fetchYearManagers($year);
        $sent     = 0;
        $skipped  = 0;
        $errors   = [];

        foreach ($managers as $m) {
            $email = isset($m['email']) && is_string($m['email']) ? trim($m['email']) : '';
            if ($email === '') {
                continue;
            }

            $managerId = isset($m['managerId']) && $m['managerId'] !== null ? (int) $m['managerId'] : 0;
            if ($managerId > 0 && ! $notificationDecision->shouldSend('manager', $managerId, $year, 'REALTIME_REPORT', 'email')) {
                $skipped++;
                continue;
            }

            $firstname = (string) ($m['firstname'] ?? '');
            $lastname  = (string) ($m['lastname']  ?? '');
            $yearTitle = (string) $year->getTitle();

            try {
                $mailer->sendEmailWithPdfAttachment(
                    $email,
                    "Rapport temps réel MACCS — {$yearTitle} · {$monthStr}",
                    $this->buildEmailBody($firstname, $lastname, $yearTitle, $monthStr),
                    $pdfBase64,
                    "rapport-maccs-{$yearTitle}-{$monthStr}.pdf",
                );
                $sent++;
            } catch (\Throwable $e) {
                $logger->error('RealtimeReport email failed', [
                    'email'     => $email,
                    'exception' => $e->getMessage(),
                ]);
                $errors[] = $email;
            }
        }

        return $this->json(['message' => 'Rapport envoyé', 'sent' => $sent, 'skipped' => $skipped, 'errors' => $errors]);
    }

    private function buildEmailBody(string $firstname, string $lastname, string $yearTitle, string $month): string
    {
        $name = trim("{$firstname} {$lastname}") ?: 'Responsable';

        return <<<HTML
<p>Bonjour {$name},</p>
<p>Veuillez trouver en pièce jointe le rapport de présentation des heures prestées MACCS
pour <strong>{$yearTitle}</strong> ({$month}).</p>
<p>Ce rapport a été généré automatiquement depuis la plateforme <strong>MED@WORK</strong>.</p>
<p>Cordialement,<br>L'équipe MED@WORK</p>
HTML;
    }
}
