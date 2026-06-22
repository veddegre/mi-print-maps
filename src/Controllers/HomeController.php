<?php

declare(strict_types=1);

namespace MiPrintMaps\Controllers;

use MiPrintMaps\Config;

final class HomeController extends BaseController
{
    public function index(): void
    {
        $this->render('home', [
            'appName' => Config::appName(),
        ]);
    }

    public function editor(): void
    {
        $this->render('editor', [
            'appName' => Config::appName(),
        ]);
    }
}
