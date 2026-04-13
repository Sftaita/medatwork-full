<?php

declare(strict_types=1);

namespace App\Security\Voter;

use App\Entity\Resident;
use App\Entity\Timesheet;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;

/**
 * @extends Voter<string, Timesheet>
 */
class TimesheetVoter extends Voter
{
    public const VIEW = 'timesheet_view';
    public const EDIT = 'timesheet_edit';

    protected function supports(string $attribute, mixed $subject): bool
    {
        return in_array($attribute, [self::VIEW, self::EDIT], true)
            && $subject instanceof Timesheet;
    }

    protected function voteOnAttribute(string $attribute, mixed $subject, TokenInterface $token): bool
    {
        $user = $token->getUser();

        if (! $user instanceof Resident) {
            return false;
        }

        /** @var Timesheet $timesheet */
        $timesheet = $subject;

        return $timesheet->getResident()?->getId() === $user->getId();
    }
}
