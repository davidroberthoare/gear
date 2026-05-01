<?php
require __DIR__ . '/version-config.php';

header('Content-Type: application/javascript; charset=UTF-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

echo 'self.APP_VERSION = ' . json_encode($APP_VERSION) . ';' . "\n";
echo 'window.APP_VERSION = ' . json_encode($APP_VERSION) . ';' . "\n";
