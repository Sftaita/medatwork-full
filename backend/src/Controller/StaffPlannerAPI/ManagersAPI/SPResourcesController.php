<?php

declare(strict_types=1);

namespace App\Controller\StaffPlannerAPI\ManagersAPI;

use App\DTO\IntegerIdsInputDTO;
use App\DTO\UpdateSPResourceInputDTO;
use App\Entity\StaffPlannerResources;
use App\Repository\YearsRepository;
use App\Repository\YearsResidentRepository;
use App\Security\Voter\YearAccessVoter;
use App\Services\StaffPlanner\CheckResidentResources;
use App\Services\StaffPlanner\UpdateSPResource;
use Doctrine\ORM\EntityManagerInterface;
use Exception;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Staff Planner APIs
 */
class SPResourcesController extends AbstractController
{
    #[Route('/api/managers/getSPRes/{yearId}', name: 'getStaffPlannerResources', methods: ['GET'])]
    public function fetchResources(string $yearId, YearsRepository $yearsRepository, YearsResidentRepository $yearsResidentRepository, EntityManagerInterface $entityManager): JsonResponse
    {
        // 1. Check if YearId is valid
        if (strlen($yearId) > 8) {
            return new JsonResponse(['message' => 'Invalid yearId'], 400);
        }

        //2. Find year
        $year = $yearsRepository->findOneBy(['id' => $yearId]);

        // 3. Check managerRights on this Year
        $this->denyAccessUnlessGranted(YearAccessVoter::ADMIN, $year);

        // 5. Fetch data
        $yearResidents = $yearsResidentRepository->findBy(['year' => $year]);

        $data = [];

        foreach ($yearResidents as $relation) {
            if ($relation->getAllowed()) {

                // 5.1 If no StaffPlannerresource find for this relation, create it.
                $stinfo = $relation->getStaffPlannerResources();
                $resident = $relation->getResident();

                if ($stinfo === null) {
                    $staffPnnaerResources = new StaffPlannerResources();

                    $staffPnnaerResources->setWorkerHRID(null)
                                        ->setSectionHRID(null)
                                        ->setYearsResident($relation)
                    ;
                    $entityManager->persist($staffPnnaerResources);
                    $entityManager->flush();

                    $data[] = [
                        'id' => $staffPnnaerResources->getId(),
                        'WorkerHRID' => $staffPnnaerResources->getWorkerHRID(),
                        'SectionHRID' => $staffPnnaerResources->getSectionHRID(),
                        'residentId' => $resident->getId(),
                        'firstname' => $resident->getFirstname(),
                        'lastname' => $resident->getLastname(),
                    ];
                } else {
                    $data[] = [
                        'id' => $stinfo->getId(),
                        'WorkerHRID' => $stinfo->getWorkerHRID(),
                        'SectionHRID' => $stinfo->getSectionHRID(),
                        'residentId' => $resident->getId(),
                        'firstname' => $resident->getFirstname(),
                        'lastname' => $resident->getLastname(),
                    ];
                }
            };
        }

        return($this->json($data, 200));
    }

    #[Route('/api/managers/updateSPRes', name: 'updateStaffPlannerResources', methods: ['PUT'])]
    public function updateResources(Request $request, UpdateSPResource $updateSPResource): JsonResponse
    {

        try {
            $dto = UpdateSPResourceInputDTO::fromRequest($request);
        } catch (\InvalidArgumentException $e) {
            return new JsonResponse(['message' => $e->getMessage()], 400);
        }

        $updateSPResource->updateResources([
            'resourceId'  => $dto->resourceId,
            'workerHRID'  => $dto->workerHRID,
            'sectionHRID' => $dto->sectionHRID,
        ]);

        return new JsonResponse([
         'message' => 'ok',
         ], 200);
    }

    /**
     * @deprecated
     *
     * Check if all the resident of the requested ValidationPeriod have their StaffPlanner resource completed.
     * This is the original version of the function which is kept for backward compatibility.
     * It's used by the frontend clients who have not updated their applications to the latest version.
     *
     */
    #[Route('/api/managers/SPCheck', name: 'checkResidentResources', methods: ['POST'])]
    public function checkResources(Security $security, Request $request, CheckResidentResources $checkResidentResources): JsonResponse
    {

        try {
            $dto = IntegerIdsInputDTO::fromRequest($request, 'periodsId');
        } catch (\InvalidArgumentException $e) {
            return new JsonResponse(['message' => $e->getMessage()], 400);
        }

        $manager = $security->getUser();

        // 2. Check resources of each Validation Period
        $check = $checkResidentResources->checkResources($dto->ids);

        return($this->json($check, 200));
    }

    /**
     * New version of the resource check function for a more granular validation approach.
     *
     * This function receives a request with a JSON payload containing an array of Resident Validation IDs ('periodValidationArray').
     * It first checks that the provided 'periodValidationArray' only contains numeric values. If not, an exception is thrown.
     *
     * Then, it uses the checkResidentStaffPlannerCompletion method of the CheckResidentResources service to check if all necessary
     * StaffPlanner resources are completed for each resident in the provided validation periods. The method returns an array of residents
     * with missing Staff Planner fields.
     *
     * Finally, the function returns a JSON response containing the check results, with an access control allow origin header set according
     * to the environment variable 'CORS_ALLOW_ORIGIN'.
     *
     * @param Security $security A security helper object
     * @param Request $request The HTTP request
     * @param CheckResidentResources $checkResidentResources A service to check resident resources
     *
     * @throws Exception If the 'periodValidationArray' contains non-numeric values
     * @return JsonResponse A JSON response containing the check results
     */
    #[Route('/api/managers/SPCheckV2', name: 'checkResidentResourcesNew', methods: ['POST'])]
    public function checkResourcesNewVersion(Security $security, Request $request, CheckResidentResources $checkResidentResources): JsonResponse
    {

        try {
            $dto = IntegerIdsInputDTO::fromRequest($request, 'periodValidationArray');
        } catch (\InvalidArgumentException $e) {
            return new JsonResponse(['message' => $e->getMessage()], 400);
        }

        $manager = $security->getUser();

        // 2. Check resources of each Validation Period
        $check = $checkResidentResources->checkResidentStaffPlannerCompletion($dto->ids);

        return($this->json($check, 200));
    }

}
