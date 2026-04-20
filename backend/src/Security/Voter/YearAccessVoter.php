<?php

declare(strict_types=1);

namespace App\Security\Voter;

use App\Entity\HospitalAdmin;
use App\Entity\Manager;
use App\Entity\Years;
use App\Repository\ManagerYearsRepository;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;

/**
 * @extends Voter<string, Years>
 */
class YearAccessVoter extends Voter
{
    public const DATA_ACCESS      = 'year_data_access';
    public const DATA_VALIDATION  = 'year_data_validation';
    public const DATA_DOWNLOAD    = 'year_data_download';
    public const MANAGE_AGENDA    = 'year_manage_agenda';
    public const AGENDA_ACCESS    = 'year_agenda_access';
    public const ADMIN            = 'year_admin';

    /** @var list<string> */
    public const SUPPORTED_ATTRIBUTES = [
        self::DATA_ACCESS,
        self::DATA_VALIDATION,
        self::DATA_DOWNLOAD,
        self::MANAGE_AGENDA,
        self::AGENDA_ACCESS,
        self::ADMIN,
    ];

    private const SUPPORTED = self::SUPPORTED_ATTRIBUTES;

    public function __construct(private readonly ManagerYearsRepository $managerYearsRepository)
    {
    }

    protected function supports(string $attribute, mixed $subject): bool
    {
        return in_array($attribute, self::SUPPORTED, true)
            && $subject instanceof Years;
    }

    protected function voteOnAttribute(string $attribute, mixed $subject, TokenInterface $token): bool
    {
        $user = $token->getUser();

        /** @var Years $year */
        $year = $subject;

        // HospitalAdmin has full access to every year that belongs to their hospital
        if ($user instanceof HospitalAdmin) {
            $yearHospital = $year->getHospital();

            return $yearHospital !== null
                && $yearHospital->getId() === $user->getHospital()->getId();
        }

        if (! $user instanceof Manager) {
            return false;
        }

        $relation = $this->managerYearsRepository->findOneBy([
            'manager' => $user,
            'years'   => $year,
        ]);

        if ($relation === null) {
            return false;
        }

        return match ($attribute) {
            self::DATA_ACCESS     => (bool) $relation->getDataAccess(),
            self::DATA_VALIDATION => (bool) $relation->getDataValidation(),
            self::DATA_DOWNLOAD   => (bool) $relation->getDataDownload(),
            self::MANAGE_AGENDA   => (bool) $relation->getCanManageAgenda(),
            self::AGENDA_ACCESS   => (bool) $relation->getHasAgendaAccess(),
            self::ADMIN           => (bool) $relation->getAdmin(),
            default               => false,
        };
    }
}
