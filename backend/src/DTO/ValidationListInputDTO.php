<?php

declare(strict_types=1);

namespace App\DTO;

use Symfony\Component\HttpFoundation\Request;

/**
 * A single resident entry within a validation batch request.
 */
final class ValidationItemInputDTO
{
    public function __construct(
        public readonly int     $residentId,
        public readonly string  $status,
        public readonly ?string $managerComment,
        public readonly ?string $residentNotification,
    ) {
    }
}

/**
 * Typed input DTO for PUT /api/managers/validation/{periodId}.
 *
 * The body is a JSON array of resident validation items.
 */
final class ValidationListInputDTO
{
    private function __construct(
        /** @var ValidationItemInputDTO[] */
        public readonly array $items,
    ) {
    }

    /**
     * @throws \InvalidArgumentException when the body is invalid or any item is malformed.
     */
    public static function fromRequest(Request $request): self
    {
        $data = json_decode($request->getContent(), true);

        if (! is_array($data)) {
            throw new \InvalidArgumentException('Invalid JSON body');
        }

        $items = [];
        foreach ($data as $index => $item) {
            if (! is_array($item)) {
                throw new \InvalidArgumentException("Item at index $index must be an object");
            }

            if (! isset($item['status']) || ! in_array($item['status'], ['validate', 'invalidate'], true)) {
                throw new \InvalidArgumentException("Item at index $index: status must be \"validate\" or \"invalidate\"");
            }

            if (! isset($item['residentId']) || ! is_int($item['residentId'])) {
                throw new \InvalidArgumentException("Item at index $index: residentId must be an integer");
            }

            if (isset($item['managerComment']) && ! is_string($item['managerComment'])) {
                throw new \InvalidArgumentException("Item at index $index: managerComment must be a string");
            }

            if (isset($item['residentNotification']) && ! is_string($item['residentNotification'])) {
                throw new \InvalidArgumentException("Item at index $index: residentNotification must be a string");
            }

            $items[] = new ValidationItemInputDTO(
                residentId: $item['residentId'],
                status: $item['status'],
                managerComment: $item['managerComment'] ?? null,
                residentNotification: $item['residentNotification'] ?? null,
            );
        }

        return new self(items: $items);
    }
}
