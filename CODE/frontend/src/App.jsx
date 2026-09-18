import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Link,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
  useSearchParams
} from "react-router-dom";
import QRCode from "qrcode";
import { Html5Qrcode } from "html5-qrcode";
import * as api from "./api";

const SESSION_KEY = "tttn_session";
const normalizeSession = (s) => {
  if (!s) return null;
  const user = s.user || {};
  const role = user.role || user.role_name || s.role || s.role_name;
  if (!role) return null;
  return { ...s, user: { ...user, role } };
};
const getSession = () => { try { return normalizeSession(JSON.parse(localStorage.getItem(SESSION_KEY) || "null")); } catch { return null; } };
const saveSession = s => localStorage.setItem(SESSION_KEY, JSON.stringify(normalizeSession(s)));
const fmt = v => v ? new Date(v).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }) : "-";
const unwrap = r => r?.data;

function Alert({ children, type = "error" }) { return <div className={`alert ${type}`}>{children}</div>; }
function Badge({ value }) { return <span className={`badge ${String(value || "").toLowerCase()}`}>{value || "-"}</span>; }
function Button({ children, className = "primary", ...props }) { return <button className={className} {...props}>{children}</button>; }

function useAuth() {
  const [session, setSession] = useState(getSession());
  const login = s => { const normalized = normalizeSession(s); if (!normalized) throw new Error("Thông tin quyền đăng nhập không hợp lệ. Vui lòng đăng nhập lại."); saveSession(normalized); setSession(normalized); };
  const logout = () => { localStorage.removeItem(SESSION_KEY); setSession(null); };
  return { session, login, logout };
}
function Protected({ session, roles, children }) {
  if (!session) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(session.user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}
function Layout({ session, logout, children }) {
  const role = session.user.role;
  return <div className="app">
    <header className="topbar">
      <Link to="/dashboard" className="brand">TTTN_MIS_04</Link>
      <nav>
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/events">Event</Link>
        {role === "USER" && <Link to="/my-registrations">Đăng ký của tôi</Link>}
        {role === "ORGANIZER" && <Link to="/events/create">+ Tạo Event</Link>}
        {role === "ADMINISTRATOR" && <Link to="/events?status=PENDING_APPROVAL">Chờ duyệt</Link>}
      </nav>
      <div className="account"><div><b>{session.user.full_name}</b><small>{role}</small></div><Button className="ghost" onClick={logout}>Đăng xuất</Button></div>
    </header>
    <main className="container">{children}</main>
  </div>;
}
function AuthShell({ children }) { return <div className="auth-page"><div className="auth-hero"><div className="logo">M</div><div className="eyebrow">TTTN_MIS_04</div><h1>Quản lý khóa học<br />và sự kiện nội bộ</h1><p>DRAFT → phê duyệt → công bố → đăng ký → WAITLIST FIFO → Check-in → Survey.</p></div>{children}</div>; }

function Login({ onLogin }) {
  const nav = useNavigate();
  const [username, setUsername] = useState("user01"), [password, setPassword] = useState("123456"), [error, setError] = useState(""), [loading, setLoading] = useState(false);
  async function submit(e) { e.preventDefault(); setError(""); setLoading(true); try { const r = await api.login({ username, password }); onLogin(r.data); nav("/dashboard"); } catch (e) { setError(e.message); } finally { setLoading(false); } }
  return <AuthShell><form className="card auth-card" onSubmit={submit}><h2>Đăng nhập</h2><p className="muted">Demo: user01 / organizer01 / admin01 — mật khẩu 123456</p><label>Username<input value={username} onChange={e => setUsername(e.target.value)} required /></label><label>Mật khẩu<input type="password" value={password} onChange={e => setPassword(e.target.value)} required /></label>{error && <Alert>{error}</Alert>}<Button className="primary wide" disabled={loading}>{loading ? "Đang đăng nhập..." : "ĐĂNG NHẬP"}</Button><p className="center">Chưa có tài khoản? <Link to="/register">Đăng ký User</Link></p></form></AuthShell>;
}
function Register() {
  const nav = useNavigate();
  const [f, setF] = useState({ full_name: "", username: "", email: "", phone: "", password: "", confirm: "" }), [error, setError] = useState(""), [ok, setOk] = useState(""), [loading, setLoading] = useState(false);
  const change = e => setF(v => ({ ...v, [e.target.name]: e.target.value }));
  async function submit(e) { e.preventDefault(); setError(""); setOk(""); if (f.password !== f.confirm) return setError("Mật khẩu xác nhận không khớp"); setLoading(true); try { await api.register({ full_name: f.full_name, username: f.username, email: f.email, phone: f.phone, password: f.password }); setOk("Đăng ký thành công. Đang chuyển về đăng nhập..."); setTimeout(() => nav("/login"), 800); } catch (e) { setError(e.message); } finally { setLoading(false); } }
  return <AuthShell><form className="card auth-card wide-card" onSubmit={submit}><h2>Đăng ký tài khoản User</h2><p className="muted">Tài khoản mới tự động có quyền USER.</p><div className="grid2"><label>Họ và tên<input name="full_name" value={f.full_name} onChange={change} required /></label><label>Username<input name="username" value={f.username} onChange={change} required /></label><label>Email<input type="email" name="email" value={f.email} onChange={change} required /></label><label>Số điện thoại<input name="phone" value={f.phone} onChange={change} /></label><label>Mật khẩu<input type="password" name="password" value={f.password} onChange={change} required /></label><label>Xác nhận<input type="password" name="confirm" value={f.confirm} onChange={change} required /></label></div>{error && <Alert>{error}</Alert>}{ok && <Alert type="success">{ok}</Alert>}<Button className="primary wide" disabled={loading}>{loading ? "Đang tạo..." : "ĐĂNG KÝ"}</Button><Button type="button" className="ghost wide" onClick={() => nav("/login")}>← Quay lại</Button></form></AuthShell>;
}

function Stat({ label, value, hint }) { return <div className="stat"><span>{label}</span><strong>{value ?? 0}</strong>{hint && <small>{hint}</small>}</div>; }
function Dashboard({ session, logout }) {
  const [d, setD] = useState({}), [error, setError] = useState("");
  const role = session.user.role;
  async function load() { try { const r = await api.dashboard(role, session.accessToken); setD(unwrap(r) || {}); setError(""); } catch (e) { setError(e.message); } }
  useEffect(() => { load(); }, [role, session.accessToken]);
  const cards = role === "USER" ? [
    ["Đăng ký", d.total_registrations], ["REGISTERED", d.active_registered], ["WAITLIST", d.waitlist_count], ["Đã tham dự", d.attended_count], ["Rating TB", d.avg_rating]
  ] : role === "ORGANIZER" ? [
    ["Tổng Event", d.total_events], ["Chờ duyệt", d.pending_events], ["Published", d.published_events], ["Đăng ký", d.registered_count], ["Đã tham dự", d.attended_count], ["Rating TB", d.avg_rating]
  ] : [
    ["User", d.total_users], ["Event", d.total_events], ["Chờ duyệt", d.pending_events], ["Published", d.published_events], ["Đăng ký", d.registered_count], ["WAITLIST", d.waitlist_count], ["Attendance", d.attended_count], ["Rating TB", d.avg_rating]
  ];
  return <Layout session={session} logout={logout}><div className="page-head"><div><div className="eyebrow dark">DASHBOARD</div><h1>{role === "ADMINISTRATOR" ? "Quản trị hệ thống" : `Xin chào, ${session.user.full_name}`}</h1><p className="muted">Thao tác theo đúng quyền {role}.</p></div><Link className="primary btn" to="/events">Quản lý Event →</Link></div>{error && <Alert>{error}</Alert>}<div className="stats">{cards.map(([l,v]) => <Stat key={l} label={l} value={v} />)}</div>
    {role === "ADMINISTRATOR" && <section className="card admin-guide"><h2>Trung tâm phê duyệt</h2><p className="muted">Chọn Event có trạng thái <b>PENDING_APPROVAL</b> để Approve hoặc Reject. Sau khi Approve, Admin có thể Publish.</p><Link className="primary btn" to="/events">Mở danh sách Event</Link></section>}
    {role === "ORGANIZER" && <section className="card admin-guide"><h2>Quản lý Event của tôi</h2><p className="muted">Tạo Event → DRAFT → Gửi chờ phê duyệt → theo dõi trạng thái → xem đăng ký, Attendance và Survey.</p><Link className="primary btn" to="/events/create">+ Tạo Event mới</Link></section>}
    {role === "USER" && <section className="card admin-guide"><h2>Luồng User</h2><p className="muted">Đăng ký trực tiếp trên app. Nếu còn chỗ sẽ REGISTERED và hiển thị QR; nếu đầy sẽ vào WAITLIST FIFO. Khi được promotion, trạng thái tự chuyển sang REGISTERED.</p><Link className="primary btn" to="/events">Xem Event đang mở</Link></section>}
  </Layout>;
}

function Events({ session, logout }) {
  const [searchParams] = useSearchParams();

  const queryStatus = searchParams.get("status") || "ALL";

  const [list, setList] = useState([]);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState(queryStatus);

  const role = session.user.role;

  // Khi chuyển giữa /events và /events?status=PENDING_APPROVAL
  // thì cập nhật bộ lọc theo URL
  useEffect(() => {
    setStatus(queryStatus);
  }, [queryStatus]);

  async function load() {
    try {
      const r = await api.events(session.accessToken);
      const data = unwrap(r);
      setList(Array.isArray(data) ? data : []);
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    load();
  }, [session.accessToken]);

  const isAdminPending =
    role === "ADMINISTRATOR" &&
    queryStatus === "PENDING_APPROVAL";

  const filtered = useMemo(() => {
    return list.filter(
      e =>
        (!q ||
          `${e.title} ${e.description || ""} ${e.type_name || ""}`
            .toLowerCase()
            .includes(q.toLowerCase())) &&
        (status === "ALL" || e.status === status)
    );
  }, [list, q, status]);

  // Trang Chờ duyệt chỉ cho phép xem PENDING_APPROVAL
  const statuses = isAdminPending
    ? ["PENDING_APPROVAL"]
    : role === "USER"
      ? ["ALL", "PUBLISHED"]
      : [
          "ALL",
          "DRAFT",
          "PENDING_APPROVAL",
          "APPROVED",
          "PUBLISHED",
          "REJECTED",
          "CLOSED",
          "CANCELLED"
        ];

  return (
    <Layout session={session} logout={logout}>
      <div className="page-head">
        <div>
          <div className="eyebrow dark">
            {isAdminPending ? "PENDING APPROVAL" : "EVENT MANAGEMENT"}
          </div>

          <h1>
            {role === "USER"
              ? "Event đang mở đăng ký"
              : role === "ORGANIZER"
                ? "Event của tôi"
                : isAdminPending
                  ? "Event chờ duyệt"
                  : "Tất cả Event"}
          </h1>

          <p className="muted">
            {isAdminPending
              ? "Danh sách Event đang chờ Administrator phê duyệt."
              : role === "ADMINISTRATOR"
                ? "Quản lý toàn bộ Event trong hệ thống."
                : ""}
          </p>
        </div>

        {role === "ORGANIZER" && (
          <Link
            className="primary btn"
            to="/events/create"
          >
            + Tạo Event
          </Link>
        )}
      </div>

      {isAdminPending && (
        <section className="card admin-guide">
          <h2>⏳ Event chờ phê duyệt</h2>
          <p className="muted">
            Chỉ các Event có trạng thái{" "}
            <b>PENDING_APPROVAL</b> được hiển thị ở đây.
          </p>
        </section>
      )}

      {error && <Alert>{error}</Alert>}

      <section className="card filters">
        <input
          placeholder="Tìm Event..."
          value={q}
          onChange={e => setQ(e.target.value)}
        />

        {!isAdminPending && (
          <select
            value={status}
            onChange={e => setStatus(e.target.value)}
          >
            {statuses.map(s => (
              <option key={s} value={s}>
                {s === "ALL"
                  ? "Tất cả trạng thái"
                  : s}
              </option>
            ))}
          </select>
        )}

        {isAdminPending && (
          <div className="pending-filter">
            <Badge value="PENDING_APPROVAL" />
          </div>
        )}
      </section>

      <div className="cards">
        {filtered.map(e => (
          <EventCard
            key={e.event_id}
            event={e}
            role={role}
          />
        ))}

        {!filtered.length && !error && (
          <div className="empty card">
            {isAdminPending
              ? "Hiện không có Event nào đang chờ duyệt."
              : "Chưa có Event phù hợp."}
          </div>
        )}
      </div>
    </Layout>
  );
}
function EventCard({ event, role }) { return <article className="card event-card"><div className="row between"><span className="eyebrow">{event.type_name}</span><Badge value={event.status} /></div><h2>{event.title}</h2><p>{event.description || "Không có mô tả."}</p><div className="meta"><span>📍 {event.location || "Chưa cập nhật"}</span><span>🕒 {fmt(event.start_time)}</span><span>👥 Quota: {event.quota}</span></div><div className="row between"><small>Organizer: {event.organizer_name || "-"}</small><Link className="btn ghost" to={`/events/${event.event_id}`}>Chi tiết →</Link></div></article>; }

function CreateEvent({ session, logout }) {
  const nav = useNavigate(); const [types,setTypes]=useState([]), [f,setF]=useState({event_type_id:"1",title:"",description:"",location:"",start_time:"",end_time:"",registration_deadline:"",quota:2,checkin_start:"",checkin_end:""}), [error,setError]=useState(""),[loading,setLoading]=useState(false);
  useEffect(()=>{api.eventTypes(session.accessToken).then(r=>setTypes(unwrap(r)||[])).catch(e=>setError(e.message))},[session.accessToken]);
  const change=e=>setF(v=>({...v,[e.target.name]:e.target.value}));
  async function submit(e){e.preventDefault();setError("");setLoading(true);try{const body={...f,event_type_id:Number(f.event_type_id),quota:Number(f.quota),start_time:f.start_time.replace("T"," "),end_time:f.end_time.replace("T"," "),registration_deadline:f.registration_deadline.replace("T"," "),checkin_start:f.checkin_start?f.checkin_start.replace("T"," "):null,checkin_end:f.checkin_end?f.checkin_end.replace("T"," "):null};const r=await api.createEvent(body,session.accessToken);nav(`/events/${r.eventId||r.data?.eventId}`)}catch(e){setError(e.message)}finally{setLoading(false)}}
  return <Layout session={session} logout={logout}><div className="page-head"><div><div className="eyebrow dark">CREATE EVENT</div><h1>Tạo Event mới</h1></div><Link className="ghost btn" to="/events">← Danh sách</Link></div><form className="card form-card" onSubmit={submit}><div className="grid2"><label>Loại Event<select name="event_type_id" value={f.event_type_id} onChange={change}>{types.map(t=><option key={t.event_type_id} value={t.event_type_id}>{t.type_name}</option>)}</select></label><label>Quota<input type="number" min="1" name="quota" value={f.quota} onChange={change} required/></label></div><label>Tiêu đề<input name="title" value={f.title} onChange={change} required/></label><label>Mô tả<textarea name="description" value={f.description} onChange={change} rows="4"/></label><div className="grid2"><label>Địa điểm<input name="location" value={f.location} onChange={change}/></label><label>Hạn đăng ký<input type="datetime-local" name="registration_deadline" value={f.registration_deadline} onChange={change} required/></label><label>Bắt đầu<input type="datetime-local" name="start_time" value={f.start_time} onChange={change} required/></label><label>Kết thúc<input type="datetime-local" name="end_time" value={f.end_time} onChange={change} required/></label><label>Check-in bắt đầu<input type="datetime-local" name="checkin_start" value={f.checkin_start} onChange={change}/></label><label>Check-in kết thúc<input type="datetime-local" name="checkin_end" value={f.checkin_end} onChange={change}/></label></div>{error&&<Alert>{error}</Alert>}<div className="row gap"><Button disabled={loading}>{loading?"Đang tạo...":"Tạo Event"}</Button><Link className="ghost btn" to="/events">Hủy</Link></div></form></Layout>;
}

function EventDetail({ session, logout }) {
  const {id}=useParams(); const role=session.user.role; const [event,setEvent]=useState(null),[reg,setReg]=useState(null),[attendance,setAttendance]=useState(null),[survey,setSurvey]=useState(null),[error,setError]=useState(""),[message,setMessage]=useState(""),[loading,setLoading]=useState(true);
  async function load(){setLoading(true);try{const r=await api.eventDetail(id,session.accessToken);setEvent(unwrap(r));if(role==="USER"){const [rr,aa,ss]=await Promise.all([api.myRegistration(id,session.accessToken).catch(()=>null),api.myAttendance(id,session.accessToken).catch(()=>null),api.mySurvey(id,session.accessToken).catch(()=>null)]);setReg(unwrap(rr)||null);setAttendance(unwrap(aa)||null);setSurvey(unwrap(ss)||null)}setError("")}catch(e){setError(e.message)}finally{setLoading(false)}}
  useEffect(()=>{load()},[id,session.accessToken,role]);
  async function action(fn,msg){try{setError("");setMessage("");await fn();setMessage(msg);await load()}catch(e){setError(e.message)}}
  if(loading&&!event)return <Layout session={session} logout={logout}><div className="card">Đang tải Event...</div></Layout>;
  if(error&&!event)return <Layout session={session} logout={logout}><Alert>{error}</Alert><Link className="ghost btn" to="/events">← Quay lại</Link></Layout>;
  if(!event)return null;
  const registered = reg && reg.status !== "CANCELLED";
  return <Layout session={session} logout={logout}><div className="page-head"><div><div className="eyebrow dark">EVENT #{event.event_id}</div><h1>{event.title}</h1><Badge value={event.status}/></div><Link className="ghost btn" to="/events">← Event</Link></div>{message&&<Alert type="success">{message}</Alert>}{error&&<Alert>{error}</Alert>}
    <div className="detail-grid"><section className="card"><h2>Thông tin Event</h2><dl><dt>Loại</dt><dd>{event.type_name}</dd><dt>Organizer</dt><dd>{event.organizer_name||"-"}</dd><dt>Địa điểm</dt><dd>{event.location||"-"}</dd><dt>Bắt đầu</dt><dd>{fmt(event.start_time)}</dd><dt>Kết thúc</dt><dd>{fmt(event.end_time)}</dd><dt>Hạn đăng ký</dt><dd>{fmt(event.registration_deadline)}</dd><dt>Quota</dt><dd>{event.quota}</dd>{role!=="USER"&&<><dt>Check-in code</dt><dd><code>{event.checkin_code||"Chưa có"}</code></dd><dt>Check-in</dt><dd>{fmt(event.checkin_start)} → {fmt(event.checkin_end)}</dd>{event.rejection_reason&&<><dt>Lý do từ chối</dt><dd>{event.rejection_reason}</dd></>}</>}</dl></section>
      <section className="card actions"><h2>{role==="USER"?"Đăng ký":"Thao tác"}</h2>
        {role==="USER"&&event.status==="PUBLISHED"&&(!registered ? <Button className="primary wide" onClick={()=>action(()=>api.registerEvent(id,session.accessToken),"Đăng ký thành công")}>Đăng ký Event</Button> : <><Alert type={reg.status==="WAITLIST"?"info":"success"}>{reg.status==="WAITLIST"?`Bạn đang WAITLIST #${reg.waitlist_position}`:"Bạn đã REGISTERED"}</Alert>{reg.status==="REGISTERED"&&<QRCard event={event}/>}<Button className="danger wide" onClick={()=>action(()=>api.cancelRegistration(id,session.accessToken),"Hủy đăng ký thành công")}>Hủy đăng ký</Button></>)}
        {role==="ORGANIZER"&&<><Workflow status={event.status} onSubmit={()=>action(()=>api.submitEvent(id,session.accessToken),"Đã gửi chờ phê duyệt")}/>{event.status==="PUBLISHED"&&event.checkin_code&&<QRCard event={event}/>}<Link className="ghost btn wide" to={`/events/${id}/registrations`}>👥 Danh sách đăng ký</Link><Link className="ghost btn wide" to={`/events/${id}/attendance`}>✓ Attendance</Link><Link className="ghost btn wide" to={`/events/${id}/surveys`}>★ Survey</Link></>}
        {role==="ADMINISTRATOR"&&<><AdminActions event={event} token={session.accessToken} action={action}/>{event.status==="PUBLISHED"&&event.checkin_code&&<QRCard event={event}/>}<Link className="ghost btn wide" to={`/events/${id}/registrations`}>👥 Danh sách đăng ký</Link><Link className="ghost btn wide" to={`/events/${id}/attendance`}>✓ Attendance</Link><Link className="ghost btn wide" to={`/events/${id}/surveys`}>★ Survey</Link></>}
        {role==="USER"&&event.status!=="PUBLISHED"&&<Alert type="info">Event chưa mở đăng ký.</Alert>}
      </section></div>
    {role==="USER"&&event.status==="PUBLISHED"&&registered&&<div className="detail-grid"><CheckinBox event={event} session={session} attendance={attendance} onDone={load}/><SurveyBox event={event} session={session} attendance={attendance} survey={survey} onDone={load}/></div>}
  </Layout>;
}
function Workflow({status,onSubmit}){return status==="DRAFT"?<Button className="primary wide" onClick={onSubmit}>Gửi chờ phê duyệt</Button>:<Alert type="info">Event đang ở trạng thái <b>{status}</b>.</Alert>}
function AdminActions({event,token,action}){return <>{event.status==="PENDING_APPROVAL"&&<><Button className="primary wide" onClick={()=>action(()=>api.approveEvent(event.event_id,token),"Event đã được phê duyệt")}>Approve</Button><Button className="danger wide" onClick={()=>{const reason=prompt("Nhập lý do từ chối:");if(reason?.trim())action(()=>api.rejectEvent(event.event_id,reason,token),"Event đã bị từ chối");}}>Reject</Button></>}{event.status==="APPROVED"&&<Button className="primary wide" onClick={()=>action(()=>api.publishEvent(event.event_id,token),"Event đã Publish")}>Publish</Button>}</>}

function QRCard({event}){
  const [qr,setQr]=useState("");
  useEffect(()=>{
    let active=true;
    if(event.checkin_code){
      QRCode.toDataURL(event.checkin_code,{width:280,margin:2})
        .then(data=>{if(active)setQr(data)})
        .catch(()=>{if(active)setQr("")});
    } else setQr("");
    return ()=>{active=false};
  },[event.checkin_code]);
  return <div className="qr-card">
    <h3>🎟 QR Check-in</h3>
    <p className="muted">Mã QR chứa mã check-in của Event. Có thể mở QR này trên màn hình khác để User quét bằng camera.</p>
    {qr?<img className="qr" src={qr} alt="QR Check-in"/>:<div className="qr-placeholder">Backend chưa cấp check-in code.</div>}
    <div className="code-box">Mã: <b>{event.checkin_code||"-"}</b></div>
  </div>
}

function QRScanner({onScan,onClose}){
  const scannerRef=useRef(null);
  const elementId=useRef(`qr-reader-${Math.random().toString(36).slice(2)}`);
  const [error,setError]=useState("");
  const [starting,setStarting]=useState(true);

  useEffect(()=>{
    let scanner=null;
    let stopped=false;
    let stream=null;
    let timer=null;

    const friendlyCameraError=(e)=>{
      const name=e?.name||"";
      if(!window.isSecureContext){
        return "Camera trên iPhone cần HTTPS. Hãy mở frontend bằng địa chỉ https://IP_LAPTOP:5173 và cho phép Camera.";
      }
      if(name==="NotAllowedError"||name==="PermissionDeniedError") return "Camera bị từ chối. Hãy vào Cài đặt iPhone → Cốc Cốc → Camera và bật quyền, sau đó tải lại trang.";
      if(name==="NotFoundError"||name==="DevicesNotFoundError") return "Không tìm thấy camera trên thiết bị.";
      if(name==="NotReadableError"||name==="TrackStartError") return "Camera đang được ứng dụng khác sử dụng. Hãy đóng ứng dụng camera hoặc tab khác rồi thử lại.";
      if(name==="OverconstrainedError") return "Không chọn được camera sau. Hãy thử lại hoặc dùng camera mặc định.";
      return `Không thể mở camera${e?.message?`: ${e.message}`:". Hãy kiểm tra quyền Camera và HTTPS."}`;
    };

    async function start(){
      try{
        setError("");
        setStarting(true);
        if(!window.isSecureContext){
          throw new Error("INSECURE_CONTEXT");
        }
        if(!navigator.mediaDevices?.getUserMedia){
          throw new Error("Trình duyệt không hỗ trợ Camera API.");
        }

        // Xin quyền camera trước. Cách này ổn định hơn trên iPhone/iOS
        // so với việc truyền trực tiếp {facingMode:"environment"} cho scanner.
        stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"}},audio:false});
        stream.getTracks().forEach(t=>t.stop());
        stream=null;
        if(stopped)return;

        const devices=await navigator.mediaDevices.enumerateDevices();
        const cameras=devices.filter(d=>d.kind==="videoinput");
        if(!cameras.length) throw new Error("Không tìm thấy camera.");

        const rear=cameras.find(d=>/back|rear|environment|sau|wide/i.test(d.label));
        const cameraId=(rear||cameras[0]).deviceId;

        scanner=new Html5Qrcode(elementId.current);
        scannerRef.current=scanner;

        const startPromise=scanner.start(
          {deviceId:{exact:cameraId}},
          {fps:10,qrbox:{width:250,height:250},aspectRatio:1.0},
          async decodedText=>{
            if(stopped)return;
            stopped=true;
            setStarting(false);
            onScan(String(decodedText||"").trim());
            try{await scanner.stop();}catch{}
            try{await scanner.clear();}catch{}
          },
          ()=>{}
        );

        timer=setTimeout(()=>{
          if(!stopped){
            setStarting(false);
            setError("Camera mở quá lâu nhưng chưa hoạt động. Hãy kiểm tra quyền Camera của Cốc Cốc và thử lại.");
          }
        },12000);

        await startPromise;
        if(timer)clearTimeout(timer);
        if(!stopped)setStarting(false);
      }catch(e){
        if(timer)clearTimeout(timer);
        if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;}
        if(!stopped){
          setStarting(false);
          setError(e?.message==="INSECURE_CONTEXT" ? "Camera trên iPhone cần HTTPS. Hãy mở frontend bằng địa chỉ https://IP_LAPTOP:5173." : friendlyCameraError(e));
        }
      }
    }

    start();
    return ()=>{
      stopped=true;
      if(timer)clearTimeout(timer);
      if(stream)stream.getTracks().forEach(t=>t.stop());
      const s=scannerRef.current;
      if(s){
        s.stop().catch(()=>{}).finally(()=>s.clear().catch(()=>{}));
      }
    };
  },[onScan]);

  return <div className="scanner-panel">
    <div className="row between scanner-head"><b>📷 Quét QR bằng camera</b><Button type="button" className="ghost" onClick={onClose}>Đóng</Button></div>
    {starting&&!error&&<p className="muted">Đang mở camera...</p>}
    <div id={elementId.current} className="qr-reader"></div>
    {error&&<Alert>{error}</Alert>}
    {!error&&!starting&&<p className="muted scanner-help">Đưa mã QR của Event vào khung quét. Sau khi đọc được mã, hệ thống sẽ tự điền mã Check-in.</p>}
    {error&&<p className="muted scanner-help">Nếu đang dùng iPhone, hãy mở trang bằng HTTPS và cho phép Camera cho Cốc Cốc.</p>}
  </div>
}

