<?php

declare(strict_types=1);

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

class VersionController extends AbstractController
{
    private const VERSION = '3.7.0';

    #[Route('/api/version', name: 'app_version', methods: ['GET'])]
    public function version(): JsonResponse
    {
        return new JsonResponse([
            'version' => self::VERSION,
            'app'     => 'MED@WORK API',
        ]);
    }
}
