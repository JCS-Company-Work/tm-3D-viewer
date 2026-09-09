<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;
use TmThreeViewer\Data\TM3D_Data;

final class InitialStateTest extends TestCase
{
    public function testInitialStateIncludesTopAndBaseDefaults(): void
    {
        $data = TM3D_Data::getData();
        $initial = $data['initial_state'] ?? [];

        $this->assertIsArray($initial);
        $this->assertNotEmpty($initial['top'] ?? '', 'Expected top default in initial_state.');
        $this->assertNotEmpty($initial['base'] ?? '', 'Expected base default in initial_state.');
        $this->assertArrayHasKey('veneer', $initial, 'Expected veneer compatibility key in initial_state.');
    }

    public function testInitialStateUsesExpectedDefaultProductIdWhenProvided(): void
    {
        $expectedId = (int) ($_ENV['EXPECTED_DEFAULT_PRODUCT_ID'] ?? getenv('EXPECTED_DEFAULT_PRODUCT_ID') ?: 0);

        if ($expectedId <= 0) {
            $this->markTestSkipped('Set EXPECTED_DEFAULT_PRODUCT_ID in tests/.env to enable this assertion.');
        }

        $data = TM3D_Data::getData();
        $initial = $data['initial_state'] ?? [];
        $this->assertSame($expectedId, (int) ($initial['id'] ?? 0));
    }
}
