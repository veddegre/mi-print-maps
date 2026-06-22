<?php

declare(strict_types=1);

namespace MiPrintMaps\Services;

use MiPrintMaps\Config;

final class StyleService
{
    /** @var array<string, array> */
    private static array $styleCache = [];

    /** @param list<string> $hide */
    public static function build(string $styleName, array $hide = []): array
    {
        $tileUrl = Config::tileUrl();

        if (self::usesCustomTileEndpoint($tileUrl)) {
            $style = self::buildFromCustomTiles($styleName, $tileUrl);
        } else {
            $style = self::fetchBaseStyle($styleName);
            $style['name'] = $styleName;
            self::applyTheme($style, $styleName);
        }

        self::applyLayerVisibility($style, $hide);
        self::enhancePrintContrast($style);

        return $style;
    }

    private static function usesCustomTileEndpoint(string $tileUrl): bool
    {
        return str_contains($tileUrl, '{z}/{x}/{y}')
            && !str_contains($tileUrl, 'openfreemap.org');
    }

    private static function baseStyleUrl(string $styleName): string
    {
        return match ($styleName) {
            'dark'      => 'https://tiles.openfreemap.org/styles/dark',
            'topo'      => 'https://tiles.openfreemap.org/styles/liberty',
            'blueprint' => 'https://tiles.openfreemap.org/styles/fiord',
            default     => 'https://tiles.openfreemap.org/styles/bright',
        };
    }

    private static function fetchBaseStyle(string $styleName): array
    {
        $url = self::baseStyleUrl($styleName);
        if (!isset(self::$styleCache[$url])) {
            $json = @file_get_contents($url);
            if ($json === false) {
                return self::buildFromCustomTiles($styleName, 'https://tiles.openfreemap.org/planet');
            }
            self::$styleCache[$url] = json_decode($json, true, 512, JSON_THROW_ON_ERROR);
        }
        return self::$styleCache[$url];
    }

    /** @param list<string> $hide */
    private static function applyLayerVisibility(array &$style, array $hide): void
    {
        if ($hide === []) {
            return;
        }

        foreach ($style['layers'] as &$layer) {
            if (self::shouldHideLayer($layer['id'] ?? '', $hide)) {
                $layer['layout'] ??= [];
                $layer['layout']['visibility'] = 'none';
            }
        }
        unset($layer);
    }

    /** @param list<string> $hide */
    private static function shouldHideLayer(string $id, array $hide): bool
    {
        foreach ($hide as $category) {
            if (self::matchesHideCategory($id, $category)) {
                return true;
            }
        }
        return false;
    }

    private static function matchesHideCategory(string $id, string $category): bool
    {
        return match ($category) {
            'transit' => self::matches($id, [
                'poi_transit', 'railway-transit', 'railway-service',
                'aeroway', 'airport', 'ferry', 'cablecar', 'landuse-railway',
            ]),
            'poi' => str_starts_with($id, 'poi_'),
            'shields' => self::matches($id, ['highway-shield', 'road_shield']),
            'paths' => self::matches($id, [
                'highway-path', 'highway-name-path', 'tunnel-path', 'bridge-path',
            ]),
            'minor_labels' => self::matches($id, [
                'highway-name-minor', 'highway-name-path', 'label_village', 'label_other',
            ]),
            default => false,
        };
    }

