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

## Migration from Single-Tenant

If you're upgrading from the previous version:

1. **Backup your database** (automatic during migration)
2. **Run the migration script**:
   ```bash
   php migrate.php
   ```
3. **Default credentials** will be created:
   - Username: `Teacher`
   - PIN: `0000`
4. All existing data will be assigned to the default teacher account

## Usage Guide

### Getting Started

1. **First Time Setup**
   - Click "Create New Classroom" on login screen
   - Enter a username (e.g., "MrSmith", "Photography101")
   - Enter a 4-digit PIN (remember this - it's your admin/verify PIN)
   - Click "Create Account"

2. **Daily Login**
   - Enter your username and PIN
   - Click "Login"

### Adding Regular Gear

1. Click the settings icon (⚙️) in the top right
2. Enter your PIN (admin access)
3. In the "Inventory" section:
   - Enter item ID (e.g., "CAM1")
   - Enter item name (e.g., "Canon EOS R5")
   - Leave "One-time item" **unchecked**
   - Click the + button

### Adding One-Time Gear

Perfect for equipment you're borrowing temporarily or lending out once:

1. Access admin panel (⚙️ → enter PIN)
2. In the "Inventory" section:
   - Enter item ID (e.g., "TEMP1")
   - Enter item name (e.g., "Borrowed Tripod")
   - **Check** "One-time item (auto-remove after return)"
   - Click the + button
3. Item will automatically be deleted after it's returned

### Adding Regular Students

1. Access admin panel (⚙️ → enter PIN)
2. In the "Student Roster" section:
   - Enter full name
   - Enter 4-digit PIN
   - Leave "One-time student" **unchecked**
   - Click the + button

### Adding One-Time Students

Perfect for guest users or substitute teachers:

1. Access admin panel (⚙️ → enter PIN)
2. In the "Student Roster" section:
   - Enter name (e.g., "Guest - John Doe")
   - Enter 4-digit PIN (can be simple like "9999")
   - **Check** "One-time student (for single checkout)"
   - Click the + button

### Checkout Process

1. Student clicks on an available item
2. Student enters their 4-digit PIN
3. Item status changes to "OUT"

### Return Process

**For Regular Items:**
1. Student clicks on the item they're returning
2. Student enters their PIN
3. Item status changes to "CHECK-IN" (pending verification)
4. Teacher clicks "Verify All Pending" or clicks the specific item
5. Teacher enters their PIN
6. Item returns to "READY" status

**For One-Time Items:**
1. Student clicks on the item they're returning
2. Student enters their PIN
3. Item is automatically removed from inventory (no verification needed)
4. Log entry shows "Returned (One-Time Item Removed)"

### Logging Out

1. Click the logout icon (🚪) in the top right
2. Confirm logout
3. You'll return to the login screen

## Security Notes

- Each teacher's PIN functions as their admin password
- PINs should be 4 digits for ease of use
- Student PINs are unique per classroom
- Data is completely isolated between teachers
- Sessions persist until logout (stored in browser localStorage)

## One-Time Items Best Practices

**When to use:**
- Borrowed equipment from another department
- Personal equipment temporarily available
- Equipment being tested before permanent addition
- Items for special events or projects
- Equipment with uncertain availability

**Benefits:**
- No clutter in inventory
- Automatic cleanup
- No verification step needed
- Quick checkout for temporary needs

**Note:** If a one-time item is not returned (still checked out), it will remain in the system until returned. It's only removed when returned to available status.

## One-Time Students Best Practices

**When to use:**
- Guest instructors or substitute teachers
- Students from other classes (one-time access)
- Temporary access for special projects
- Workshop participants
- Visitors who need equipment briefly

**Benefits:**
- Quick temporary access
- No long-term roster clutter
- Simple PIN management
- Easy identification with naming conventions (e.g., "Guest - Name")

## Tips

1. **Naming Convention for One-Time Items**: Use prefixes like "TEMP-" or "LOAN-" to easily identify temporary gear
2. **Naming Convention for One-Time Students**: Use "Guest - Name" or "Temp - Name" format
3. **Temporary PINs**: For one-time students, you can use simple sequential PINs like 9990, 9991, 9992, etc.
4. **Converting One-Time to Permanent**: If you want to keep a one-time item/student permanently, you'll need to add it again without the one-time checkbox
5. **Multiple Classrooms**: If you teach multiple classes, create separate accounts for each (e.g., "Photo101", "Photo201")
6. **PIN Security**: While student PINs are simple, keep your teacher PIN secure as it controls all admin functions

## Troubleshooting

**Q: I forgot my teacher PIN**
A: Contact your system administrator to reset it in the database

**Q: Can I change my username or PIN?**
A: Currently, this requires database access. Feature coming in future update.

**Q: What happens if I delete a one-time student who has items checked out?**
A: Students can be deleted, but it's recommended to wait until all their items are returned for proper logging.

**Q: Can I see items/students from other teachers?**
A: No, all data is completely isolated per teacher account for privacy and organization.

**Q: Do one-time items show any differently on the dashboard?**
A: They look the same to students on the dashboard. Only in the admin panel do they have a "ONE-TIME" badge.

## Technical Details

- **Database**: SQLite with multi-tenant schema
- **Frontend**: Vanilla JavaScript with jQuery
- **Backend**: PHP 7.4+
- **Storage**: localStorage for session persistence
- **Data Isolation**: Foreign keys ensure complete separation

## Future Enhancements

- Password/PIN reset functionality
- Account settings page
- Ability to mark one-time items as permanent after checkout
- Bulk operations for temporary items
- Export/reporting per classroom
- Optional item descriptions and categories
