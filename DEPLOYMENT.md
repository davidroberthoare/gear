# Deployment Guide - Multi-Tenant Gear Kiosk

## 🚀 Quick Deployment

### Option 1: Fresh Installation (No Existing Data)
```bash
# Files are already in place
# Just access the application in your browser
# Click "Create New Classroom" to get started
```

### Option 2: Upgrade Existing Installation (Recommended)

#### Step 1: Verify Files
All updated files are already in place:
- ✅ api.php (updated)
- ✅ app.js (updated) 
- ✅ index.html (updated)
- ✅ styles.css (updated)
- ✅ migrate.php (new)

#### Step 2: Run Migration
```bash
cd /var/www/vhosts/projects.davidhoare.net/gear
php migrate.php
```

Expected output:
```
✓ Backup created: gear_kiosk_backup_2026-02-11_XX-XX-XX.db
Starting migration...

1. Creating teachers table...
2. Creating default teacher account (username: Teacher, pin: 0000)...
   Created teacher with ID: 1
3. Backing up old tables...
4. Creating new multi-tenant tables...
5. Migrating existing data to default teacher...
   Migrated X items
   Migrated X students
   Migrated X log entries
6. Cleaning up old tables...

✓ Migration completed successfully!

Default Login Credentials:
  Username: Teacher
  PIN: 0000
```

#### Step 3: Test the System

**Test Login:**
1. Open application in browser
2. You should see new login screen
3. Login with: `Teacher` / `0000`
4. Verify you see all your existing data

**Test Existing Features:**
- [ ] View inventory items
- [ ] View student roster
- [ ] Check recent activity log
- [ ] Checkout an item (student PIN)
- [ ] Return an item (student PIN)
- [ ] Verify return (teacher PIN: 0000)
- [ ] Access admin panel (settings icon, PIN: 0000)

**Test New Features:**
- [ ] Add a one-time item (check the checkbox)
- [ ] Checkout the one-time item
- [ ] Return it (should auto-delete)
- [ ] Add a one-time student
- [ ] Create a second teacher account (logout, then "Create New Classroom")
- [ ] Verify data isolation (new teacher has empty inventory)

#### Step 4: Configure Default Teacher (Optional)

If you want to change the default credentials:

```bash
# Access database
sqlite3 gear_kiosk.db

# View current teacher
SELECT * FROM teachers;

# Update username and PIN
UPDATE teachers SET username = 'YourName', pin = 'YourPIN' WHERE id = 1;

# Exit
.quit
```

## 📋 Pre-Deployment Checklist

- [ ] Read CHANGES.md to understand all modifications
- [ ] Review README_MULTITENANT.md for feature documentation
- [ ] Backup current database (migration does this automatically)
- [ ] Note down any items currently checked out
- [ ] Inform users of upcoming changes
- [ ] Plan for 5-10 minutes of downtime (if needed)

## 🔄 Migration Timeline

**Minimal Downtime Approach:**

1. **During Off-Hours** (recommended):
   ```bash
   # Run migration when no one is using the system
   php migrate.php
   # Takes < 1 second for most databases
   ```

2. **During Business Hours** (if necessary):
   - System can remain online
   - Students may need to refresh their browsers
   - Teachers should logout and login again

## ✅ Post-Deployment Tasks

### Immediate (First Hour)
- [ ] Verify migration success
- [ ] Test login with default credentials
- [ ] Check data integrity (counts match)
- [ ] Test one checkout/return cycle
- [ ] Create additional teacher accounts (if needed)

### First Day
- [ ] Monitor for any issues
- [ ] Help teachers login for first time
- [ ] Demonstrate new features:
  - One-time items
  - One-time students
  - Logout functionality
- [ ] Distribute QUICK_REFERENCE.md to teachers

### First Week
- [ ] Gather feedback from teachers
- [ ] Document any issues or questions
- [ ] Ensure all teachers have accounts
- [ ] Verify data isolation working correctly

## 🆘 Troubleshooting

### Issue: Migration script fails
**Solution:**
```bash
# Check if backup was created
ls -la gear_kiosk_backup_*.db

# Restore if needed
cp gear_kiosk_backup_YYYY-MM-DD_HH-MM-SS.db gear_kiosk.db

# Check error message and fix issue
# Re-run migration
php migrate.php
```

