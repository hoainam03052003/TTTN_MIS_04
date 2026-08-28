const eventService =
    require("../services/event.service");


async function createEvent(req, res) {

    try {

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


module.exports = {
    createEvent,
    getEvents,
    getEventById,
    submitEvent
};