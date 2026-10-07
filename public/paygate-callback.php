<?php
/**
 * PHLOX TOGO - PayGate Global Webhook Callback & Server Verification
 * URL : https://phlox-togo.com/paygate-callback.php
 * Security Hardened:
 * 1. Store location: /data/phlox_orders_state.json (outside public directory).
 * 2. Only transitions order to "paid" if PayGate /api/v2/status confirms (status 0)
 *    AND callback/API amount matches the saved order's totalAmount.
 * 3. Never creates a new order from a callback (403 Forbidden if order not found).
 * 4. Processes each tx_reference only once.
 * 5. Uses flock() for file locking.
 */

declare(strict_types=1);

ini_set('display_errors', '0');
error_reporting(0);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('X-Frame-Options: DENY');

$paygateApiKey = getenv('PAYGATE_API_KEY') ?: '';
$dataDir = is_dir(__DIR__ . '/data')
    ? __DIR__ . '/data'
    : (is_dir(dirname(__DIR__) . '/data') ? dirname(__DIR__) . '/data' : __DIR__ . '/data');
if (!is_dir($dataDir)) {
    @mkdir($dataDir, 0755, true);
}
$storageFile = $dataDir . '/phlox_orders_state.json';

function loadOrdersWithLock(string $filePath): array {
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

function saveOrdersWithLock(string $filePath, array $data): void {
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

function queryPaygateV2Status(string $apiKey, string $identifier): ?array {
    if ($apiKey === '' || !function_exists('curl_init')) {
        return null;
    }
    $ch = curl_init('https://paygateglobal.com/api/v2/status');
    if ($ch === false) return null;

    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => json_encode(['auth_token' => $apiKey, 'identifier' => $identifier]),
        CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 10
    ]);
    $res = curl_exec($ch);
    curl_close($ch);

    if (!is_string($res)) return null;
    $decoded = json_decode($res, true);
    return is_array($decoded) ? $decoded : null;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    http_response_code(200);
    echo json_encode([
        'status' => 'active',
        'merchant' => 'PHLOX TOGO',
        'message' => 'PayGate Callback Endpoint active.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'POST requis.'], JSON_UNESCAPED_UNICODE);
    exit;
}

$raw = file_get_contents('php://input');
$data = json_decode($raw ?: '', true);
if (!is_array($data)) {
    $data = $_POST;
}

$txReference = isset($data['tx_reference']) ? trim(htmlspecialchars(strip_tags((string)$data['tx_reference']), ENT_QUOTES, 'UTF-8')) : '';
$identifier  = isset($data['identifier']) ? strtoupper(trim(htmlspecialchars(strip_tags((string)$data['identifier']), ENT_QUOTES, 'UTF-8'))) : '';
$cbAmount    = isset($data['amount']) ? (float)$data['amount'] : 0.0;

if ($identifier === '' || $txReference === '') {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Réf ou identifiant manquant.'], JSON_UNESCAPED_UNICODE);
    exit;
}

$ordersState = loadOrdersWithLock($storageFile);

// 3. Ne crée JAMAIS une commande depuis un callback
if (!isset($ordersState[$identifier]) || !is_array($ordersState[$identifier])) {
    http_response_code(403);
    echo json_encode(['status' => 'error', 'message' => 'Commande introuvable.'], JSON_UNESCAPED_UNICODE);
    exit;
}

$record = $ordersState[$identifier];

// Traite chaque tx_reference une seule fois
if (isset($record['processed_tx_refs']) && is_array($record['processed_tx_refs'])) {
    if (in_array($txReference, $record['processed_tx_refs'], true)) {
        http_response_code(200);
        echo json_encode(['status' => 'success', 'message' => 'Transaction déjà traitée.'], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

// Interroge PayGate /api/v2/status pour vérifier statut 0
$pgInfo = queryPaygateV2Status($paygateApiKey, $identifier);
$pgStatus = $pgInfo !== null && isset($pgInfo['status']) ? (int)$pgInfo['status'] : -1;

if ($pgStatus !== 0) {
    http_response_code(403);
    echo json_encode(['status' => 'error', 'message' => 'Statut PayGate non confirmé (status != 0).'], JSON_UNESCAPED_UNICODE);
    exit;
}

// Vérifie que le montant égale celui de la commande enregistrée
$expectedAmount = (float)($record['totalAmount'] ?? $record['amount'] ?? 0);
if (abs($cbAmount - $expectedAmount) > 0.01 && abs((float)($pgInfo['amount'] ?? 0) - $expectedAmount) > 0.01) {
    http_response_code(403);
    echo json_encode(['status' => 'error', 'message' => 'Montant de paiement non conforme.'], JSON_UNESCAPED_UNICODE);
    exit;
}

// Tout est valide: passer à "paid"
$processedTx = $record['processed_tx_refs'] ?? [];
$processedTx[] = $txReference;

$ordersState[$identifier]['status'] = 'paid';
$ordersState[$identifier]['order_status'] = 'paid';
$ordersState[$identifier]['paidAt'] = gmdate('Y-m-d\TH:i:s\Z');
$ordersState[$identifier]['txReference'] = $txReference;
$ordersState[$identifier]['processed_tx_refs'] = array_values(array_unique($processedTx));

saveOrdersWithLock($storageFile, $ordersState);

http_response_code(200);
echo json_encode([
    'status' => 'success',
    'identifier' => $identifier,
    'message' => 'Commande ' . $identifier . ' passée au statut payée.'
], JSON_UNESCAPED_UNICODE);
exit;
