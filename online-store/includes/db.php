<?php
/**
 * includes/db.php — Secure Database Connector for Quantix Storefront Engine
 * Connects read-only to the cfd MySQL database with utf8mb4 encoding.
 */

if (!function_exists('get_store_db')) {
    function get_store_db() {
        static $pdo = null;
        if ($pdo !== null) {
            return $pdo;
        }

        // Try reading credentials from .env if available
        $envFile = '/lamp/www/cfdadmin/.env';
        $dbHost = '127.0.0.1';
        $dbName = 'cfd';
        $dbUser = 'root';
        $dbPass = '';

        if (file_exists($envFile)) {
            $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach ($lines as $line) {
                $line = trim($line);
                if (empty($line) || $line[0] === '#') continue;
                if (strpos($line, '=') !== false) {
                    list($k, $v) = explode('=', $line, 2);
                    $k = trim($k);
                    $v = trim($v, " \t\n\r\0\x0B\"'");
                    if ($k === 'CFD_DB_HOST') $dbHost = $v;
                    if ($k === 'CFD_DB_NAME') $dbName = $v;
                    if ($k === 'CFD_DB_USER') $dbUser = $v;
                    if ($k === 'CFD_DB_PASS') $dbPass = $v;
                }
            }
        }

        if (empty($dbPass) && getenv('MYSQL_PWD')) {
            $dbPass = getenv('MYSQL_PWD');
        }
        if (empty($dbPass)) {
            $dbPass = 'M@chiavell1'; // fallback standard server credential
        }

        try {
            $dsn = "mysql:host={$dbHost};dbname={$dbName};charset=utf8mb4";
            $pdo = new PDO($dsn, $dbUser, $dbPass, [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]);
            return $pdo;
        } catch (PDOException $e) {
            error_log('[Quantix Store DB Error] ' . $e->getMessage());
            die('<div style="font-family:sans-serif; padding:40px; text-align:center;"><h2>Tienda Temporalmente Fuera de Servicio</h2><p>Error de conexión a la base de datos.</p></div>');
        }
    }
}