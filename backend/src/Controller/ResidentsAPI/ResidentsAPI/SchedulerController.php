<?php

declare(strict_types=1);

namespace App\Controller\ResidentsAPI\ResidentsAPI;

use App\Entity\Resident;
use App\Services\ResidentScheduler\GetSchedulerData;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Core\Exception\AccessDeniedException;

class SchedulerController extends AbstractController
{
    #[Route('/api/residents/fetchSchedulerData', name: 'getMyScheduler', methods: ['GET'])]
    public function GetInfo(Security $security, GetSchedulerData $getSchedulerData): JsonResponse
    {
        $user = $security->getUser();
        if (! $user instanceof Resident) {
            throw new AccessDeniedException();
        }

        $data = $getSchedulerData->getData($user);

        return($this->json($data, 200));

    }
};
