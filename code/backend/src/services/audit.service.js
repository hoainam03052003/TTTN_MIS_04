const pool = require("../config/database");

async function writeAuditLog({ userId, action, entity, entityId, description }) {
    await pool.execute(
        `INSERT INTO audit_logs (user_id, action, entity, entity_id, description)
         VALUES (?, ?, ?, ?, ?)`,
        [userId || null, action, entity, entityId || null, description || null]
    );
}

module.exports = { writeAuditLog };