    private static function applyTheme(array &$style, string $styleName): void
    {
        $palette = self::palette($styleName);
        if ($palette === null) {
            return;
        }

        foreach ($style['layers'] as &$layer) {
            $id = $layer['id'] ?? '';
            $type = $layer['type'] ?? '';

            if ($type === 'background') {
                $layer['paint']['background-color'] = $palette['background'];
                continue;
            }

            if ($type === 'fill') {
                if (self::matches($id, ['water', 'waterway', 'ocean'])) {
                    $layer['paint']['fill-color'] = $palette['water'];
                } elseif (self::matches($id, ['park', 'landcover', 'landuse', 'grass'])) {
                    $layer['paint']['fill-color'] = $palette['land'];
                } elseif (self::matches($id, ['building'])) {
                    $layer['paint']['fill-color'] = $palette['building'];
                }
            }

            if ($type === 'line') {
                if (self::matches($id, ['water', 'waterway', 'river'])) {
                    if (isset($layer['paint']['line-color']) && is_string($layer['paint']['line-color'])) {
                        $layer['paint']['line-color'] = $palette['water'];
                    }
                } elseif (self::matches($id, ['casing'])) {
                    if (isset($layer['paint']['line-color']) && is_string($layer['paint']['line-color'])) {
                        $layer['paint']['line-color'] = $palette['road_casing'];
                    }
                } elseif (self::matches($id, ['road', 'highway', 'transportation', 'bridge', 'tunnel', 'rail'])) {
                    if (isset($layer['paint']['line-color']) && is_string($layer['paint']['line-color'])) {
                        $layer['paint']['line-color'] = $palette['road'];
                    }
                } elseif (self::matches($id, ['contour', 'topo'])) {
                    if (isset($layer['paint']['line-color']) && is_string($layer['paint']['line-color'])) {
                        $layer['paint']['line-color'] = $palette['contour'];
                    }
                }
            }

            if ($type === 'symbol') {
                if (isset($layer['paint']['text-color']) && is_string($layer['paint']['text-color'])) {
                    $layer['paint']['text-color'] = $palette['text'];
                }
                if (isset($layer['paint']['text-halo-color'])) {
                    $layer['paint']['text-halo-color'] = $palette['background'];
                }
            }
        }
        unset($layer);
    }

    private static function enhancePrintContrast(array &$style): void
    {
        foreach ($style['layers'] as &$layer) {
            if (($layer['type'] ?? '') !== 'symbol') {
                continue;
            }
            $layer['paint'] ??= [];
            if (isset($layer['paint']['text-halo-width'])) {
                $layer['paint']['text-halo-width'] = max(1.5, (float) $layer['paint']['text-halo-width']);
            } else {
                $layer['paint']['text-halo-width'] = 2;
            }
            if (!isset($layer['paint']['text-halo-color'])) {
                $layer['paint']['text-halo-color'] = '#ffffff';
            }
        }
        unset($layer);
    }

    private static function matches(string $id, array $needles): bool
    {
        foreach ($needles as $needle) {
            if (str_contains($id, $needle)) {
                return true;
            }
        }
        return false;
    }

    private static function palette(string $style): ?array
    {
        return match ($style) {
            'minimalist' => [
                'background'  => '#f7f7f5',
                'water'       => '#9ec9de',
                'land'        => '#eceae4',
                'road'        => '#ffffff',
                'road_casing' => '#c8c4bc',
                'building'    => '#ddd9d2',
                'contour'     => '#ccc8c0',
                'text'        => '#2a2a2a',
            ],
            'topo' => [
                'background'  => '#f5f0e6',
                'water'       => '#7eb8d4',
                'land'        => '#e8e2d4',
                'road'        => '#fffef8',
                'road_casing' => '#b8a898',
                'building'    => '#d8d0c4',
                'contour'     => '#a89888',
                'text'        => '#3a3028',
            ],
            'dark' => [
                'background'  => '#1a2030',
                'water'       => '#243650',
                'land'        => '#222838',
                'road'        => '#3a4558',
                'road_casing' => '#121820',
                'building'    => '#2a3244',
                'contour'     => '#3a4558',
                'text'        => '#d8e0ec',
            ],
            'vintage' => [
                'background'  => '#f0e6d0',
                'water'       => '#8eb4c8',
                'land'        => '#e4dcc8',
                'road'        => '#faf6ee',
                'road_casing' => '#b8a888',
                'building'    => '#d4c8b0',
                'contour'     => '#b8a888',
                'text'        => '#4a3828',
            ],
            'blueprint' => [
                'background'  => '#1a3a5c',
                'water'       => '#143050',
                'land'        => '#1e4068',
                'road'        => '#4a78b0',
                'road_casing' => '#0f2848',
                'building'    => '#224870',
                'contour'     => '#2a5080',
                'text'        => '#c8dcf0',
            ],
            'black-white' => [
                'background'  => '#ffffff',
                'water'       => '#c8c8c8',
                'land'        => '#f0f0f0',
                'road'        => '#ffffff',
                'road_casing' => '#888888',
                'building'    => '#d8d8d8',
                'contour'     => '#aaaaaa',
                'text'        => '#111111',
            ],
            default => null,
        };
    }

