<?php

declare(strict_types=1);

namespace App\Controller;

use App\DTO\HospitalRequestInputDTO;
use App\Entity\HospitalRequest;
use App\Entity\Manager;
use App\Enum\HospitalRequestStatus;
use App\Repository\HospitalRequestRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Hospital request endpoints for managers.
 * A manager submits a request when their hospital is not in the list yet.
 */
#[Route('/api/hospital-requests')]
class HospitalRequestController extends AbstractController
{
    #[Route('', name: 'hospital_request_create', methods: ['POST'])]
    public function create(Request $request, EntityManagerInterface $em, HospitalRequestRepository $requestRepository): JsonResponse
    {
        $user = $this->getUser();
        if (! $user instanceof Manager) {
            return new JsonResponse(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
        }

        try {
            $dto = HospitalRequestInputDTO::fromRequest($request);
        } catch (\InvalidArgumentException $e) {
            return new JsonResponse(['message' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
        }

        // Prevent duplicate pending requests for the same hospital name by the same manager
        $existing = $requestRepository->findOneBy([
            'requestedBy'  => $user,
            'hospitalName' => $dto->hospitalName,
            'status'       => HospitalRequestStatus::Pending,
        ]);

        if ($existing !== null) {
            return $this->json(['message' => 'ok']);
        }

        $hospitalRequest = (new HospitalRequest())
            ->setHospitalName($dto->hospitalName)
            ->setRequestedBy($user);

        $em->persist($hospitalRequest);
        $em->flush();

        return $this->json(['message' => 'ok', 'id' => $hospitalRequest->getId()], Response::HTTP_CREATED);
    }

    #[Route('', name: 'hospital_request_list', methods: ['GET'])]
    public function list(HospitalRequestRepository $requestRepository): JsonResponse
    {
        $user = $this->getUser();
        if (! $user instanceof Manager) {
            return new JsonResponse(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
        }

        $result = [];
        foreach ($requestRepository->findBy(['requestedBy' => $user], ['createdAt' => 'DESC']) as $req) {
            $result[] = [
                'id'           => $req->getId(),
                'hospitalName' => $req->getHospitalName(),
                'status'       => $req->getStatus()->value,
                'createdAt'    => $req->getCreatedAt()->format(\DateTimeInterface::ATOM),
            ];
        }

        return $this->json($result);
    }
}
