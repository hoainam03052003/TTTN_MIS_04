const pool = require("../config/database");

async function registerForEvent(eventId, userId) {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const [eventRows] = await connection.execute(
            `SELECT event_id, status, quota, registration_deadline, start_time
             FROM events
             WHERE event_id = ?
             FOR UPDATE`,
            [eventId]
        );

        if (eventRows.length === 0) {
            await connection.rollback();
            return { code: "EVENT_NOT_FOUND" };
        }

        const event = eventRows[0];

        if (event.status !== "PUBLISHED") {
            await connection.rollback();
            return { code: "EVENT_NOT_PUBLISHED", status: event.status };
        }

        const now = new Date();
        if (now > new Date(event.registration_deadline)) {
            await connection.rollback();
            return { code: "REGISTRATION_CLOSED" };
        }

        const [existingRows] = await connection.execute(
            `SELECT registration_id, status, waitlist_position
             FROM registrations
             WHERE event_id = ? AND user_id = ?
             FOR UPDATE`,
            [eventId, userId]
        );

        if (existingRows.length > 0 && existingRows[0].status !== "CANCELLED") {
            await connection.rollback();
            return {
                code: "ALREADY_REGISTERED",
                status: existingRows[0].status,
                waitlistPosition: existingRows[0].waitlist_position
            };
        }

        const [countRows] = await connection.execute(
            `SELECT COUNT(*) AS registered_count
             FROM registrations
             WHERE event_id = ? AND status = 'REGISTERED'`,
            [eventId]
        );

        const registeredCount = Number(countRows[0].registered_count);
        let status;
        let waitlistPosition = null;

        if (registeredCount < event.quota) {
            status = "REGISTERED";
        } else {
            const [positionRows] = await connection.execute(
                `SELECT COALESCE(MAX(waitlist_position), 0) + 1 AS next_position
                 FROM registrations
                 WHERE event_id = ? AND status = 'WAITLIST'`,
                [eventId]
            );

            status = "WAITLIST";
            waitlistPosition = Number(positionRows[0].next_position);
        }

        if (existingRows.length > 0) {
            await connection.execute(
                `UPDATE registrations
                 SET status = ?,
                     waitlist_position = ?,
                     registered_at = CURRENT_TIMESTAMP,
                     cancelled_at = NULL
                 WHERE registration_id = ?`,
                [status, waitlistPosition, existingRows[0].registration_id]
            );
        } else {
            await connection.execute(
                `INSERT INTO registrations
                 (event_id, user_id, status, waitlist_position)
                 VALUES (?, ?, ?, ?)`,
                [eventId, userId, status, waitlistPosition]
            );
        }

        await connection.commit();

        return {
            code: "OK",
            status,
            waitlistPosition
        };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

async function getMyRegistration(eventId, userId) {
    const [rows] = await pool.execute(
        `SELECT registration_id, event_id, user_id, status,
                waitlist_position, registered_at, cancelled_at
         FROM registrations
         WHERE event_id = ? AND user_id = ?`,
        [eventId, userId]
    );

    return rows[0] || null;
}

async function getEventRegistrations(eventId) {
    const [rows] = await pool.execute(
        `SELECT r.registration_id,
                r.event_id,
                r.user_id,
                u.username,
                u.full_name,
                u.email,
                r.status,
                r.waitlist_position,
                r.registered_at,
                r.cancelled_at
         FROM registrations r
         JOIN users u ON u.user_id = r.user_id
         WHERE r.event_id = ?
         ORDER BY
             CASE r.status
                 WHEN 'REGISTERED' THEN 1
                 WHEN 'WAITLIST' THEN 2
                 ELSE 3
             END,
             r.waitlist_position ASC,
             r.registered_at ASC`,
        [eventId]
    );

    return rows;
}

async function cancelRegistration(eventId, userId) {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const [eventRows] = await connection.execute(
            `SELECT event_id, status
             FROM events
             WHERE event_id = ?
             FOR UPDATE`,
            [eventId]
        );

        if (eventRows.length === 0) {
            await connection.rollback();
            return { code: "EVENT_NOT_FOUND" };
        }

        const [registrationRows] = await connection.execute(
            `SELECT registration_id, status, waitlist_position
             FROM registrations
             WHERE event_id = ? AND user_id = ?
             FOR UPDATE`,
            [eventId, userId]
        );

        if (registrationRows.length === 0) {
            await connection.rollback();
            return { code: "REGISTRATION_NOT_FOUND" };
        }

        const registration = registrationRows[0];

        if (registration.status === "CANCELLED") {
            await connection.rollback();
            return { code: "ALREADY_CANCELLED" };
        }

        await connection.execute(
            `UPDATE registrations
             SET status = 'CANCELLED',
                 waitlist_position = NULL,
                 cancelled_at = CURRENT_TIMESTAMP
             WHERE registration_id = ?`,
            [registration.registration_id]
        );

        let promotedUserId = null;

        if (registration.status === "REGISTERED") {
            const [waitlistRows] = await connection.execute(
                `SELECT registration_id, user_id
                 FROM registrations
                 WHERE event_id = ? AND status = 'WAITLIST'
                 ORDER BY waitlist_position ASC, registered_at ASC
                 LIMIT 1
                 FOR UPDATE`,
                [eventId]
            );

            if (waitlistRows.length > 0) {
                const next = waitlistRows[0];
                promotedUserId = next.user_id;

                await connection.execute(
                    `UPDATE registrations
                     SET status = 'REGISTERED',
                         waitlist_position = NULL
                     WHERE registration_id = ?`,
                    [next.registration_id]
                );
            }
        }

        // Keep WAITLIST positions contiguous: 1, 2, 3, ...
        const [remainingWaitlist] = await connection.execute(
            `SELECT registration_id
             FROM registrations
             WHERE event_id = ? AND status = 'WAITLIST'
             ORDER BY waitlist_position ASC, registered_at ASC`,
            [eventId]
        );

        for (let i = 0; i < remainingWaitlist.length; i++) {
            await connection.execute(
                `UPDATE registrations
                 SET waitlist_position = ?
                 WHERE registration_id = ?`,
                [i + 1, remainingWaitlist[i].registration_id]
            );
        }

        await connection.commit();

        return {
            code: "OK",
            previousStatus: registration.status,
            promotedUserId
        };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

module.exports = {
    registerForEvent,
    getMyRegistration,
    getEventRegistrations,
    cancelRegistration
};
