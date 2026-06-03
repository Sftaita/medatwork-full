<?php

declare(strict_types=1);

namespace App\Tests\Unit\Services;

use App\Compliance\DTO\ComplianceIssue;
use App\Compliance\DTO\ComplianceReport;
use App\Compliance\Enum\ComplianceIssueType;
use App\Compliance\Enum\ComplianceSeverity;
use App\Entity\Manager;
use App\Entity\Resident;
use App\Entity\Years;
use App\Repository\ManagerRepository;
use App\Repository\ManagerYearsRepository;
use App\Services\ComplianceAlertNotificationService;
use App\Services\NotificationDecisionService;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;

/**
 * P2-A — ComplianceAlertNotificationService
 *
 * Ce service envoie une NotificationManager agrégée à chaque manager
 * d'une année lorsqu'un résident présente des problèmes de conformité.
 *
 * Ces tests ÉCHOUENT car la classe n'existe pas encore.
 *
 * CA-P2-01 : manager email=true → reçoit la notification
 * CA-P2-02 : manager email=false → ne reçoit pas
 * CA-P2-03 : préférence annuelle OFF → ne reçoit pas
 * CA-P2-04 : 2 managers (A=true, B=false) → seul A reçoit
 * CA-P2-05 : rapport avec 2 issues → 1 seule notification par manager (agrégé)
 * CA-P2-06 : rapport sans issue → aucune notification (early return)
 * CA-P2-07 : 3 managers → shouldSend appelé exactement 3 fois
 */
class ComplianceAlertNotificationServiceTest extends TestCase
{
    private const MANAGER_A   = 1;
    private const MANAGER_B   = 2;
    private const MANAGER_C   = 3;
    private const RESIDENT_ID = 10;

    // ── Factories ─────────────────────────────────────────────────────────────

    private function mockManager(int $id): Manager
    {
        $m = $this->createMock(Manager::class);
        $m->method('getId')->willReturn($id);
        $m->method('getFirstname')->willReturn('Test');
        $m->method('getLastname')->willReturn('Manager'.(string) $id);
        return $m;
    }

    private function mockResident(): Resident
    {
        $r = $this->createMock(Resident::class);
        $r->method('getId')->willReturn(self::RESIDENT_ID);
        $r->method('getFirstname')->willReturn('Alice');
        $r->method('getLastname')->willReturn('Dupont');
        return $r;
    }

    private function mockYear(): Years
    {
        $y = $this->createMock(Years::class);
        $y->method('getId')->willReturn(42);
        $y->method('getTitle')->willReturn('Cardio 2025');
        return $y;
    }

    private function makeIssue(): ComplianceIssue
    {
        return new ComplianceIssue(
            type:        ComplianceIssueType::WeeklyAbsoluteLimitExceeded,
            severity:    ComplianceSeverity::Critical,
            weekStart:   '2026-05-26',
            description: 'Semaine dépassant 60h',
        );
    }

    private function makeReport(int $issueCount): ComplianceReport
    {
        $issues = array_fill(0, $issueCount, $this->makeIssue());
        return new ComplianceReport(
            residentId:  self::RESIDENT_ID,
            periodStart: '2026-05-01',
            periodEnd:   '2026-05-31',
            issues:      $issues,
        );
    }

    /**
     * Construit le service avec des managers configurables.
     *
     * @param int[] $managerIds IDs des managers de l'année
     */
    private function buildService(
        EntityManagerInterface      $em,
        NotificationDecisionService $decisionService,
        array                       $managerIds,
    ): ComplianceAlertNotificationService {
        $rows = array_map(fn(int $id) => ['managerId' => $id], $managerIds);

        $managerYearsRepo = $this->createMock(ManagerYearsRepository::class);
        $managerYearsRepo->method('fetchYearManagers')->willReturn($rows);

        $managers    = array_map(fn(int $id) => $this->mockManager($id), $managerIds);
        $managerRepo = $this->createMock(ManagerRepository::class);
        $managerRepo->method('findBy')->willReturn($managers);

        return new ComplianceAlertNotificationService(
            $decisionService,
            $managerYearsRepo,
            $managerRepo,
            $em,
        );
    }

    // ── CA-P2-01 ──────────────────────────────────────────────────────────────

