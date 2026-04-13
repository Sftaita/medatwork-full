<?php

declare(strict_types=1);

namespace App\Controller\GeneralAPI;

use App\Controller\MailerController;
use App\DTO\ContactMessageInputDTO;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

class ContactUsController extends AbstractController
{
    #[Route('/api/contactUs', name: 'contactUs', methods: ['POST'])]
    public function redirectMessage(Request $request, MailerController $mailerController): JsonResponse|Response
    {
        try {
            $dto = ContactMessageInputDTO::fromRequest($request);
        } catch (\InvalidArgumentException $e) {
            return new JsonResponse(['error' => $e->getMessage()], 400);
        }

        $subject = 'MED@WORK — Contact: '.$dto->lastname.' '.$dto->firstname;
        $parameters = [
            'subject' => $subject,
            'name'    => $dto->lastname.' '.$dto->firstname,
            'email'   => $dto->email,
            'message' => $dto->message,
        ];

        $mailerController->sendEmail(
            'support@medatwork.be',
            $subject,
            'email/simpleEmail.html.twig',
            $parameters,
            $dto->email   // Reply-To = l'email du visiteur
        );

        return new Response('ok', 200);
    }
}
