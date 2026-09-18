const express=require("express");const router=express.Router();const authenticate=require("../middlewares/auth.middleware");const authorize=require("../middlewares/role.middleware");const controller=require("../controllers/survey.controller");
router.post("/events/:id/survey",authenticate,authorize("USER"),controller.submit);
router.get("/events/:id/survey/my",authenticate,authorize("USER"),controller.mine);
router.get("/events/:id/surveys",authenticate,authorize("ORGANIZER","ADMINISTRATOR"),controller.list);
module.exports=router;
