<?php

declare(strict_types=1);

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

class SecurityController extends AbstractController
{
    #[Route('/logout_redirect', name: 'logout_redirect', methods: ['GET'])]
    public function logout_response(): Response
    {
        return new Response('Logout completed', 200);
    }
}
