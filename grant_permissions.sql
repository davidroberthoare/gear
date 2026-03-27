-- Grant all privileges on gear_dev database to gear_user
-- Run this script as MySQL root user

-- Grant privileges on the database
GRANT ALL PRIVILEGES ON gear_dev.* TO 'gear_user'@'localhost';

-- If the above doesn't work, you may need to create the database first
CREATE DATABASE IF NOT EXISTS gear_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Then grant privileges
GRANT ALL PRIVILEGES ON gear_dev.* TO 'gear_user'@'localhost';

-- Apply the changes
FLUSH PRIVILEGES;

-- Verify the grants
SHOW GRANTS FOR 'gear_user'@'localhost';
