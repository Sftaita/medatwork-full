<?php

declare(strict_types=1);

namespace App\Tests\Unit\Controller;

use App\Controller\ProfileAvatarController;
use App\Entity\HospitalAdmin;
use App\Entity\Manager;
use App\Entity\Resident;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\Container;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Security\Core\Authentication\Token\UsernamePasswordToken;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorage;

/**
 * Unit tests for ProfileAvatarController.
 *
 * Covers:
 * - POST /api/profile/avatar → 401 when not authenticated
 * - POST /api/profile/avatar → 400 when no file provided
 * - POST /api/profile/avatar → 422 when file exceeds 2 MB
 * - POST /api/profile/avatar → 422 when MIME type is not allowed
 * - POST /api/profile/avatar → 200 with avatarUrl on success (Manager)
 * - POST /api/profile/avatar → 200 with avatarUrl on success (Resident)
 * - POST /api/profile/avatar → 200 with avatarUrl on success (HospitalAdmin)
 * - POST /api/profile/avatar → calls setAvatarPath on entity
 * - POST /api/profile/avatar → deletes previous avatar file if one existed
 * - DELETE /api/profile/avatar → 401 when not authenticated
 * - DELETE /api/profile/avatar → 204 when no previous avatar
 * - DELETE /api/profile/avatar → 204 and sets avatarPath to null
 */
final class ProfileAvatarControllerTest extends TestCase
{
    private string $tmpDir;
    private EntityManagerInterface $em;

    protected function setUp(): void
    {
        $this->tmpDir = sys_get_temp_dir() . '/avatar_test_' . uniqid();
        mkdir($this->tmpDir . '/public/uploads/avatars/', 0755, true);

        $this->em = $this->createMock(EntityManagerInterface::class);
    }