function CheckinBox({event,session,attendance,onDone}){
  const [code,setCode]=useState("");
  const [method,setMethod]=useState("QR");
  const [error,setError]=useState("");
  const [ok,setOk]=useState("");
  const [scanning,setScanning]=useState(false);
  const scanCallback=useMemo(()=>code=>{setCode(code.trim());setMethod("QR");setScanning(false);setError("");setOk("Đã quét QR. Hãy bấm Xác nhận Check-in.")},[]);
  async function submit(e){
    e.preventDefault();setError("");setOk("");
    try{
      if(!code.trim())throw new Error("Vui lòng nhập hoặc quét mã Check-in.");
      await api.checkin(event.event_id,code.trim(),method,session.accessToken);
      setOk("Check-in thành công");
      await onDone();
    }catch(e){setError(e.message)}
  }
  return <section className="card">
    <h2>✓ Check-in</h2>
    {attendance?<Alert type="success">Đã Check-in lúc {fmt(attendance.checkin_time)} — {attendance.method}</Alert>:<><p className="muted">User có thể quét QR Event bằng camera hoặc nhập mã thủ công.</p>
      {scanning&&<QRScanner onScan={scanCallback} onClose={()=>setScanning(false)}/>}
      <form onSubmit={submit}>
        <label>Mã Check-in<input value={code} onChange={e=>setCode(e.target.value.toUpperCase())} placeholder="Ví dụ: A83F12BC" required/></label>
        <div className="row gap scanner-actions"><Button type="button" className="ghost" onClick={()=>{setError("");setOk("");setScanning(true)}}>📷 Quét QR</Button><span className="muted">hoặc nhập mã bên trên</span></div>
        <label>Phương thức<select value={method} onChange={e=>setMethod(e.target.value)}><option value="QR">QR</option><option value="CODE">CODE</option></select></label>
        {error&&<Alert>{error}</Alert>}{ok&&<Alert type="success">{ok}</Alert>}
        <Button className="primary wide">Xác nhận Check-in</Button>
      </form>
    </>}
  </section>
}
function SurveyBox({event,session,attendance,survey,onDone}){const [rating,setRating]=useState(5),[comment,setComment]=useState(""),[error,setError]=useState(""),[ok,setOk]=useState("");async function submit(e){e.preventDefault();setError("");try{await api.submitSurvey(event.event_id,rating,comment,session.accessToken);setOk("Gửi khảo sát thành công");await onDone()}catch(e){setError(e.message)}}return <section className="card"><h2>★ Khảo sát</h2>{survey?<Alert type="success">Bạn đã đánh giá <b>{survey.rating}/5</b>{survey.comment?` — ${survey.comment}`:""}</Alert>:!attendance?<Alert type="info">Bạn cần Check-in trước khi làm khảo sát.</Alert>:<form onSubmit={submit}><label>Đánh giá<select value={rating} onChange={e=>setRating(Number(e.target.value))}>{[1,2,3,4,5].map(x=><option key={x} value={x}>{x}/5</option>)}</select></label><label>Nhận xét<textarea value={comment} onChange={e=>setComment(e.target.value)} rows="5" placeholder="Nhập nhận xét..." /></label>{error&&<Alert>{error}</Alert>}{ok&&<Alert type="success">{ok}</Alert>}<Button className="primary wide">Gửi khảo sát</Button></form>}</section>}

