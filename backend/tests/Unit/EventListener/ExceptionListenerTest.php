<?php

declare(strict_types=1);

namespace App\Tests\Unit\EventListener;

use App\EventListener\ExceptionListener;
use PHPUnit\Framework\TestCase;
use Psr\Log\LoggerInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Event\ExceptionEvent;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\HttpKernelInterface;
use Symfony\Component\Security\Core\Exception\AccessDeniedException;
use Symfony\Component\Security\Core\Exception\AuthenticationCredentialsNotFoundException;

class ExceptionListenerTest extends TestCase
{
    private ExceptionListener $listener;

    protected function setUp(): void
    {
        $this->listener = new ExceptionListener(
            $this->createStub(LoggerInterface::class)
        );
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private function makeEvent(string $path, \Throwable $exception): ExceptionEvent
    {
        $kernel  = $this->createStub(HttpKernelInterface::class);
        $request = Request::create($path);

        return new ExceptionEvent($kernel, $request, HttpKernelInterface::MAIN_REQUEST, $exception);
    }

    // ── non-API routes ────────────────────────────────────────────────────────

    public function testNonApiRouteIsIgnored(): void
    {
        $event = $this->makeEvent('/login', new \RuntimeException('boom'));
        $this->listener->onKernelException($event);

        self::assertNull($event->getResponse());
    }

    // ── HTTP exceptions ───────────────────────────────────────────────────────

    public function testNotFoundHttpExceptionReturns404(): void
    {
        $event = $this->makeEvent('/api/foo', new NotFoundHttpException('Introuvable.'));
        $this->listener->onKernelException($event);

        $response = $event->getResponse();
        self::assertNotNull($response);
        self::assertSame(404, $response->getStatusCode());
        self::assertStringContainsString('Introuvable.', $response->getContent() ?: '');
    }

    public function testBadRequestHttpExceptionReturns400(): void
    {
        $event = $this->makeEvent('/api/foo', new BadRequestHttpException('Champ manquant.'));
        $this->listener->onKernelException($event);

        $response = $event->getResponse();
        self::assertNotNull($response);
        self::assertSame(400, $response->getStatusCode());
        self::assertStringContainsString('Champ manquant.', $response->getContent() ?: '');
    }

    // ── security exceptions ───────────────────────────────────────────────────

    public function testAccessDeniedExceptionReturns403(): void
    {
        $event = $this->makeEvent('/api/managers/foo', new AccessDeniedException());
        $this->listener->onKernelException($event);

        $response = $event->getResponse();
        self::assertNotNull($response);
        self::assertSame(403, $response->getStatusCode());
        $body = json_decode($response->getContent() ?: '{}', true);
        self::assertSame('Accès refusé.', $body['message'] ?? '');
    }

    public function testAuthenticationExceptionReturns401(): void
    {
        $event = $this->makeEvent('/api/foo', new AuthenticationCredentialsNotFoundException());
        $this->listener->onKernelException($event);

        $response = $event->getResponse();
        self::assertNotNull($response);
        self::assertSame(401, $response->getStatusCode());
        self::assertStringContainsString('Authentification requise.', $response->getContent() ?: '');
    }

    // ── \InvalidArgumentException (DTO validation) ────────────────────────────

    public function testInvalidArgumentExceptionReturns400(): void
    {
        $event = $this->makeEvent('/api/foo', new \InvalidArgumentException('Le champ yearId est requis.'));
        $this->listener->onKernelException($event);

        $response = $event->getResponse();
        self::assertNotNull($response);
        self::assertSame(400, $response->getStatusCode());
        self::assertStringContainsString('Le champ yearId est requis.', $response->getContent() ?: '');
    }

    public function testInvalidArgumentExceptionWithEmptyMessageReturns400WithFallback(): void
    {
        $event = $this->makeEvent('/api/foo', new \InvalidArgumentException(''));
        $this->listener->onKernelException($event);

        $response = $event->getResponse();
        self::assertNotNull($response);
        self::assertSame(400, $response->getStatusCode());
        $body = json_decode($response->getContent() ?: '{}', true);
        self::assertSame('Données invalides.', $body['message'] ?? '');
    }

    // ── generic \Exception → 500, no internal details ─────────────────────────

    public function testGenericExceptionReturns500WithoutInternalDetails(): void
    {
        $event = $this->makeEvent('/api/foo', new \RuntimeException('PDO connection refused at 127.0.0.1:3306'));
        $this->listener->onKernelException($event);

        $response = $event->getResponse();
        self::assertNotNull($response);
        self::assertSame(500, $response->getStatusCode());
        // Internal error message must NOT be leaked to the client
        self::assertStringNotContainsString('PDO', $response->getContent() ?: '');
        self::assertStringNotContainsString('127.0.0.1', $response->getContent() ?: '');
        self::assertStringContainsString('erreur interne', $response->getContent() ?: '');
    }

    // ── subclass of \InvalidArgumentException (e.g. InvalidYearException) ────

    public function testSubclassOfInvalidArgumentExceptionReturns400(): void
    {
        $subclass = new class ('yearId invalide.') extends \InvalidArgumentException {};

        $event = $this->makeEvent('/api/managers/validationList/abc', $subclass);
        $this->listener->onKernelException($event);

        $response = $event->getResponse();
        self::assertNotNull($response);
        self::assertSame(400, $response->getStatusCode());
        self::assertStringContainsString('yearId invalide.', $response->getContent() ?: '');
    }
}
