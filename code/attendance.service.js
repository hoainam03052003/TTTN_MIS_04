const pool = require("../config/database");
const { writeAuditLog } = require("./audit.service");

async function getEvent(eventId) {
    const [[event]] = await pool.execute(`SELECT * FROM events WHERE event_id=?`, [eventId]);
    return event || null;
}

async function checkin(eventId, userId, inputCode, method = "QR") {
    const event = await getEvent(eventId);
    if (!event) return { code:"NOT_FOUND" };
    if (event.status !== "PUBLISHED") return { code:"NOT_PUBLISHED" };

    const expected = String(event.checkin_code || "").trim().toUpperCase();
    const supplied = String(inputCode || "").trim().toUpperCase();
    if (!expected || supplied !== expected) return { code:"INVALID_CODE" };

    const now = new Date();
    if (event.checkin_start && now < new Date(event.checkin_start)) return { code:"TOO_EARLY" };
    if (event.checkin_end && now > new Date(event.checkin_end)) return { code:"TOO_LATE" };

    const [[registration]] = await pool.execute(
        `SELECT registration_id,status FROM registrations WHERE event_id=? AND user_id=?`,
        [eventId,userId]
    );
    if (!registration || registration.status !== "REGISTERED") return { code:"NOT_REGISTERED" };

    const [[old]] = await pool.execute(
        `SELECT attendance_id FROM attendances WHERE event_id=? AND user_id=?`,
        [eventId,userId]
    );
    if (old) return { code:"ALREADY" };

    const safeMethod = ["QR","CODE"].includes(String(method).toUpperCase()) ? String(method).toUpperCase() : "QR";
    await pool.execute(
        `INSERT INTO attendances(event_id,user_id,method,status) VALUES(?,?,?,'PRESENT')`,
        [eventId,userId,safeMethod]
    );

    await writeAuditLog({
        userId, action:"CHECKIN_EVENT", entity:"EVENT", entityId:eventId,
        description:`Điểm danh Event #${eventId} bằng ${safeMethod}`
    });
    return { code:"OK" };
}

async function getMyAttendance(eventId,userId) {
    const [rows] = await pool.execute(
        `SELECT a.*,e.title FROM attendances a JOIN events e ON e.event_id=a.event_id
         WHERE a.event_id=? AND a.user_id=?`, [eventId,userId]
    );
    return rows[0] || null;
}

async function listAttendance(eventId,user) {
    const [[event]] = await pool.execute(`SELECT organizer_id FROM events WHERE event_id=?`, [eventId]);
    if (!event) return { code:"NOT_FOUND" };
    if (user.role === "ORGANIZER" && Number(event.organizer_id)!==Number(user.userId)) return { code:"FORBIDDEN" };

    const [rows] = await pool.execute(
        `SELECT a.attendance_id,a.event_id,a.user_id,a.checkin_time,a.method,a.status,
                u.username,u.full_name,u.email
         FROM attendances a JOIN users u ON u.user_id=a.user_id
         WHERE a.event_id=? ORDER BY a.checkin_time ASC`, [eventId]
    );
    return { code:"OK", rows };
}

async function manualCheckin(eventId,actor,targetUserId) {
    const [[event]] = await pool.execute(`SELECT organizer_id FROM events WHERE event_id=?`, [eventId]);
    if (!event) return { code:"NOT_FOUND" };
    if (actor.role === "ORGANIZER" && Number(event.organizer_id)!==Number(actor.userId)) return { code:"FORBIDDEN" };
    if (!targetUserId) return { code:"USER_REQUIRED" };

    const [[registration]] = await pool.execute(
        `SELECT status FROM registrations WHERE event_id=? AND user_id=?`, [eventId,targetUserId]
    );
    if (!registration || registration.status !== "REGISTERED") return { code:"NOT_REGISTERED" };

    try {
        await pool.execute(`INSERT INTO attendances(event_id,user_id,method,status) VALUES(?,?,'MANUAL','PRESENT')`, [eventId,targetUserId]);
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") return { code:"ALREADY" };
        throw error;
    }

    await writeAuditLog({
        userId:actor.userId, action:"MANUAL_CHECKIN", entity:"EVENT", entityId:eventId,
        description:`Điểm danh thủ công user #${targetUserId}`
    });
    return { code:"OK" };
}

module.exports={checkin,getMyAttendance,listAttendance,manualCheckin};
