<?php

declare(strict_types=1);

namespace App\Controller\WeekTasksAPI\ManagersAPI;

use App\DTO\WeekTaskInputDTO;
use App\Entity\WeekTask;
use App\Repository\WeekTaskRepository;
use App\Repository\WeekTemplatesRepository;
use App\Security\Voter\WeekTemplateVoter;
use DateTime;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Validator\Validator\ValidatorInterface;

class WeekTasksController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly WeekTaskRepository $weekTaskRepository,
        private readonly ValidatorInterface $validator,
    ) {
    }

    #[Route('/api/managers/weekTask/create', name: 'createWeekTask', methods: ['POST'])]
    public function create(Request $request, WeekTemplatesRepository $weekTemplatesRepository): JsonResponse
    {
        try {
            $dto = WeekTaskInputDTO::fromRequest($request, true);
        } catch (\InvalidArgumentException $e) {
            return new JsonResponse(['error' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
        }

        $weekTemplate = $weekTemplatesRepository->find($dto->weekTemplateId);

        if (! $weekTemplate) {
            return new JsonResponse(['error' => 'WeekTemplate not found'], Response::HTTP_NOT_FOUND);
        }

        $this->denyAccessUnlessGranted(WeekTemplateVoter::EDIT, $weekTemplate);

        $weekTask = (new WeekTask())
            ->setTitle($dto->title)
            ->setDescription($dto->description)
            ->setDayOfWeek($dto->dayOfWeek)
            ->setStartTime(new DateTime($dto->startTime))
            ->setEndTime(new DateTime($dto->endTime))
            ->setWeekTemplate($weekTemplate);

        $errors = $this->validator->validate($weekTask);
        if (count($errors) > 0) {
            return new JsonResponse(['error' => implode(', ', array_map(fn ($e) => $e->getMessage(), iterator_to_array($errors)))], Response::HTTP_BAD_REQUEST);
        }

        if ($this->weekTaskRepository->findOverlap($dto->weekTemplateId, $dto->dayOfWeek, new DateTime($dto->startTime), new DateTime($dto->endTime))) {
            return new JsonResponse(['error' => 'An existing WeekTask overlaps with the provided times.'], Response::HTTP_BAD_REQUEST);
        }

        $this->entityManager->persist($weekTask);
        $this->entityManager->flush();

        return $this->json($this->serialize($weekTask), Response::HTTP_CREATED);
    }

    #[Route('/api/managers/weekTask/{weekTaskId}', methods: ['PUT'])]
    public function update(int $weekTaskId, Request $request): JsonResponse
    {
        $weekTask = $this->weekTaskRepository->find($weekTaskId);

        if (! $weekTask) {
            return new JsonResponse(['error' => 'WeekTask not found'], Response::HTTP_NOT_FOUND);
        }

        $weekTaskTemplate = $weekTask->getWeekTemplate();
        if ($weekTaskTemplate === null) {
            return new JsonResponse(['error' => 'WeekTemplate not found'], Response::HTTP_NOT_FOUND);
        }
        $this->denyAccessUnlessGranted(WeekTemplateVoter::EDIT, $weekTaskTemplate);

        try {
            $dto = WeekTaskInputDTO::fromRequest($request, false);
        } catch (\InvalidArgumentException $e) {
            return new JsonResponse(['error' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
        }

        $weekTask->setTitle($dto->title)
            ->setDescription($dto->description)
            ->setDayOfWeek($dto->dayOfWeek)
            ->setStartTime(new DateTime($dto->startTime))
            ->setEndTime(new DateTime($dto->endTime));

        $errors = $this->validator->validate($weekTask);
        if (count($errors) > 0) {
            return new JsonResponse(['error' => implode(', ', array_map(fn ($e) => $e->getMessage(), iterator_to_array($errors)))], Response::HTTP_BAD_REQUEST);
        }

        $overlap = $this->weekTaskRepository->findOverlap(
            $weekTaskTemplate->getId(),
            $dto->dayOfWeek,
            new DateTime($dto->startTime),
            new DateTime($dto->endTime),
        );

        if ($overlap && $overlap->getId() !== $weekTask->getId()) {
            return new JsonResponse(['error' => 'Overlapping tasks are not allowed.'], Response::HTTP_BAD_REQUEST);
        }

        $this->entityManager->flush();

        return new JsonResponse(['message' => 'WeekTask updated successfully'], Response::HTTP_OK);
    }

    #[Route('/api/managers/weekTask/{weekTaskId}', methods: ['DELETE'])]
    public function delete(int $weekTaskId): JsonResponse
    {
        $weekTask = $this->weekTaskRepository->find($weekTaskId);

        if (! $weekTask) {
            return new JsonResponse(['error' => 'WeekTask not found'], Response::HTTP_NOT_FOUND);
        }

        $deleteWeekTemplate = $weekTask->getWeekTemplate();
        if ($deleteWeekTemplate === null) {
            return new JsonResponse(['error' => 'WeekTemplate not found'], Response::HTTP_NOT_FOUND);
        }
        $this->denyAccessUnlessGranted(WeekTemplateVoter::EDIT, $deleteWeekTemplate);

        $this->entityManager->remove($weekTask);
        $this->entityManager->flush();

        return new JsonResponse(['message' => 'WeekTask deleted successfully'], Response::HTTP_OK);
    }

    #[Route('/api/managers/weekTask/{weekTaskId}', methods: ['GET'])]
    public function getWeekTask(int $weekTaskId): JsonResponse
    {
        $weekTask = $this->weekTaskRepository->find($weekTaskId);

        if (! $weekTask) {
            return new JsonResponse(['error' => 'WeekTask not found'], Response::HTTP_NOT_FOUND);
        }

        $getWeekTemplate = $weekTask->getWeekTemplate();
        if ($getWeekTemplate === null) {
            return new JsonResponse(['error' => 'WeekTemplate not found'], Response::HTTP_NOT_FOUND);
        }
        $this->denyAccessUnlessGranted(WeekTemplateVoter::EDIT, $getWeekTemplate);

        return $this->json($this->serialize($weekTask), Response::HTTP_OK);
    }

    #[Route('/api/managers/allWeekTasks/{weekTemplateId}', methods: ['GET'])]
    public function getAllWeekTasks(int $weekTemplateId, WeekTemplatesRepository $weekTemplatesRepository): JsonResponse
    {
        $weekTemplate = $weekTemplatesRepository->find($weekTemplateId);

        if (! $weekTemplate) {
            return new JsonResponse(['error' => 'WeekTemplate not found'], Response::HTTP_NOT_FOUND);
        }

        $this->denyAccessUnlessGranted(WeekTemplateVoter::VIEW, $weekTemplate);

        $weekTasks = $this->weekTaskRepository->findBy(['weekTemplate' => $weekTemplate]);

        $data = array_map(fn (WeekTask $t) => $this->serialize($t), $weekTasks);

        usort($data, static fn (array $a, array $b): int => $a['dayOfWeek'] !== $b['dayOfWeek']
                ? $a['dayOfWeek'] <=> $b['dayOfWeek']
                : $a['startTime'] <=> $b['startTime']);

        return $this->json($data, Response::HTTP_OK);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    /** @return array<string, mixed> */
    private function serialize(WeekTask $weekTask): array
    {
        $serializeTemplate = $weekTask->getWeekTemplate();
        $startTime         = $weekTask->getStartTime();
        $endTime           = $weekTask->getEndTime();

        return [
            'id'             => $weekTask->getId(),
            'title'          => $weekTask->getTitle(),
            'description'    => $weekTask->getDescription(),
            'dayOfWeek'      => $weekTask->getDayOfWeek(),
            'startTime'      => $startTime !== null ? $startTime->format('H:i') : null,
            'endTime'        => $endTime !== null ? $endTime->format('H:i') : null,
            'weekTemplateId' => $serializeTemplate !== null ? $serializeTemplate->getId() : null,
        ];
    }
}
