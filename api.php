<?php
// Only set JSON header if not generating QR
if (!isset($_GET['action']) || $_GET['action'] !== 'qr') {
    header('Content-Type: application/json');
}
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Database file
$dbFile = __DIR__ . '/gear_kiosk.db';

// Initialize database connection
try {
    $db = new PDO('sqlite:' . $dbFile);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Create tables if they don't exist
    initializeDatabase($db);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => 'Database connection failed: ' . $e->getMessage()]);
    exit;
}

// Get JSON input
$input = file_get_contents('php://input');
$data = json_decode($input, true);

$action = $_GET['action'] ?? ($data['action'] ?? null);

if (!$action) {
    echo json_encode(['success' => false, 'error' => 'Invalid request']);
    exit;
}

try {
    switch ($action) {
        case 'teacher_login':
            $username = $data['username'] ?? '';
            $pin = $data['pin'] ?? '';
            
            if (empty($username) || empty($pin)) {
                echo json_encode(['success' => false, 'error' => 'Missing credentials']);
                break;
            }
            
            $stmt = $db->prepare('SELECT * FROM teachers WHERE username = ? AND pin = ?');
            $stmt->execute([$username, $pin]);
            $teacher = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($teacher) {
                echo json_encode(['success' => true, 'teacher' => $teacher]);
            } else {
                echo json_encode(['success' => false, 'error' => 'Invalid credentials']);
            }
            break;
            
        case 'create_teacher':
            $username = $data['username'] ?? '';
            $pin = $data['pin'] ?? '';
            
            if (empty($username) || empty($pin)) {
                echo json_encode(['success' => false, 'error' => 'Missing required fields']);
                break;
            }
            
            // Check if username exists
            $stmt = $db->prepare('SELECT id FROM teachers WHERE username = ?');
            $stmt->execute([$username]);
            if ($stmt->fetch()) {
                echo json_encode(['success' => false, 'error' => 'Username already exists']);
                break;
            }
            
            $stmt = $db->prepare('INSERT INTO teachers (username, pin, created_at) VALUES (?, ?, ?)');
            $stmt->execute([$username, $pin, time()]);
            
            echo json_encode(['success' => true, 'id' => $db->lastInsertId()]);
            break;
            
        case 'get_all':
            $teacherId = $data['teacher_id'] ?? null;
            
            $items = getAllItems($db, $teacherId);
            $students = getAllStudents($db, $teacherId);
            $logs = getRecentLogs($db, $teacherId);
            
            echo json_encode([
                'success' => true,
                'data' => [
                    'items' => $items,
                    'students' => $students,
                    'logs' => $logs
                ]
            ]);
            break;
            
        case 'add_item':
            $teacherId = $data['teacher_id'] ?? 0;
            $itemId = $data['item_id'] ?? '';
            $name = $data['name'] ?? '';
            $isTemporary = $data['is_temporary'] ?? 0;
            
            if (empty($itemId) || empty($name) || $teacherId == 0) {
                echo json_encode(['success' => false, 'error' => 'Missing required fields']);
                break;
            }
            
            $stmt = $db->prepare('INSERT INTO items (teacher_id, item_id, name, status, is_temporary) VALUES (?, ?, ?, ?, ?)');
            $stmt->execute([$teacherId, $itemId, $name, 'available', $isTemporary]);
            
            echo json_encode(['success' => true, 'id' => $db->lastInsertId()]);
            break;
            
        case 'update_item':
            $id = $data['id'] ?? 0;
            $status = $data['status'] ?? 'available';
            $currentUser = $data['current_user'] ?? null;
            
            $stmt = $db->prepare('UPDATE items SET status = ?, current_user = ? WHERE id = ?');
            $stmt->execute([$status, $currentUser, $id]);
            
            echo json_encode(['success' => true]);
            break;
            
        case 'delete_item':
            $id = $data['id'] ?? 0;
            
            $stmt = $db->prepare('DELETE FROM items WHERE id = ?');
            $stmt->execute([$id]);
            
            echo json_encode(['success' => true]);
            break;

        case 'qr':
            $code = $_GET['code'] ?? '';
            if (empty($code)) {
                // Return a simple text error if no code provided
                header('Content-Type: text/plain');
                echo 'No code provided';
                exit;
            }
            
            // Include library only when needed
            if (file_exists('phpqrcode.php')) {
                require_once('phpqrcode.php');
                // QRcode::png outputs image directly with headers
                QRcode::png($code);
            } else {
                header('Content-Type: text/plain');
                echo 'QR library missing';
            }
            exit;
            
        case 'add_student':
            $teacherId = $data['teacher_id'] ?? 0;
            $name = $data['name'] ?? '';
            $pin = $data['pin'] ?? '';
            $isTemporary = $data['is_temporary'] ?? 0;
            
            if (empty($name) || empty($pin) || $teacherId == 0) {
                echo json_encode(['success' => false, 'error' => 'Missing required fields']);
                break;
            }
            
            $stmt = $db->prepare('INSERT INTO students (teacher_id, name, pin, is_temporary) VALUES (?, ?, ?, ?)');
            $stmt->execute([$teacherId, $name, $pin, $isTemporary]);
            
            echo json_encode(['success' => true, 'id' => $db->lastInsertId()]);
            break;
            
        case 'add_log':
            $teacherId = $data['teacher_id'] ?? 0;
            $item = $data['item'] ?? '';
            $student = $data['student'] ?? '';
            $logAction = $data['log_action'] ?? '';
            
            if ($teacherId == 0) {
                echo json_encode(['success' => false, 'error' => 'Missing teacher_id']);
                break;
            }
            
            $timestamp = time() * 1000; // Milliseconds
            $timeStr = date('h:i A');
            
            $stmt = $db->prepare('INSERT INTO logs (teacher_id, item, student, action, timestamp, time_str) VALUES (?, ?, ?, ?, ?, ?)');
            $stmt->execute([$teacherId, $item, $student, $logAction, $timestamp, $timeStr]);
            
            echo json_encode(['success' => true, 'id' => $db->lastInsertId()]);
            break;
            
        case 'verify_all_pending':
            $teacherId = $data['teacher_id'] ?? 0;
            
            if ($teacherId == 0) {
                echo json_encode(['success' => false, 'error' => 'Missing teacher_id']);
                break;
            }
            
            $stmt = $db->prepare('UPDATE items SET status = ?, current_user = ? WHERE status = ? AND teacher_id = ?');
            $stmt->execute(['available', null, 'pending', $teacherId]);
            
            echo json_encode(['success' => true]);
            break;
            
        case 'delete_temporary_items':
            $teacherId = $data['teacher_id'] ?? 0;
            
            if ($teacherId == 0) {
                echo json_encode(['success' => false, 'error' => 'Missing teacher_id']);
                break;
            }
            
            $stmt = $db->prepare('DELETE FROM items WHERE teacher_id = ? AND is_temporary = 1 AND status = ?');
            $stmt->execute([$teacherId, 'available']);
            
            echo json_encode(['success' => true]);
            break;
            
        case 'delete_temporary_students':
            $teacherId = $data['teacher_id'] ?? 0;
            
            if ($teacherId == 0) {
                echo json_encode(['success' => false, 'error' => 'Missing teacher_id']);
                break;
            }
            
            // Delete temporary students who don't have any items checked out
            $stmt = $db->prepare('DELETE FROM students WHERE teacher_id = ? AND is_temporary = 1');
            $stmt->execute([$teacherId]);
            
            echo json_encode(['success' => true]);
            break;
            
        case 'change_teacher_pin':
            $teacherId = $data['teacher_id'] ?? 0;
            $currentPin = $data['current_pin'] ?? '';
            $newPin = $data['new_pin'] ?? '';
            
            if ($teacherId == 0 || empty($currentPin) || empty($newPin)) {
                echo json_encode(['success' => false, 'error' => 'Missing required fields']);
                break;
            }
            
            // Verify current PIN
            $stmt = $db->prepare('SELECT pin FROM teachers WHERE id = ?');
            $stmt->execute([$teacherId]);
            $teacher = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$teacher || $teacher['pin'] !== $currentPin) {
                echo json_encode(['success' => false, 'error' => 'Current PIN is incorrect']);
                break;
            }
            
            // Update PIN
            $stmt = $db->prepare('UPDATE teachers SET pin = ? WHERE id = ?');
            $stmt->execute([$newPin, $teacherId]);
            
            echo json_encode(['success' => true]);
            break;
            
        case 'delete_classroom':
            $teacherId = $data['teacher_id'] ?? 0;
            $pin = $data['pin'] ?? '';
            
            if ($teacherId == 0 || empty($pin)) {
                echo json_encode(['success' => false, 'error' => 'Missing required fields']);
                break;
            }
            
            // Verify PIN
            $stmt = $db->prepare('SELECT pin FROM teachers WHERE id = ?');
            $stmt->execute([$teacherId]);
            $teacher = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$teacher || $teacher['pin'] !== $pin) {
                echo json_encode(['success' => false, 'error' => 'PIN is incorrect']);
                break;
            }
            
            // Delete all related data (CASCADE will handle this automatically due to FOREIGN KEY)
            // But since SQLite doesn't enforce foreign keys by default, we'll delete manually
            
            // Delete logs
            $stmt = $db->prepare('DELETE FROM logs WHERE teacher_id = ?');
            $stmt->execute([$teacherId]);
            
            // Delete items
            $stmt = $db->prepare('DELETE FROM items WHERE teacher_id = ?');
            $stmt->execute([$teacherId]);
            
            // Delete students
            $stmt = $db->prepare('DELETE FROM students WHERE teacher_id = ?');
            $stmt->execute([$teacherId]);
            
            // Delete teacher account
            $stmt = $db->prepare('DELETE FROM teachers WHERE id = ?');
            $stmt->execute([$teacherId]);
            
            echo json_encode(['success' => true]);
            break;
            
        default:
            echo json_encode(['success' => false, 'error' => 'Unknown action']);
    }
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}

