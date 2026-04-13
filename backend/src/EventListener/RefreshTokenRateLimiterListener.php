<?php

declare(strict_types=1);

namespace App\EventListener;

use Symfony\Component\EventDispatcher\Attribute\AsEventListener;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Event\RequestEvent;
use Symfony\Component\HttpKernel\KernelEvents;
use Symfony\Component\RateLimiter\RateLimiterFactoryInterface;

/**
 * Rate-limits the JWT refresh token endpoint (/api/token/refresh).
 *
 * The endpoint is provided by gesdinet/jwt-refresh-token-bundle and cannot be
 * modified directly; this listener intercepts requests before the bundle acts.
 *
 * Limit: 20 refreshes per 5 minutes per client IP (see rate_limiter.yaml).
 */
#[AsEventListener(event: KernelEvents::REQUEST, priority: 10)]
final class RefreshTokenRateLimiterListener
{
    private const REFRESH_PATH = '/api/token/refresh';

    public function __construct(
        private readonly RateLimiterFactoryInterface $tokenRefreshLimiter,
    ) {
    }

    public function __invoke(RequestEvent $event): void
    {
        if (! $event->isMainRequest()) {
            return;
        }

        $request = $event->getRequest();

        if ($request->getPathInfo() !== self::REFRESH_PATH) {
            return;
        }

        $limiter = $this->tokenRefreshLimiter->create($request->getClientIp());

        if (! $limiter->consume(1)->isAccepted()) {
            $event->setResponse(new JsonResponse(
                ['message' => 'Trop de tentatives de rafraîchissement. Réessayez dans quelques minutes.'],
                Response::HTTP_TOO_MANY_REQUESTS,
            ));
        }
    }
}
