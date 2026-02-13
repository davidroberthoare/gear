// Gear Kiosk Application - Multi-Tenant Version
const API_URL = "api.php";

// Application State
let state = {
    currentTeacher: null,
    items: [],
    students: [],
    logs: [],
    view: 'dashboard',
    activeItem: null,
    modalType: null,
    activityFilter: ''
};

// QR Scanner State
let qrScanner = null;
let lastScannedCode = null;
let lastScanTime = 0;
const SCAN_COOLDOWN = 2000; // 1 second cooldown between scans

// Initialize Application
$(document).ready(function() {
    console.log('Gear Kiosk initializing...');
    
    // Initialize Lucide icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    
    // Check if teacher is logged in
    const savedTeacher = localStorage.getItem('currentTeacher');
    if (savedTeacher) {
        console.log('Found saved teacher, auto-logging in...');
        state.currentTeacher = JSON.parse(savedTeacher);
        showApp();
        loadData();
    } else {
        console.log('No saved teacher, showing login screen...');
        showLogin();
    }
    
    // Set up event listeners
    setupEventListeners();
    console.log('Event listeners set up');
    
    // Refresh data every 15 seconds if logged in
    // setInterval(() => {
    //     if (state.currentTeacher) {
    //         loadData();
    //     }
    // }, 15000);
});

// Initialize QR Scanner
async function initQRScanner() {
    if (!state.currentTeacher) {
        console.log('❌ QR Scanner: Cannot initialize - no teacher logged in');
        return;
    }
    
    console.log('🎥 QR Scanner: Initializing...');
    console.log('📊 QR Scanner: Current items count:', state.items.length);
    
    const videoElement = document.getElementById('qr-video');
    if (!videoElement) {
        console.error('❌ QR Scanner: Video element not found');
        return;
    }
    
    // Import QrScanner dynamically
    try {
        // Create scanner instance
        const QrScanner = window.QrScanner || (await import('https://unpkg.com/qr-scanner@1.4.2/qr-scanner.min.js')).default;
        console.log('✅ QR Scanner: QrScanner library loaded');
        
        qrScanner = new QrScanner(
            videoElement,
            result => onQRCodeScanned(result.data, result),
            {
                returnDetailedScanResult: true,
                highlightScanRegion: true,
                highlightCodeOutline: true,
                maxScansPerSecond: 5,
                preferredCamera: 'user' // Front camera for iPad
            }
        );
        
        console.log('✅ QR Scanner: QrScanner instance created');
        console.log('📷 QR Scanner: Starting camera...');
        
        await qrScanner.start();
        console.log('✅ QR Scanner: Camera started successfully');
        console.log('🔄 QR Scanner: Now scanning at 5 scans/second');
        $('#qr-scanner-container').addClass('polling');
        
    } catch (err) {
        console.error('❌ QR Scanner: Failed to initialize:', err);
        $('#qr-scanner-container').removeClass('polling');
    }
}

// Stop QR Scanner
function stopQRScanner() {
    console.log('🛑 QR Scanner: Stop requested');
    if (qrScanner) {
        console.log('🛑 QR Scanner: Stopping active scanner...');
        qrScanner.stop();
        console.log('✅ QR Scanner: Stopped successfully');
        $('#qr-scanner-container').removeClass('polling detected');
    } else {
        console.log('⚠️ QR Scanner: No active scanner to stop');
    }
}

