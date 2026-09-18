const crypto = require("crypto");
const pool = require("../config/database");
const { writeAuditLog } = require("./audit.service");

async function createEvent(data, organizerId) {

    const {
        event_type_id,
        title,
        description,
        location,
        start_time,
        end_time,
        registration_deadline,
        quota,
        checkin_start,
        checkin_end
    } = data;

    const [result] = await pool.execute(
        `
        INSERT INTO events
        (
            event_type_id,
            organizer_id,
            title,
            description,
            location,
            start_time,
            end_time,
            registration_deadline,
            quota,
            status,
            checkin_code,
            checkin_start,
            checkin_end
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?, ?, ?)
        `,
        [
            event_type_id,
            organizerId,
            title,
            description,
            location,
            start_time,
            end_time,
            registration_deadline,
            quota,
            crypto.randomBytes(4).toString("hex").toUpperCase(),
            checkin_start || null,
            checkin_end || null
        ]
    );

    await writeAuditLog({
        userId: organizerId,
        action: "CREATE_EVENT",
        entity: "EVENT",
        entityId: result.insertId,
        description: `Tạo Event #${result.insertId} ở trạng thái DRAFT`
    });

    return result.insertId;
}


async function getEvents(user) {
    let sql = `
        SELECT
            e.event_id, e.title, e.description, e.location,
            e.start_time, e.end_time, e.registration_deadline,
            e.quota, e.status, e.checkin_code, e.checkin_start, e.checkin_end,
            u.full_name AS organizer_name,
            et.type_name
        FROM events e
        JOIN users u ON e.organizer_id = u.user_id
        JOIN event_types et ON e.event_type_id = et.event_type_id`;
    const params = [];

    if (user.role === "USER") {
        sql += ` WHERE e.status = 'PUBLISHED'`;
    } else if (user.role === "ORGANIZER") {
        sql += ` WHERE e.organizer_id = ?`;
        params.push(user.userId);
    }

    sql += ` ORDER BY e.created_at DESC`;
    const [rows] = await pool.execute(sql, params);
    return rows;
}

async function getEventTypes() {
    const [rows] = await pool.execute(`SELECT event_type_id,type_name,description FROM event_types ORDER BY event_type_id`);
    return rows;
}

async function getEventById(eventId) {

    const [rows] = await pool.execute(
        `
        SELECT
            e.*,
            u.full_name AS organizer_name,
            et.type_name
        FROM events e

        JOIN users u
            ON e.organizer_id = u.user_id

        JOIN event_types et
            ON e.event_type_id = et.event_type_id

        WHERE e.event_id = ?
        `,
        [eventId]
    );

    return rows[0];
}


async function submitEvent(eventId, organizerId) {

    const [result] = await pool.execute(
        `
        UPDATE events

        SET status = 'PENDING_APPROVAL'

        WHERE event_id = ?
        AND organizer_id = ?
        AND status = 'DRAFT'
        `,
        [eventId, organizerId]
    );

    if (result.affectedRows > 0) {
        await writeAuditLog({
            userId: organizerId,
            action: "SUBMIT_EVENT",
            entity: "EVENT",
            entityId: eventId,
            description: `Gửi Event #${eventId} chờ phê duyệt`
        });
        return true;
    }

    return false;
}


async function approveEvent(eventId, adminId) {
    const [result] = await pool.execute(
        `UPDATE events
         SET status = 'APPROVED', rejection_reason = NULL
         WHERE event_id = ? AND status = 'PENDING_APPROVAL'`,
        [eventId]
    );

    if (result.affectedRows === 0) {
        const [rows] = await pool.execute(
            `SELECT event_id, status FROM events WHERE event_id = ?`,
            [eventId]
        );
        if (rows.length === 0) return { code: "NOT_FOUND" };
        return { code: "INVALID_STATUS", status: rows[0].status };
    }

    await writeAuditLog({
        userId: adminId,
        action: "APPROVE_EVENT",
        entity: "EVENT",
        entityId: eventId,
        description: `Phê duyệt Event #${eventId}: PENDING_APPROVAL -> APPROVED`
    });

    return { code: "OK" };
}


async function rejectEvent(eventId, adminId, reason) {
    const cleanReason = typeof reason === "string" ? reason.trim() : "";
    if (!cleanReason) return { code: "REASON_REQUIRED" };

    const [result] = await pool.execute(
        `UPDATE events
         SET status = 'REJECTED', rejection_reason = ?
         WHERE event_id = ? AND status = 'PENDING_APPROVAL'`,
        [cleanReason, eventId]
    );

    if (result.affectedRows === 0) {
        const [rows] = await pool.execute(
            `SELECT event_id, status FROM events WHERE event_id = ?`,
            [eventId]
        );
        if (rows.length === 0) return { code: "NOT_FOUND" };
        return { code: "INVALID_STATUS", status: rows[0].status };
    }

    await writeAuditLog({
        userId: adminId,
        action: "REJECT_EVENT",
        entity: "EVENT",
        entityId: eventId,
        description: `Từ chối Event #${eventId}: ${cleanReason}`
    });

    return { code: "OK" };
}


async function publishEvent(eventId, adminId) {
    const [result] = await pool.execute(
        `UPDATE events
         SET status = 'PUBLISHED',
             checkin_code = COALESCE(NULLIF(checkin_code, ''), UPPER(SUBSTRING(MD5(CONCAT(event_id, '-TTTN-MIS-04')), 1, 8)))
         WHERE event_id = ? AND status = 'APPROVED'`,
        [eventId]
    );

    if (result.affectedRows === 0) {
        const [rows] = await pool.execute(
            `SELECT event_id, status FROM events WHERE event_id = ?`,
            [eventId]
        );
        if (rows.length === 0) return { code: "NOT_FOUND" };
        return { code: "INVALID_STATUS", status: rows[0].status };
    }

    await writeAuditLog({
        userId: adminId,
        action: "PUBLISH_EVENT",
        entity: "EVENT",
        entityId: eventId,
        description: `Đăng tải Event #${eventId}: APPROVED -> PUBLISHED`
    });

    return { code: "OK" };
}


module.exports = {
    createEvent,
    getEvents,
    getEventTypes,
    getEventById,
    submitEvent,
    approveEvent,
    rejectEvent,
    publishEvent
};