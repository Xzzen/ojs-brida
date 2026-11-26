<?php

// Vercel Serverless entry point untuk Laravel 9
// Pastikan folder /tmp/storage tersedia karena filesystem Vercel bersifat read-only di luar /tmp
$dirs = [
    '/tmp/storage/app',
    '/tmp/storage/framework/views',
    '/tmp/storage/framework/cache/data',
    '/tmp/storage/framework/sessions',
    '/tmp/storage/logs',
];
foreach ($dirs as $dir) {
    if (!is_dir($dir)) {
        @mkdir($dir, 0777, true);
    }
}

// Wajib: cegah Symfony/Laravel menghapus prefix "/api" akibat SCRIPT_NAME="/api/index.php" di vercel-php
$_SERVER['SCRIPT_NAME'] = '/index.php';
$_SERVER['PHP_SELF'] = '/index.php';

require __DIR__ . '/../public/index.php';
