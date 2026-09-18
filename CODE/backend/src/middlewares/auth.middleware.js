const jwt = require("jsonwebtoken");

function authenticate(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message: "Không tìm thấy access token"
            });
        }

        const parts = authHeader.trim().split(/\s+/);

        if (parts.length !== 2 || parts[0] !== "Bearer" || !parts[1]) {
            return res.status(401).json({
                success: false,
                message: "Authorization header không hợp lệ"
            });
        }

        req.user = jwt.verify(parts[1], process.env.JWT_SECRET);
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Access token không hợp lệ hoặc đã hết hạn"
        });
    }
}

module.exports = authenticate;
