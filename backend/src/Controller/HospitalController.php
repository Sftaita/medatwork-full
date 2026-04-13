<?php

declare(strict_types=1);

namespace App\Controller;

use App\Repository\HospitalRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Public read-only hospital endpoints used by the registration forms.
 */
class HospitalController extends AbstractController
{
    #[Route('/api/hospitals', name: 'hospitals_list', methods: ['GET'])]
    public function list(HospitalRepository $hospitalRepository): JsonResponse
    {
        $hospitals = [];
        foreach ($hospitalRepository->findAllActive() as $hospital) {
            $hospitals[] = [
                'id'      => $hospital->getId(),
                'name'    => $hospital->getName(),
                'city'    => $hospital->getCity(),
                'country' => $hospital->getCountry(),
            ];
        }

        return $this->json($hospitals);
    }
}
