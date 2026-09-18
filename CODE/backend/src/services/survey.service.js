const pool=require("../config/database");
const {writeAuditLog}=require("./audit.service");
async function submit(eventId,userId,rating,comment){
    const n=Number(rating);
    if(!Number.isInteger(n)||n<1||n>5)return {code:"INVALID_RATING"};
    const [[attendance]]=await pool.execute(`SELECT attendance_id FROM attendances WHERE event_id=? AND user_id=? AND status='PRESENT'`,[eventId,userId]);
    if(!attendance)return {code:"NOT_ATTENDED"};
    const [[old]]=await pool.execute(`SELECT survey_id FROM surveys WHERE event_id=? AND user_id=?`,[eventId,userId]);
    if(old)return {code:"ALREADY"};
    await pool.execute(`INSERT INTO surveys(event_id,user_id,rating,comment) VALUES(?,?,?,?)`,[eventId,userId,n,typeof comment==='string'&&comment.trim()?comment.trim():null]);
    await writeAuditLog({userId,action:"SUBMIT_SURVEY",entity:"EVENT",entityId:eventId,description:`Gửi khảo sát Event #${eventId}, rating ${n}/5`});
    return {code:"OK"};
}
async function mine(eventId,userId){const [rows]=await pool.execute(`SELECT * FROM surveys WHERE event_id=? AND user_id=?`,[eventId,userId]);return rows[0]||null;}
async function list(eventId,user){const [[event]]=await pool.execute(`SELECT organizer_id FROM events WHERE event_id=?`,[eventId]);if(!event)return {code:"NOT_FOUND"};if(user.role==='ORGANIZER'&&Number(event.organizer_id)!==Number(user.userId))return {code:"FORBIDDEN"};const [rows]=await pool.execute(`SELECT s.*,u.username,u.full_name FROM surveys s JOIN users u ON u.user_id=s.user_id WHERE s.event_id=? ORDER BY s.submitted_at DESC`,[eventId]);return {code:"OK",rows};}
module.exports={submit,mine,list};
