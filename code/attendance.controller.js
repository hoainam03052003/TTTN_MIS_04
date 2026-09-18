const service = require("../services/attendance.service");

async function checkin(req,res){
    try{
        const { code, method } = req.body || {};
        if(!code?.trim()) return res.status(400).json({success:false,message:"Mã Check-in không được để trống"});
        const r=await service.checkin(Number(req.params.id),req.user.userId,code,method);
        const map={NOT_FOUND:[404,"Không tìm thấy Event"],NOT_PUBLISHED:[400,"Event chưa được publish"],INVALID_CODE:[400,"Mã Check-in không chính xác"],TOO_EARLY:[400,"Chưa đến thời gian Check-in"],TOO_LATE:[400,"Đã hết thời gian Check-in"],NOT_REGISTERED:[403,"Bạn chưa có trạng thái REGISTERED cho Event này"],ALREADY:[409,"Bạn đã Check-in Event này"]};
        if(map[r.code]) return res.status(map[r.code][0]).json({success:false,message:map[r.code][1]});
        return res.status(200).json({success:true,message:"Check-in thành công",data:{eventId:Number(req.params.id)}});
    }catch(error){console.error(error);return res.status(500).json({success:false,message:"Không thể Check-in"});}
}
async function mine(req,res){try{return res.json({success:true,data:await service.getMyAttendance(Number(req.params.id),req.user.userId)});}catch(e){console.error(e);return res.status(500).json({success:false,message:"Lỗi hệ thống"});}}
async function list(req,res){try{const r=await service.listAttendance(Number(req.params.id),req.user);if(r.code==='NOT_FOUND')return res.status(404).json({success:false,message:'Không tìm thấy Event'});if(r.code==='FORBIDDEN')return res.status(403).json({success:false,message:'Bạn không có quyền xem Attendance của Event này'});return res.json({success:true,data:r.rows});}catch(e){console.error(e);return res.status(500).json({success:false,message:'Lỗi hệ thống'});}}
async function manual(req,res){try{const r=await service.manualCheckin(Number(req.params.id),req.user,Number(req.body?.user_id));const map={NOT_FOUND:[404,'Không tìm thấy Event'],FORBIDDEN:[403,'Bạn không có quyền thao tác Event này'],USER_REQUIRED:[400,'user_id không được để trống'],NOT_REGISTERED:[400,'User chưa ở trạng thái REGISTERED'],ALREADY:[409,'User đã Check-in Event này']};if(map[r.code])return res.status(map[r.code][0]).json({success:false,message:map[r.code][1]});return res.status(201).json({success:true,message:'Điểm danh thủ công thành công'});}catch(e){console.error(e);return res.status(500).json({success:false,message:'Không thể điểm danh thủ công'});}}
module.exports={checkin,mine,list,manual};
