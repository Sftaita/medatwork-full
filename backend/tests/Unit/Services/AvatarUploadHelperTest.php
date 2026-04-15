<?php

declare(strict_types=1);

namespace App\Tests\Unit\Services;

use App\Services\AvatarUploadHelper;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\File\UploadedFile;

/**
 * Unit tests for AvatarUploadHelper::process().
 *
 * Covers:
 * - file too large (> 2 MB) → InvalidArgumentException
 * - disallowed MIME type     → InvalidArgumentException
 * - JPEG / PNG / WebP accepted
 * - filename is random 32-char hex + correct extension
 * - previous avatar file is deleted when it exists
 * - missing previous avatar file does not throw
 * - entity without avatar methods works silently
 * - uploads directory is created automatically when missing
 */
final class AvatarUploadHelperTest extends TestCase
{
    private string $tmpDir;

    protected function setUp(): void
    {
        $this->tmpDir = sys_get_temp_dir() . '/avatar_test_' . bin2hex(random_bytes(8));
        mkdir($this->tmpDir, 0755, true);
    }

    protected function tearDown(): void
    {
        foreach (glob($this->tmpDir . '/{,.}*', GLOB_BRACE) as $f) {
            if (is_file($f)) {
                unlink($f);
            }
        }
        if (is_dir($this->tmpDir)) {
            rmdir($this->tmpDir);
        }
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private function makeFile(int $size = 100, string $mime = 'image/jpeg'): UploadedFile
    {
        $file     = $this->createMock(UploadedFile::class);
        $fileMock = $this->createMock(\Symfony\Component\HttpFoundation\File\File::class);

        $file->method('getSize')->willReturn($size);
        $file->method('getMimeType')->willReturn($mime);
        // Simulate move(): write a placeholder so filesystem tests can verify the file, and return
        // a File mock (move() return type is File, so returning null would throw a TypeError).
        $file->method('move')->willReturnCallback(
            static function (string $dir, string $filename) use ($fileMock): \Symfony\Component\HttpFoundation\File\File {
                file_put_contents($dir . '/' . $filename, 'fake-image-data');

                return $fileMock;
            }
        );

        return $file;
    }

    private function makeEntity(?string $currentAvatar = null): object
    {
        return new class ($currentAvatar) {
            public ?string $avatarPath;

            public function __construct(?string $path)
            {
                $this->avatarPath = $path;
            }

            public function getAvatarPath(): ?string
            {
                return $this->avatarPath;
            }

            public function setAvatarPath(?string $path): static
            {
                $this->avatarPath = $path;

                return $this;
            }
        };
    }

    // ── validation failures ───────────────────────────────────────────────────

    public function testFileTooLargeThrowsInvalidArgument(): void
    {
        $file   = $this->makeFile(3 * 1024 * 1024); // 3 MB — exceeds 2 MB limit
        $entity = $this->makeEntity();
        $helper = new AvatarUploadHelper($this->tmpDir);

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('dépasse 2 Mo');
        $helper->process($file, $entity);
    }

    public function testExactlyTwoMegabytesIsAccepted(): void
    {
        $file   = $this->makeFile(2 * 1024 * 1024); // exactly 2 MB
        $entity = $this->makeEntity();
        $helper = new AvatarUploadHelper($this->tmpDir);

        $helper->process($file, $entity);

        $this->assertNotNull($entity->avatarPath);
    }

    /** @dataProvider disallowedMimeProvider */
    public function testDisallowedMimeTypeThrows(string $mime): void
    {
        $file   = $this->makeFile(100, $mime);
        $entity = $this->makeEntity();
        $helper = new AvatarUploadHelper($this->tmpDir);

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Format non supporté');
        $helper->process($file, $entity);
    }

    /** @return array<string, array{string}> */
    public static function disallowedMimeProvider(): array
    {
        return [
            'gif'  => ['image/gif'],
            'tiff' => ['image/tiff'],
            'bmp'  => ['image/bmp'],
            'pdf'  => ['application/pdf'],
        ];
    }

    // ── happy path ────────────────────────────────────────────────────────────

    /** @dataProvider validMimeProvider */
    public function testValidMimeTypeSetsAvatarPathWithCorrectExtension(string $mime, string $expectedExt): void
    {
        $file   = $this->makeFile(100, $mime);
        $entity = $this->makeEntity();
        $helper = new AvatarUploadHelper($this->tmpDir);

        $helper->process($file, $entity);

        $this->assertNotNull($entity->avatarPath);
        $this->assertStringEndsWith('.' . $expectedExt, $entity->avatarPath);
    }

    /** @return array<string, array{string, string}> */
    public static function validMimeProvider(): array
    {
        return [
            'jpeg' => ['image/jpeg', 'jpg'],
            'png'  => ['image/png',  'png'],
            'webp' => ['image/webp', 'webp'],
        ];
    }

    public function testFilenameIsRandomHexString(): void
    {
        $file   = $this->makeFile(100, 'image/jpeg');
        $entity = $this->makeEntity();
        $helper = new AvatarUploadHelper($this->tmpDir);

        $helper->process($file, $entity);

        // 32 lowercase hex chars + ".jpg"
        $this->assertMatchesRegularExpression('/^[0-9a-f]{32}\.jpg$/', $entity->avatarPath);
    }

    public function testTwoCallsProduceDifferentFilenames(): void
    {
        $helper = new AvatarUploadHelper($this->tmpDir);
        $e1     = $this->makeEntity();
        $e2     = $this->makeEntity();

        $helper->process($this->makeFile(), $e1);
        $helper->process($this->makeFile(), $e2);

        $this->assertNotSame($e1->avatarPath, $e2->avatarPath);
    }

    // ── previous avatar cleanup ───────────────────────────────────────────────

    public function testPreviousAvatarFileIsDeletedOnSuccess(): void
    {
        $prevPath = $this->tmpDir . '/oldavatar.jpg';
        file_put_contents($prevPath, 'old image data');

        $file   = $this->makeFile();
        $entity = $this->makeEntity('oldavatar.jpg');
        $helper = new AvatarUploadHelper($this->tmpDir);

        $helper->process($file, $entity);

        $this->assertFileDoesNotExist($prevPath);
        $this->assertNotSame('oldavatar.jpg', $entity->avatarPath);
    }

    public function testMissingPreviousAvatarFileDoesNotThrow(): void
    {
        $file   = $this->makeFile();
        $entity = $this->makeEntity('nonexistent_previous.jpg'); // file does not exist on disk
        $helper = new AvatarUploadHelper($this->tmpDir);

        $helper->process($file, $entity); // must not throw

        $this->assertNotNull($entity->avatarPath);
    }

    public function testNullPreviousAvatarSkipsDeletion(): void
    {
        $file   = $this->makeFile();
        $entity = $this->makeEntity(null); // no previous avatar
        $helper = new AvatarUploadHelper($this->tmpDir);

        $helper->process($file, $entity); // must not throw

        $this->assertNotNull($entity->avatarPath);
    }

    // ── entity without avatar interface ───────────────────────────────────────

    public function testEntityWithoutAvatarMethodsDoesNotThrow(): void
    {
        $file   = $this->makeFile();
        $entity = new \stdClass(); // no getAvatarPath() / setAvatarPath()
        $helper = new AvatarUploadHelper($this->tmpDir);

        $helper->process($file, $entity); // must not throw
        $this->assertTrue(true); // if we reach here, no exception was raised
    }

    // ── auto-create uploads directory ─────────────────────────────────────────

    public function testUploadsDirectoryIsCreatedWhenMissing(): void
    {
        $subDir = $this->tmpDir . '/sub/nested';
        // Do NOT pre-create the directory
        $file   = $this->makeFile();
        $entity = $this->makeEntity();
        $helper = new AvatarUploadHelper($subDir);

        $helper->process($file, $entity);

        $this->assertDirectoryExists($subDir);

        // cleanup
        array_map('unlink', glob($subDir . '/*') ?: []);
        rmdir($subDir);
        rmdir($this->tmpDir . '/sub');
    }
}
