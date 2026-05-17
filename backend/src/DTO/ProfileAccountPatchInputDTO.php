<?php

declare(strict_types=1);

namespace App\DTO;

use App\Enum\ManagerJob;
use App\Enum\Sexe;
use Symfony\Component\HttpFoundation\Request;

/**
 * Validates a PATCH /api/profile/account body.
 *
 * Allowed fields depend on the caller's role:
 *   All roles  : firstname, lastname
 *   manager    : + sexe, job (ManagerJob value or null to clear)
 *   resident   : + sexe, speciality, university, dateOfMaster (YYYY-MM-DD or null)
 *
 * $provided tracks which keys were explicitly included in the request.
 * The controller uses it to distinguish "not sent" from "explicitly null/cleared".
 *
 * Never accepted: email, password, roles, validatedAt, status, adminHospital.
 */
final class ProfileAccountPatchInputDTO
{
    private static array $ROLE_EXTRA_KEYS = [
        'manager'  => ['sexe', 'job'],
        'resident' => ['sexe', 'speciality', 'university', 'dateOfMaster'],
    ];

    private function __construct(
        /** Keys explicitly present in the request body */
        public readonly array   $provided,
        public readonly ?string $firstname,
        public readonly ?string $lastname,
        public readonly ?Sexe   $sexe,
        // manager
        public readonly ?string $job,
        // resident
        public readonly ?string $speciality,
        public readonly ?string $university,
        public readonly ?string $dateOfMaster,  // YYYY-MM-DD or null
    ) {
    }

    public static function fromRequest(Request $request, string $userType): self
    {
        $data = json_decode($request->getContent(), true);
        if (! is_array($data) || empty($data)) {
            throw new \InvalidArgumentException('Corps JSON invalide ou vide');
        }

        $allowed = array_merge(
            ['firstname', 'lastname'],
            self::$ROLE_EXTRA_KEYS[$userType] ?? [],
        );
        $unknown = array_diff(array_keys($data), $allowed);
        if (! empty($unknown)) {
            throw new \InvalidArgumentException('Champs non autorisés : ' . implode(', ', $unknown));
        }

        $provided    = [];
        $firstname   = null;
        $lastname    = null;
        $sexe        = null;
        $job         = null;
        $speciality  = null;
        $university  = null;
        $dateOfMaster = null;

        // ── firstname ──────────────────────────────────────────────────────────
        if (array_key_exists('firstname', $data)) {
            if (! is_string($data['firstname']) || strlen(trim($data['firstname'])) < 2) {
                throw new \InvalidArgumentException('Le prénom doit contenir au minimum 2 caractères');
            }
            if (strlen($data['firstname']) > 50) {
                throw new \InvalidArgumentException('Le prénom est trop long (max 50 caractères)');
            }
            $firstname = trim($data['firstname']);
            $provided[] = 'firstname';
        }

        // ── lastname ───────────────────────────────────────────────────────────
        if (array_key_exists('lastname', $data)) {
            if (! is_string($data['lastname']) || strlen(trim($data['lastname'])) < 2) {
                throw new \InvalidArgumentException('Le nom doit contenir au minimum 2 caractères');
            }
            if (strlen($data['lastname']) > 70) {
                throw new \InvalidArgumentException('Le nom est trop long (max 70 caractères)');
            }
            $lastname = trim($data['lastname']);
            $provided[] = 'lastname';
        }

        // ── sexe ───────────────────────────────────────────────────────────────
        if (array_key_exists('sexe', $data)) {
            try {
                $sexe = Sexe::from($data['sexe']);
            } catch (\ValueError) {
                throw new \InvalidArgumentException('sexe doit être "male" ou "female"');
            }
            $provided[] = 'sexe';
        }

        // ── job (manager only) ─────────────────────────────────────────────────
        if (array_key_exists('job', $data)) {
            if ($data['job'] !== null) {
                $validValues = array_map(fn(ManagerJob $j) => $j->value, ManagerJob::cases());
                if (! in_array($data['job'], $validValues, true)) {
                    throw new \InvalidArgumentException(
                        'job invalide — valeurs acceptées : ' . implode(', ', $validValues)
                    );
                }
                $job = $data['job'];
            }
            $provided[] = 'job';
        }

        // ── speciality (resident only) ─────────────────────────────────────────
        if (array_key_exists('speciality', $data)) {
            if ($data['speciality'] !== null && $data['speciality'] !== '') {
                if (! is_string($data['speciality']) || strlen($data['speciality']) > 100) {
                    throw new \InvalidArgumentException('La spécialité est trop longue (max 100 caractères)');
                }
                $speciality = trim($data['speciality']);
            }
            $provided[] = 'speciality';
        }

        // ── university (resident only) ─────────────────────────────────────────
        if (array_key_exists('university', $data)) {
            if ($data['university'] !== null && $data['university'] !== '') {
                if (! is_string($data['university']) || strlen($data['university']) > 255) {
                    throw new \InvalidArgumentException("Le nom de l'université est trop long (max 255 caractères)");
                }
                $university = trim($data['university']);
            }
            $provided[] = 'university';
        }

        // ── dateOfMaster (resident only) ───────────────────────────────────────
        if (array_key_exists('dateOfMaster', $data)) {
            if ($data['dateOfMaster'] !== null && $data['dateOfMaster'] !== '') {
                if (! is_string($data['dateOfMaster'])
                    || ! preg_match('/^\d{4}-\d{2}-\d{2}$/', $data['dateOfMaster'])
                    || \DateTimeImmutable::createFromFormat('Y-m-d', $data['dateOfMaster']) === false
                ) {
                    throw new \InvalidArgumentException('dateOfMaster doit être au format YYYY-MM-DD');
                }
                $dateOfMaster = $data['dateOfMaster'];
            }
            $provided[] = 'dateOfMaster';
        }

        if (empty($provided)) {
            throw new \InvalidArgumentException('Aucun champ valide à mettre à jour');
        }

        return new self(
            $provided, $firstname, $lastname, $sexe,
            $job, $speciality, $university, $dateOfMaster,
        );
    }

    public function has(string $field): bool
    {
        return in_array($field, $this->provided, true);
    }
}
