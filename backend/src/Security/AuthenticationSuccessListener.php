<?php

declare(strict_types=1);

namespace App\Security;

use App\Entity\AppAdmin;
use App\Entity\HospitalAdmin;
use App\Entity\Manager;
use App\Entity\Resident;
use App\Repository\ManagerRepository;
use App\Repository\ResidentRepository;
use Lexik\Bundle\JWTAuthenticationBundle\Event\AuthenticationSuccessEvent;
use Symfony\Component\HttpFoundation\Cookie;

class AuthenticationSuccessListener
{
    public function __construct(
        private readonly int $tokenTtl,
        private readonly ResidentRepository $residentRepository,
        private readonly ManagerRepository $managerRepository,
        private readonly string $apiUrl = '',
    ) {
    }

    public function onAuthenticationSuccess(AuthenticationSuccessEvent $event): void
    {
        $response = $event->getResponse();
        $user = $event->getUser();
        $data = $event->getData();

        if ($user instanceof Resident || $user instanceof Manager) {
            $data['firstname'] = $user->getFirstname();
            $data['lastname'] = $user->getLastname();
            $data['gender'] = $user->getSexe()->value;
            $data['avatarUrl'] = $this->buildAvatarUrl($user->getAvatarPath());
            if ($user instanceof Manager && $user->getAdminHospital() !== null) {
                $data['role']         = 'hospital_admin';
                $data['hospitalId']   = $user->getAdminHospital()->getId();
                $data['hospitalName'] = $user->getAdminHospital()->getName();
            } else {
                $data['role']          = $user->getRole();
                $data['canCreateYear'] = $user instanceof Manager && $user->isCanCreateYear();
            }
        } elseif ($user instanceof AppAdmin) {
            $data['firstname'] = $user->getFirstname();
            $data['lastname'] = $user->getLastname();
            $data['role'] = 'super_admin';
            $data['gender'] = '';
            $data['avatarUrl'] = null;
        } elseif ($user instanceof HospitalAdmin) {
            $data['firstname'] = $user->getFirstname() ?? '';
            $data['lastname'] = $user->getLastname() ?? '';
            $data['role'] = 'hospital_admin';
            $data['gender'] = '';
            $data['hospitalId'] = $user->getHospital()->getId();
            $data['hospitalName'] = $user->getHospital()->getName();
            $data['avatarUrl'] = $this->buildAvatarUrl($user->getAvatarPath());
        } else {
            // Fallback — should not happen with the current chain provider
            return;
        }

        $token = $data['token'];
        unset($data['refresh_token']);
        $event->setData($data);

        $response->headers->setCookie(new Cookie(
            'BEARER',
            $token,
            (new \DateTime())->add(new \DateInterval('PT' . $this->tokenTtl . 'S')),
            '/',
            null,
            null,   // secure: auto (true on HTTPS, false on HTTP)
            true,   // httpOnly
            false,  // raw
            Cookie::SAMESITE_STRICT
        ));
        $response->headers->set('Content-Type', 'application/json');
    }

    private function buildAvatarUrl(?string $avatarPath): ?string
    {
        if ($avatarPath === null || $avatarPath === '') {
            return null;
        }
        // Strip /api/ suffix to reach the static files root
        $base = rtrim(preg_replace('#/api/?$#', '', rtrim($this->apiUrl, '/')), '/');
        return $base . '/uploads/avatars/' . $avatarPath;
    }
}
