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


module.exports = router;