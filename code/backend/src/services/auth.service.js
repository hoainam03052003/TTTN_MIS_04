const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/database");

async function login(username, password) {

    const [rows] = await pool.execute(
        `
        SELECT
            u.user_id,
            u.username,
            u.password_hash,
            u.full_name,
            u.email,
            u.status,
            r.role_name
        FROM users u
        JOIN roles r
            ON u.role_id = r.role_id
        WHERE u.username = ?
        `,
        [username]
    );

    if (rows.length === 0) {
        throw new Error("USERNAME_NOT_FOUND");
    }

    const user = rows[0];

    if (user.status !== "ACTIVE") {
        throw new Error("USER_INACTIVE");
    }

    const validPassword = await bcrypt.compare(
        password,
        user.password_hash
    );

    if (!validPassword) {
        throw new Error("INVALID_PASSWORD");
    }

    const token = jwt.sign(
        {
            userId: user.user_id,
            username: user.username,
            role: user.role_name
        },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRES_IN
        }
    );

    delete user.password_hash;

    return {
        accessToken: token,
        user
    };
}

module.exports = {
    login
};