    /**
     * Manager A (email=true) + rapport avec 1 issue → A reçoit 1 notification.
     *
     * RED : classe inexistante → Error on class not found.
     */
    public function testManagerWithEmailOnReceivesNotification(): void
    {
        $em              = $this->createMock(EntityManagerInterface::class);
        $decisionService = $this->createMock(NotificationDecisionService::class);

        $decisionService->method('shouldSend')->willReturn(true);

        $em->expects(self::exactly(1))->method('persist');
        $em->expects(self::once())->method('flush');

        $service = $this->buildService($em, $decisionService, [self::MANAGER_A]);

        $service->notifyForReport(
            $this->makeReport(1),
            $this->mockYear(),
            $this->mockResident(),
        );
    }

    // ── CA-P2-02 ──────────────────────────────────────────────────────────────

    /**
     * Manager A (email=false) + rapport avec 1 issue → aucune notification.
     *
     * RED : classe inexistante.
     */
    public function testManagerWithEmailOffReceivesNoNotification(): void
    {
        $em              = $this->createMock(EntityManagerInterface::class);
        $decisionService = $this->createMock(NotificationDecisionService::class);

        $decisionService->method('shouldSend')->willReturn(false);

        $em->expects(self::never())->method('persist');

        $service = $this->buildService($em, $decisionService, [self::MANAGER_A]);

        $service->notifyForReport(
            $this->makeReport(1),
            $this->mockYear(),
            $this->mockResident(),
        );
    }

    // ── CA-P2-03 ──────────────────────────────────────────────────────────────

    /**
     * Préférence annuelle COMPLIANCE_ALERT désactivée → aucune notification
     * (shouldSend retourne false car annual OFF supplante global ON).
     *
     * Le service délègue entièrement à NotificationDecisionService.
     * Ce test documente que c'est bien NDS qui décide, pas le service de notif.
     */
    public function testAnnualPrefOffBlocksNotification(): void
    {
        $em              = $this->createMock(EntityManagerInterface::class);
        $decisionService = $this->createMock(NotificationDecisionService::class);

        // shouldSend retourne false (simule annual pref=false)
        $decisionService->expects(self::atLeastOnce())->method('shouldSend')
            ->with(
                'manager',
                self::MANAGER_A,
                self::anything(),
                'COMPLIANCE_ALERT',
                'email',
            )
            ->willReturn(false);

        $em->expects(self::never())->method('persist');

        $service = $this->buildService($em, $decisionService, [self::MANAGER_A]);

        $service->notifyForReport(
            $this->makeReport(1),
            $this->mockYear(),
            $this->mockResident(),
        );
    }

    // ── CA-P2-04 ──────────────────────────────────────────────────────────────

    /**
     * 2 managers : A email=true, B email=false → seul A reçoit.
     *
     * RED : classe inexistante.
     */
    public function testTwoManagersOnlyTrueReceivesNotification(): void
    {
        $em              = $this->createMock(EntityManagerInterface::class);
        $decisionService = $this->createMock(NotificationDecisionService::class);

        $decisionService->method('shouldSend')
            ->willReturnCallback(
                fn(string $type, int $id): bool => $id === self::MANAGER_A
            );

        // Seul A = 1 persist
        $em->expects(self::exactly(1))->method('persist');

        $service = $this->buildService($em, $decisionService, [self::MANAGER_A, self::MANAGER_B]);

        $service->notifyForReport(
            $this->makeReport(1),
            $this->mockYear(),
            $this->mockResident(),
        );
    }

    // ── CA-P2-05 ──────────────────────────────────────────────────────────────

    /**
     * Rapport avec 2 issues conformité pour le même résident.
     * → 1 seule notification par manager (agrégée), pas 2.
     *
     * Comportement documenté : les issues sont agrégées en une notification.
     * Justification : éviter le spam en cas de violations multiples.
     */
    public function testMultipleIssuesProduceSingleNotificationPerManager(): void
    {
        $em              = $this->createMock(EntityManagerInterface::class);
        $decisionService = $this->createMock(NotificationDecisionService::class);

        $decisionService->method('shouldSend')->willReturn(true);

        // 2 issues mais 1 seule notification (agrégée)
        $em->expects(self::exactly(1))->method('persist');

        $service = $this->buildService($em, $decisionService, [self::MANAGER_A]);

        $service->notifyForReport(
            $this->makeReport(2),   // 2 issues
            $this->mockYear(),
            $this->mockResident(),
        );
    }

    // ── CA-P2-06 ──────────────────────────────────────────────────────────────

