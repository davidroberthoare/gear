<?php
/**
 * Print Labels for Gear Kiosk
 * Generates QR code labels for items with configurable formatting options
 */

// Load environment variables from .env file
function loadEnv($path) {
    if (!file_exists($path)) {
        return false;
    }
    
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) {
            continue; // Skip comments
        }
        
        list($name, $value) = explode('=', $line, 2);
        $name = trim($name);
        $value = trim($value);
        
        if (!array_key_exists($name, $_ENV)) {
            putenv("$name=$value");
            $_ENV[$name] = $value;
            $_SERVER[$name] = $value;
        }
    }
    return true;
}

// Load .env file
loadEnv(__DIR__ . '/.env');

// Get database credentials
$dbHost = getenv('DB_HOST') ?: 'localhost';
$dbName = getenv('DB_NAME') ?: 'gear_dev';
$dbUser = getenv('DB_USER') ?: 'root';
$dbPass = getenv('DB_PASSWORD') ?: '';
$dbCharset = getenv('DB_CHARSET') ?: 'utf8mb4';

// Get parameters
$teacherId = intval($_GET['teacher_id'] ?? 0);  // Teacher ID (required)
$itemId = $_GET['item'] ?? null;  // Specific item ID (if printing single item)
$size = intval($_GET['size'] ?? 80);  // QR code size in pixels (default 80)
$cols = intval($_GET['cols'] ?? 4);   // Number of columns (default 3)
$rows = intval($_GET['rows'] ?? 0);   // Number of rows (0 = auto)
$showName = isset($_GET['show_name']) ? $_GET['show_name'] === '1' : false; // Show item name (default false)

// Validate parameters
if ($teacherId == 0) {
    die('<html><body><h1>Error: teacher_id parameter is required</h1></body></html>');
}
$size = max(40, min(200, $size)); // Between 40 and 200
$cols = max(1, min(6, $cols));     // Between 1 and 6

try {
    $dsn = "mysql:host=$dbHost;dbname=$dbName;charset=$dbCharset";
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ];
    $db = new PDO($dsn, $dbUser, $dbPass, $options);
    
    // Fetch items
    if ($itemId) {
        // Single item
        $stmt = $db->prepare('SELECT * FROM items WHERE item_id = ? AND teacher_id = ? AND (is_temporary = 0 OR is_temporary IS NULL)');
        $stmt->execute([$itemId, $teacherId]);
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
    } else {
        // All items
        $stmt = $db->prepare('SELECT * FROM items WHERE teacher_id = ? AND (is_temporary = 0 OR is_temporary IS NULL) ORDER BY item_id');
        $stmt->execute([$teacherId]);
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    if (empty($items)) {
        die('<html><body><h1>No items found</h1></body></html>');
    }
    
} catch (PDOException $e) {
    die('<html><body><h1>Database error: ' . htmlspecialchars($e->getMessage()) . '</h1></body></html>');
}

