<?php

declare(strict_types=1);

namespace App\Controller\YearsAPI\ManagersAPI;

use App\Controller\MailerController;
use App\Entity\Resident;
use App\Entity\YearsResident;
use App\Enum\Sexe;
use App\Enum\YearStatus;
use App\Repository\ManagerYearsRepository;
use App\Repository\ResidentRepository;
use App\Repository\YearsRepository;
use App\Repository\YearsResidentRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Attribute\Route;

class ManagerAddResidentController extends AbstractController
{
    public function __construct(
        private readonly MailerController $mailer,
        private readonly string $frontendUrl,
    ) {
    }

    /**
     * POST /api/managers/years/{yearId}/add-resident
     * Body: {firstname, lastname, email}
     * Requires: manager with admin rights on the year.
     */
    #[Route('/api/managers/years/{yearId}/add-resident', name: 'manager_add_resident', methods: ['POST'])]
    public function addResident(
        int $yearId,
        Request $request,
        Security $security,
        YearsRepository $yearsRepository,
        ManagerYearsRepository $managerYearsRepository,
        ResidentRepository $residentRepository,
        YearsResidentRepository $yearsResidentRepository,
        EntityManagerInterface $em,
        UserPasswordHasherInterface $passwordHasher,
    ): JsonResponse {
        $manager = $security->getUser();

        $year = $yearsRepository->find($yearId);
        if ($year === null) {
            return new JsonResponse(['message' => 'Année introuvable'], Response::HTTP_NOT_FOUND);
        }

        $managerRelation = $managerYearsRepository->findOneBy(['manager' => $manager, 'years' => $year]);
        if ($managerRelation === null || !$managerRelation->getAdmin()) {
            return new JsonResponse(['message' => "Droits insuffisants pour cette année."], Response::HTTP_FORBIDDEN);
        }

        if ($year->getStatus() === YearStatus::Closed || $year->getStatus() === YearStatus::Archived) {
            return new JsonResponse(['message' => "Cette année est fermée et n'accepte plus de nouveaux résidents."], Response::HTTP_CONFLICT);
        }

        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return new JsonResponse(['message' => 'Invalid JSON'], Response::HTTP_BAD_REQUEST);
        }

        $email     = trim((string) ($data['email'] ?? ''));
        $firstname = trim((string) ($data['firstname'] ?? ''));
        $lastname  = trim((string) ($data['lastname'] ?? ''));

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return new JsonResponse(['message' => 'Email invalide'], Response::HTTP_BAD_REQUEST);
        }
        if ($firstname === '' || $lastname === '') {
            return new JsonResponse(['message' => 'Nom et prénom obligatoires'], Response::HTTP_BAD_REQUEST);
        }

        $resident = $residentRepository->findOneBy(['email' => $email]);
        $isNew    = $resident === null;

        if (!$isNew && $yearsResidentRepository->checkLink($resident, $year)) {
            return new JsonResponse(['message' => 'Ce MACCS est déjà rattaché à cette année'], Response::HTTP_CONFLICT);
        }

        if ($isNew) {
            $resident = (new Resident())
                ->setEmail($email)
                ->setFirstname($firstname)
                ->setLastname($lastname)
                ->setRole('resident')
                ->setRoles(['ROLE_RESIDENT'])
                ->setSexe(Sexe::Male)
                ->setDateOfMaster(null)
                ->setPassword($passwordHasher->hashPassword(new Resident(), bin2hex(random_bytes(16))))
                ->setCreatedAt(new \DateTime());
            $em->persist($resident);
        }

        $yr = (new YearsResident())
            ->setYear($year)
            ->setResident($resident)
            ->setAllowed(true)
            ->setOptingOut(false)
            ->setCreatedAt(new \DateTime());

        $em->persist($yr);
        $em->flush();

        try {
            $hospital = $year->getHospital();
            if ($isNew && $hospital !== null) {
                $token = bin2hex(random_bytes(32));
                $resident->setToken($token)->setTokenExpiration(new \DateTime('+7 days'));
                $em->flush();
                $this->mailer->sendEmail(
                    $resident->getEmail(),
                    'Vous avez été invité à rejoindre MED@WORK',
                    'email/maccsInvited.html.twig',
                    [
                        'firstname'    => $resident->getFirstname(),
                        'hospitalName' => $hospital->getName(),
                        'setupLink'    => rtrim($this->frontendUrl, '/') . '/maccs-setup/' . $token,
                    ],
                );
            } else {
                $this->mailer->sendEmail(
                    $email,
                    'Vous avez été ajouté à une année — MED@WORK',
                    'email/maccsAddedToYear.html.twig',
                    [
                        'firstname' => $resident->getFirstname(),
                        'yearTitle' => $year->getTitle(),
                        'loginUrl'  => rtrim($this->frontendUrl, '/') . '/login',
                    ],
                );
            }
        } catch (\Throwable) {
            // L'échec d'email ne bloque pas l'opération
        }

        return new JsonResponse([
            'yearResidentId' => $yr->getId(),
            'residentId'     => $resident->getId(),
            'firstname'      => $resident->getFirstname(),
            'lastname'       => $resident->getLastname(),
            'email'          => $resident->getEmail(),
            'allowed'        => $yr->getAllowed(),
        ], Response::HTTP_CREATED);
    }
}