    /**
     * Rapport sans aucune issue → early return, aucune notification.
     *
     * Justification : la commande nightly passe pour tous les résidents
     * même s'ils sont conformes. Il ne faut rien envoyer dans ce cas.
     */
    public function testNoIssuesProducesNoNotification(): void
    {
        $em              = $this->createMock(EntityManagerInterface::class);
        $decisionService = $this->createMock(NotificationDecisionService::class);

        // shouldSend ne doit pas être appelé si pas d'issues
        $decisionService->expects(self::never())->method('shouldSend');
        $em->expects(self::never())->method('persist');
        $em->expects(self::never())->method('flush');

        $service = $this->buildService($em, $decisionService, [self::MANAGER_A]);

        $service->notifyForReport(
            $this->makeReport(0),   // rapport vide
            $this->mockYear(),
            $this->mockResident(),
        );
    }

    // ── CA-P2-07 ──────────────────────────────────────────────────────────────

    /**
     * 3 managers liés à l'année.
     * shouldSend doit être appelé exactement 3 fois (une fois par manager).
     *
     * Garantit que la décision est prise individuellement, jamais globalement.
     */
    public function testShouldSendCalledOncePerManager(): void
    {
        $em              = $this->createMock(EntityManagerInterface::class);
        $decisionService = $this->createMock(NotificationDecisionService::class);
        $em->method('flush');
        $em->method('persist');

        $decisionService->expects(self::exactly(3))
            ->method('shouldSend')
            ->with(
                'manager',
                self::anything(),
                self::anything(),
                'COMPLIANCE_ALERT',
                'email',
            )
            ->willReturn(true);

        $service = $this->buildService(
            $em,
            $decisionService,
            [self::MANAGER_A, self::MANAGER_B, self::MANAGER_C],
        );

        $service->notifyForReport(
            $this->makeReport(1),
            $this->mockYear(),
            $this->mockResident(),
        );
    }

    // ════════════════════════════════════════════════════════════════════════════
    // QW-1 / QW-2 / QW-3 — Enrichissement du contenu des notifications
    // ════════════════════════════════════════════════════════════════════════════

    /**
     * Helper pour capturer l'objet NotificationManager persisted.
     * Passe $captured par référence pour que le callback puisse y écrire.
     *
     * @param list<\App\Entity\NotificationManager> $captured  Référence vers le tableau de capture
     */
    private function capturingEm(array &$captured): EntityManagerInterface
    {
        $em = $this->createMock(EntityManagerInterface::class);
        $em->method('flush');
        $em->method('persist')->willReturnCallback(
            static function ($notification) use (&$captured): void {
                $captured[] = $notification;
            }
        );
        return $em;
    }

    private function makeWarningIssue(): ComplianceIssue
    {
        return new ComplianceIssue(
            type:        ComplianceIssueType::SmoothedAverageWarning,
            severity:    ComplianceSeverity::Warning,
            weekStart:   '2026-05-26',
            description: 'Moyenne lissée à 51,8 h (seuil d\'attention : 48 h).',
        );
    }

    // ── CA-QW-01 : titre contient le nom de l'année ───────────────────────────

    /**
     * Le titre de la notification doit contenir le nom de l'année
     * pour permettre au manager d'identifier l'année concernée immédiatement.
     *
     * RED : titre actuel = "Alerte de conformité — Alice Dupont" (pas d'année)
     */
    public function testTitleContainsYearName(): void
    {
        $captured = [];
        $em = $this->capturingEm($captured);
        $decisionService = $this->createMock(NotificationDecisionService::class);
        $decisionService->method('shouldSend')->willReturn(true);

        $service = $this->buildService($em, $decisionService, [self::MANAGER_A]);
        $service->notifyForReport(
            $this->makeReport(1),
            $this->mockYear(),   // getTitle() → 'Cardio 2025'
            $this->mockResident(),
        );

        self::assertNotEmpty($captured);
        self::assertStringContainsString(
            'Cardio 2025',
            $captured[0]->getObject(),
            'QW-1 : le titre doit contenir le nom de l\'année'
        );
    }

    // ── CA-QW-02 : titre indique CRITIQUE pour issues critiques ──────────────

    /**
     * Quand le rapport contient au moins une issue Critical,
     * le titre doit contenir un indicateur CRITIQUE (texte ou préfixe).
     *
     * RED : titre actuel n'a pas d'indicateur de sévérité.
     */
    public function testTitleIndicatesCriticalSeverity(): void
    {
        $captured = [];
        $em = $this->capturingEm($captured);
        $decisionService = $this->createMock(NotificationDecisionService::class);
        $decisionService->method('shouldSend')->willReturn(true);

        // makeIssue() produit une issue Critical
        $service = $this->buildService($em, $decisionService, [self::MANAGER_A]);
        $service->notifyForReport(
            $this->makeReport(1),
            $this->mockYear(),
            $this->mockResident(),
        );

        self::assertNotEmpty($captured);
        self::assertMatchesRegularExpression(
            '/CRITIQUE|critique|critical/i',
            $captured[0]->getObject(),
            'QW-2 : le titre doit indiquer la sévérité critique'
        );
    }

