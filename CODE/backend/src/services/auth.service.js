const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/database");
const { writeAuditLog } = require("./audit.service");

async function login(username, password) {
    const [rows] = await pool.execute(
        `SELECT
            u.user_id,
            u.username,
            u.password_hash,
            u.full_name,
            u.email,
            u.phone,
            u.status,
            r.role_name
         FROM users u
         JOIN roles r ON u.role_id = r.role_id
         WHERE u.username = ?`,
        [username]
    );

    if (rows.length === 0) throw new Error("USERNAME_NOT_FOUND");

    const user = rows[0];

    if (user.status !== "ACTIVE") throw new Error("USER_INACTIVE");

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) throw new Error("INVALID_PASSWORD");

    const token = jwt.sign(
        {
            userId: user.user_id,
            username: user.username,
            role: user.role_name
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || "8h" }
    );

    delete user.password_hash;

    await writeAuditLog({
        userId: user.user_id,
        action: "LOGIN",
        entity: "USER",
        entityId: user.user_id,
        description: `Đăng nhập thành công: ${user.username}`
    });

    return { accessToken: token, user };
}

async function register({ username, password, full_name, email, phone }) {
    const [roles] = await pool.execute(
        `SELECT role_id FROM roles WHERE role_name = 'USER' LIMIT 1`
    );

    if (!roles.length) throw new Error("USER_ROLE_NOT_FOUND");

    const [existingUsername] = await pool.execute(
        `SELECT user_id FROM users WHERE username = ? LIMIT 1`,
        [username]
    );
    if (existingUsername.length) throw new Error("USERNAME_EXISTS");

    const [existingEmail] = await pool.execute(
        `SELECT user_id FROM users WHERE email = ? LIMIT 1`,
        [email]
    );
    if (existingEmail.length) throw new Error("EMAIL_EXISTS");

    const passwordHash = await bcrypt.hash(password, 10);

    const [result] = await pool.execute(
        `INSERT INTO users
            (username, password_hash, full_name, email, phone, role_id, status)
         VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')`,
        [username, passwordHash, full_name, email, phone || null, roles[0].role_id]
    );

    await writeAuditLog({
        userId: result.insertId,
        action: "REGISTER_USER",
        entity: "USER",
        entityId: result.insertId,
        description: `Tạo tài khoản USER: ${username}`
    });

    return {
        userId: result.insertId,
        username,
        full_name,
        email,
        phone: phone || null,
        role: "USER",
        status: "ACTIVE"
    };
}

module.exports = { login, register };
