<?php

declare(strict_types=1);

namespace App\Controller\ResidentsAPI\ResidentsAPI;

use App\DTO\UpdateResidentAccountInputDTO;
use App\Entity\Resident;
use App\Repository\ResidentRepository;
use App\Services\Resident\UpdateResident;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Core\Exception\AccessDeniedException;

class AccountController extends AbstractController
{
    #[Route('/api/residents/userInfo', name: 'getMyResidentUserInfo', methods: ['GET'])]
    public function GetInfo(Security $security, ResidentRepository $residentRepository): JsonResponse
    {
        $user = $security->getUser();
        if (! $user instanceof Resident) {
            throw new AccessDeniedException();
        }
        $resident = $residentRepository->find($user);
        if ($resident === null) {
            throw new AccessDeniedException();
        }

        $info = [
            'firstname' => $resident->getFirstname(),
            'lastname' => $resident->getLastname(),
            'dateOfBirth' => $resident->getDateOfBirth(),
            'university' => $resident->getUniversity(),
            'email' => $resident->getEmail(),
            'sexe' => $resident->getSexe()->value,
            'dateOfMaster' => $resident->getDateOfMaster(),
            'speciality' => $resident->getSpeciality(),
        ];

        return($this->json($info, 200));
    }

    #[Route('/api/residents/update', name: 'updateResident', methods: ['PUT'])]
    public function UpdateResident(Request $request, Security $security, UpdateResident $updateResident): JsonResponse
    {
        try {
            $dto = UpdateResidentAccountInputDTO::fromRequest($request);
        } catch (\InvalidArgumentException $e) {
            return $this->json(['message' => $e->getMessage()], 400);
        }

        /** @var Resident $resident */
        $resident = $security->getUser();

        $updateResident->updateResident($resident, ['target' => $dto->target, 'newValue' => $dto->newValue]);

        return($this->json('ok', 200));
    }
};
