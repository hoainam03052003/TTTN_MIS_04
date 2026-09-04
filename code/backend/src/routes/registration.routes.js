const express = require("express");
const router = express.Router();

const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");
const controller = require("../controllers/registration.controller");

router.post(
    "/events/:id/register",
    authenticate,
    authorize("USER"),
    controller.registerForEvent
);

router.get(
    "/events/:id/my-registration",
    authenticate,
    authorize("USER"),
    controller.getMyRegistration
);

router.delete(
    "/events/:id/register",
    authenticate,
    authorize("USER"),
    controller.cancelRegistration
);

router.get(
    "/events/:id/registrations",
    authenticate,
    authorize("ORGANIZER", "ADMINISTRATOR"),
    controller.getEventRegistrations
);

module.exports = router;
