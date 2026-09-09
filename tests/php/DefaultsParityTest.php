<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;
use TmThreeViewer\Data\TM3D_Data;

final class DefaultsParityTest extends TestCase
{
    public function testNoParamAndEquivalentParamInitialStateMatch(): void
    {
        $previousRequestUri = $_SERVER['REQUEST_URI'] ?? null;

        try {
            unset($_SERVER['REQUEST_URI']);

            $data = TM3D_Data::getData();
            $noParamState = $data['initial_state'] ?? [];

            $this->assertNotEmpty($noParamState['id'] ?? '', 'Expected default initial state id.');
            $this->assertNotEmpty($noParamState['top'] ?? '', 'Expected default initial state top.');
            $this->assertNotEmpty($noParamState['base'] ?? '', 'Expected default initial state base.');

            $query = [
                'id=' . rawurlencode((string) ($noParamState['id'] ?? '')),
                'colour=' . rawurlencode((string) ($noParamState['top'] ?? '')),
                'base=' . rawurlencode((string) ($noParamState['base'] ?? '')),
            ];

            if (!empty($noParamState['veneer'])) {
                $query[] = 'veneer=' . rawurlencode((string) $noParamState['veneer']);
            }

            $_SERVER['REQUEST_URI'] = '/?' . implode('&', $query);

            $paramState = TM3D_Data::productInitialState();

            $this->assertSame((int) ($noParamState['id'] ?? 0), (int) ($paramState['id'] ?? 0));
            $this->assertSame((string) ($noParamState['top'] ?? ''), (string) ($paramState['top'] ?? ''));
            $this->assertSame((string) ($noParamState['base'] ?? ''), (string) ($paramState['base'] ?? ''));
            $this->assertSame((string) ($noParamState['veneer'] ?? ''), (string) ($paramState['veneer'] ?? ''));
        } finally {
            if ($previousRequestUri === null) {
                unset($_SERVER['REQUEST_URI']);
            } else {
                $_SERVER['REQUEST_URI'] = $previousRequestUri;
            }
        }
    }

    public function testExpectedModelHasCanonicalDefaultColourOptionKeys(): void
    {
        $expectedId = (int) ($_ENV['EXPECTED_DEFAULT_PRODUCT_ID'] ?? getenv('EXPECTED_DEFAULT_PRODUCT_ID') ?: 0);

        if ($expectedId <= 0) {
            $this->markTestSkipped('Set EXPECTED_DEFAULT_PRODUCT_ID in tests/.env to enable this assertion.');
        }

        TM3D_Data::getData();
        $model = TM3D_Data::get_model_by_id($expectedId);

        $this->assertIsArray($model);
        $this->assertNotEmpty($model['default_colour_options'] ?? []);

        $options = $model['default_colour_options'];

        $this->assertArrayHasKey('_tmpa_top_colour', $options);
        $this->assertArrayHasKey('_tmpa_base_colour', $options);
        $this->assertArrayHasKey('_tmpa_metal_colour', $options);

        $this->assertNotEmpty((string) ($options['_tmpa_top_colour'] ?? ''));
        $this->assertNotEmpty((string) ($options['_tmpa_base_colour'] ?? ''));
    }
}