    // ── CA-QW-03 : titre indique AVERTISSEMENT pour issues warning uniquement ─

    /**
     * Quand le rapport ne contient que des issues Warning,
     * le titre doit indiquer AVERTISSEMENT (pas CRITIQUE).
     *
     * RED : pas d'indicateur de sévérité actuellement.
     */
    public function testTitleIndicatesWarningWhenOnlyWarningIssues(): void
    {
        $captured = [];
        $em = $this->capturingEm($captured);
        $decisionService = $this->createMock(NotificationDecisionService::class);
        $decisionService->method('shouldSend')->willReturn(true);

        // Rapport avec uniquement des issues Warning
        $warningReport = new ComplianceReport(
            residentId:  self::RESIDENT_ID,
            periodStart: '2026-05-01',
            periodEnd:   '2026-05-31',
            issues:      [$this->makeWarningIssue()],
        );

        $service = $this->buildService($em, $decisionService, [self::MANAGER_A]);
        $service->notifyForReport($warningReport, $this->mockYear(), $this->mockResident());

        self::assertNotEmpty($captured);
        $title = $captured[0]->getObject();

        self::assertMatchesRegularExpression(
            '/AVERTISSEMENT|avertissement|warning/i',
            $title,
            'QW-3 : le titre doit indiquer AVERTISSEMENT quand pas de critical'
        );
        self::assertDoesNotMatchRegularExpression(
            '/CRITIQUE|critique/i',
            $title,
            'QW-3 : le titre NE doit PAS indiquer CRITIQUE pour un avertissement'
        );
    }

    // ── CA-QW-04 : body contient la description de la violation ──────────────

    /**
     * Le corps de la notification doit inclure la description de l'issue
     * afin que le manager comprenne immédiatement ce qui s'est passé.
     *
     * RED : body actuel = "X présente N problème(s)..." (sans descriptions)
     */
    public function testBodyContainsIssueDescription(): void
    {
        $captured = [];
        $em = $this->capturingEm($captured);
        $decisionService = $this->createMock(NotificationDecisionService::class);
        $decisionService->method('shouldSend')->willReturn(true);

        $issue = new ComplianceIssue(
            type:        ComplianceIssueType::WeeklyAbsoluteLimitExceeded,
            severity:    ComplianceSeverity::Critical,
            weekStart:   '2026-05-26',
            description: 'La semaine 22 dépasse 60h.',
        );
        $report = new ComplianceReport(
            residentId:  self::RESIDENT_ID,
            periodStart: '2026-05-01',
            periodEnd:   '2026-05-31',
            issues:      [$issue],
        );

        $service = $this->buildService($em, $decisionService, [self::MANAGER_A]);
        $service->notifyForReport($report, $this->mockYear(), $this->mockResident());

        self::assertNotEmpty($captured);
        self::assertStringContainsString(
            'La semaine 22 dépasse 60h.',
            $captured[0]->getBody(),
            'QW-4 : le body doit contenir la description de la violation'
        );
    }

    // ── CA-QW-05 : body liste plusieurs violations (jusqu'à 3) ───────────────

    /**
     * Avec 3 issues, toutes les descriptions doivent apparaître dans le body.
     */
    public function testBodyListsUpToThreeIssueDescriptions(): void
    {
        $captured = [];
        $em = $this->capturingEm($captured);
        $decisionService = $this->createMock(NotificationDecisionService::class);
        $decisionService->method('shouldSend')->willReturn(true);

        $issues = [
            new ComplianceIssue(ComplianceIssueType::WeeklyAbsoluteLimitExceeded, ComplianceSeverity::Critical, '2026-05-26', 'Violation S22'),
            new ComplianceIssue(ComplianceIssueType::MinimumRestViolated,          ComplianceSeverity::Critical, '2026-05-26', 'Repos insuffisant'),
            new ComplianceIssue(ComplianceIssueType::MaxShiftDurationExceeded,     ComplianceSeverity::Critical, '2026-05-26', 'Prestation > 24h'),
        ];
        $report = new ComplianceReport(self::RESIDENT_ID, '2026-05-01', '2026-05-31', $issues);

        $service = $this->buildService($em, $decisionService, [self::MANAGER_A]);
        $service->notifyForReport($report, $this->mockYear(), $this->mockResident());

        self::assertNotEmpty($captured);
        $body = $captured[0]->getBody();

        self::assertStringContainsString('Violation S22',      $body);
        self::assertStringContainsString('Repos insuffisant',  $body);
        self::assertStringContainsString('Prestation > 24h',   $body);
    }