// Handle QR Code Scan
function onQRCodeScanned(decodedText, decodedResult) {
    const now = Date.now();
    
    console.log('🔍 QR Scanner: Code detected in frame');
    console.log('📝 QR Scanner: Decoded text:', decodedText);
    console.log('📊 QR Scanner: Result format:', decodedResult?.result?.format?.formatName || 'unknown');
    
    // Prevent rapid re-scans of the same code
    if (decodedText === lastScannedCode && (now - lastScanTime) < SCAN_COOLDOWN) {
        const timeSince = now - lastScanTime;
        console.log('⏸️ QR Scanner: Cooldown active, ignoring duplicate scan (' + timeSince + 'ms since last)');
        return;
    }
    
    lastScannedCode = decodedText;
    lastScanTime = now;
    
    console.log('✅ QR Scanner: New scan accepted (cooldown passed)');
    console.log('🔎 QR Scanner: Searching for item with ID:', decodedText);
    console.log('📋 QR Scanner: Current inventory:', state.items.map(i => i.item_id).join(', '));
    
    // Visual feedback
    $('#qr-scanner-container').addClass('detected');
    setTimeout(() => {
        $('#qr-scanner-container').removeClass('detected');
    }, 1500);
    
    // Find item by ID (trim and case-insensitive match)
    const searchId = decodedText.trim();
    console.log('🔍 QR Scanner: Trimmed search ID:', `"${searchId}"`);
    
    const item = state.items.find(i => {
        const itemId = (i.item_id || '').trim();
        console.log('  Comparing:', `"${itemId}"`, 'with', `"${searchId}"`, '=', itemId === searchId);
        return itemId === searchId;
    });
    
    if (item) {
        console.log('✅ QR Scanner: Match found!');
        console.log('📦 QR Scanner: Item details:', {
            id: item.id,
            item_id: item.item_id,
            name: item.name,
            status: item.status,
            current_user: item.current_user
        });
        console.log('🎯 QR Scanner: Triggering item action...');
        // Trigger the item button
        handleScan(item);
    } else {
        console.warn('⚠️ QR Scanner: No matching item found for code:', decodedText);
        console.log('💡 QR Scanner: Available item IDs:', state.items.map(i => i.item_id));
    }
}


// Show/Hide screens
function showLogin() {
    $('#loginScreen').show();
    $('#appContainer').hide();
    stopQRScanner();
}

function showApp() {
    $('#loginScreen').hide();
    $('#appContainer').show();
    $('#teacherName').text(state.currentTeacher.username + "'s Classroom");
    
    // Initialize QR scanner when app shows
    setTimeout(() => {
        initQRScanner();
    }, 500);
}

// Load data from API
function loadData() {
    if (!state.currentTeacher) return;
    
    $.ajax({
        url: API_URL,
        method: 'POST',
        data: JSON.stringify({ 
            action: 'get_all',
            teacher_id: state.currentTeacher.id
        }),
        contentType: 'application/json',
        success: function(response) {
            if (response.success) {
                state.items = response.data.items || [];
                state.students = response.data.students || [];
                state.logs = response.data.logs || [];
                render();
            }
        },
        error: function(error) {
            console.error('Error loading data:', error);
        }
    });
}

// Setup Event Listeners
function setupEventListeners() {
    // Login
    $('#loginBtn').click(function(e) {
        console.log('Login button clicked');
        handleLogin();
    });
    $('#createAccountBtn').click(function(e) {
        console.log('Create classroom button clicked');
        handleCreateClassroom();
    });
    $('#loginUsername').on('keypress', function(e) {
        if (e.which === 13) {
            console.log('Enter pressed in username');
            handleLogin();
        }
    });
    $('#loginPin').on('keypress', function(e) {
        if (e.which === 13) {
            console.log('Enter pressed in login PIN');
            handleLogin();
        }
    });
    $('#loginPin').on('input', function() {
        // No duplicate check needed for login screen
        $('#loginPin').removeClass('pin-duplicate pin-valid');
    });
    $('#addStudentBtn').click(addStudent);

    // Activity filter
    $('#activitySearch').on('input', function() {
        const value = $(this).val();
        state.activityFilter = value.length >= 2 ? value : '';
        renderDashboard();
    });
    
    // Real-time PIN duplicate checking for student creation
    $('#newStudentPin').on('input', function() {
        const pin = $(this).val();
        $(this).removeClass('pin-duplicate pin-valid');
        
        if (pin.length === 5) {
            // Check if PIN already exists
            const isDuplicate = state.students.some(s => s.pin === pin);
            if (isDuplicate) {
                $(this).addClass('pin-duplicate');
            } else {
                $(this).addClass('pin-valid');
            }
        }
    });
    
    // Modal
    $('#cancelBtn').click(closeModal);
    $('#submitBtn').click(handleSubmit);
    $('#pinInput').on('input', function() {
        hideError();
        const pin = $(this).val();
        $(this).removeClass('pin-duplicate pin-valid');
        
        // For student PIN entry (checkout/return), check for duplicates
        if (state.modalType === 'pin_entry' && pin.length === 5) {
            const student = state.students.find(s => s.pin === pin);
            if (student) {
                $(this).addClass('pin-valid');
            }
        }
    });
    
    // Enter key handler
    $(document).keypress(function(e) {
        if (e.which === 13) { // Enter key
            if ($('#modalOverlay').is(':visible')) {
                handleSubmit();
            } else if ($('#oneTimeModalOverlay').is(':visible')) {
                handleOneTimeSubmit();
            }
        }
    });
    
    // Prevent modal close on click inside
    $('.modal').click(function(e) {
        e.stopPropagation();
    });
    
    // Close modal on overlay click
    $('#modalOverlay').click(closeModal);

    // Prevent modal close on click inside one-time modal
    $('.one-time-modal').click(function(e) {
        e.stopPropagation();
    });

    // Close one-time modal on overlay click
    $('#oneTimeModalOverlay').click(closeOneTimeModal);
}

