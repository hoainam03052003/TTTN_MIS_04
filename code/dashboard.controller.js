const service=require("../services/dashboard.service");
exports.user=async(req,res)=>{try{return res.json({success:true,data:await service.user(req.user.userId)});}catch(e){console.error(e);return res.status(500).json({success:false,message:"Không thể tải dashboard"});}};
exports.organizer=async(req,res)=>{try{return res.json({success:true,data:await service.organizer(req.user.userId)});}catch(e){console.error(e);return res.status(500).json({success:false,message:"Không thể tải dashboard"});}};
exports.admin=async(req,res)=>{try{return res.json({success:true,data:await service.admin()});}catch(e){console.error(e);return res.status(500).json({success:false,message:"Không thể tải dashboard"});}};
