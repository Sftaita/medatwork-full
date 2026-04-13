<?php

declare(strict_types=1);

namespace App\Security;

use Lexik\Bundle\JWTAuthenticationBundle\Event\AuthenticationSuccessEvent;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpFoundation\Cookie;

class RefreshedTokenListener implements EventSubscriberInterface
{
    public function __construct(
        private readonly int $ttl,
    ) {
    }

    public function setRefreshToken(AuthenticationSuccessEvent $event): void
    {
        $refreshToken = $event->getData()['refresh_token'] ?? null;

        if (! $refreshToken) {
            return;
        }

        $event->getResponse()->headers->setCookie(new Cookie(
            'REFRESH_TOKEN',
            $refreshToken,
            (new \DateTime())->add(new \DateInterval('PT' . $this->ttl . 'S')),
            '/',
            null,
            null,   // secure: auto (true on HTTPS, false on HTTP)
            true,   // httpOnly
            false,  // raw
            Cookie::SAMESITE_STRICT
        ));
        $event->getResponse()->headers->set('Content-Type', 'application/json');
    }

    public static function getSubscribedEvents()
    {
        return [
            'lexik_jwt_authentication.on_authentication_success' => [
                ['setRefreshToken'],
            ],
        ];
    }
}
