<?php

declare(strict_types=1);

namespace App\Controller\WeekTemplatesAPI\ManagersAPI;

use App\Entity\WeekTemplates;
use App\Repository\WeekTemplatesRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Serializer\SerializerInterface;
use Symfony\Component\Validator\Validator\ValidatorInterface;

class WeekController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly WeekTemplatesRepository $weekTemplatesRepository,
        private readonly SerializerInterface $serializer,
        private readonly ValidatorInterface $validator,
    ) {
    }


    public function create(Request $request): Response
    {
        $data = $request->getContent();
        $weekTemplate = $this->serializer->deserialize($data, WeekTemplates::class, 'json');

        $errors = $this->validator->validate($weekTemplate);

        if (count($errors) > 0) {
            return new Response(implode(', ', array_map(fn ($e) => $e->getMessage(), iterator_to_array($errors))), 400);
        }

        $this->entityManager->persist($weekTemplate);
        $this->entityManager->flush();

        return new Response('WeekTemplate created successfully', 201);
    }


    public function update(Request $request, int $id): Response
    {
        $existingWeekTemplate = $this->weekTemplatesRepository->find($id);

        if (! $existingWeekTemplate) {
            return new Response('WeekTemplate not found', 404);
        }

        $data = $request->getContent();
        $updatedWeekTemplate = $this->serializer->deserialize($data, WeekTemplates::class, 'json');

        // Set properties with updated values
        $existingWeekTemplate->setTitle($updatedWeekTemplate->getTitle())
            ->setDescription($updatedWeekTemplate->getDescription())
            ->setColor($updatedWeekTemplate->getColor());

        $this->entityManager->flush();

        return new Response('WeekTemplate updated successfully', 200);
    }

    #[Route('/api/managers/manerweekTemplate/{id}', methods: 'DELETE')]
    public function delete(int $id): Response
    {
        $existingWeekTemplate = $this->weekTemplatesRepository->find($id);

        if (! $existingWeekTemplate) {
            return new Response('WeekTemplate not found', 404);
        }

        $this->entityManager->remove($existingWeekTemplate);
        $this->entityManager->flush();

        return new Response('WeekTemplate deleted successfully', 200);
    }
}
