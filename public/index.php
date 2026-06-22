<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/vendor/autoload.php';

use MiPrintMaps\Config;
use MiPrintMaps\Router;
use MiPrintMaps\Controllers\HomeController;
use MiPrintMaps\Controllers\ApiController;

Config::load(dirname(__DIR__));

$router = new Router();

$router->get('/', [HomeController::class, 'index']);
$router->get('/editor', [HomeController::class, 'editor']);

$router->get('/api/config', [ApiController::class, 'config']);
$router->get('/api/presets', [ApiController::class, 'presets']);
$router->get('/api/styles/{style}', [ApiController::class, 'style']);

$router->dispatch(
    $_SERVER['REQUEST_METHOD'] ?? 'GET',
    parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/'
);