// Calculate label dimensions
$labelWidth = 100 / $cols;
$padding = 15; // Padding in pixels
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Print Labels - Gear Kiosk</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            padding: 20px;
            background: #f5f5f5;
        }
        
        .no-print {
            background: white;
            padding: 20px;
            margin-bottom: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .no-print h1 {
            font-size: 24px;
            margin-bottom: 15px;
            color: #333;
        }
        
        .no-print .controls {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            margin-bottom: 15px;
        }
        
        .no-print button {
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .btn-print {
            background: #007bff;
            color: white;
        }
        
        .btn-print:hover {
            background: #0056b3;
        }
        
        .btn-settings {
            background: #6c757d;
            color: white;
        }
        
        .btn-settings:hover {
            background: #545b62;
        }
        
        .no-print .info {
            color: #666;
            font-size: 14px;
        }
        
        .labels-container {
            background: white;
            padding: 20px;
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
        }
        
        .label-item {
            width: calc(<?php echo $labelWidth; ?>% - 10px);
            padding: <?php echo $padding; ?>px;
            border: 1px solid #ddd;
            border-radius: 8px;
            page-break-inside: avoid;
            break-inside: avoid;
            background: white;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .label-qr {
            flex-shrink: 0;
            width: <?php echo $size; ?>px;
            height: <?php echo $size; ?>px;
        }
        
        .label-qr img {
            width: 100%;
            height: 100%;
            display: block;
        }
        
        .label-text {
            flex: 1;
            text-align: left;
            display: flex;
            flex-direction: column;
            justify-content: center;
            min-width: 0;
        }
        
        .label-id {
            font-weight: bold;
            font-size: <?php echo round($size * 0.36); ?>px;
            color: #333;
            line-height: <?php echo round($size * 0.4); ?>px;
            word-wrap: break-word;
        }
        
        .label-name {
            font-size: <?php echo round($size * 0.32); ?>px;
            color: #666;
            line-height: <?php echo round($size * 0.4); ?>px;
            word-wrap: break-word;
        }
        
        @media print {
            body {
                background: white;
                padding: 0;
            }
            
            .no-print {
                display: none !important;
            }
            
            .labels-container {
                padding: 10mm;
                gap: 5px;
            }
            
            .label-item {
                border: 1px solid #999;
                margin: 0;
            }
        }
        
        @media screen and (max-width: 768px) {
            .label-item {
                width: calc(50% - 10px);
            }
        }
    </style>
</head>
<body>
    <div class="no-print">
        <h1><?php echo $itemId ? "Label for Item: {$itemId}" : "All Item Labels"; ?></h1>
        <div class="controls">
            <button class="btn-print" onclick="window.print()">🖨️ Print Labels</button>
            <button class="btn-settings" onclick="showSettings()">⚙️ Adjust Settings</button>
        </div>
        <div class="info">
            <strong>Labels:</strong> <?php echo count($items); ?> items | 
            <strong>Size:</strong> <?php echo $size; ?>px | 
            <strong>Columns:</strong> <?php echo $cols; ?> | 
            <strong>Show Names:</strong> <?php echo $showName ? 'Yes' : 'No'; ?>
        </div>
    </div>
    
    <div class="labels-container">
        <?php foreach ($items as $item): ?>
            <div class="label-item">
                <div class="label-qr">
                    <img src="api.php?action=qr&code=<?php echo urlencode($item['item_id']); ?>" alt="QR Code for <?php echo htmlspecialchars($item['item_id']); ?>">
                </div>
                <div class="label-text">
                    <div class="label-id"><?php echo htmlspecialchars($item['item_id']); ?></div>
                    <?php if ($showName): ?>
                        <div class="label-name"><?php echo htmlspecialchars($item['name']); ?></div>
                    <?php endif; ?>
                </div>
            </div>
        <?php endforeach; ?>
    </div>
    
    <script>
        function showSettings() {
            const currentParams = new URLSearchParams(window.location.search);
            const teacherId = currentParams.get('teacher_id');
            const item = currentParams.get('item') || '';
            const size = prompt('QR Code Size (40-200px):', '<?php echo $size; ?>');
            if (size === null) return;
            
            const cols = prompt('Number of Columns (1-6):', '<?php echo $cols; ?>');
            if (cols === null) return;
            
            const showName = confirm('Show item names?');
            
            const params = new URLSearchParams();
            if (teacherId) params.set('teacher_id', teacherId);
            if (item) params.set('item', item);
            params.set('size', Math.max(40, Math.min(200, parseInt(size) || 80)));
            params.set('cols', Math.max(1, Math.min(6, parseInt(cols) || 3)));
            params.set('show_name', showName ? '1' : '0');
            
            window.location.search = params.toString();
        }
        
        // Auto-print if specified
        <?php if (isset($_GET['auto_print'])): ?>
        window.onload = function() {
            setTimeout(function() {
                window.print();
            }, 500);
        };
        <?php endif; ?>
    </script>
</body>
</html>
