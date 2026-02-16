# Gear Kiosk

## Overview
Gear Kiosk has been upgraded to support multiple teachers/classrooms with separate accounts and data isolation. Each teacher can now manage their own inventory, students, and checkouts independently.

## Key Features

### 1. **Multi-Tenant Architecture**
- Each teacher has a unique username and PIN
- Complete data isolation between classrooms
- Teacher PIN serves as both admin access and verification PIN

### 2. **Teacher Accounts**
- **Create Account**: New teachers can create their own classroom from the login screen
- **Login**: Existing teachers login with username and PIN
- **Logout**: Secure logout with confirmation

### 3. **One-Time Items (Exceptional Gear)**
- Add gear for single-use checkouts
- Mark items as "one-time" when adding to inventory
- Automatically removed from inventory after return
- Perfect for borrowed or temporary equipment
- No teacher verification needed for one-time items

### 4. **One-Time Students (Guest Checkouts)**
- Add students for single checkouts
- Mark students as "one-time" when adding to roster
- Ideal for visitors, substitute teachers, or temporary access
- Can be used for multiple checkouts but intended for temporary use


## Technical Details

- **Database**: SQLite with multi-tenant schema
- **Frontend**: Vanilla JavaScript with jQuery
- **Backend**: PHP 7.4+
- **Storage**: localStorage for session persistence