### Issue: Can't login with default credentials
**Solution:**
```bash
# Verify teacher exists
sqlite3 gear_kiosk.db "SELECT * FROM teachers;"

# Should show: 1|Teacher|0000|timestamp
```

### Issue: Old data not visible
**Solution:**
```bash
# Check data migration
sqlite3 gear_kiosk.db "SELECT COUNT(*), teacher_id FROM items GROUP BY teacher_id;"
# Should show all items under teacher_id = 1
```

### Issue: Browser showing old version
**Solution:**
```
# Have users clear browser cache or hard refresh
Windows/Linux: Ctrl + Shift + R
Mac: Cmd + Shift + R
```

## 🔐 Security Notes

**Default Credentials:**
- Username: `Teacher`
- PIN: `0000`
- **Change these** in production!

**PIN Management:**
- Teacher PINs control everything
- Should be 4 digits for simplicity
- Keep them confidential
- No built-in reset (requires database access)

**Session Management:**
- Sessions stored in browser localStorage
- Persist until logout
- Separate per browser/device
- Not shared across tabs

## 📊 Monitoring

**Database Queries for Monitoring:**

```bash
# Count teachers
sqlite3 gear_kiosk.db "SELECT COUNT(*) FROM teachers;"

# Count items per teacher
sqlite3 gear_kiosk.db "SELECT username, COUNT(items.id) as item_count 
FROM teachers 
LEFT JOIN items ON teachers.id = items.teacher_id 
GROUP BY teachers.id;"

# Count students per teacher
sqlite3 gear_kiosk.db "SELECT username, COUNT(students.id) as student_count 
FROM teachers 
LEFT JOIN students ON teachers.id = students.teacher_id 
GROUP BY teachers.id;"

# Check for one-time items
sqlite3 gear_kiosk.db "SELECT * FROM items WHERE is_temporary = 1;"

# Recent activity
sqlite3 gear_kiosk.db "SELECT * FROM logs ORDER BY timestamp DESC LIMIT 20;"
```

## 📱 User Communication

**Email Template:**

Subject: Gear Kiosk System Upgrade - New Features!

Hi Team,

Gear Kiosk has been upgraded with exciting new features:

✨ **What's New:**
- Multi-teacher support - each classroom can have its own account
- One-time items - for borrowed or temporary equipment
- One-time students - for guest access
- Improved security with individual PINs

📝 **For Existing Users:**
- Your data has been preserved
- Login: Username: `Teacher` / PIN: `0000`
- Please change this PIN to your preference

🆕 **Creating Your Own Classroom:**
1. Logout from default account
2. Click "Create New Classroom"
3. Choose your username and PIN
4. Start adding your items and students

📚 **Documentation:**
- Quick Reference Guide: [link to QUICK_REFERENCE.md]
- Full Documentation: [link to README_MULTITENANT.md]

Questions? Reply to this email!

## 🎯 Success Metrics

After deployment, verify:
- ✅ 100% data preservation (all items/students migrated)
- ✅ Zero downtime (or minimal planned downtime)
- ✅ All teachers can login successfully
- ✅ Checkout/return workflow functions normally
- ✅ One-time items auto-delete correctly
- ✅ No cross-tenant data leakage
- ✅ Teachers satisfied with new features

## 🔄 Rollback Plan

If critical issues arise:

```bash
# Stop using the system
# Restore backup
cp gear_kiosk_backup_YYYY-MM-DD_HH-MM-SS.db gear_kiosk.db

# Restore old code (if you saved backup)
# Or download from version control

# Restart web server (if needed)
sudo systemctl restart apache2
# or
sudo systemctl restart nginx
```

## 📞 Support Contacts

**Technical Issues:**
- Check MIGRATION_CHECKLIST.md
- Check CHANGES.md for implementation details
- Check README_MULTITENANT.md for feature documentation

**User Questions:**
- Provide QUICK_REFERENCE.md
- Schedule training session if needed

---

## Final Deployment Command

```bash
# One command to rule them all
cd /var/www/vhosts/projects.davidhoare.net/gear && \
php migrate.php && \
echo "✓ Deployment complete! Default login: Teacher / 0000"
```

**Estimated Time:** < 1 minute
**Risk Level:** Low (automatic backup created)
**Rollback Time:** < 30 seconds (if needed)

---

**Deployment Date:** _______________
**Deployed By:** _______________
**Status:** ☐ Success ☐ Rolled Back ☐ Issues

**Notes:**
_________________________________
_________________________________
_________________________________
