const pool = require("../config/database");

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

    return result.affectedRows > 0;
}


module.exports = {
    createEvent,
    getEvents,
    getEventById,
    submitEvent
};