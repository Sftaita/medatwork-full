<?php

declare(strict_types=1);

namespace App\Services\ManagerMonthValidation;

use App\Entity\Years;
use App\Repository\PeriodValidationRepository;
use App\Repository\YearsRepository;
use App\Security\Voter\YearAccessVoter;
use App\Services\Utils\Tools;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;
use Symfony\Component\Security\Core\Exception\AccessDeniedException;

class GetMonthStatus
{
    public function __construct(
        private readonly PeriodValidationRepository $periodValidationRepository,
        private readonly YearsRepository $yearsRepository,
        private readonly Tools $tools,
        private readonly PeriodChecker $periodChecker,
        private readonly AuthorizationCheckerInterface $authorizationChecker,
    ) {
    }

    /**
     * Find months that haven't been validated
     *
     * @param integer $yearId
     * @return array<int, mixed>
     */
    public function getMonthPeriods(int $yearId): array
    {

        // 1. Find related year
        $year = $this->yearsRepository->findOneBy(['id' => $yearId]);

        // 2. Check rights
        if (! $this->authorizationChecker->isGranted(YearAccessVoter::ADMIN, $year)
            && ! $this->authorizationChecker->isGranted(YearAccessVoter::DATA_VALIDATION, $year)) {
            throw new AccessDeniedException("Vous n'avez pas les droits pour valider");
        }

        // 3. Update periodsList if needed
        $this->periodChecker->updatePeriodsForYear($year);

        // 4. Get previous month that have not been validated
        // If a period has been validated for more than 3 days, it won't appear in the returned array as it is now forbidden to validate.
        $today = date('y-m-d 00:00:00');
        $validationLimit = (new \DateTime($today))->modify('-3 days')->format('Y-m-d 00:00:00');

        $request = $this->periodValidationRepository->findMonthToValidate($year, $today, $validationLimit);

        return $request;
    }

    /** @return array<string, mixed> */
    public function summarisedStats(Years $years, int $month, int $year): array
    {
        // 1. define limits (all weeks of the current month)
        $monthBoundary = $this->tools->dateBoundaries($month, $year);

        return [];
    }


}