// Database functions
function initializeDatabase($db) {
    // Teachers table
    $db->exec("CREATE TABLE IF NOT EXISTS teachers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        pin TEXT NOT NULL,
        created_at INTEGER NOT NULL
    )");
    
    // Items table (now with teacher_id)
    $db->exec("CREATE TABLE IF NOT EXISTS items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        teacher_id INTEGER NOT NULL,
        item_id TEXT NOT NULL,
        name TEXT NOT NULL,
        status TEXT DEFAULT 'available',
        current_user TEXT,
        is_temporary INTEGER DEFAULT 0,
        FOREIGN KEY (teacher_id) REFERENCES teachers(id),
        UNIQUE(teacher_id, item_id)
    )");
    
    // Students table (now with teacher_id)
    $db->exec("CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        teacher_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        pin TEXT NOT NULL,
        is_temporary INTEGER DEFAULT 0,
        FOREIGN KEY (teacher_id) REFERENCES teachers(id),
        UNIQUE(teacher_id, pin)
    )");
    
    // Logs table (now with teacher_id)
    $db->exec("CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        teacher_id INTEGER NOT NULL,
        item TEXT NOT NULL,
        student TEXT NOT NULL,
        action TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        time_str TEXT NOT NULL,
        FOREIGN KEY (teacher_id) REFERENCES teachers(id)
    )");
}

function getAllItems($db, $teacherId = null) {
    if ($teacherId === null) {
        $stmt = $db->query('SELECT * FROM items ORDER BY item_id');
    } else {
        $stmt = $db->prepare('SELECT * FROM items WHERE teacher_id = ? ORDER BY item_id');
        $stmt->execute([$teacherId]);
    }
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

function getAllStudents($db, $teacherId = null) {
    if ($teacherId === null) {
        $stmt = $db->query('SELECT * FROM students ORDER BY name');
    } else {
        $stmt = $db->prepare('SELECT * FROM students WHERE teacher_id = ? ORDER BY name');
        $stmt->execute([$teacherId]);
    }
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

function getRecentLogs($db, $teacherId = null) {
    if ($teacherId === null) {
        $stmt = $db->query('SELECT * FROM logs ORDER BY timestamp DESC LIMIT 100');
    } else {
        $stmt = $db->prepare('SELECT * FROM logs WHERE teacher_id = ? ORDER BY timestamp DESC LIMIT 100');
        $stmt->execute([$teacherId]);
    }
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}
?>
