export const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000/api";

export async function api(path, { method="GET", body, token, signal }={}) {
    const headers={Accept:"application/json"};
    if(body!==undefined) headers["Content-Type"]="application/json";
    if(token) headers.Authorization=`Bearer ${token}`;
    let response;
    try {
        response=await fetch(`${API_BASE}${path}`,{method,headers,body:body===undefined?undefined:JSON.stringify(body),signal});
    } catch(error) {
        const e=new Error("Không kết nối được Backend. Hãy kiểm tra http://localhost:3000/api/health."); e.cause=error; throw e;
    }
    const data=await response.json().catch(()=>({}));
    if(!response.ok){const e=new Error(data.message||`HTTP ${response.status}`);e.status=response.status;e.data=data;throw e;}
    return data;
}

export const login=body=>api("/auth/login",{method:"POST",body});
export const register=body=>api("/auth/register",{method:"POST",body});
export const events=token=>api("/events",{token});
export const eventTypes=token=>api("/events/types",{token});
export const eventDetail=(id,token)=>api(`/events/${id}`,{token});
export const createEvent=(body,token)=>api("/events",{method:"POST",body,token});
export const submitEvent=(id,token)=>api(`/events/${id}/submit`,{method:"POST",token});
export const approveEvent=(id,token)=>api(`/events/${id}/approve`,{method:"POST",token});
export const rejectEvent=(id,reason,token)=>api(`/events/${id}/reject`,{method:"POST",body:{reason},token});
export const publishEvent=(id,token)=>api(`/events/${id}/publish`,{method:"POST",token});
export const registerEvent=(id,token)=>api(`/events/${id}/register`,{method:"POST",token});
export const myRegistration=(id,token)=>api(`/events/${id}/my-registration`,{token});
export const cancelRegistration=(id,token)=>api(`/events/${id}/register`,{method:"DELETE",token});
export const registrations=(id,token)=>api(`/events/${id}/registrations`,{token});
export const checkin=(id,code,method,token)=>api(`/events/${id}/attendance/checkin`,{method:"POST",body:{code,method},token});
export const myAttendance=(id,token)=>api(`/events/${id}/attendance/my`,{token});
export const attendances=(id,token)=>api(`/events/${id}/attendance`,{token});
export const manualCheckin=(id,user_id,token)=>api(`/events/${id}/attendance/manual`,{method:"POST",body:{user_id:Number(user_id)},token});
export const submitSurvey=(id,rating,comment,token)=>api(`/events/${id}/survey`,{method:"POST",body:{rating:Number(rating),comment},token});
export const mySurvey=(id,token)=>api(`/events/${id}/survey/my`,{token});
export const surveys=(id,token)=>api(`/events/${id}/surveys`,{token});
export const dashboard=(role,token)=>api(`/dashboard/${role==="USER"?"user":role==="ORGANIZER"?"organizer":"admin"}`,{token});
