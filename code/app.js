require("dotenv").config();
const express=require("express");
const cors=require("cors");
const authRoutes=require("./routes/auth.routes");
const eventRoutes=require("./routes/event.routes");
const registrationRoutes=require("./routes/registration.routes");
const attendanceRoutes=require("./routes/attendance.routes");
const surveyRoutes=require("./routes/survey.routes");
const dashboardRoutes=require("./routes/dashboard.routes");

const app=express();
app.use(cors());
app.use(express.json({limit:"1mb"}));
app.use(express.urlencoded({extended:true}));

app.get("/api/health",async(req,res)=>{
    let database="unknown";
    try { const pool=require("./config/database"); await pool.query("SELECT 1"); database="connected"; }
    catch(error){ database="disconnected"; }
    res.json({success:true,message:"TTTN_MIS_04 API is running",database});
});

app.use("/api/auth",authRoutes);
app.use("/api/events",eventRoutes);
app.use("/api",registrationRoutes);
app.use("/api",attendanceRoutes);
app.use("/api",surveyRoutes);
app.use("/api/dashboard",dashboardRoutes);

app.use((req,res)=>res.status(404).json({success:false,message:"API endpoint not found"}));
app.use((error,req,res,next)=>{console.error(error);res.status(500).json({success:false,message:"Internal server error"});});
module.exports=app;
