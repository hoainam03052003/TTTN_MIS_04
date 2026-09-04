const eventService =
    require("../services/event.service");


async function createEvent(req, res) {

    try {
        const {
            event_type_id,
            title,
            start_time,
            end_time,
            registration_deadline,
            quota
        } = req.body;

        if (!event_type_id || !title || !start_time || !end_time || !registration_deadline || quota === undefined) {
            return res.status(400).json({
                success: false,
                message: "Thiếu thông tin bắt buộc của Event"
            });
        }

        if (!Number.isInteger(Number(quota)) || Number(quota) <= 0) {
            return res.status(400).json({
                success: false,
                message: "Quota phải là số nguyên lớn hơn 0"
            });
        }

        if (new Date(end_time) <= new Date(start_time)) {
            return res.status(400).json({
                success: false,
                message: "Thời gian kết thúc phải sau thời gian bắt đầu"
            });
        }

        if (new Date(registration_deadline) >= new Date(start_time)) {
            return res.status(400).json({
                success: false,
                message: "Hạn đăng ký phải trước thời gian bắt đầu Event"
            });
        }

        const eventId =
            await eventService.createEvent(
                req.body,
                req.user.userId
            );

        res.status(201).json({
            success: true,
            message: "Tạo Event thành công",
            eventId
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Không thể tạo Event"
        });
    }
}


async function getEvents(req, res) {

    try {

        const events =
            await eventService.getEvents();

        res.status(200).json({
            success: true,
            data: events
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Không thể lấy danh sách Event"
        });
    }
}


async function getEventById(req, res) {

    try {

        const event =
            await eventService.getEventById(
                req.params.id
            );

        if (!event) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy Event"
            });
        }

        res.status(200).json({
            success: true,
            data: event
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Lỗi hệ thống"
        });
    }
}


async function submitEvent(req, res) {

    try {

        const success =
            await eventService.submitEvent(
                req.params.id,
                req.user.userId
            );

        if (!success) {

            return res.status(400).json({
                success: false,
                message:
                    "Event không ở trạng thái DRAFT hoặc bạn không phải Organizer"
            });
        }

        res.status(200).json({
            success: true,
            message:
                "Event đã được gửi chờ phê duyệt"
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Lỗi hệ thống"
        });
    }
}


async function approveEvent(req, res) {
    try {
        const result = await eventService.approveEvent(
            req.params.id,
            req.user.userId
        );

        if (result.code === "NOT_FOUND") {
            return res.status(404).json({ success: false, message: "Không tìm thấy Event" });
        }
        if (result.code === "INVALID_STATUS") {
            return res.status(400).json({
                success: false,
                message: `Không thể phê duyệt Event ở trạng thái ${result.status}`
            });
        }

        return res.status(200).json({
            success: true,
            message: "Event đã được phê duyệt",
            data: { eventId: Number(req.params.id), status: "APPROVED" }
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Lỗi hệ thống" });
    }
}


async function rejectEvent(req, res) {
    try {
        const result = await eventService.rejectEvent(
            req.params.id,
            req.user.userId,
            req.body.reason
        );

        if (result.code === "REASON_REQUIRED") {
            return res.status(400).json({
                success: false,
                message: "Lý do từ chối không được để trống"
            });
        }
        if (result.code === "NOT_FOUND") {
            return res.status(404).json({ success: false, message: "Không tìm thấy Event" });
        }
        if (result.code === "INVALID_STATUS") {
            return res.status(400).json({
                success: false,
                message: `Không thể từ chối Event ở trạng thái ${result.status}`
            });
        }

        return res.status(200).json({
            success: true,
            message: "Event đã bị từ chối",
            data: { eventId: Number(req.params.id), status: "REJECTED" }
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Lỗi hệ thống" });
    }
}


async function publishEvent(req, res) {
    try {
        const result = await eventService.publishEvent(
            req.params.id,
            req.user.userId
        );

        if (result.code === "NOT_FOUND") {
            return res.status(404).json({ success: false, message: "Không tìm thấy Event" });
        }
        if (result.code === "INVALID_STATUS") {
            return res.status(400).json({
                success: false,
                message: `Chỉ được publish Event ở trạng thái APPROVED. Trạng thái hiện tại: ${result.status}`
            });
        }

        return res.status(200).json({
            success: true,
            message: "Event đã được publish",
            data: { eventId: Number(req.params.id), status: "PUBLISHED" }
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Lỗi hệ thống" });
    }
}


module.exports = {
    createEvent,
    getEvents,
    getEventById,
    submitEvent,
    approveEvent,
    rejectEvent,
    publishEvent
};