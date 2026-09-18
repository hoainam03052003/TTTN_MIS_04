require("dotenv").config();
const bcrypt=require("bcryptjs");
const pool=require("./src/config/database");

const users=[
  ["user01","123456","User One","user01@example.com","0900000001","USER"],
  ["user02","123456","User Two","user02@example.com","0900000002","USER"],
  ["user03","123456","User Three","user03@example.com","0900000003","USER"],
  ["user04","123456","User Four","user04@example.com","0900000004","USER"],
  ["organizer01","123456","Organizer One","organizer01@example.com","0900000010","ORGANIZER"],
  ["admin01","123456","Administrator One","admin01@example.com","0900000020","ADMINISTRATOR"]
];
(async()=>{
  try{
    for(const [username,password,full_name,email,phone,role] of users){
      const [[r]]=await pool.execute(`SELECT role_id FROM roles WHERE role_name=?`,[role]);
      if(!r) throw new Error(`Role ${role} not found`);
      const hash=await bcrypt.hash(password,10);
      const [existing]=await pool.execute(`SELECT user_id FROM users WHERE username=?`,[username]);
      if(existing.length){
        await pool.execute(`UPDATE users SET password_hash=?,full_name=?,email=?,phone=?,role_id=?,status='ACTIVE' WHERE username=?`,[hash,full_name,email,phone,r.role_id,username]);
      }else{
        await pool.execute(`INSERT INTO users(username,password_hash,full_name,email,phone,role_id,status) VALUES(?,?,?,?,?,?, 'ACTIVE')`,[username,hash,full_name,email,phone,r.role_id]);
      }
    }
    console.log("Test users are ready. Password for all demo users: 123456");
  }catch(e){console.error(e);process.exitCode=1;}finally{await pool.end();}
})();