// Login functions
function handleCreateClassroom() {
    console.log('handleCreateClassroom called');
    const username = $('#loginUsername').val().trim();
    const pin = $('#loginPin').val().trim();
    console.log('Username:', username, 'PIN length:', pin.length);
    
    if (!username || !pin || pin.length !== 5) {
        console.log('Validation failed');
        showLoginError('Please enter username and 5-digit PIN');
        return;
    }
    
    console.log('Creating new classroom...');
    
    // Create new teacher account
    $.ajax({
        url: API_URL,
        method: 'POST',
        data: JSON.stringify({
            action: 'create_teacher',
            username: username,
            pin: pin
        }),
        contentType: 'application/json',
        success: function(response) {
            console.log('Create response:', response);
            if (response.success) {
                // Auto-login after creation
                loginAsTeacher({ id: response.id, username: username, pin: pin });
            } else {
                showLoginError(response.error || 'Failed to create account');
            }
        },
        error: function(xhr, status, error) {
            console.error('Create error:', error, xhr.responseText);
            showLoginError('Connection error');
        }
    });
}

function handleLogin() {
    console.log('handleLogin called');
    const username = $('#loginUsername').val().trim();
    const pin = $('#loginPin').val().trim();
    console.log('Username:', username, 'PIN length:', pin.length);
    
    if (!username || !pin || pin.length !== 5) {
        console.log('Validation failed');
        showLoginError('Please enter username and 5-digit PIN');
        return;
    }
    
    console.log('Logging in...');
    
    // Login existing teacher
    $.ajax({
        url: API_URL,
        method: 'POST',
        data: JSON.stringify({
            action: 'teacher_login',
            username: username,
            pin: pin
        }),
        contentType: 'application/json',
        success: function(response) {
            console.log('Login response:', response);
            if (response.success) {
                loginAsTeacher(response.teacher);
            } else {
                showLoginError(response.error || 'Invalid credentials');
            }
        },
        error: function(xhr, status, error) {
            console.error('Login error:', error, xhr.responseText);
            showLoginError('Connection error');
        }
    });
}

function loginAsTeacher(teacher) {
    console.log('Logging in as:', teacher);
    state.currentTeacher = teacher;
    localStorage.setItem('currentTeacher', JSON.stringify(teacher));
    $('#loginUsername').val('');
    $('#loginPin').val('');
    $('#loginError').hide();
    showApp();
    loadData();
}

function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        stopQRScanner();
        state.currentTeacher = null;
        localStorage.removeItem('currentTeacher');
        showLogin();
        state.view = 'dashboard';
    }
}

function showLoginError(message) {
    $('#loginError').text(message).show();
}

