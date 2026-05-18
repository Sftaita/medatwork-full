<?php

declare(strict_types=1);

namespace App\Controller\GeneralAPI;

use App\Controller\MailerController;
use App\DTO\ContactMessageInputDTO;
use App\Entity\ContactMessage;
use App\Repository\ContactCcConfigRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\RateLimiter\RateLimiterFactory;
use Symfony\Component\Routing\Attribute\Route;

class ContactUsController extends AbstractController
{
    public function __construct(
        private readonly RateLimiterFactory $contactUsLimiter,
    ) {
    }

    #[Route('/api/contactUs', name: 'contactUs', methods: ['POST'])]
    public function redirectMessage(
        Request $request,
        MailerController $mailerController,
        EntityManagerInterface $em,
        ContactCcConfigRepository $ccRepo,
    ): JsonResponse|Response {
        $limiter = $this->contactUsLimiter->create($request->getClientIp());
        if (!$limiter->consume(1)->isAccepted()) {
            return new JsonResponse(['error' => 'Trop de messages envoyés. Réessayez dans une heure.'], Response::HTTP_TOO_MANY_REQUESTS);
        }

        try {
            $dto = ContactMessageInputDTO::fromRequest($request);
        } catch (\InvalidArgumentException $e) {
            return new JsonResponse(['error' => $e->getMessage()], 400);
        }

        // Persist to DB
        $msg = new ContactMessage($dto->firstname, $dto->lastname, $dto->email, $dto->message);
        $em->persist($msg);
        $em->flush();

        // Send email with active CCs
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
            $dto->email,
            $ccRepo->findActiveEmails()
        );

        return new Response('ok', 200);
    }
}
