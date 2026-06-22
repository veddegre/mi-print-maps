<?php

declare(strict_types=1);

namespace MiPrintMaps;

final class Config
{
    private static array $config = [];

    public static function load(string $basePath): void
    {
        $envFile = $basePath . '/.env';
        if (is_file($envFile)) {
            foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
                if (str_starts_with(trim($line), '#') || !str_contains($line, '=')) {
                    continue;
                }
                [$key, $value] = explode('=', $line, 2);
                self::$config[trim($key)] = trim($value, " \t\"'");
            }
        }

        foreach ($_ENV as $key => $value) {
            if (is_string($value)) {
                self::$config[$key] = $value;
            }
        }
    }

    public static function get(string $key, mixed $default = null): mixed
    {
        return self::$config[$key] ?? getenv($key) ?: $default;
    }

    public static function appName(): string
    {
        return (string) self::get('APP_NAME', 'MI Print Maps');
    }

    public static function tileUrl(): string
    {
        return (string) self::get('TILE_URL', 'http://localhost:8090/data/michigan/{z}/{x}/{y}.pbf');
    }

    public static function glyphsUrl(): string
    {
        return (string) self::get('GLYPHS_URL', 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf');
    }

    public static function defaultCenter(): array
    {
        return [
            'lat' => (float) self::get('DEFAULT_LAT', 44.3148),
            'lng' => (float) self::get('DEFAULT_LNG', -85.6024),
            'zoom' => (float) self::get('DEFAULT_ZOOM', 6),
        ];
    }

    public static function michiganBounds(): array
    {
        // [west, south, east, north] — includes full UP with margin (Ironwood, Keweenaw, Isle Royale)
        return [-91.3, 41.55, -81.85, 48.45];
    }

    public static function paperSizes(): array
    {
        return [
            '8x10'  => ['width' => 8, 'height' => 10, 'label' => '8×10"'],
            '11x14' => ['width' => 11, 'height' => 14, 'label' => '11×14"'],
            '16x20' => ['width' => 16, 'height' => 20, 'label' => '16×20"'],
            '24x36' => ['width' => 24, 'height' => 36, 'label' => '24×36"'],
        ];
    }

    public static function dpis(): array
    {
        return [150, 300, 600];
    }

    public static function styles(): array
    {
        return [
            'minimalist'    => 'Minimalist',
            'topo'          => 'Topographic',
            'dark'          => 'Dark',
            'vintage'       => 'Vintage',
            'blueprint'     => 'Blueprint',
            'black-white'   => 'Black & White',
        ];
    }
}