    // ── CA-QW-06 : body tronqué avec fallback au-delà de 3 violations ────────

    /**
     * Avec plus de 3 issues, les 3 premières sont listées
     * et un texte "et N autre(s)" indique qu'il y en a davantage.
     *
     * Évite un body trop long et dirige le manager vers l'interface.
     */
    public function testBodyTruncatesAfterThreeIssuesWithFallback(): void
    {
        $captured = [];
        $em = $this->capturingEm($captured);
        $decisionService = $this->createMock(NotificationDecisionService::class);
        $decisionService->method('shouldSend')->willReturn(true);

        $issues = [
            new ComplianceIssue(ComplianceIssueType::WeeklyAbsoluteLimitExceeded, ComplianceSeverity::Critical, '2026-05-26', 'Violation 1'),
            new ComplianceIssue(ComplianceIssueType::MinimumRestViolated,          ComplianceSeverity::Critical, '2026-05-26', 'Violation 2'),
            new ComplianceIssue(ComplianceIssueType::MaxShiftDurationExceeded,     ComplianceSeverity::Critical, '2026-05-26', 'Violation 3'),
            new ComplianceIssue(ComplianceIssueType::SmoothedAverageExceeded,      ComplianceSeverity::Critical, '2026-05-26', 'Violation 4'),
            new ComplianceIssue(ComplianceIssueType::SmoothedAverageWarning,       ComplianceSeverity::Warning,  '2026-05-26', 'Violation 5'),
        ];
        $report = new ComplianceReport(self::RESIDENT_ID, '2026-05-01', '2026-05-31', $issues);

        $service = $this->buildService($em, $decisionService, [self::MANAGER_A]);
        $service->notifyForReport($report, $this->mockYear(), $this->mockResident());

        self::assertNotEmpty($captured);
        $body = $captured[0]->getBody();

        // Les 3 premières présentes
        self::assertStringContainsString('Violation 1', $body);
        self::assertStringContainsString('Violation 2', $body);
        self::assertStringContainsString('Violation 3', $body);

        // La 4e et 5e pas listées individuellement
        self::assertStringNotContainsString('Violation 4', $body);
        self::assertStringNotContainsString('Violation 5', $body);

        // Le fallback mentionne "2 autre(s)"
        self::assertMatchesRegularExpression(
            '/2\s+autre/i',
            $body,
            'QW-6 : le body doit indiquer "2 autre(s)" pour les violations non listées'
        );
    }

    // ════════════════════════════════════════════════════════════════════════════
    // P2-C — metadata deep link (MC-01 à MC-06)
    // ════════════════════════════════════════════════════════════════════════════

    // ── MC-01 : metadata contient yearId ─────────────────────────────────────

    /**
     * RED : setMetadata() n'est pas encore appelé dans le service.
     */
    public function testMetadataContainsYearId(): void
    {
        $captured        = [];
        $em              = $this->capturingEm($captured);
        $decisionService = $this->createMock(NotificationDecisionService::class);
        $decisionService->method('shouldSend')->willReturn(true);

        $year = $this->createMock(Years::class);
        $year->method('getId')->willReturn(7);
        $year->method('getTitle')->willReturn('Cardiologie 2025-2026');

        $service = $this->buildService($em, $decisionService, [self::MANAGER_A]);
        $service->notifyForReport($this->makeReport(1), $year, $this->mockResident());

        self::assertNotEmpty($captured);
        $metadata = $captured[0]->getMetadata();
        self::assertIsArray($metadata, 'MC-01 : metadata doit être un tableau');
        self::assertSame(7, $metadata['yearId'], 'MC-01 : metadata.yearId doit correspondre à year.getId()');
    }

    // ── MC-02 : metadata contient yearTitle ──────────────────────────────────

