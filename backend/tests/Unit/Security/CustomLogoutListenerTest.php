<?php

declare(strict_types=1);

namespace App\Tests\Unit\Security;

use App\Security\CustomLogoutListener;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Security\Http\Event\LogoutEvent;

/**
 * Tests for CustomLogoutListener.
 *
 * The listener must return a JSON response (not a redirect) so that the
 * React SPA can handle navigation itself without CORS issues on the redirect.
 */
final class CustomLogoutListenerTest extends TestCase
{
    private function buildListener(): CustomLogoutListener
    {
        return new CustomLogoutListener();
    }

    private function buildEvent(): LogoutEvent
    {
        return new LogoutEvent(new Request(), null);
    }

    public function testListenerSetsAResponse(): void
    {
        $event = $this->buildEvent();
        $this->buildListener()->onSymfonyComponentSecurityHttpEventLogoutEvent($event);

        $this->assertNotNull($event->getResponse());
    }

    public function testResponseIsJsonResponse(): void
    {
        $event = $this->buildEvent();
        $this->buildListener()->onSymfonyComponentSecurityHttpEventLogoutEvent($event);

        $this->assertInstanceOf(JsonResponse::class, $event->getResponse());
    }

    public function testStatusCodeIs200(): void
    {
        $event = $this->buildEvent();
        $this->buildListener()->onSymfonyComponentSecurityHttpEventLogoutEvent($event);

        $this->assertSame(Response::HTTP_OK, $event->getResponse()?->getStatusCode());
    }

    public function testResponseBodyContainsMessage(): void
    {
        $event = $this->buildEvent();
        $this->buildListener()->onSymfonyComponentSecurityHttpEventLogoutEvent($event);

        $body = json_decode((string) $event->getResponse()?->getContent(), true);
        $this->assertArrayHasKey('message', $body);
    }
}
