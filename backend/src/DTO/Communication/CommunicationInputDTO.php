<?php

declare(strict_types=1);

namespace App\DTO\Communication;

use Symfony\Component\HttpFoundation\Request;

/**
 * Validates and carries the payload for creating a CommunicationMessage.
 *
 * Expected JSON body:
 * {
 *   "type":           "notification" | "modal"          (required)
 *   "title":          string                             (required, max 255)
 *   "body":           string                             (required)
 *   "imageUrl":       string|null                        (optional)
 *   "linkUrl":        string|null                        (optional)
 *   "buttonLabel":    string|null                        (optional, max 100)
 *   "targetUrl":      string|null                        (optional — notification redirect)
 *   "priority":       int|null                           (optional — modal order)
 *   "scopeType":      "all" | "role" | "user"            (required)
 *   "targetRole":     "manager"|"resident"|"hospital_admin" (required when scopeType=role)
 *   "targetUserId":   int|null                           (required when scopeType=user)
 *   "targetUserType": "manager"|"resident"|"hospital_admin" (required when scopeType=user)
 * }
 */
final class CommunicationInputDTO
{
    public readonly string  $type;
    public readonly string  $title;
    public readonly string  $body;
    public readonly ?string $imageUrl;
    public readonly ?string $linkUrl;
    public readonly ?string $buttonLabel;
    public readonly ?string $targetUrl;
    public readonly ?int    $priority;
    public readonly string  $scopeType;
    public readonly ?string $targetRole;
    public readonly ?int    $targetUserId;
    public readonly ?string $targetUserType;

    private function __construct(
        string  $type,
        string  $title,
        string  $body,
        ?string $imageUrl,
        ?string $linkUrl,
        ?string $buttonLabel,
        ?string $targetUrl,
        ?int    $priority,
        string  $scopeType,
        ?string $targetRole,
        ?int    $targetUserId,
        ?string $targetUserType,
    ) {
        $this->type           = $type;
        $this->title          = $title;
        $this->body           = $body;
        $this->imageUrl       = $imageUrl;
        $this->linkUrl        = $linkUrl;
        $this->buttonLabel    = $buttonLabel;
        $this->targetUrl      = $targetUrl;
        $this->priority       = $priority;
        $this->scopeType      = $scopeType;
        $this->targetRole     = $targetRole;
        $this->targetUserId   = $targetUserId;
        $this->targetUserType = $targetUserType;
    }

    public static function fromRequest(Request $request): self
    {
        $data = json_decode($request->getContent(), true) ?? [];

        $type      = $data['type']      ?? null;
        $title     = $data['title']     ?? null;
        $body      = $data['body']      ?? null;
        $scopeType = $data['scopeType'] ?? null;

        if (!in_array($type, ['notification', 'modal'], true)) {
            throw new \InvalidArgumentException('Le champ type doit être "notification" ou "modal".');
        }
        if (empty($title) || strlen($title) > 255) {
            throw new \InvalidArgumentException('Le titre est obligatoire et ne peut pas dépasser 255 caractères.');
        }
        if (empty($body)) {
            throw new \InvalidArgumentException('Le contenu est obligatoire.');
        }
        if (!in_array($scopeType, ['all', 'role', 'user'], true)) {
            throw new \InvalidArgumentException('Le champ scopeType doit être "all", "role" ou "user".');
        }

        $targetRole     = $data['targetRole']     ?? null;
        $targetUserId   = isset($data['targetUserId'])   ? (int) $data['targetUserId']   : null;
        $targetUserType = $data['targetUserType'] ?? null;

        if ($scopeType === 'role') {
            if (!in_array($targetRole, ['manager', 'resident', 'hospital_admin'], true)) {
                throw new \InvalidArgumentException('targetRole doit être "manager", "resident" ou "hospital_admin" quand scopeType est "role".');
            }
        }
        if ($scopeType === 'user') {
            if ($targetUserId === null || empty($targetUserType)) {
                throw new \InvalidArgumentException('targetUserId et targetUserType sont obligatoires quand scopeType est "user".');
            }
        }

        $buttonLabel = $data['buttonLabel'] ?? null;
        if ($buttonLabel !== null && strlen($buttonLabel) > 100) {
            throw new \InvalidArgumentException('Le libellé du bouton ne peut pas dépasser 100 caractères.');
        }

        return new self(
            type:           $type,
            title:          $title,
            body:           $body,
            imageUrl:       $data['imageUrl']   ?? null,
            linkUrl:        $data['linkUrl']     ?? null,
            buttonLabel:    $buttonLabel,
            targetUrl:      $data['targetUrl']   ?? null,
            priority:       isset($data['priority']) ? (int) $data['priority'] : null,
            scopeType:      $scopeType,
            targetRole:     $targetRole,
            targetUserId:   $targetUserId,
            targetUserType: $targetUserType,
        );
    }
}