    /** Fallback for self-hosted OpenMapTiles endpoints. */
    private static function buildFromCustomTiles(string $styleName, string $tileUrl): array
    {
        $glyphs = Config::glyphsUrl();
        $palette = self::palette($styleName) ?? self::palette('minimalist');

        $source = str_contains($tileUrl, '{z}/{x}/{y}')
            ? ['type' => 'vector', 'tiles' => [$tileUrl], 'minzoom' => 0, 'maxzoom' => 14]
            : ['type' => 'vector', 'url' => $tileUrl];

        return [
            'version' => 8,
            'name' => $styleName,
            'glyphs' => $glyphs,
            'sources' => ['openmaptiles' => $source],
            'layers' => [
                ['id' => 'background', 'type' => 'background', 'paint' => ['background-color' => $palette['background']]],
                ['id' => 'landcover', 'type' => 'fill', 'source' => 'openmaptiles', 'source-layer' => 'landcover',
                    'paint' => ['fill-color' => $palette['land'], 'fill-opacity' => 0.6]],
                ['id' => 'landuse', 'type' => 'fill', 'source' => 'openmaptiles', 'source-layer' => 'landuse',
                    'paint' => ['fill-color' => $palette['land'], 'fill-opacity' => 0.5]],
                ['id' => 'park', 'type' => 'fill', 'source' => 'openmaptiles', 'source-layer' => 'park',
                    'paint' => ['fill-color' => $palette['land'], 'fill-opacity' => 0.7]],
                ['id' => 'water', 'type' => 'fill', 'source' => 'openmaptiles', 'source-layer' => 'water',
                    'paint' => ['fill-color' => $palette['water']]],
                ['id' => 'waterway', 'type' => 'line', 'source' => 'openmaptiles', 'source-layer' => 'waterway',
                    'paint' => ['line-color' => $palette['water'], 'line-width' => 1.2]],
                ['id' => 'building', 'type' => 'fill', 'source' => 'openmaptiles', 'source-layer' => 'building',
                    'minzoom' => 13, 'paint' => ['fill-color' => $palette['building'], 'fill-opacity' => 0.85]],
                ['id' => 'road-casing', 'type' => 'line', 'source' => 'openmaptiles', 'source-layer' => 'transportation',
                    'filter' => ['!=', ['get', 'class'], 'path'],
                    'paint' => ['line-color' => $palette['road_casing'], 'line-width' => ['interpolate', ['linear'], ['zoom'], 8, 0.8, 14, 3.5]]],
                ['id' => 'road', 'type' => 'line', 'source' => 'openmaptiles', 'source-layer' => 'transportation',
                    'filter' => ['!=', ['get', 'class'], 'path'],
                    'paint' => ['line-color' => $palette['road'], 'line-width' => ['interpolate', ['linear'], ['zoom'], 8, 0.5, 14, 2.5]]],
                ['id' => 'road-major', 'type' => 'line', 'source' => 'openmaptiles', 'source-layer' => 'transportation',
                    'filter' => ['in', ['get', 'class'], ['literal', ['motorway', 'trunk', 'primary']]],
                    'paint' => ['line-color' => $palette['road'], 'line-width' => ['interpolate', ['linear'], ['zoom'], 6, 0.8, 14, 5]]],
                ['id' => 'place-label', 'type' => 'symbol', 'source' => 'openmaptiles', 'source-layer' => 'place',
                    'layout' => [
                        'text-field' => ['get', 'name'],
                        'text-font' => ['Noto Sans Regular'],
                        'text-size' => ['interpolate', ['linear'], ['zoom'], 4, 10, 12, 16],
                    ],
                    'paint' => [
                        'text-color' => $palette['text'],
                        'text-halo-color' => $palette['background'],
                        'text-halo-width' => 2,
                    ]],
            ],
        ];
    }
}
