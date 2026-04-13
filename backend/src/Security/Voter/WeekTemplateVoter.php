<?php

declare(strict_types=1);

namespace App\Security\Voter;

use App\Entity\Manager;
use App\Entity\WeekTemplates;
use App\Repository\ManagerWeekTemplateRepository;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;

/**
 * Controls access to WeekTemplate resources.
 *
 *  VIEW — manager has any ManagerWeekTemplate relation for this template
 *  EDIT — manager has a ManagerWeekTemplate relation with canEdit = true
 *
 * @extends Voter<string, WeekTemplates>
 */
final class WeekTemplateVoter extends Voter
{
    public const VIEW = 'week_template_view';
    public const EDIT = 'week_template_edit';

    public function __construct(
        private readonly ManagerWeekTemplateRepository $managerWeekTemplateRepository,
    ) {
    }

    protected function supports(string $attribute, mixed $subject): bool
    {
        return in_array($attribute, [self::VIEW, self::EDIT], true)
            && $subject instanceof WeekTemplates;
    }

    protected function voteOnAttribute(string $attribute, mixed $subject, TokenInterface $token): bool
    {
        $user = $token->getUser();

        if (! $user instanceof Manager) {
            return false;
        }

        /** @var WeekTemplates $template */
        $template = $subject;

        $relation = $this->managerWeekTemplateRepository->findOneBy([
            'manager'      => $user,
            'weekTemplate' => $template,
        ]);

        if ($relation === null) {
            return false;
        }

        return match ($attribute) {
            self::VIEW => true,
            self::EDIT => $relation->getCanEdit() === true,
            default    => false,
        };
    }
}
