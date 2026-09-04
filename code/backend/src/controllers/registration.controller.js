const registrationService = require("../services/registration.service");

async function registerForEvent(req, res) {
    try {
        const result = await registrationService.registerForEvent(
            Number(req.params.id),
            req.user.userId
        );

        if (result.code === "EVENT_NOT_FOUND") {
            return res.status(404).json({ success: false, message: "Không tìm thấy Event" });
        }
        if (result.code === "EVENT_NOT_PUBLISHED") {
            return res.status(400).json({ success: false, message: "Event chưa được publish", status: result.status });
        }
        if (result.code === "REGISTRATION_CLOSED") {
            return res.status(400).json({ success: false, message: "Đã hết thời hạn đăng ký Event" });
        }
        if (result.code === "ALREADY_REGISTERED") {
            return res.status(409).json({
                success: false,
                message: "Bạn đã đăng ký Event này",
                status: result.status,
                waitlistPosition: result.waitlistPosition
            });
        }

        if (result.status === "REGISTERED") {
            return res.status(201).json({
                success: true,
                message: "Đăng ký Event thành công",
                status: "REGISTERED"
            });
        }

        return res.status(201).json({
            success: true,
            message: "Event đã đầy, bạn được đưa vào WAITLIST",
            status: "WAITLIST",
            waitlistPosition: result.waitlistPosition
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Lỗi hệ thống" });
    }
}

async function getMyRegistration(req, res) {
    try {
        const registration = await registrationService.getMyRegistration(
            Number(req.params.id),
            req.user.userId
        );

        if (!registration) {
            return res.status(404).json({ success: false, message: "Bạn chưa đăng ký Event này" });
        }

        return res.status(200).json({ success: true, data: registration });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Lỗi hệ thống" });
    }
}

async function getEventRegistrations(req, res) {
    try {
        const registrations = await registrationService.getEventRegistrations(
            Number(req.params.id)
        );

        return res.status(200).json({ success: true, data: registrations });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Lỗi hệ thống" });
    }
}

async function cancelRegistration(req, res) {
    try {
        const result = await registrationService.cancelRegistration(
            Number(req.params.id),
            req.user.userId
        );

        if (result.code === "EVENT_NOT_FOUND") {
            return res.status(404).json({ success: false, message: "Không tìm thấy Event" });
        }
        if (result.code === "REGISTRATION_NOT_FOUND") {
            return res.status(404).json({ success: false, message: "Bạn chưa đăng ký Event này" });
        }
        if (result.code === "ALREADY_CANCELLED") {
            return res.status(409).json({ success: false, message: "Đăng ký đã được hủy trước đó" });
        }

        return res.status(200).json({
            success: true,
            message: result.promotedUserId
                ? "Hủy đăng ký thành công và đã tự động chuyển người tiếp theo từ WAITLIST lên REGISTERED"
                : "Hủy đăng ký thành công",
            previousStatus: result.previousStatus,
            autoPromotion: Boolean(result.promotedUserId)
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Lỗi hệ thống" });
    }
}

module.exports = {
    registerForEvent,
    getMyRegistration,
    getEventRegistrations,
    cancelRegistration
};
