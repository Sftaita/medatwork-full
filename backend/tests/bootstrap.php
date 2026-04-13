<?php

declare(strict_types=1);

use Symfony\Component\Dotenv\Dotenv;

require dirname(__DIR__).'/vendor/autoload.php';

if (file_exists(dirname(__DIR__).'/config/bootstrap.php')) {
    require dirname(__DIR__).'/config/bootstrap.php';
} elseif (method_exists(Dotenv::class, 'bootEnv')) {
    // usePutenv() ensures getenv() works in WebTestCase requests (DI env var processor).
    // putenv() is safe for single-process test runs (not thread-safe but tests are not parallel).
    (new Dotenv())->usePutenv()->bootEnv(dirname(__DIR__).'/.env');
}