    protected function tearDown(): void
    {
        // Clean up temp directory
        $this->rrmdir($this->tmpDir);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function buildController(mixed $user = null): ProfileAvatarController
    {
        $controller = new ProfileAvatarController($this->tmpDir);
        $container  = new Container();

        $tokenStorage = new TokenStorage();
        if ($user !== null) {
            $token = new UsernamePasswordToken($user, 'main', []);
            $tokenStorage->setToken($token);
        }
        $container->set('security.token_storage', $tokenStorage);
        $controller->setContainer($container);

        return $controller;
    }

    /**
     * Create a temp UploadedFile with real image magic bytes so Symfony's
     * finfo-based getMimeType() detects the correct MIME type.
     *
     * @param string $type  'jpeg' | 'png' | 'webp' | 'invalid'
     */
    private function makeUploadedFile(string $type = 'jpeg', int $extraBytes = 0): UploadedFile
    {
        $tmp = tempnam(sys_get_temp_dir(), 'avatar_');

        switch ($type) {
            case 'jpeg':
                // Minimal JPEG: SOI + APP0 + EOI
                $header = "\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00\xFF\xD9";
                file_put_contents($tmp, $header . str_repeat("\x00", $extraBytes));
                $ext  = 'jpg';
                break;
            case 'png':
                // 1x1 black pixel PNG (base64-encoded)
                $content = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');
                file_put_contents($tmp, $content . str_repeat("\x00", $extraBytes));
                $ext = 'png';
                break;
            case 'webp':
                // Minimal WebP RIFF header
                $header = "RIFF\x24\x00\x00\x00WEBPVP8 \x18\x00\x00\x00\x30\x01\x00\x9d\x01\x2a\x01\x00\x01\x00\x00\x34\x25\x9f\x11\x00\x00\xfe\xd3\x96\x00\x00";
                file_put_contents($tmp, $header . str_repeat("\x00", $extraBytes));
                $ext = 'webp';
                break;
            default: // 'invalid'
                file_put_contents($tmp, str_repeat('x', 100));
                $ext = 'txt';
                break;
        }

        return new UploadedFile($tmp, 'photo.' . $ext, null, null, true);
    }

    private function makeRequestWithFile(UploadedFile $file): Request
    {
        return new Request([], [], [], [], ['avatar' => $file], ['HTTP_HOST' => 'localhost:8000', 'HTTPS' => 'off']);
    }

    private function rrmdir(string $dir): void
    {
        if (!is_dir($dir)) return;
        foreach (scandir($dir) as $entry) {
            if ($entry === '.' || $entry === '..') continue;
            $path = $dir . '/' . $entry;
            is_dir($path) ? $this->rrmdir($path) : unlink($path);
        }
        rmdir($dir);
    }

    // ── POST — upload ─────────────────────────────────────────────────────────

    public function testUploadReturns401WhenNotAuthenticated(): void
    {
        $response = $this->buildController(null)->upload(new Request(), $this->em);
        $this->assertSame(401, $response->getStatusCode());
    }

    public function testUploadReturns400WhenNoFileprovided(): void
    {
        $user = $this->createMock(Manager::class);
        $response = $this->buildController($user)->upload(new Request(), $this->em);
        $this->assertSame(400, $response->getStatusCode());
    }

    public function testUploadReturns422WhenFileTooLarge(): void
    {
        $user    = $this->createMock(Manager::class);
        $bigFile = $this->makeUploadedFile('jpeg', 3 * 1024 * 1024); // valid JPEG header + 3 MB padding
        $request = $this->makeRequestWithFile($bigFile);

        $response = $this->buildController($user)->upload($request, $this->em);
        $this->assertSame(422, $response->getStatusCode());
        $data = json_decode((string) $response->getContent(), true);
        $this->assertStringContainsString('2 Mo', $data['message']);
    }

    public function testUploadReturns422WhenMimeTypeNotAllowed(): void
    {
        $user       = $this->createMock(Manager::class);
        $invalidFile = $this->makeUploadedFile('invalid'); // plain text — finfo detects as text/plain
        $request    = $this->makeRequestWithFile($invalidFile);

        $response = $this->buildController($user)->upload($request, $this->em);
        $this->assertSame(422, $response->getStatusCode());
        $data = json_decode((string) $response->getContent(), true);
        $this->assertStringContainsString('Format non supporté', $data['message']);
    }

    public function testUploadReturns200WithAvatarUrlForManager(): void
    {
        $user = $this->createMock(Manager::class);
        $user->method('getAvatarPath')->willReturn(null);
        $user->method('setAvatarPath')->willReturnSelf();

        $file    = $this->makeUploadedFile('jpeg');
        $request = $this->makeRequestWithFile($file);

        $this->em->expects($this->once())->method('flush');

        $response = $this->buildController($user)->upload($request, $this->em);
        $this->assertSame(200, $response->getStatusCode());
        $data = json_decode((string) $response->getContent(), true);
        $this->assertArrayHasKey('avatarUrl', $data);
        $this->assertStringContainsString('/uploads/avatars/', $data['avatarUrl']);
    }

    public function testUploadReturns200ForResident(): void
    {
        $user = $this->createMock(Resident::class);
        $user->method('getAvatarPath')->willReturn(null);
        $user->method('setAvatarPath')->willReturnSelf();

        $file    = $this->makeUploadedFile('png');
        $request = $this->makeRequestWithFile($file);

        $response = $this->buildController($user)->upload($request, $this->em);
        $this->assertSame(200, $response->getStatusCode());
    }

    public function testUploadReturns200ForHospitalAdmin(): void
    {
        $user = $this->createMock(HospitalAdmin::class);
        $user->method('getAvatarPath')->willReturn(null);
        $user->method('setAvatarPath')->willReturnSelf();

        $file    = $this->makeUploadedFile('jpeg');
        $request = $this->makeRequestWithFile($file);

        $response = $this->buildController($user)->upload($request, $this->em);
        $this->assertSame(200, $response->getStatusCode());
    }

    public function testUploadCallsSetAvatarPathOnEntity(): void
    {
        $user = $this->createMock(Manager::class);
        $user->method('getAvatarPath')->willReturn(null);
        $user->expects($this->once())->method('setAvatarPath')
            ->with($this->matchesRegularExpression('/^[0-9a-f]+\.jpg$/'))
            ->willReturnSelf();

        $file    = $this->makeUploadedFile('jpeg');
        $request = $this->makeRequestWithFile($file);

        $this->buildController($user)->upload($request, $this->em);
    }

    public function testUploadDeletesPreviousAvatarFile(): void
    {
        $existingFilename = 'old_avatar.jpg';
        $existingPath     = $this->tmpDir . '/public/uploads/avatars/' . $existingFilename;
        file_put_contents($existingPath, 'old image data');

        $user = $this->createMock(Manager::class);
        $user->method('getAvatarPath')->willReturn($existingFilename);
        $user->method('setAvatarPath')->willReturnSelf();

        $file    = $this->makeUploadedFile('jpeg');
        $request = $this->makeRequestWithFile($file);

        $this->buildController($user)->upload($request, $this->em);

        $this->assertFileDoesNotExist($existingPath, 'Old avatar file should have been deleted');
    }

    // ── DELETE — delete ───────────────────────────────────────────────────────

    public function testDeleteReturns401WhenNotAuthenticated(): void
    {
        $response = $this->buildController(null)->delete($this->em);
        $this->assertSame(401, $response->getStatusCode());
    }

    public function testDeleteReturns204WhenNoAvatar(): void
    {
        $user = $this->createMock(Manager::class);
        $user->method('getAvatarPath')->willReturn(null);
        $user->expects($this->once())->method('setAvatarPath')->with(null)->willReturnSelf();

        $this->em->expects($this->once())->method('flush');

        $response = $this->buildController($user)->delete($this->em);
        $this->assertSame(204, $response->getStatusCode());
    }

    public function testDeleteRemovesAvatarFileAndSetsPathToNull(): void
    {
        $existingFilename = 'to_delete.jpg';
        $existingPath     = $this->tmpDir . '/public/uploads/avatars/' . $existingFilename;
        file_put_contents($existingPath, 'image data');

        $user = $this->createMock(Resident::class);
        $user->method('getAvatarPath')->willReturn($existingFilename);
        $user->expects($this->once())->method('setAvatarPath')->with(null)->willReturnSelf();

        $response = $this->buildController($user)->delete($this->em);

        $this->assertSame(204, $response->getStatusCode());
        $this->assertFileDoesNotExist($existingPath, 'Avatar file should have been deleted');
    }
}
