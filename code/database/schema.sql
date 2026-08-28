CREATE DATABASE IF NOT EXISTS tttn_mis_04
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE tttn_mis_04;

-- =========================================
-- 1. ROLE
-- =========================================

CREATE TABLE roles (
    role_id INT AUTO_INCREMENT PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255)
);

INSERT INTO roles (role_name, description) VALUES
('USER', 'Người dùng tham gia khóa học/sự kiện'),
('ORGANIZER', 'Người tổ chức khóa học/sự kiện'),
('ADMINISTRATOR', 'Quản trị viên hệ thống');


-- =========================================
-- 2. USER
-- =========================================

CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,

    username VARCHAR(50) NOT NULL UNIQUE,

    password_hash VARCHAR(255) NOT NULL,

    full_name VARCHAR(150) NOT NULL,

    email VARCHAR(150) NOT NULL UNIQUE,

    phone VARCHAR(20),

    role_id INT NOT NULL,

    status ENUM('ACTIVE', 'INACTIVE', 'LOCKED')
        DEFAULT 'ACTIVE',

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_users_role
        FOREIGN KEY (role_id)
        REFERENCES roles(role_id)
);


-- =========================================
-- 3. EVENT TYPE
-- =========================================

CREATE TABLE event_types (
    event_type_id INT AUTO_INCREMENT PRIMARY KEY,

    type_name VARCHAR(100) NOT NULL UNIQUE,

    description VARCHAR(255),

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);


-- =========================================
-- 4. EVENT
-- =========================================

CREATE TABLE events (
    event_id INT AUTO_INCREMENT PRIMARY KEY,

    event_type_id INT NOT NULL,

    organizer_id INT NOT NULL,

    title VARCHAR(200) NOT NULL,

    description TEXT,

    location VARCHAR(255),

    start_time DATETIME NOT NULL,

    end_time DATETIME NOT NULL,

    registration_deadline DATETIME NOT NULL,

    quota INT NOT NULL,

    status ENUM(
        'DRAFT',
        'PENDING_APPROVAL',
        'REJECTED',
        'APPROVED',
        'PUBLISHED',
        'CLOSED',
        'CANCELLED'
    ) DEFAULT 'DRAFT',

    rejection_reason TEXT,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_events_type
        FOREIGN KEY (event_type_id)
        REFERENCES event_types(event_type_id),

    CONSTRAINT fk_events_organizer
        FOREIGN KEY (organizer_id)
        REFERENCES users(user_id),

    CONSTRAINT chk_event_quota
        CHECK (quota > 0),

    CONSTRAINT chk_event_time
        CHECK (end_time > start_time)
);


-- =========================================
-- 5. REGISTRATION
-- =========================================

CREATE TABLE registrations (
    registration_id INT AUTO_INCREMENT PRIMARY KEY,

    event_id INT NOT NULL,

    user_id INT NOT NULL,

    status ENUM(
        'REGISTERED',
        'WAITLIST',
        'CANCELLED'
    ) NOT NULL,

    waitlist_position INT NULL,

    registered_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    cancelled_at DATETIME NULL,

    CONSTRAINT fk_reg_event
        FOREIGN KEY (event_id)
        REFERENCES events(event_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_reg_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    CONSTRAINT uq_user_event
        UNIQUE (event_id, user_id)
);


-- =========================================
-- 6. ATTENDANCE
-- =========================================

CREATE TABLE attendances (
    attendance_id INT AUTO_INCREMENT PRIMARY KEY,

    event_id INT NOT NULL,

    user_id INT NOT NULL,

    checkin_time DATETIME DEFAULT CURRENT_TIMESTAMP,

    method ENUM(
        'QR',
        'CODE',
        'MANUAL'
    ) DEFAULT 'QR',

    status ENUM(
        'PRESENT',
        'ABSENT'
    ) DEFAULT 'PRESENT',

    CONSTRAINT fk_att_event
        FOREIGN KEY (event_id)
        REFERENCES events(event_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_att_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    CONSTRAINT uq_attendance
        UNIQUE (event_id, user_id)
);


-- =========================================
-- 7. SURVEY
-- =========================================

CREATE TABLE surveys (
    survey_id INT AUTO_INCREMENT PRIMARY KEY,

    event_id INT NOT NULL,

    user_id INT NOT NULL,

    rating INT NOT NULL,

    comment TEXT,

    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_survey_event
        FOREIGN KEY (event_id)
        REFERENCES events(event_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_survey_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    CONSTRAINT uq_survey
        UNIQUE (event_id, user_id),

    CONSTRAINT chk_rating
        CHECK (rating BETWEEN 1 AND 5)
);


-- =========================================
-- 8. AUDIT LOG
-- =========================================

CREATE TABLE audit_logs (
    log_id BIGINT AUTO_INCREMENT PRIMARY KEY,

    user_id INT NULL,

    action VARCHAR(100) NOT NULL,

    entity VARCHAR(100),

    entity_id INT,

    description TEXT,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_audit_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE SET NULL
);