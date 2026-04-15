<?php

declare(strict_types=1);

namespace App\Services;

use Symfony\Component\HttpFoundation\File\UploadedFile;

/**
 * Shared helper for processing an avatar file upload.
 *
 * Validates the file (MIME type, size), saves it to the uploads directory,
 * removes any previous avatar, and sets the new filename on the entity.
 *
 * The entity must implement getAvatarPath(): ?string  and  setAvatarPath(?string).
 */
class AvatarUploadHelper
{
    private const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
    private const MAX_SIZE_BYTES     = 2 * 1024 * 1024; // 2 MB

    public function __construct(private readonly string $uploadsDir)
    {
    }

    /**
     * Process an uploaded avatar file and attach it to the entity.
     *
     * @throws \InvalidArgumentException on validation failure (message is user-safe)
     */
    public function process(UploadedFile $file, object $entity): void
    {
        if ($file->getSize() > self::MAX_SIZE_BYTES) {
            throw new \InvalidArgumentException('Le fichier dépasse 2 Mo');
        }

        $mime = $file->getMimeType();
        if (!in_array($mime, self::ALLOWED_MIME_TYPES, true)) {
            throw new \InvalidArgumentException('Format non supporté. Utilisez JPG, PNG ou WebP');
        }

        $ext = match ($mime) {
            'image/jpeg' => 'jpg',
            'image/png'  => 'png',
            'image/webp' => 'webp',
            default      => 'jpg',
        };

        $uploadPath = rtrim($this->uploadsDir, '/') . '/';
        if (!is_dir($uploadPath)) {
            mkdir($uploadPath, 0755, true);
        }

        // Remove previous avatar file if any
        if (method_exists($entity, 'getAvatarPath')) {
            $current = $entity->getAvatarPath();
            if ($current !== null && is_file($uploadPath . $current)) {
                unlink($uploadPath . $current);
            }
        }

        $filename = bin2hex(random_bytes(16)) . '.' . $ext;
        $file->move($uploadPath, $filename);

        if (method_exists($entity, 'setAvatarPath')) {
            $entity->setAvatarPath($filename);
        }
    }
}
