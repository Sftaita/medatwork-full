<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\HospitalAdmin;
use App\Entity\Manager;
use App\Entity\Resident;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\ResponseHeaderBag;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Endpoints for user profile picture upload / deletion.
 * All routes require authentication (JWT) — see security.yaml.
 *
 * POST   /api/profile/avatar   multipart/form-data field "avatar"
 * DELETE /api/profile/avatar
 */
#[Route('/api/profile')]
class ProfileAvatarController extends AbstractController
{
    private const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
    private const MAX_SIZE_BYTES     = 2 * 1024 * 1024; // 2 MB
    private const UPLOAD_SUBDIR      = 'uploads/avatars/';

    public function __construct(
        private readonly string $uploadsBaseUrl,
        private readonly string $uploadsDir,
    ) {
    }

    /**
     * Upload (or replace) the profile picture of the authenticated user.
     */
    #[Route('/avatar', name: 'profile_avatar_upload', methods: ['POST'])]
    public function upload(Request $request, EntityManagerInterface $em): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof HospitalAdmin && !$user instanceof Manager && !$user instanceof Resident) {
            return new JsonResponse(['message' => 'Non autorisé'], Response::HTTP_UNAUTHORIZED);
        }

        $file = $request->files->get('avatar');
        if ($file === null) {
            return new JsonResponse(['message' => 'Aucun fichier fourni'], Response::HTTP_BAD_REQUEST);
        }

        if ($file->getSize() > self::MAX_SIZE_BYTES) {
            return new JsonResponse(['message' => 'Le fichier dépasse 2 Mo'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $mime = $file->getMimeType();
        if (!in_array($mime, self::ALLOWED_MIME_TYPES, true)) {
            return new JsonResponse(
                ['message' => 'Format non supporté. Utilisez JPG, PNG ou WebP'],
                Response::HTTP_UNPROCESSABLE_ENTITY
            );
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
        $this->deleteAvatarFile($user, $uploadPath);

        $filename = bin2hex(random_bytes(16)) . '.' . $ext;
        $file->move($uploadPath, $filename);

        $user->setAvatarPath($filename);
        $em->flush();

        return new JsonResponse([
            'avatarUrl' => $this->buildAvatarUrl($filename),
        ]);
    }

    /**
     * Delete the profile picture of the authenticated user.
     */
    #[Route('/avatar', name: 'profile_avatar_delete', methods: ['DELETE'])]
    public function delete(EntityManagerInterface $em): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof HospitalAdmin && !$user instanceof Manager && !$user instanceof Resident) {
            return new JsonResponse(['message' => 'Non autorisé'], Response::HTTP_UNAUTHORIZED);
        }

        $uploadPath = rtrim($this->uploadsDir, '/') . '/';
        $this->deleteAvatarFile($user, $uploadPath);

        $user->setAvatarPath(null);
        $em->flush();

        return new JsonResponse(null, Response::HTTP_NO_CONTENT);
    }

    private function deleteAvatarFile(HospitalAdmin|Manager|Resident $user, string $uploadPath): void
    {
        $current = $user->getAvatarPath();
        if ($current !== null && is_file($uploadPath . $current)) {
            unlink($uploadPath . $current);
        }
    }

    /**
     * Serve an avatar image publicly (no auth required).
     * The URL uses only the hex token — no image extension — to bypass CDN restrictions
     * on shared hosting (Hostinger hcdn blocks PHP-served .jpg/.png URLs).
     */
    #[Route('/avatar/{token}', name: 'profile_avatar_serve', methods: ['GET'], requirements: ['token' => '[a-f0-9]{32}'])]
    public function serve(string $token): Response
    {
        $dir = rtrim($this->uploadsDir, '/') . '/';

        // Find the file — stored as {token}.{ext}
        $found = null;
        foreach (['jpg', 'png', 'webp'] as $ext) {
            $candidate = $dir . $token . '.' . $ext;
            if (is_file($candidate)) {
                $found = $candidate;
                break;
            }
        }

        if ($found === null) {
            return new Response('', Response::HTTP_NOT_FOUND);
        }

        $mime = mime_content_type($found) ?: 'image/jpeg';
        $response = new BinaryFileResponse($found);
        $response->headers->set('Content-Type', $mime);
        $response->setContentDisposition(ResponseHeaderBag::DISPOSITION_INLINE, basename($found));
        $response->headers->set('Cache-Control', 'public, max-age=31536000, immutable');
        return $response;
    }

    private function buildAvatarUrl(string $filename): string
    {
        // Strip extension from filename to get the token (e.g. "abc123...def.jpg" → "abc123...def")
        $token = pathinfo($filename, PATHINFO_FILENAME);
        return rtrim($this->uploadsBaseUrl, '/') . '/api/profile/avatar/' . $token;
    }
}
