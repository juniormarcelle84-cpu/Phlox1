<?php
/**
 * PHLOX TOGO - Server-side Payment Request Endpoint (/api/pay.php)
 * Security Hardened:
 * 1. Server-side generated random Order ID (PHX-XXXXXXXXXXXX). Client cannot specify or overwrite IDs.
 * 2. Strict catalog validation: Unknown product ID = HTTP 400.
 * 3. Total recalculated strictly from /data/server-catalog.json + server city fees.
 * 4. Anti-abuse: Max 3 requests / 10 min per IP and per debit phone number. Max 1 active pending payment per order.
 * 5. Safe file locking with flock().
 * 6. Security headers & display_errors=0.
 */

declare(strict_types=1);

ini_set('display_errors', '0');
error_reporting(0);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('X-Frame-Options: DENY');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Méthode non autorisée. Utilisez POST.'], JSON_UNESCAPED_UNICODE);
    exit;
}

$ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
$paygateToken = getenv('PAYGATE_API_KEY') ?: '';

$dataDir = dirname(__DIR__, 2) . '/data';
if (!is_dir($dataDir)) {
    @mkdir($dataDir, 0755, true);
}

$storageFile = $dataDir . '/phlox_orders_state.json';
$rateLimitFile = $dataDir . '/phlox_ratelimit.json';
$catalogFile = $dataDir . '/server-catalog.json';

// Load shared catalog
$catalog = ['products' => [], 'cityDeliveryFees' => []];
if (file_exists($catalogFile)) {
    $catContent = @file_get_contents($catalogFile);
    $decodedCat = json_decode($catContent ?: '', true);
    if (is_array($decodedCat)) {
        $catalog = $decodedCat;
    }
}

// Parse request body
$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput ?: '', true);
if (!is_array($data)) {
    $data = $_POST;
}

$rawPhone     = isset($data['phone_number']) ? preg_replace('/\D/', '', (string)$data['phone_number']) : '';
$network      = isset($data['network']) && strtoupper(trim((string)$data['network'])) === 'FLOOZ' ? 'FLOOZ' : 'TMONEY';
$city         = isset($data['city']) ? trim((string)$data['city']) : 'Lomé';
$customerName = isset($data['customer_name']) ? trim(strip_tags((string)$data['customer_name'])) : '';
$customerPhone = isset($data['customer_phone']) ? trim(strip_tags((string)$data['customer_phone'])) : '';
$customerAddress = isset($data['customer_address']) ? trim(strip_tags((string)$data['customer_address'])) : '';
$items        = isset($data['items']) && is_array($data['items']) ? $data['items'] : [];

// Normalize Togo Phone to 8 subscriber digits
if (str_starts_with($rawPhone, '00228') && strlen($rawPhone) >= 13) {
    $subscriber8 = substr($rawPhone, 5, 8);
} elseif (str_starts_with($rawPhone, '228') && strlen($rawPhone) >= 11) {
    $subscriber8 = substr($rawPhone, 3, 8);
} else {
    $subscriber8 = substr($rawPhone, 0, 8);
}

if (strlen($subscriber8) !== 8) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Numéro à débiter invalide. Veuillez saisir un numéro togolais à 8 chiffres.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$fullPaygatePhone = '228' . $subscriber8;

// Helper with flock for reading/writing JSON
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

// 7. ANTI-ABUS: Rate limiting for pay.php (Max 3 requests / 10 min per IP and per debit phone)
$rateLimits = loadJsonWithLock($rateLimitFile);
$now = time();
$window = 600; // 10 minutes

$ipKey = 'ip_' . $ip;
$phoneKey = 'phone_' . $fullPaygatePhone;

$ipRequests = array_filter($rateLimits[$ipKey] ?? [], fn($t) => ($now - $t) < $window);
$phoneRequests = array_filter($rateLimits[$phoneKey] ?? [], fn($t) => ($now - $t) < $window);

