<?php

declare(strict_types=1);

namespace MiPrintMaps\Controllers;

use MiPrintMaps\Config;
use MiPrintMaps\Services\PresetService;
use MiPrintMaps\Services\StyleService;

final class ApiController extends BaseController
{
    public function config(): void
    {
        $center = Config::defaultCenter();
        $this->json([
            'appName' => Config::appName(),
            'tileUrl' => Config::tileUrl(),
            'glyphsUrl' => Config::glyphsUrl(),
            'defaultCenter' => $center,
            'paperSizes' => Config::paperSizes(),
            'dpis' => Config::dpis(),
            'styles' => Config::styles(),
            'michiganBounds' => Config::michiganBounds(),
        ]);
    }

    public function presets(): void
    {
        $this->json(PresetService::all());
    }

    public function style(array $params): void
    {
        $styleName = $params['style'] ?? 'minimalist';
        $styles = Config::styles();

        if (!isset($styles[$styleName])) {
            $this->json(['error' => 'Unknown style'], 404);
            return;
        }

        $hide = [];
        if (!empty($_GET['hide'])) {
            $hide = array_filter(array_map('trim', explode(',', (string) $_GET['hide'])));
        }

        $style = StyleService::build($styleName, $hide);
        $this->json($style);
    }
}
