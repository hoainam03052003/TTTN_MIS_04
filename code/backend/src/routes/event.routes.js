const express = require("express");

const router = express.Router();

const authenticate =
    require("../middlewares/auth.middleware");

const authorize =
    require("../middlewares/role.middleware");

const eventController =
    require("../controllers/event.controller");


router.get(
    "/",
    authenticate,
    eventController.getEvents
);


router.get(
    "/:id",
    authenticate,
    eventController.getEventById
);


router.post(
    "/",
    authenticate,
    authorize("ORGANIZER", "ADMINISTRATOR"),
    eventController.createEvent
);


router.post(
    "/:id/submit",
    authenticate,
    authorize("ORGANIZER"),
    eventController.submitEvent
);

router.post(
    "/:id/approve",
    authenticate,
    authorize("ADMINISTRATOR"),
    eventController.approveEvent
);

router.post(
    "/:id/reject",
    authenticate,
    authorize("ADMINISTRATOR"),
    eventController.rejectEvent
);

router.post(
    "/:id/publish",
    authenticate,
    authorize("ADMINISTRATOR"),
    eventController.publishEvent
);


module.exports = router;