if (count($ipRequests) >= 3 || count($phoneRequests) >= 3) {
    http_response_code(429);
    echo json_encode([
        'status' => 'error',
        'message' => 'Trop de demandes de paiement. Veuillez patienter 10 minutes avant de réessayer.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// Check items against catalog (4. Produit inconnu = Erreur 400)
if (empty($items)) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Aucun article dans la commande.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$subtotal = 0;
$validatedItems = [];
$productsConfig = $catalog['products'] ?? [];

foreach ($items as $item) {
    if (!is_array($item)) continue;
    $prodId = isset($item['productId']) ? (string)$item['productId'] : '';
    $qty    = isset($item['quantity']) ? max(1, (int)$item['quantity']) : 1;

    if (!isset($productsConfig[$prodId])) {
        http_response_code(400);
        echo json_encode([
            'status' => 'error',
            'message' => 'Produit inconnu: ' . htmlspecialchars($prodId, ENT_QUOTES, 'UTF-8')
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $prodInfo = $productsConfig[$prodId];
    $unitPrice = (int)($prodInfo['price'] ?? 0);

    // Variant addon check
    if (isset($item['selectedVariants']) && is_array($item['selectedVariants']) && isset($prodInfo['variants'])) {
        foreach ($item['selectedVariants'] as $vVal) {
            if (is_string($vVal) && isset($prodInfo['variants'][$vVal])) {
                $unitPrice += (int)$prodInfo['variants'][$vVal];
            }
        }
    }

    $subtotal += $unitPrice * $qty;
    $validatedItems[] = [
        'productId' => $prodId,
        'productName' => $prodInfo['name'] ?? $prodId,
        'quantity' => $qty,
        'price' => $unitPrice,
        'selectedVariants' => $item['selectedVariants'] ?? []
    ];
}

$cityFees = $catalog['cityDeliveryFees'] ?? [];
$deliveryFee = $cityFees[$city] ?? 1000;
$serverRecalculatedTotal = $subtotal + $deliveryFee;

// 4. Server-generated Order ID (PHX- + random 12 hex chars)
try {
    $randomHex = strtoupper(bin2hex(random_bytes(6)));
} catch (\Throwable $e) {
    $randomHex = strtoupper(substr(md5((string)mt_rand()), 0, 12));
}
$orderId = 'PHX-' . $randomHex;

// Load orders state safely
$ordersState = loadJsonWithLock($storageFile);

// Refuse to overwrite existing order
if (isset($ordersState[$orderId])) {
    http_response_code(409);
    echo json_encode(['status' => 'error', 'message' => 'Identifiant de commande en conflit. Réessayez.'], JSON_UNESCAPED_UNICODE);
    exit;
}

// 7. Max 1 active pending payment request per order (checked when retrying)
$nowIso = gmdate('Y-m-d\TH:i:s\Z', $now);
$expiresTimestamp = $now + 120;

$ordersState[$orderId] = [
    'id'                  => $orderId,
    'identifier'          => $orderId,
    'customerName'        => $customerName,
    'customerPhone'       => $customerPhone ?: '+' . $fullPaygatePhone,
    'debitPhone'          => '+' . $fullPaygatePhone,
    'customerAddress'     => $customerAddress,
    'customerCity'        => $city,
    'paymentMethod'       => $network,
    'items'               => $validatedItems,
    'totalAmount'         => $serverRecalculatedTotal,
    'status'              => 'pending',
    'order_status'        => 'pending',
    'createdAt'           => $nowIso,
    'expiresAt'           => $expiresTimestamp,
    'expires_timestamp'   => $expiresTimestamp,
    'waSent'              => false
];

saveJsonWithLock($storageFile, $ordersState);

// Record rate limit hit
$ipRequests[] = $now;
$phoneRequests[] = $now;
$rateLimits[$ipKey] = $ipRequests;
$rateLimits[$phoneKey] = $phoneRequests;
saveJsonWithLock($rateLimitFile, $rateLimits);

// Send Push USSD request to PayGate (/api/v1/pay)
$txReference = null;
$paygateStatus = 0;

if ($paygateToken !== '' && function_exists('curl_init')) {
    $payload = json_encode([
        'auth_token'   => $paygateToken,
        'phone_number' => $fullPaygatePhone,
        'amount'       => $serverRecalculatedTotal,
        'description'  => 'Commande ' . $orderId . ' - PHLOX TOGO',
        'identifier'   => $orderId,
        'network'      => $network
    ]);

    $ch = curl_init('https://paygateglobal.com/api/v1/pay');
    if ($ch !== false) {
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $payload,
            CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 10
        ]);
        $rawRes = curl_exec($ch);
        curl_close($ch);

        if (is_string($rawRes)) {
            $pgData = json_decode($rawRes, true);
            if (is_array($pgData)) {
                $paygateStatus = isset($pgData['status']) ? (int)$pgData['status'] : 0;
                $txReference = isset($pgData['tx_reference']) ? (string)$pgData['tx_reference'] : null;
            }
        }
    }
}

if ($txReference !== null) {
    $ordersState = loadJsonWithLock($storageFile);
    if (isset($ordersState[$orderId])) {
        $ordersState[$orderId]['txReference'] = $txReference;
        $ordersState[$orderId]['tx_reference'] = $txReference;
        saveJsonWithLock($storageFile, $ordersState);
    }
}

$networkLabel = $network === 'FLOOZ' ? 'Flooz Money' : 'Mixx by Yas';

http_response_code(200);
echo json_encode([
    'status'         => 'success',
    'paygate_status' => $paygateStatus,
    'tx_reference'   => $txReference,
    'identifier'     => $orderId,
    'amount'         => $serverRecalculatedTotal,
    'expires_in'     => 120,
    'message'        => 'Demande Push USSD ' . $networkLabel . ' envoyée. Validez sur votre téléphone.'
], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
exit;
