<?php

declare(strict_types=1);

namespace App\EventListener;

use Psr\Log\LoggerInterface;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Event\ExceptionEvent;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\KernelEvents;
use Symfony\Component\Security\Core\Exception\AccessDeniedException;
use Symfony\Component\Security\Core\Exception\AuthenticationException;

class ExceptionListener implements EventSubscriberInterface
{
    public function __construct(private readonly LoggerInterface $logger)
    {
    }

    public static function getSubscribedEvents(): array
    {
        return [KernelEvents::EXCEPTION => ['onKernelException', 0]];
    }

    public function onKernelException(ExceptionEvent $event): void
    {
        // Only handle /api routes
        if (! str_starts_with($event->getRequest()->getPathInfo(), '/api')) {
            return;
        }

        $exception = $event->getThrowable();
        $statusCode = $this->resolveStatusCode($exception);

        // Log server errors (5xx) with full details; client errors (4xx) at lower level
        if ($statusCode >= 500) {
            $this->logger->error('Unhandled exception', [
                'exception' => $exception->getMessage(),
                'file' => $exception->getFile(),
                'line' => $exception->getLine(),
                'path' => $event->getRequest()->getPathInfo(),
            ]);
        } else {
            $this->logger->info('Client error', [
                'status' => $statusCode,
                'path' => $event->getRequest()->getPathInfo(),
            ]);
        }

        $event->setResponse(new JsonResponse(
            ['message' => $this->resolveMessage($exception, $statusCode)],
            $statusCode
        ));
    }

    private function resolveStatusCode(\Throwable $exception): int
    {
        if ($exception instanceof HttpExceptionInterface) {
            return $exception->getStatusCode();
        }
        if ($exception instanceof AccessDeniedException) {
            return Response::HTTP_FORBIDDEN;
        }
        if ($exception instanceof AuthenticationException) {
            return Response::HTTP_UNAUTHORIZED;
        }
        if ($exception instanceof \InvalidArgumentException) {
            return Response::HTTP_BAD_REQUEST;
        }
        return Response::HTTP_INTERNAL_SERVER_ERROR;
    }

    private function resolveMessage(\Throwable $exception, int $statusCode): string
    {
        // Never expose internal error details to the client
        if ($statusCode >= 500) {
            return 'Une erreur interne est survenue. Veuillez réessayer plus tard.';
        }
        if ($exception instanceof AccessDeniedException) {
            return 'Accès refusé.';
        }
        if ($exception instanceof AuthenticationException) {
            return 'Authentification requise.';
        }
        // For 4xx HttpExceptions, the message is safe to return
        if ($exception instanceof HttpExceptionInterface) {
            return $exception->getMessage() ?: Response::$statusTexts[$statusCode] ?? 'Erreur.';
        }
        if ($exception instanceof \InvalidArgumentException) {
            return $exception->getMessage() ?: 'Données invalides.';
        }
        return 'Une erreur est survenue.';
    }
}
