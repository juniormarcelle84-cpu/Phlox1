<?php
/**
 * PHLOX TOGO - Admin API Endpoint (/api/admin.php)
 * Security Hardened:
 * 1. Session authentication with HttpOnly / SameSite=Strict cookies.
 * 2. Password hashed with password_hash / password_verify.
 * 3. Anti-abuse: max 5 login attempts per 15 min per IP.
 * 4. All admin actions require authenticated session.
 */

declare(strict_types=1);

ini_set('display_errors', '0');
error_reporting(0);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('X-Frame-Options: DENY');

session_set_cookie_params([
    'lifetime' => 86400,
    'path' => '/',
    'httponly' => true,
    'samesite' => 'Strict',
    'secure' => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on'
]);

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
$dataDir = dirname(__DIR__, 2) . '/data';
if (!is_dir($dataDir)) {
    @mkdir($dataDir, 0755, true);
}

$storageFile = $dataDir . '/phlox_orders_state.json';
$loginRateFile = $dataDir . '/phlox_admin_login_ratelimit.json';

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

// Get admin email, password or password hash from env
$envAdminEmail = getenv('ADMIN_EMAIL') ?: 'admin@phlox-togo.com';
$envAdminPass = getenv('ADMIN_PASSWORD') ?: '';
$envAdminPassHash = getenv('ADMIN_PASSWORD_HASH') ?: '';

$action = $_GET['action'] ?? 'status';

// Login endpoint
if ($action === 'login' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $loginLimits = loadJsonWithLock($loginRateFile);
    $now = time();
    $window = 900; // 15 minutes

    $ipKey = 'ip_' . $ip;
    $attempts = array_filter($loginLimits[$ipKey] ?? [], fn($t) => ($now - $t) < $window);

    if (count($attempts) >= 5) {
        http_response_code(429);
        echo json_encode([
            'status' => 'error',
            'message' => 'Trop de tentatives de connexion (max 5 par 15 min). Veuillez patienter.'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput ?: '', true);
    $inputPassword = isset($data['password']) ? (string)$data['password'] : '';

    if ($envAdminPass === '' && $envAdminPassHash === '') {
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'L\'administrateur doit configurer ADMIN_PASSWORD ou ADMIN_PASSWORD_HASH sur le serveur.'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $inputEmail = isset($data['email']) ? trim((string)$data['email']) : '';

    $isValid = false;
    if (strtolower($inputEmail) === strtolower($envAdminEmail)) {
        if ($envAdminPass !== '') {
            $isValid = ($inputPassword === $envAdminPass);
        } else if ($envAdminPassHash !== '') {
            $isValid = password_verify($inputPassword, $envAdminPassHash);
        }
    }

    if (!$isValid) {
        $attempts[] = $now;
        $loginLimits[$ipKey] = $attempts;
        saveJsonWithLock($loginRateFile, $loginLimits);

        http_response_code(401);
        echo json_encode([
            'status' => 'error',
            'message' => 'Mot de passe administrateur incorrect.'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $_SESSION['phlox_admin_authenticated'] = true;
    $_SESSION['phlox_admin_login_time'] = $now;

    $ordersMap = loadJsonWithLock($storageFile);
    $ordersList = array_values($ordersMap);

    http_response_code(200);
    echo json_encode([
        'status' => 'success',
        'message' => 'Authentification administrateur réussie.',
        'orders' => $ordersList
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// Check session requirement
if (empty($_SESSION['phlox_admin_authenticated'])) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Session administrateur non authentifiée.'], JSON_UNESCAPED_UNICODE);
    exit;
}

// Logout endpoint
if ($action === 'logout') {
    $_SESSION = [];
    if (ini_get("session.use_cookies")) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000,
            $params["path"], $params["domain"],
            $params["secure"], $params["httponly"]
        );
    }
    session_destroy();
    http_response_code(200);
    echo json_encode(['status' => 'success', 'message' => 'Déconnexion effectuée.'], JSON_UNESCAPED_UNICODE);
    exit;
}

// Admin orders endpoint
if ($action === 'orders') {
    $ordersMap = loadJsonWithLock($storageFile);

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        http_response_code(200);
        echo json_encode([
            'status' => 'success',
            'orders' => array_values($ordersMap)
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'PUT' || $_SERVER['REQUEST_METHOD'] === 'POST') {
        $rawInput = file_get_contents('php://input');
        $data = json_decode($rawInput ?: '', true);
        $orderId = isset($_GET['id']) ? strtoupper(trim((string)$_GET['id'])) : (isset($data['id']) ? strtoupper(trim((string)$data['id'])) : '');

        if ($orderId !== '' && isset($ordersMap[$orderId])) {
            if (isset($data['status'])) {
                $ordersMap[$orderId]['status'] = trim((string)$data['status']);
                $ordersMap[$orderId]['order_status'] = trim((string)$data['status']);
            }
            saveJsonWithLock($storageFile, $ordersMap);
            http_response_code(200);
            echo json_encode(['status' => 'success', 'order' => $ordersMap[$orderId]], JSON_UNESCAPED_UNICODE);
            exit;
        }

        http_response_code(404);
        echo json_encode(['status' => 'error', 'message' => 'Commande non trouvée.'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        $orderId = isset($_GET['id']) ? strtoupper(trim((string)$_GET['id'])) : '';
        if ($orderId !== '' && isset($ordersMap[$orderId])) {
            unset($ordersMap[$orderId]);
            saveJsonWithLock($storageFile, $ordersMap);
            http_response_code(200);
            echo json_encode(['status' => 'success', 'message' => 'Commande supprimée.'], JSON_UNESCAPED_UNICODE);
            exit;
        }
        http_response_code(404);
        echo json_encode(['status' => 'error', 'message' => 'Commande introuvable.'], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

http_response_code(400);
echo json_encode(['status' => 'error', 'message' => 'Action d\'administration non reconnue.'], JSON_UNESCAPED_UNICODE);
exit;
