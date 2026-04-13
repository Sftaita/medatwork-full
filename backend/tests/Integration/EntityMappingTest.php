<?php

declare(strict_types=1);

namespace App\Tests\Integration;

use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

/**
 * Verifies that Doctrine entity mappings are valid without needing a real database.
 */
class EntityMappingTest extends KernelTestCase
{
    public function testEntityMappingsAreValid(): void
    {
        self::bootKernel();

        $em = static::getContainer()->get('doctrine')->getManager();
        $metadata = $em->getMetadataFactory()->getAllMetadata();

        $this->assertNotEmpty($metadata, 'Should have at least one mapped entity');

        $entityNames = array_map(fn ($m) => $m->getName(), $metadata);

        $this->assertContains('App\Entity\Manager', $entityNames);
        $this->assertContains('App\Entity\Resident', $entityNames);
        $this->assertContains('App\Entity\Years', $entityNames);
        $this->assertContains('App\Entity\Timesheet', $entityNames);
    }

    public function testAllEntitiesHaveIdField(): void
    {
        self::bootKernel();

        $em = static::getContainer()->get('doctrine')->getManager();
        $allMetadata = $em->getMetadataFactory()->getAllMetadata();

        foreach ($allMetadata as $metadata) {
            $this->assertTrue(
                $metadata->hasField('id') || count($metadata->getIdentifier()) > 0,
                "Entity {$metadata->getName()} must have an identifier"
            );
        }
    }
}