    public function testMetadataContainsYearTitle(): void
    {
        $captured        = [];
        $em              = $this->capturingEm($captured);
        $decisionService = $this->createMock(NotificationDecisionService::class);
        $decisionService->method('shouldSend')->willReturn(true);

        $year = $this->createMock(Years::class);
        $year->method('getId')->willReturn(7);
        $year->method('getTitle')->willReturn('Cardiologie 2025-2026');

        $service = $this->buildService($em, $decisionService, [self::MANAGER_A]);
        $service->notifyForReport($this->makeReport(1), $year, $this->mockResident());

        self::assertNotEmpty($captured);
        $metadata = $captured[0]->getMetadata();
        self::assertSame('Cardiologie 2025-2026', $metadata['yearTitle'],
            'MC-02 : metadata.yearTitle doit correspondre à year.getTitle()'
        );
    }

    // ── MC-03 : metadata.tab = 'compliance' ──────────────────────────────────

    public function testMetadataTabIsCompliance(): void
    {
        $captured        = [];
        $em              = $this->capturingEm($captured);
        $decisionService = $this->createMock(NotificationDecisionService::class);
        $decisionService->method('shouldSend')->willReturn(true);

        $year = $this->createMock(Years::class);
        $year->method('getId')->willReturn(7);
        $year->method('getTitle')->willReturn('Cardio');

        $service = $this->buildService($em, $decisionService, [self::MANAGER_A]);
        $service->notifyForReport($this->makeReport(1), $year, $this->mockResident());

        $metadata = $captured[0]->getMetadata();
        self::assertSame('compliance', $metadata['tab'],
            'MC-03 : metadata.tab doit toujours être "compliance" pour COMPLIANCE_ALERT'
        );
    }

    // ── MC-04 : metadata.severity = 'critical' pour issues critiques ─────────

    public function testMetadataSeverityIsCriticalWhenReportHasCriticalIssues(): void
    {
        $captured        = [];
        $em              = $this->capturingEm($captured);
        $decisionService = $this->createMock(NotificationDecisionService::class);
        $decisionService->method('shouldSend')->willReturn(true);

        $year = $this->createMock(Years::class);
        $year->method('getId')->willReturn(7);
        $year->method('getTitle')->willReturn('Cardio');

        // makeReport(1) génère une issue Critical par défaut
        $service = $this->buildService($em, $decisionService, [self::MANAGER_A]);
        $service->notifyForReport($this->makeReport(1), $year, $this->mockResident());

        $metadata = $captured[0]->getMetadata();
        self::assertSame('critical', $metadata['severity'],
            'MC-04 : metadata.severity = "critical" quand hasCriticalIssues() = true'
        );
    }

    // ── MC-05 : metadata.severity = 'warning' pour rapport warning uniquement ─

    public function testMetadataSeverityIsWarningForWarningOnlyReport(): void
    {
        $captured        = [];
        $em              = $this->capturingEm($captured);
        $decisionService = $this->createMock(NotificationDecisionService::class);
        $decisionService->method('shouldSend')->willReturn(true);

        $year = $this->createMock(Years::class);
        $year->method('getId')->willReturn(7);
        $year->method('getTitle')->willReturn('Cardio');

        $warningReport = new ComplianceReport(
            residentId:  self::RESIDENT_ID,
            periodStart: '2026-05-01',
            periodEnd:   '2026-05-31',
            issues:      [$this->makeWarningIssue()],
        );

        $service = $this->buildService($em, $decisionService, [self::MANAGER_A]);
        $service->notifyForReport($warningReport, $year, $this->mockResident());

        $metadata = $captured[0]->getMetadata();
        self::assertSame('warning', $metadata['severity'],
            'MC-05 : metadata.severity = "warning" quand hasCriticalIssues() = false'
        );
    }

    // ── MC-06 : metadata.version = 1 ─────────────────────────────────────────

    /**
     * Le champ version permet de gérer l'évolution du format metadata.
     * Valeur initiale = 1.
     */
    public function testMetadataVersionIsOne(): void
    {
        $captured        = [];
        $em              = $this->capturingEm($captured);
        $decisionService = $this->createMock(NotificationDecisionService::class);
        $decisionService->method('shouldSend')->willReturn(true);

        $year = $this->createMock(Years::class);
        $year->method('getId')->willReturn(7);
        $year->method('getTitle')->willReturn('Cardio');

        $service = $this->buildService($em, $decisionService, [self::MANAGER_A]);
        $service->notifyForReport($this->makeReport(1), $year, $this->mockResident());

        $metadata = $captured[0]->getMetadata();
        self::assertSame(1, $metadata['version'],
            'MC-06 : metadata.version doit être 1 (version initiale du format)'
        );
    }
}
