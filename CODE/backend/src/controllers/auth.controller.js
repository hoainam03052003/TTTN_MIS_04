const authService = require("../services/auth.service");

async function login(req, res) {
    try {
        const { username, password } = req.body || {};

        if (!username?.trim() || !password) {
            return res.status(400).json({
                success: false,
                message: "Username và password không được để trống"
            });
        }

        const data = await authService.login(username.trim(), password);

        return res.status(200).json({
            success: true,
            message: "Đăng nhập thành công",
            data
        });
    } catch (error) {
        const errors = {
            USERNAME_NOT_FOUND: [401, "Username không tồn tại"],
            INVALID_PASSWORD: [401, "Mật khẩu không chính xác"],
            USER_INACTIVE: [403, "Tài khoản không hoạt động"]
        };

        if (errors[error.message]) {
            return res.status(errors[error.message][0]).json({
                success: false,
                message: errors[error.message][1]
            });
        }

        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Không thể đăng nhập"
        });
    }
}

async function register(req, res) {
    try {
        let { username, password, full_name, email, phone } = req.body || {};

        username = username?.trim();
        full_name = full_name?.trim();
        email = email?.trim().toLowerCase();
        phone = phone?.trim();

        if (!username || !password || !full_name || !email) {
            return res.status(400).json({
                success: false,
                message: "Vui lòng nhập đầy đủ họ tên, username, email và mật khẩu"
            });
        }

        if (!/^[A-Za-z0-9_.-]{3,50}$/.test(username)) {
            return res.status(400).json({
                success: false,
                message: "Username phải có 3-50 ký tự, chỉ gồm chữ, số, _, ., -"
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Mật khẩu phải có ít nhất 6 ký tự"
            });
        }

        if (!/^\S+@\S+\.\S+$/.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Email không hợp lệ"
            });
        }

        const data = await authService.register({
            username,
            password,
            full_name,
            email,
            phone
        });

        return res.status(201).json({
            success: true,
            message: "Đăng ký tài khoản thành công",
            data
        });
    } catch (error) {
        if (error.message === "USERNAME_EXISTS") {
            return res.status(409).json({ success: false, message: "Username đã tồn tại" });
        }
        if (error.message === "EMAIL_EXISTS") {
            return res.status(409).json({ success: false, message: "Email đã tồn tại" });
        }
        if (error.message === "USER_ROLE_NOT_FOUND") {
            return res.status(500).json({ success: false, message: "Chưa cấu hình role USER trong database" });
        }

        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Không thể đăng ký tài khoản"
        });
    }
}

module.exports = { login, register };
