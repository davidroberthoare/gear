# Gear Kiosk

## Overview
Gear Kiosk is a simple equipment management/sign-out system for our CommTech lab. Each teacher can now manage their own inventory, students, and checkouts independently.

A working free version for public use is available here: https://gear.drhmedia.net/ or you can host your own.


## Branches
- "main" branch requires a mysql server (for improved multi-tenancy) and also works as a PWA. All future development will be in this branch.
- "sqlite" branch is self-contained, running on sqlite. It works fine, but development has paused on this branch.


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

- **Database**: MySQL or SQLite with multi-tenant schema
- **Frontend**: Vanilla JavaScript with jQuery, PWA-installable
- **Backend**: PHP 7.4+
- **Storage**: localStorage for session persistence

## Live Version Notice

The public live version at https://gear.drhmedia.net/ is provided as-is and is not guaranteed for uptime, availability, or fitness for any particular purpose.

Security is best-effort and intentionally lightweight for a school/lab use case; it should not be considered hardened for high-risk or sensitive production environments.

This app does not include analytics, ad trackers, or any intentional data collection of personal usage data.

## License

This project is released under **The Unlicense**.

You may use, copy, modify, distribute, and sell this software, in source or binary form, for any purpose, with or without attribution.

In jurisdictions where public domain dedication is not recognized, this project is provided under terms equivalent to an unrestricted permissive license.

See the `LICENSE` file for the full text.