// Render UI
function render() {
    if (state.view === 'dashboard') {
        renderDashboard();
    } else if (state.view === 'admin_panel') {
        renderAdminPanel();
    }
    
    // Update Lucide icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

// Render Dashboard
function renderDashboard() {
    $('#dashboardView').show();
    $('#adminView').hide();
    
    // Update counts
    const availableCount = state.items.filter(i => i.status === 'available').length;
    const outCount = state.items.filter(i => i.status === 'out').length;
    const pendingCount = state.items.filter(i => i.status === 'pending').length;
    
    $('#availableCount').text(availableCount);
    $('#outCount').text(outCount);
    
    // Show/hide verify all button
    if (pendingCount > 0) {
        $('#verifyAllBtn').show();
    } else {
        $('#verifyAllBtn').hide();
    }
    
    // Render items
    const $itemsGrid = $('#itemsGrid');
    $itemsGrid.empty();
    
    state.items.forEach(item => {
        const $card = $(`
            <button class="item-card ${item.status}" data-id="${item.id}">
                <div class="item-id">${item.item_id}</div>
                <div class="item-name">${item.name}</div>
                <div class="item-status ${item.status}">
                    ${getStatusHTML(item)}
                </div>
            </button>
        `);
        
        $card.click(() => handleScan(item));
        $itemsGrid.append($card);
    });

    updateItemsGridLayout();
    
    // Render logs
    const $logContainer = $('#logContainer');
    $logContainer.empty();

    const filterText = (state.activityFilter || '').trim().toLowerCase();
    const itemNameByCode = state.items.reduce((acc, item) => {
        acc[item.item_id] = item.name || '';
        return acc;
    }, {});

    const filteredLogs = filterText.length >= 2
        ? state.logs.filter(log => {
            const itemCode = (log.item || '').toLowerCase();
            const itemName = (itemNameByCode[log.item] || '').toLowerCase();
            const studentName = (log.student || '').toLowerCase();
            return itemCode.includes(filterText)
                || itemName.includes(filterText)
                || studentName.includes(filterText);
        })
        : state.logs;
    
    if (filteredLogs.length === 0) {
        const emptyText = filterText.length >= 2 ? 'No matching logs' : 'No logs yet';
        $logContainer.html(`<div class="log-empty">${emptyText}</div>`);
    } else {
        filteredLogs.forEach(log => {
            const $logEntry = $(
                `<div class="log-entry">
                    <div class="log-header">
                        <span class="log-student">${log.student}</span>
                        <span class="log-time">${formatLogTime(log)}</span>
                    </div>
                    <div class="log-action">
                        ${log.action}: <span class="log-item">${log.item}</span>
                    </div>
                </div>`
            );
            $logContainer.append($logEntry);
        });
    }
}

function formatLogTime(log) {
    if (log && log.timestamp) {
        const date = new Date(Number(log.timestamp));
        if (!Number.isNaN(date.getTime())) {
            const datePart = date.toLocaleDateString(undefined, {
                month: 'numeric',
                day: 'numeric'
            });
            const timePart = date.toLocaleTimeString(undefined, {
                hour: 'numeric',
                minute: '2-digit'
            });
            return `${datePart} ${timePart}`;
        }
    }

    return log && log.time_str ? log.time_str : '';
}

function updateItemsGridLayout() {
    const $itemsGrid = $('#itemsGrid');
    const count = state.items.length;

    if (count > 0 && count <= 20) {
        const cols = Math.ceil(Math.sqrt(count));
        const rows = Math.ceil(count / cols);

        $itemsGrid.css({
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gridTemplateRows: `repeat(${rows}, 1fr)`,
            overflowY: 'hidden'
        });
    } else {
        $itemsGrid.css({
            gridTemplateColumns: '',
            gridTemplateRows: '',
            overflowY: 'auto'
        });
    }
}

// Get status HTML with icon
function getStatusHTML(item) {
    if (item.status === 'available') {
        return '<i data-lucide="check-circle" style="width: 12px; height: 12px;"></i> READY';
    } else if (item.status === 'out') {
        const firstName = item.current_user ? item.current_user.split(' ')[0] : 'Unknown';
        return `<i data-lucide="user" style="width: 12px; height: 12px;"></i> ${firstName}`;
    } else if (item.status === 'pending') {
        return '<i data-lucide="alert-circle" style="width: 12px; height: 12px;"></i> CHECK-IN';
    }
}

// Render Admin Panel
function renderAdminPanel() {
    $('#dashboardView').hide();
    $('#adminView').show();
    
    // Render items list
    const $itemsList = $('#adminItemsList');
    $itemsList.empty();
    
    state.items.forEach(item => {
        const tempBadge = item.is_temporary == 1 ? '<span style="font-size: 0.6rem; background: #fbbf24; color: #78350f; padding: 2px 6px; border-radius: 4px; margin-left: 4px;">ONE-TIME</span>' : '';
        const $item = $(`
            <div class="admin-item">
                <div class="admin-item-info">
                    <span class="admin-item-id">${item.item_id}</span>
                    <span class="admin-item-name">${item.name}${tempBadge}</span>
                </div>
                <div class="admin-item-actions">
                    <button class="btn-icon-small print" data-id="${item.id}">
                        <i data-lucide="printer" style="width: 14px; height: 14px;"></i>
                    </button>
                    <button class="btn-icon-small delete" data-id="${item.id}">
                        <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
                    </button>
                </div>
            </div>
        `);
        
        $item.find('.print').click(() => printSpecific(item));
        $item.find('.delete').click(() => deleteItem(item.id));
        
        $itemsList.append($item);
    });
    
    // Render students list
    const $studentsList = $('#adminStudentsList');
    $studentsList.empty();
    
    state.students.forEach(student => {
        const tempBadge = student.is_temporary == 1 ? '<span style="font-size: 0.6rem; background: #fbbf24; color: #78350f; padding: 2px 6px; border-radius: 4px; margin-left: 4px;">ONE-TIME</span>' : '';
        const $student = $(`
            <div class="admin-item">
                <span class="admin-item-name">${student.name}${tempBadge}</span>
                <span class="student-pin">PIN: ${student.pin}</span>
            </div>
        `);
        $studentsList.append($student);
    });
    
    // Update icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

// Handle item scan
function handleScan(item) {
    state.activeItem = item;
    
    if (item.status === 'pending' || requiresTeacherReturn(item)) {
        showModal('teacher_auth');
    } else {
        showModal('pin_entry');
    }
}

// Show modal
function showModal(type) {
    state.modalType = type;
    $('#pinInput').val('');
    hideError();
    
    const $modalIcon = $('#modalIcon');
    $modalIcon.removeClass('teacher admin');
    
    if (type === 'admin_login') {
        $('#modalTitle').text('Teacher Access');
        $('#modalSubtitle').text('Enter your 5-digit code to continue');
        $modalIcon.addClass('admin');
        $modalIcon.html('<i data-lucide="lock"></i>');
    } else if (type === 'teacher_auth' || type === 'teacher_auth_all') {
        $('#modalTitle').text('Teacher PIN');
        $('#modalSubtitle').text('Enter your 5-digit code to continue');
        $modalIcon.addClass('teacher');
        $modalIcon.html('<i data-lucide="shield-check"></i>');
    } else if (type === 'pin_entry') {
        $('#modalTitle').text('Confirm ID');
        const actionLabel = state.activeItem && state.activeItem.status === 'out' ? 'Returning' : 'Checking out';
        $('#modalSubtitle').text(`${actionLabel} ${state.activeItem.item_id}`);
        $modalIcon.html('<i data-lucide="qr-code"></i>');
    }
    
    $('#modalOverlay').show();
    
    // Delayed focus for mobile keyboard activation
    setTimeout(() => {
        const $input = $('#pinInput');
        $input.focus();
        // Trigger click to ensure keyboard appears on iOS/iPad
        $input[0].click();
    }, 100);
    
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

// Close modal
function closeModal() {
    $('#modalOverlay').hide();
    $('#pinInput').val('');
    hideError();
    state.activeItem = null;
    state.modalType = null;
}

// Handle submit
function handleSubmit() {
    const pin = $('#pinInput').val();
    
    if (state.modalType === 'admin_login') {
        handleAdminLogin(pin);
    } else if (state.modalType === 'pin_entry') {
        handlePinEntry(pin);
    } else if (state.modalType === 'teacher_auth') {
        handleTeacherAuth(pin);
    } else if (state.modalType === 'teacher_auth_all') {
        handleTeacherAuthAll(pin);
    }
}

// Handle admin login
function handleAdminLogin(pin) {
    if (pin === state.currentTeacher.pin) {
        closeModal();
        showView('admin_panel');
    } else {
        showError('Access Denied');
    }
}

// Handle PIN entry for checkout/return
function handlePinEntry(pin) {
    const item = state.activeItem;
    
    // If returning gear and teacher PIN is used, bypass pending state
    if (item && item.status === 'out' && pin === state.currentTeacher.pin) {
        if (item.is_temporary == 1) {
            deleteItemAfterReturn(item, { name: 'Teacher' });
            return;
        }

        $.ajax({
            url: API_URL,
            method: 'POST',
            data: JSON.stringify({
                action: 'update_item',
                id: item.id,
                status: 'available',
                current_user: null
            }),
            contentType: 'application/json',
            success: function(response) {
                if (response.success) {
                    addLog(item.item_id, 'Teacher', 'Returned (Teacher)');
                    closeModal();
                    loadData();
                } else {
                    showError('Update failed');
                }
            },
            error: function() {
                showError('Update failed');
            }
        });
        return;
    }

    // Verify student PIN
    const student = state.students.find(s => s.pin === pin);
    
    if (!student) {
        showError('Invalid PIN');
        return;
    }
    
    let newStatus, newUser, action;
    
    if (item.status === 'available') {
        newStatus = 'out';
        newUser = student.name;
        action = 'Checkout';
    } else if (item.status === 'out') {
        if (requiresTeacherReturn(item)) {
            showError('Teacher PIN required');
            return;
        }
        // If item is temporary, delete it instead of setting to pending
        if (item.is_temporary == 1) {
            deleteItemAfterReturn(item, student);
            return;
        }
        newStatus = 'pending';
        newUser = student.name;
        action = 'Returned (Pending)';
    }
    
    // Update item
    $.ajax({
        url: API_URL,
        method: 'POST',
        data: JSON.stringify({
            action: 'update_item',
            id: item.id,
            status: newStatus,
            current_user: newUser
        }),
        contentType: 'application/json',
        success: function(response) {
            if (response.success) {
                // Add log
                addLog(item.item_id, student.name, action);
                closeModal();
                loadData();
            } else {
                showError('Update failed');
            }
        },
        error: function() {
            showError('Update failed');
        }
    });
}

// Delete temporary item after return
function deleteItemAfterReturn(item, student) {
    $.ajax({
        url: API_URL,
        method: 'POST',
        data: JSON.stringify({
            action: 'delete_item',
            id: item.id
        }),
        contentType: 'application/json',
        success: function(response) {
            if (response.success) {
                addLog(item.item_id, student.name, 'Returned (One-Time Item Removed)');
                closeModal();
                loadData();
            } else {
                showError('Return failed');
            }
        },
        error: function() {
            showError('Return failed');
        }
    });
}

// Handle teacher verification of return
function handleTeacherAuth(pin) {
    if (pin !== state.currentTeacher.pin) {
        showError('Invalid Teacher PIN');
        return;
    }
    
    const item = state.activeItem;

    if (item && item.status === 'out' && item.is_temporary == 1) {
        deleteItemAfterReturn(item, { name: 'Teacher' });
        return;
    }
    
    // Update item to available
    $.ajax({
        url: API_URL,
        method: 'POST',
        data: JSON.stringify({
            action: 'update_item',
            id: item.id,
            status: 'available',
            current_user: null
        }),
        contentType: 'application/json',
        success: function(response) {
            if (response.success) {
                addLog(item.item_id, 'Teacher', 'Verified Return');
                closeModal();
                loadData();
            } else {
                showError('Update failed');
            }
        },
        error: function() {
            showError('Update failed');
        }
    });
}

// Handle verify all pending
function handleTeacherAuthAll(pin) {
    if (pin !== state.currentTeacher.pin) {
        showError('Invalid Teacher PIN');
        return;
    }
    
    const pendingItems = state.items.filter(i => i.status === 'pending');
    
    if (pendingItems.length === 0) {
        closeModal();
        return;
    }
    
    // Update all pending items
    $.ajax({
        url: API_URL,
        method: 'POST',
        data: JSON.stringify({
            action: 'verify_all_pending',
            teacher_id: state.currentTeacher.id
        }),
        contentType: 'application/json',
        success: function(response) {
            if (response.success) {
                // Add logs for all items
                pendingItems.forEach(item => {
                    addLog(item.item_id, 'Teacher', 'Verified Return (Bulk)');
                });
                closeModal();
                loadData();
            } else {
                showError('Update failed');
            }
        },
        error: function() {
            showError('Update failed');
        }
    });
}

// Add log entry
function addLog(item, student, action) {
    $.ajax({
        url: API_URL,
        method: 'POST',
        data: JSON.stringify({
            action: 'add_log',
            teacher_id: state.currentTeacher.id,
            item: item,
            student: student,
            log_action: action
        }),
        contentType: 'application/json',
        success: function() {
            loadData();
        }
    });
}

function requiresTeacherReturn(item) {
    if (!item || item.status !== 'out') {
        return false;
    }

    if (item.is_temporary == 1) {
        return true;
    }

    return isTemporaryStudentName(item.current_user);
}

function isTemporaryStudentName(name) {
    if (!name) {
        return false;
    }

    const target = name.toLowerCase();
    return state.students.some(student => student.is_temporary == 1 && student.name && student.name.toLowerCase() === target);
}

function showOneTimeModal() {
    clearOneTimeInputs();
    hideOneTimeError();
    $('#oneTimeModalOverlay').show();

    setTimeout(() => {
        const $input = $('#oneTimeItemName');
        $input.focus();
        $input[0].click();
    }, 100);

    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

function closeOneTimeModal() {
    $('#oneTimeModalOverlay').hide();
    clearOneTimeInputs();
    hideOneTimeError();
}

function showOneTimeError(message) {
    $('#oneTimeError').text(message).show();
}

function hideOneTimeError() {
    $('#oneTimeError').hide().text('');
}

function clearOneTimeInputs() {
    $('#oneTimeItemName').val('');
    $('#oneTimeStudentName').val('');
    $('#oneTimeTeacherPin').val('');
}

function generateTempItemId() {
    let index = 1;
    let id = `TEMP-${index}`;

    while (state.items.some(item => item.item_id === id)) {
        index += 1;
        id = `TEMP-${index}`;
    }

    return id;
}

function generateTempPin() {
    let pin;
    do {
        pin = String(Math.floor(10000 + Math.random() * 90000));
    } while (state.students.some(student => student.pin === pin));
    return pin;
}

function findItemByCode(code) {
    const target = code.toLowerCase();
    return state.items.find(item => (item.item_id || '').toLowerCase() === target);
}

function findStudentByName(name) {
    const target = name.toLowerCase();
    return state.students.find(student => (student.name || '').toLowerCase() === target);
}

function handleOneTimeSubmit() {
    hideOneTimeError();

    if (!state.currentTeacher) {
        showOneTimeError('Please log in first');
        return;
    }

    const itemCode = $('#oneTimeItemName').val().trim();
    const studentName = $('#oneTimeStudentName').val().trim();
    const teacherPin = $('#oneTimeTeacherPin').val().trim();

    if (!itemCode || !studentName) {
        showOneTimeError('Enter item code and student name');
        return;
    }

    if (teacherPin !== state.currentTeacher.pin) {
        showOneTimeError('Invalid Teacher PIN');
        return;
    }

    const resolveItem = (callback) => {
        const existingItem = findItemByCode(itemCode);
        if (existingItem) {
            if (existingItem.status !== 'available') {
                showOneTimeError('Item not available');
                return;
            }
            callback(existingItem);
            return;
        }

        const generatedId = generateTempItemId();
        $.ajax({
            url: API_URL,
            method: 'POST',
            data: JSON.stringify({
                action: 'add_item',
                teacher_id: state.currentTeacher.id,
                item_id: generatedId,
                name: itemCode,
                is_temporary: 1
            }),
            contentType: 'application/json',
            success: function(response) {
                if (response.success) {
                    callback({
                        id: response.id,
                        item_id: generatedId,
                        name: itemCode,
                        status: 'available',
                        is_temporary: 1
                    });
                } else {
                    showOneTimeError(response.error || 'Error adding item');
                }
            },
            error: function() {
                showOneTimeError('Error adding item');
            }
        });
    };

    const resolveStudent = (callback) => {
        const existingStudent = findStudentByName(studentName);
        if (existingStudent) {
            callback(existingStudent);
            return;
        }

        const generatedPin = generateTempPin();
        $.ajax({
            url: API_URL,
            method: 'POST',
            data: JSON.stringify({
                action: 'add_student',
                teacher_id: state.currentTeacher.id,
                name: studentName,
                pin: generatedPin,
                is_temporary: 1
            }),
            contentType: 'application/json',
            success: function(response) {
                if (response.success) {
                    callback({
                        name: studentName,
                        pin: generatedPin,
                        is_temporary: 1
                    });
                } else {
                    showOneTimeError(response.error || 'Error adding student');
                }
            },
            error: function() {
                showOneTimeError('Error adding student');
            }
        });
    };

    resolveItem((item) => {
        resolveStudent((student) => {
            $.ajax({
                url: API_URL,
                method: 'POST',
                data: JSON.stringify({
                    action: 'update_item',
                    id: item.id,
                    status: 'out',
                    current_user: student.name
                }),
                contentType: 'application/json',
                success: function(response) {
                    if (response.success) {
                        addLog(item.item_id, student.name, 'Checkout');
                        closeOneTimeModal();
                        loadData();
                    } else {
                        showOneTimeError('Checkout failed');
                    }
                },
                error: function() {
                    showOneTimeError('Checkout failed');
                }
            });
        });
    });
}

// Add new item
function addItem() {
    const itemId = $('#newItemId').val().trim();
    const name = $('#newItemName').val().trim();
    const isTemporary = 0;
    
    if (!itemId || !name) {
        return;
    }
    
    $.ajax({
        url: API_URL,
        method: 'POST',
        data: JSON.stringify({
            action: 'add_item',
            teacher_id: state.currentTeacher.id,
            item_id: itemId,
            name: name,
            is_temporary: isTemporary
        }),
        contentType: 'application/json',
        success: function(response) {
            if (response.success) {
                $('#newItemId').val('');
                $('#newItemName').val('');
                loadData();
            } else {
                alert('Error adding item: ' + (response.error || 'Unknown error'));
            }
        },
        error: function() {
            alert('Error adding item');
        }
    });
}

// Delete item
function deleteItem(id) {
    if (!confirm('Are you sure you want to delete this item?')) {
        return;
    }
    
    $.ajax({
        url: API_URL,
        method: 'POST',
        data: JSON.stringify({
            action: 'delete_item',
            id: id
        }),
        contentType: 'application/json',
        success: function(response) {
            if (response.success) {
                loadData();
            } else {
                alert('Error deleting item');
            }
        },
        error: function() {
            alert('Error deleting item');
        }
    });
}

// Add new student
function addStudent() {
    const name = $('#newStudentName').val().trim();
    const pin = $('#newStudentPin').val().trim();
    const isTemporary = 0;
    
    if (!name || !pin || pin.length !== 5) {
        return;
    }
    
    // Check for duplicate PIN
    if (state.students.some(s => s.pin === pin)) {
        alert('This PIN is already in use. Please choose a different PIN.');
        return;
    }
    
    $.ajax({
        url: API_URL,
        method: 'POST',
        data: JSON.stringify({
            action: 'add_student',
            teacher_id: state.currentTeacher.id,
            name: name,
            pin: pin,
            is_temporary: isTemporary
        }),
        contentType: 'application/json',
        success: function(response) {
            if (response.success) {
                $('#newStudentName').val('');
                $('#newStudentPin').val('');
                loadData();
            } else {
                alert('Error adding student: ' + (response.error || 'PIN may already exist'));
            }
        },
        error: function() {
            alert('Error adding student');
        }
    });
}

// Print specific item
function printSpecific(item) {
    // Open print labels page for specific item in new window
    const params = new URLSearchParams({
        item: item.item_id,
        // size: 80,
        // cols: 3,
        // show_name: '1'
    });
    window.open(`print_labels.php?${params.toString()}`, '_blank');
}

// Print all items
function printAll() {
    // Open print labels page for all items in new window
    const params = new URLSearchParams({
        size: 80,
        cols: 3,
        show_name: '1'
    });
    window.open(`print_labels.php?${params.toString()}`, '_blank');
}

// Show error message
function showError(message) {
    $('#errorMessage').text(message).show();
}

// Hide error message
function hideError() {
    $('#errorMessage').hide();
}

// Show view
function showView(view) {
    state.view = view;
    
    // Stop scanner when going to admin panel, restart when returning to dashboard
    if (view === 'admin_panel') {
        stopQRScanner();
    } else if (view === 'dashboard' && state.currentTeacher) {
        setTimeout(() => {
            initQRScanner();
        }, 500);
    }
    
    render();
}
