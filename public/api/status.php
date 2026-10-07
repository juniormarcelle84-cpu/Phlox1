<?php
/**
 * PHLOX TOGO - Server Status Verification Endpoint (/api/status.php)
 * Security Hardened:
 * 1. Reads from /data/phlox_orders_state.json with flock().
 * 2. Returns ONLY paid and order_status (NO phone number, NO amount).
 * 3. Anti-abuse: 1 request per 3 seconds per order identifier.
 */

declare(strict_types=1);

ini_set('display_errors', '0');
error_reporting(0);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('X-Frame-Options: DENY');

$paygateToken = getenv('PAYGATE_API_KEY') ?: '';
$dataDir = is_dir(dirname(__DIR__) . '/data')
    ? dirname(__DIR__) . '/data'
    : (is_dir(dirname(__DIR__, 2) . '/data') ? dirname(__DIR__, 2) . '/data' : dirname(__DIR__) . '/data');
if (!is_dir($dataDir)) {
    @mkdir($dataDir, 0755, true);
}
$storageFile = $dataDir . '/phlox_orders_state.json';
$rateLimitFile = $dataDir . '/phlox_status_ratelimit.json';

function loadJsonWithLock(string $filePath): array {
    if (!file_exists($filePath)) return [];
    $fp = @fopen($filePath, 'r');
    if (!$fp) return [];
    flock($fp, LOCK_SH);
    $content = @stream_get_contents($fp);
    flock($fp, LOCK_UN);
    fclose($fp);
    $decoded = json_decode($content ?: '', true);
    return is_array($decoded) ? $decoded : [];
}

function saveJsonWithLock(string $filePath, array $data): void {
    $fp = @fopen($filePath, 'c+');
    if (!$fp) return;
    flock($fp, LOCK_EX);
    ftruncate($fp, 0);
    rewind($fp);
    fwrite($fp, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
    fflush($fp);
    flock($fp, LOCK_UN);
    fclose($fp);
}

$identifier = '';
if (isset($_GET['identifier'])) {
    $identifier = strtoupper(trim(htmlspecialchars(strip_tags((string)$_GET['identifier']), ENT_QUOTES, 'UTF-8')));
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput ?: '', true);
    if (is_array($data) && isset($data['identifier'])) {
        $identifier = strtoupper(trim(htmlspecialchars(strip_tags((string)$data['identifier']), ENT_QUOTES, 'UTF-8')));
    }
}

if ($identifier === '') {
    http_response_code(400);
    echo json_encode([
        'status'       => 'error',
        'order_status' => 'pending',
        'paid'         => false
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// 7. Anti-abuse: 1 request / 3 seconds per order identifier
$statusLimits = loadJsonWithLock($rateLimitFile);
$now = time();
$lastReqTime = (int)($statusLimits[$identifier] ?? 0);

if (($now - $lastReqTime) < 3) {
    http_response_code(429);
    echo json_encode([
        'status'       => 'error',
        'identifier'   => $identifier,
        'order_status' => 'pending',
        'paid'         => false,
        'message'      => 'Veuillez espacer vos requêtes de statut (1 requête / 3 s).'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$statusLimits[$identifier] = $now;
saveJsonWithLock($rateLimitFile, $statusLimits);

$ordersState = loadJsonWithLock($storageFile);
$record = isset($ordersState[$identifier]) && is_array($ordersState[$identifier])
    ? $ordersState[$identifier]
    : null;

$orderStatus = $record ? (string)($record['order_status'] ?? $record['status'] ?? 'pending') : 'pending';
$isPaid = ($orderStatus === 'paid');

// Fallback check with PayGate /api/v2/status if pending
if (!$isPaid && $orderStatus === 'pending' && $paygateToken !== '' && function_exists('curl_init')) {
    $ch = curl_init('https://paygateglobal.com/api/v2/status');
    if ($ch !== false) {
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => json_encode(['auth_token' => $paygateToken, 'identifier' => $identifier]),
            CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 8
        ]);
        $res = curl_exec($ch);
        curl_close($ch);

        if (is_string($res)) {
            $pgJson = json_decode($res, true);
            if (is_array($pgJson) && isset($pgJson['status'])) {
                $pgStatus = (int)$pgJson['status'];
                if ($pgStatus === 0) {
                    $isPaid = true;
                    $orderStatus = 'paid';
                    if ($record) {
                        $ordersState[$identifier]['status'] = 'paid';
                        $ordersState[$identifier]['order_status'] = 'paid';
                        $ordersState[$identifier]['paidAt'] = gmdate('Y-m-d\TH:i:s\Z');
                        saveJsonWithLock($storageFile, $ordersState);
                    }
                } elseif (in_array($pgStatus, [4, 6], true)) {
                    $orderStatus = 'failed';
                }
            }
        }
    }
}

// Expiration check (2 min)
if (!$isPaid && $orderStatus === 'pending' && $record && isset($record['expires_timestamp'])) {
    if ($now > (int)$record['expires_timestamp']) {
        $orderStatus = 'expired';
    }
}

// 5. status.php ne renvoie que paid et order_status (ni téléphone, ni montant)
http_response_code(200);
echo json_encode([
    'status'       => 'success',
    'identifier'   => $identifier,
    'order_status' => $isPaid ? 'paid' : $orderStatus,
    'paid'         => $isPaid
], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
exit;
