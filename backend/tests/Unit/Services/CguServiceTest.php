<?php

declare(strict_types=1);

namespace App\Tests\Unit\Services;

use App\Services\CguService;
use PHPUnit\Framework\TestCase;

/**
 * Tests for CguService.
 *
 * Covers:
 * - isAccepted() returns true when the stored version matches CGU_VERSION
 * - isAccepted() returns false for null settings, missing key, wrong version
 * - acceptPatch() returns the expected structure with the current version
 */
final class CguServiceTest extends TestCase
{
    // ── isAccepted ────────────────────────────────────────────────────────────

    public function testIsAcceptedReturnsTrueWhenVersionMatches(): void
    {
        $settings = ['cgv' => ['acceptedVersion' => CguService::CGU_VERSION]];

        $this->assertTrue(CguService::isAccepted($settings));
    }

    public function testIsAcceptedReturnsFalseWhenSettingsAreNull(): void
    {
        $this->assertFalse(CguService::isAccepted(null));
    }

    public function testIsAcceptedReturnsFalseWhenSettingsAreEmpty(): void
    {
        $this->assertFalse(CguService::isAccepted([]));
    }

    public function testIsAcceptedReturnsFalseWhenCgvKeyMissing(): void
    {
        $settings = ['theme' => 'dark', 'language' => 'fr'];

        $this->assertFalse(CguService::isAccepted($settings));
    }

    public function testIsAcceptedReturnsFalseWhenAcceptedVersionKeyMissing(): void
    {
        $settings = ['cgv' => []];

        $this->assertFalse(CguService::isAccepted($settings));
    }

    public function testIsAcceptedReturnsFalseWhenVersionIsOld(): void
    {
        $settings = ['cgv' => ['acceptedVersion' => '2025.1']];

        $this->assertFalse(CguService::isAccepted($settings));
    }

    public function testIsAcceptedReturnsFalseWhenVersionIsNull(): void
    {
        $settings = ['cgv' => ['acceptedVersion' => null]];

        $this->assertFalse(CguService::isAccepted($settings));
    }

    public function testIsAcceptedReturnsFalseWhenVersionIsEmptyString(): void
    {
        $settings = ['cgv' => ['acceptedVersion' => '']];

        $this->assertFalse(CguService::isAccepted($settings));
    }

    // ── acceptPatch ───────────────────────────────────────────────────────────

    public function testAcceptPatchReturnsCorrectStructure(): void
    {
        $patch = CguService::acceptPatch();

        $this->assertArrayHasKey('cgv', $patch);
        $this->assertArrayHasKey('acceptedVersion', $patch['cgv']);
        $this->assertSame(CguService::CGU_VERSION, $patch['cgv']['acceptedVersion']);
    }

    public function testAcceptPatchVersionMatchesIsAccepted(): void
    {
        $patch = CguService::acceptPatch();

        // Applying the patch to an empty settings array must result in isAccepted() = true.
        $this->assertTrue(CguService::isAccepted($patch));
    }

    // ── CGU_VERSION constant ──────────────────────────────────────────────────

    public function testCguVersionConstantIsNonEmpty(): void
    {
        $this->assertNotEmpty(CguService::CGU_VERSION);
    }

    public function testCguVersionConstantMatchesExpectedFormat(): void
    {
        // Version format: YYYY.N — e.g. "2026.1"
        $this->assertMatchesRegularExpression('/^\d{4}\.\d+$/', CguService::CGU_VERSION);
    }
}