function MyRegistrations({session,logout}){const [rows,setRows]=useState([]);useEffect(()=>{api.events(session.accessToken).then(async r=>{const ev=unwrap(r)||[];const data=await Promise.all(ev.map(async e=>{try{const x=await api.myRegistration(e.event_id,session.accessToken);return x?.data?{...x.data,title:e.title}:null}catch{return null}}));setRows(data.filter(Boolean))}).catch(()=>{})},[session.accessToken]);return <Layout session={session} logout={logout}><div className="page-head"><div><div className="eyebrow dark">MY REGISTRATIONS</div><h1>Đăng ký của tôi</h1></div></div><div className="cards">{rows.map(r=><div className="card event-card" key={r.registration_id}><div className="row between"><h2>{r.title}</h2><Badge value={r.status}/></div><p>{r.status==="WAITLIST"?`Vị trí WAITLIST: #${r.waitlist_position}`:`Đăng ký: ${fmt(r.registered_at)}`}</p><Link className="btn ghost" to={`/events/${r.event_id}`}>Mở Event →</Link></div>)}{!rows.length&&<div className="empty card">Bạn chưa có đăng ký.</div>}</div></Layout>}

function ManageList({session,logout,type}) {
  const {id}=useParams();
  const [rows,setRows]=useState([]),[error,setError]=useState(""),[event,setEvent]=useState(null);

  async function load(){
    try{
      const er=await api.eventDetail(id,session.accessToken);
      setEvent(unwrap(er));
      const r=type==="reg"
        ? await api.registrations(id,session.accessToken)
        : type==="att"
          ? await api.attendances(id,session.accessToken)
          : await api.surveys(id,session.accessToken);
      const data=unwrap(r);
      setRows(Array.isArray(data)?data:[]);
    }catch(e){setError(e.message)}
  }

  useEffect(()=>{load()},[id,session.accessToken,type]);
  const title=type==="reg"?"Danh sách đăng ký":type==="att"?"Attendance":"Survey";

  return (
    <Layout session={session} logout={logout}>
      <div className="page-head">
        <div>
          <div className="eyebrow dark">EVENT #{id}</div>
          <h1>{title}</h1>
          <p className="muted">{event?.title||""}</p>
        </div>
        <Link className="ghost btn" to={`/events/${id}`}>← Event</Link>
      </div>

      {error&&<Alert>{error}</Alert>}

      <div className="table-wrap card">
        <table>
          <thead>
            <tr>
              {type==="reg" ? (
                <><th>User</th><th>Email</th><th>Status</th><th>Position</th><th>Registered</th></>
              ) : type==="att" ? (
                <><th>User</th><th>Method</th><th>Status</th><th>Time</th></>
              ) : (
                <><th>User</th><th>Rating</th><th>Comment</th><th>Submitted</th></>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((r,i)=>(
              <tr key={r.registration_id||r.attendance_id||r.survey_id||i}>
                {type==="reg" ? (
                  <>
                    <td>{r.username} - {r.full_name}</td>
                    <td>{r.email}</td>
                    <td><Badge value={r.status}/></td>
                    <td>{r.waitlist_position??"-"}</td>
                    <td>{fmt(r.registered_at)}</td>
                  </>
                ) : type==="att" ? (
                  <>
                    <td>{r.username} - {r.full_name}</td>
                    <td>{r.method}</td>
                    <td>{r.status}</td>
                    <td>{fmt(r.checkin_time)}</td>
                  </>
                ) : (
                  <>
                    <td>{r.username} - {r.full_name}</td>
                    <td>{r.rating}/5</td>
                    <td>{r.comment||"-"}</td>
                    <td>{fmt(r.submitted_at)}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length&&<div className="empty">Chưa có dữ liệu.</div>}
      </div>
    </Layout>
  );
}

function AdminPending({session,logout}){return <Events session={session} logout={logout}/>}

function App(){const {session,login,logout}=useAuth();return <Routes><Route path="/login" element={session?<Navigate to="/dashboard" replace/>:<Login onLogin={login}/>}/><Route path="/register" element={<Register/>}/><Route path="/dashboard" element={<Protected session={session}><Dashboard session={session} logout={logout}/></Protected>}/><Route path="/events" element={<Protected session={session}><Events session={session} logout={logout}/></Protected>}/><Route path="/events/create" element={<Protected session={session} roles={["ORGANIZER"]}><CreateEvent session={session} logout={logout}/></Protected>}/><Route path="/events/:id" element={<Protected session={session}><EventDetail session={session} logout={logout}/></Protected>}/><Route path="/events/:id/registrations" element={<Protected session={session} roles={["ORGANIZER","ADMINISTRATOR"]}><ManageList session={session} logout={logout} type="reg"/></Protected>}/><Route path="/events/:id/attendance" element={<Protected session={session} roles={["ORGANIZER","ADMINISTRATOR"]}><ManageList session={session} logout={logout} type="att"/></Protected>}/><Route path="/events/:id/surveys" element={<Protected session={session} roles={["ORGANIZER","ADMINISTRATOR"]}><ManageList session={session} logout={logout} type="survey"/></Protected>}/><Route path="/my-registrations" element={<Protected session={session} roles={["USER"]}><MyRegistrations session={session} logout={logout}/></Protected>}/><Route path="*" element={<Navigate to={session?"/dashboard":"/login"} replace/>}/></Routes>}
export default App;
