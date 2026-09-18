USE tttn_mis_04;

-- Migration an toàn cho database đã có dữ liệu.
-- Không DROP DATABASE, không xóa Event/Registration/WAITLIST.

SET @sql = (
    SELECT IF(COUNT(*) = 0,
        'ALTER TABLE events ADD COLUMN checkin_code VARCHAR(32) NULL',
        'SELECT 1')
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'events'
      AND COLUMN_NAME = 'checkin_code'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
    SELECT IF(COUNT(*) = 0,
        'ALTER TABLE events ADD COLUMN checkin_start DATETIME NULL',
        'SELECT 1')
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'events'
      AND COLUMN_NAME = 'checkin_start'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
    SELECT IF(COUNT(*) = 0,
        'ALTER TABLE events ADD COLUMN checkin_end DATETIME NULL',
        'SELECT 1')
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'events'
      AND COLUMN_NAME = 'checkin_end'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Tạo mã Check-in cho Event cũ chưa có mã.
SET SQL_SAFE_UPDATES = 0;
UPDATE events
SET checkin_code = UPPER(SUBSTRING(MD5(CONCAT(event_id, '-TTTN-MIS-04')), 1, 8))
WHERE event_id IS NOT NULL
  AND (checkin_code IS NULL OR checkin_code = '');
SET SQL_SAFE_UPDATES = 1;

SELECT event_id, title, checkin_code, checkin_start, checkin_end
FROM events
ORDER BY event_id;
