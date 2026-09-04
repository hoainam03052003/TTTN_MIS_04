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
        quota
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
            status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT')
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
            quota
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


async function getEvents() {

    const [rows] = await pool.execute(
        `
        SELECT
            e.event_id,
            e.title,
            e.description,
            e.location,
            e.start_time,
            e.end_time,
            e.registration_deadline,
            e.quota,
            e.status,

            u.full_name AS organizer_name,

            et.type_name

        FROM events e

        JOIN users u
            ON e.organizer_id = u.user_id

        JOIN event_types et
            ON e.event_type_id = et.event_type_id

        ORDER BY e.created_at DESC
        `
    );

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
         SET status = 'PUBLISHED'
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
    getEventById,
    submitEvent,
    approveEvent,
    rejectEvent,
    publishEvent
};