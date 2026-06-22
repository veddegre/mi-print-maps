<?php

declare(strict_types=1);

namespace MiPrintMaps\Controllers;

abstract class BaseController
{
    protected function json(mixed $data, int $status = 200): void
    {
        http_response_code($status);
        header('Content-Type: application/json');
        echo json_encode($data, JSON_THROW_ON_ERROR);
    }

    protected function render(string $template, array $data = []): void
    {
        extract($data);
        $contentTemplate = dirname(__DIR__, 2) . '/templates/' . $template . '.php';
        require dirname(__DIR__, 2) . '/templates/layout.php';
    }

    protected function readJsonBody(): array
    {
        $raw = file_get_contents('php://input') ?: '{}';
        return json_decode($raw, true, 512, JSON_THROW_ON_ERROR) ?: [];
    }
}
