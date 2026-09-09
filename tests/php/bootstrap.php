<?php

declare(strict_types=1);

/**
 * Minimal .env loader for tests/.env (KEY=VALUE lines).
 */
function tm3d_test_load_env(string $path): void {
    if (!is_file($path)) {
        return;
    }

    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if (!is_array($lines)) {
        return;
    }

    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) {
            continue;
        }

        $pos = strpos($line, '=');
        if ($pos === false) {
            continue;
        }

        $key = trim(substr($line, 0, $pos));
        $val = trim(substr($line, $pos + 1));

        if ($key === '') {
            continue;
        }

        $val = trim($val, "\"'");
        putenv($key . '=' . $val);
        $_ENV[$key] = $val;
    }
}

$pluginRoot = dirname(__DIR__, 2);
tm3d_test_load_env($pluginRoot . '/tests/.env');

$wpLoadPath = $_ENV['WP_LOAD_PATH'] ?? getenv('WP_LOAD_PATH') ?: '';
if ($wpLoadPath === '' || !file_exists($wpLoadPath)) {
    fwrite(STDERR, "WP_LOAD_PATH missing or invalid. Set it in tests/.env\n");
    exit(1);
}

require_once $wpLoadPath;
