<?php

declare(strict_types=1);

namespace App\Controller\WeekTemplatesAPI\ManagersAPI;

use App\DTO\WeekTemplateInputDTO;
use App\Entity\Manager;
use App\Entity\ManagerWeekTemplate;
use App\Entity\WeekTask;
use App\Entity\WeekTemplates;
use App\Repository\ManagerWeekTemplateRepository;
use App\Repository\WeekTemplatesRepository;
use App\Security\Voter\WeekTemplateVoter;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Validator\Validator\ValidatorInterface;

class WeekTemplatesController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly WeekTemplatesRepository $weekTemplatesRepository,
        private readonly ManagerWeekTemplateRepository $managerWeekTemplateRepository,
        private readonly ValidatorInterface $validator,
    ) {
    }

    #[Route('/api/managers/weekTemplate/{weekTemplateId}', methods: ['GET'])]
    public function getWeekTemplate(int $weekTemplateId, Security $security): JsonResponse
    {
        $weekTemplate = $this->weekTemplatesRepository->find($weekTemplateId);

        if (! $weekTemplate) {
            return new JsonResponse(['error' => 'WeekTemplate non trouvé.'], Response::HTTP_NOT_FOUND);
        }

        $this->denyAccessUnlessGranted(WeekTemplateVoter::VIEW, $weekTemplate);

        /** @var Manager $manager */
        $manager             = $security->getUser();
        $managerWeekTemplate = $this->managerWeekTemplateRepository->findOneBy([
            'manager'      => $manager,
            'weekTemplate' => $weekTemplate,
        ]);

        return $this->json($this->serializeTemplate($weekTemplate, $managerWeekTemplate), 200);
    }

    #[Route('/api/managers/allweekTemplates', methods: ['GET'])]
    public function getAllWeekTemplates(Security $security): JsonResponse
    {
        /** @var Manager $manager */
        $manager              = $security->getUser();
        $managerWeekTemplates = $this->managerWeekTemplateRepository->findBy(['manager' => $manager]);

        $data = [];
        foreach ($managerWeekTemplates as $mwt) {
            $mwtTemplate = $mwt->getWeekTemplate();
            if ($mwtTemplate === null) {
                continue;
            }
            $data[] = $this->serializeTemplate($mwtTemplate, $mwt);
        }

        usort($data, fn (array $a, array $b) => $a['title'] <=> $b['title']);

        return $this->json($data, 200);
    }

    #[Route('/api/managers/weekTemplate/create', name: 'createWeekTemplate', methods: ['POST'])]
    public function create(Request $request, Security $security): JsonResponse
    {
        try {
            $dto = WeekTemplateInputDTO::fromRequest($request);
        } catch (\InvalidArgumentException $e) {
            return new JsonResponse(['error' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
        }

        $weekTemplate = (new WeekTemplates())
            ->setTitle($dto->title)
            ->setDescription($dto->description)
            ->setColor($dto->color);

        $errors = $this->validator->validate($weekTemplate);
        if (count($errors) > 0) {
            return new JsonResponse(['error' => implode(', ', array_map(fn ($e) => $e->getMessage(), iterator_to_array($errors)))], Response::HTTP_BAD_REQUEST);
        }

        /** @var Manager $manager */
        $manager = $security->getUser();

        $managerWeekTemplate = (new ManagerWeekTemplate())
            ->setManager($manager)
            ->setWeekTemplate($weekTemplate)
            ->setCanEdit(true)
            ->setCanShare(true);

        $this->entityManager->persist($weekTemplate);
        $this->entityManager->persist($managerWeekTemplate);
        $this->entityManager->flush();

        return $this->json($this->serializeTemplate($weekTemplate, $managerWeekTemplate), Response::HTTP_CREATED);
    }

    #[Route('/api/managers/weekTemplate/{weekTemplateId}', methods: ['PUT'])]
    public function update(int $weekTemplateId, Request $request): JsonResponse
    {
        $weekTemplate = $this->weekTemplatesRepository->find($weekTemplateId);

        if (! $weekTemplate) {
            return new JsonResponse(['error' => 'WeekTemplate non trouvé.'], Response::HTTP_NOT_FOUND);
        }

        $this->denyAccessUnlessGranted(WeekTemplateVoter::EDIT, $weekTemplate);

        try {
            $dto = WeekTemplateInputDTO::fromRequest($request, '');
        } catch (\InvalidArgumentException $e) {
            return new JsonResponse(['error' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
        }

        $weekTemplate->setTitle($dto->title)
            ->setDescription($dto->description)
            ->setColor($dto->color);

        $errors = $this->validator->validate($weekTemplate);
        if (count($errors) > 0) {
            return new JsonResponse(['error' => implode(', ', array_map(fn ($e) => $e->getMessage(), iterator_to_array($errors)))], Response::HTTP_BAD_REQUEST);
        }

        $this->entityManager->flush();

        return new JsonResponse(['message' => 'WeekTemplate mis à jour.'], 200);
    }

    #[Route('/api/managers/weekTemplate/{weekTemplateId}', methods: ['DELETE'])]
    public function delete(int $weekTemplateId, Security $security): JsonResponse
    {
        $weekTemplate = $this->weekTemplatesRepository->find($weekTemplateId);

        if (! $weekTemplate) {
            return new JsonResponse(['error' => 'WeekTemplate non trouvé.'], Response::HTTP_NOT_FOUND);
        }

        $this->denyAccessUnlessGranted(WeekTemplateVoter::VIEW, $weekTemplate);

        /** @var Manager $manager */
        $manager = $security->getUser();

        $managerWeekTemplate = $this->managerWeekTemplateRepository->findOneBy([
            'manager'      => $manager,
            'weekTemplate' => $weekTemplate,
        ]);

        if ($managerWeekTemplate === null) {
            return new JsonResponse(['error' => 'Association non trouvée.'], Response::HTTP_NOT_FOUND);
        }

        // Remove only the manager↔template link, not the template itself
        $this->entityManager->remove($managerWeekTemplate);
        $this->entityManager->flush();

        return new JsonResponse(['message' => 'Association supprimée.'], 200);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    /** @return array<string, mixed> */
    private function serializeTemplate(WeekTemplates $template, ManagerWeekTemplate $relation): array
    {
        return [
            'id'           => $template->getId(),
            'title'        => $template->getTitle(),
            'description'  => $template->getDescription(),
            'color'        => $template->getColor(),
            'canEdit'      => $relation->getCanEdit(),
            'canShare'     => $relation->getCanShare(),
            'weekTaskList' => array_map(
                fn (WeekTask $t) => [
                    'id'             => $t->getId(),
                    'title'          => $t->getTitle(),
                    'description'    => $t->getDescription(),
                    'dayOfWeek'      => $t->getDayOfWeek(),
                    'startTime'      => $t->getStartTime()->format('H:i'),
                    'endTime'        => $t->getEndTime()->format('H:i'),
                    'weekTemplateId' => $template->getId(),
                ],
                $template->getWeekTaskList()->getValues(),
            ),
        ];
    }
}
