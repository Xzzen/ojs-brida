<?php

// Vercel Serverless entry point untuk Laravel 9
// Pastikan folder /tmp/storage tersedia karena filesystem Vercel bersifat read-only di luar /tmp
$dirs = [
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

require __DIR__ . '/../public/index.php';
