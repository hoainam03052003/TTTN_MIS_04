const authService = require("../services/auth.service");

async function login(req, res) {

    try {

        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: "Username và password không được để trống"
            });
        }

        const result = await authService.login(
            username,
            password
        );

        return res.status(200).json({
            success: true,
            message: "Đăng nhập thành công",
            data: result
        });

    } catch (error) {

        if (error.message === "USERNAME_NOT_FOUND") {
            return res.status(401).json({
                success: false,
                message: "Username không tồn tại"
            });
        }

        if (error.message === "INVALID_PASSWORD") {
            return res.status(401).json({
                success: false,
                message: "Mật khẩu không chính xác"
            });
        }

        if (error.message === "USER_INACTIVE") {
            return res.status(403).json({
                success: false,
                message: "Tài khoản không hoạt động"
            });
        }

        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
}

module.exports = {
    login
};