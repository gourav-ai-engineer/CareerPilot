import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Activity, ArrowDownRight, ArrowUpRight, Bell, BriefcaseBusiness, CalendarDays,
  Check, ChevronDown, CircleHelp, Command, ExternalLink, Filter, LayoutDashboard,
  LogOut, MoreHorizontal, Plus, Search, Settings2, Sparkles, Target, Trash2,
  TrendingUp, X
} from "lucide-react";

type Status = "Wishlist" | "Applied" | "OA" | "Interview" | "Offer" | "Rejected";
type Application = {
  id: number; company: string; role: string; url?: string | null;
  status: Status; applied_on?: string | null; notes?: string | null; updated_at?: string;
};
type User = { id: number; email: string };
type AuthResponse = { access_token: string; user: User };
const API = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
const statuses: Status[] = ["Wishlist", "Applied", "OA", "Interview", "Offer", "Rejected"];
const colors: Record<Status, string> = {
  Wishlist: "slate", Applied: "blue", OA: "violet", Interview: "amber", Offer: "green", Rejected: "rose"
};
const demo: Application[] = [
  { id: -1, company: "Google", role: "Software Engineer, University Graduate", status: "Interview", applied_on: "2026-10-10", url: "https://careers.google.com" },
  { id: -2, company: "Microsoft", role: "Software Engineer — Early Careers", status: "OA", applied_on: "2026-10-12" },
  { id: -3, company: "NVIDIA", role: "Hardware Engineering Intern", status: "Applied", applied_on: "2026-10-15" },
  { id: -4, company: "Atlassian", role: "Graduate Software Engineer", status: "Wishlist", applied_on: "2026-10-16" },
  { id: -5, company: "Amazon", role: "SDE I — New Grad", status: "Applied", applied_on: "2026-10-08" },
  { id: -6, company: "AUMOVIO", role: "AI / ML Research Intern", status: "Offer", applied_on: "2026-10-02" },
  { id: -7, company: "Adobe", role: "Machine Learning Engineer", status: "Rejected", applied_on: "2026-09-28" }
];

async function api<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...init.headers }
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail ?? `Request failed (${response.status})`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function initials(company: string) {
  return company.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}
function formatDate(value?: string | null) {
  if (!value) return "Not set";
  return new Date(value + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem("careerpilot_token") ?? "");
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("careerpilot_user");
    return saved ? JSON.parse(saved) as User : null;
  });
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [applications, setApplications] = useState<Application[]>(demo);
  const [usingDemo, setUsingDemo] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"All" | Status>("All");
  const [modal, setModal] = useState(false);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState({ company: "", role: "", url: "", status: "Wishlist" as Status, applied_on: "", notes: "" });

  useEffect(() => {
    if (!token) return;
    api<Application[]>("/applications", token)
      .then((rows) => { setApplications(rows); setUsingDemo(false); })
      .catch((error: Error) => setNotice(`API connection: ${error.message}. Showing demo data until the API is available.`));
  }, [token]);

  const visible = useMemo(() => applications.filter((item) => {
    const matchesQuery = `${item.company} ${item.role}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (filter === "All" || item.status === filter);
  }), [applications, query, filter]);

  const total = applications.length;
  const active = applications.filter((item) => !["Offer", "Rejected"].includes(item.status)).length;
  const interviews = applications.filter((item) => item.status === "Interview").length;
  const responseCount = applications.filter((item) => ["OA", "Interview", "Offer", "Rejected"].includes(item.status)).length;
  const responseRate = total ? Math.round(responseCount / total * 100) : 0;

  async function authenticate(event: FormEvent) {
    event.preventDefault(); setBusy(true); setNotice("");
    try {
      const result = await fetch(`${API}/auth/${authMode === "register" ? "register" : "login"}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const body = await result.json();
      if (!result.ok) throw new Error(body.detail ?? "Could not authenticate");
      const data = body as AuthResponse;
      localStorage.setItem("careerpilot_token", data.access_token);
      localStorage.setItem("careerpilot_user", JSON.stringify(data.user));
      setToken(data.access_token); setUser(data.user); setNotice("You're signed in.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Something went wrong");
    } finally { setBusy(false); }
  }

  async function saveApplication(event: FormEvent) {
    event.preventDefault();
    if (!draft.company.trim() || !draft.role.trim()) return;
    const payload = { ...draft, url: draft.url || null, applied_on: draft.applied_on || null, notes: draft.notes || null };
    if (token && !usingDemo) {
      try {
        const created = await api<Application>("/applications", token, { method: "POST", body: JSON.stringify(payload) });
        setApplications((old) => [created, ...old]);
      } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to save"); return; }
    } else {
      setApplications((old) => [{ ...payload, id: Date.now() }, ...old]);
    }
    setModal(false); setDraft({ company: "", role: "", url: "", status: "Wishlist", applied_on: "", notes: "" });
    setNotice(usingDemo ? "Added to this demo session. Sign in to persist applications." : "Application saved.");
  }

  async function moveApplication(item: Application, status: Status) {
    if (item.status === status) return;
    if (token && !usingDemo && item.id > 0) {
      try {
        const updated = await api<Application>(`/applications/${item.id}`, token, { method: "PATCH", body: JSON.stringify({ status }) });
        setApplications((old) => old.map((row) => row.id === item.id ? updated : row));
      } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to update"); }
    } else setApplications((old) => old.map((row) => row.id === item.id ? { ...row, status } : row));
  }

  async function removeApplication(item: Application) {
    if (token && !usingDemo && item.id > 0) {
      try { await api<void>(`/applications/${item.id}`, token, { method: "DELETE" }); }
      catch (error) { setNotice(error instanceof Error ? error.message : "Unable to delete"); return; }
    }
    setApplications((old) => old.filter((row) => row.id !== item.id));
  }

  function logout() {
    localStorage.removeItem("careerpilot_token"); localStorage.removeItem("careerpilot_user");
    setToken(""); setUser(null); setApplications(demo); setUsingDemo(true);
  }

  if (!token) return <div className="auth-screen">
    <div className="auth-art"><div className="brand"><span className="brand-mark"><Command size={20}/></span> careerpilot</div>
      <div className="art-copy"><span className="eyebrow"><Sparkles size={14}/> YOUR NEXT CHAPTER STARTS HERE</span>
        <h1>Make your next<br/>move <em>count.</em></h1><p>One calm place to manage every application, prepare for every interview, and stay on top of your career.</p>
        <div className="art-stats"><div><strong>One board</strong><span>Every opportunity</span></div><div><strong>Zero guesswork</strong><span>Know your next step</span></div></div>
      </div><div className="art-footer">BUILT FOR THE AMBITION IN YOU <span>✳</span></div>
    </div>
    <div className="auth-panel"><div className="auth-mobile-brand"><span className="brand-mark"><Command size={18}/></span> careerpilot</div>
      <form className="auth-form" onSubmit={authenticate}><span className="eyebrow">WELCOME {authMode === "login" ? "BACK" : "ABOARD"}</span>
        <h2>{authMode === "login" ? "Good to see you." : "Create your space."}</h2><p>{authMode === "login" ? "Pick up where your career journey left off." : "A more organized job search starts here."}</p>
        <label>Email address<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"/></label>
        <label>Password<input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters"/></label>
        {notice && <div className="notice">{notice}</div>}<button className="primary-button full" disabled={busy}>{busy ? "Please wait…" : authMode === "login" ? "Sign in" : "Create account"} <ArrowUpRight size={16}/></button>
        <div className="auth-switch">{authMode === "login" ? "New to CareerPilot?" : "Already have an account?"} <button type="button" onClick={() => {setAuthMode(authMode === "login" ? "register" : "login"); setNotice("");}}>{authMode === "login" ? "Create an account" : "Sign in"}</button></div>
        <div className="auth-privacy"><Check size={14}/> Your job search is personal. Your data stays yours.</div>
      </form><div className="auth-bottom">© 2026 CAREERPILOT <span>MADE FOR YOUR NEXT CHAPTER</span></div>
    </div>
  </div>;

  return <div className="app-shell">
    <aside className="sidebar"><div className="brand"><span className="brand-mark"><Command size={19}/></span> careerpilot</div>
      <div className="workspace-label">WORKSPACE <ChevronDown size={13}/></div><div className="workspace"><div className="workspace-avatar">G</div><div><strong>My job search</strong><small>Personal workspace</small></div><MoreHorizontal size={17}/></div>
      <div className="nav-label">MENU</div><button className="nav-item active"><LayoutDashboard size={17}/> Overview <span className="nav-dot"/></button><button className="nav-item" onClick={() => setFilter("All")}><BriefcaseBusiness size={17}/> Applications <span className="nav-count">{total}</span></button><button className="nav-item" onClick={() => setNotice("Follow-up reminders are coming in the next milestone.")}><Bell size={17}/> Follow-ups <span className="nav-badge">Soon</span></button>
      <div className="sidebar-bottom"><div className="sidebar-tip"><div className="tip-icon"><Sparkles size={16}/></div><strong>A little progress adds up.</strong><p>Every application is a step closer to the right opportunity.</p><div className="tip-progress"><span style={{width: `${Math.min(total * 5,100)}%`}}/></div><small>{total} opportunities in your orbit</small></div>
        <button className="nav-item" onClick={() => setNotice("Settings will be added in a future milestone.")}><Settings2 size={17}/> Settings</button><button className="nav-item" onClick={() => setNotice("Help center is coming soon.")}><CircleHelp size={17}/> Help & support</button>
        <div className="profile"><div className="profile-avatar">{initials(user?.email ?? "Gourav")}</div><div className="profile-info"><strong>{user?.email.split("@")[0] ?? "CareerPilot user"}</strong><small>{user?.email ?? "Demo workspace"}</small></div><button className="icon-button" title="Sign out" onClick={logout}><LogOut size={16}/></button></div>
      </div>
    </aside>
    <main className="main-content"><header className="topbar"><div className="breadcrumbs">Workspace <span>/</span> <strong>Overview</strong></div><div className="top-actions"><span className="today"><CalendarDays size={15}/> {new Date().toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short"})}</span><button className="icon-button notification" title="Notifications" onClick={() => setNotice("You're all caught up.")}><Bell size={17}/><i/></button><div className="top-avatar">{initials(user?.email ?? "Gourav")}</div></div></header>
      <div className="page-content"><div className="welcome-row"><div><div className="eyebrow">SATURDAY, OCTOBER 17, 2026 <span className="sun">✳</span></div><h1>Your career, <em>in motion.</em></h1><p>Small steps today. Big opportunities tomorrow.</p></div><button className="primary-button" onClick={() => setModal(true)}><Plus size={17}/> Add application</button></div>
        {notice && <div className="notice-banner"><span>{notice}</span><button onClick={() => setNotice("")}><X size={15}/></button></div>}
        {usingDemo && <div className="demo-banner"><Sparkles size={16}/><span><strong>Preview mode</strong> — you're exploring sample data. Sign in to connect your account and save changes.</span><button onClick={() => setNotice("Create an account or sign in using the form after signing out.")}>How it works <ArrowUpRight size={14}/></button></div>}
        <section className="stats-grid">
          <article className="stat-card"><div className="stat-top"><span>Total applications</span><span className="stat-icon blue"><BriefcaseBusiness size={17}/></span></div><div className="stat-value">{total}<span className="stat-trend positive"><TrendingUp size={13}/> tracked</span></div><div className="stat-foot">Across your entire job search</div><div className="sparkline blue-line"><span/><span/><span/><span/><span/><span/><span/><span/><span/><span/></div></article>
          <article className="stat-card"><div className="stat-top"><span>Response rate</span><span className="stat-icon violet"><Activity size={17}/></span></div><div className="stat-value">{responseRate}<small>%</small><span className="stat-trend"><ArrowUpRight size={13}/> funnel</span></div><div className="stat-foot">Applications with a known outcome</div><div className="mini-bar"><span style={{width:`${responseRate}%`}}/></div></article>
          <article className="stat-card"><div className="stat-top"><span>In progress</span><span className="stat-icon amber"><Target size={17}/></span></div><div className="stat-value">{active}<span className="stat-trend neutral">active</span></div><div className="stat-foot">Opportunities still in play</div><div className="stage-dots"><i/><i/><i/><i/><i/></div></article>
          <article className="stat-card"><div className="stat-top"><span>Interviews</span><span className="stat-icon green"><CalendarDays size={17}/></span></div><div className="stat-value">{interviews}<span className="stat-trend positive"><ArrowUpRight size={13}/> focus</span></div><div className="stat-foot">Make every conversation count</div><div className="interview-footer"><span>Keep the momentum</span><Sparkles size={14}/></div></article>
        </section>
        <section className="board-section"><div className="section-heading"><div><h2>Application board <span>{visible.length}</span></h2><p>Move opportunities forward as your journey unfolds.</p></div><div className="board-tools"><label className="search-box"><Search size={15}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search companies..."/><kbd>⌘ K</kbd></label><select className="filter-select" value={filter} onChange={(e) => setFilter(e.target.value as "All" | Status)} aria-label="Filter by status"><option value="All">All statuses</option>{statuses.map((status) => <option key={status}>{status}</option>)}</select><button className="icon-button filter-button" title="Filters" onClick={() => setFilter(filter === "All" ? "Applied" : "All")}><Filter size={16}/></button></div></div>
          <div className="kanban-board">{statuses.map((status) => {
            const rows = visible.filter((item) => item.status === status);
            return <section className="kanban-column" key={status} onDragOver={(event) => event.preventDefault()} onDrop={(event) => {const id=Number(event.dataTransfer.getData("text/plain"));const item=applications.find((row)=>row.id===id);if(item) void moveApplication(item,status);}}>
              <div className="column-heading"><span className={`status-dot ${colors[status]}`}/><strong>{status}</strong><span className="column-count">{rows.length}</span><button className="column-more" title={`Add to ${status}`} onClick={() => {setDraft((old)=>({...old,status}));setModal(true);}}><Plus size={15}/></button></div>
              <div className="column-cards">{rows.map((item) => <article className="application-card" key={item.id} draggable onDragStart={(event) => event.dataTransfer.setData("text/plain",String(item.id))}>
                <div className="card-top"><div className={`company-logo logo-${colors[item.status]}`}>{initials(item.company)}</div><button className="card-more" title="Delete application" onClick={() => void removeApplication(item)}><Trash2 size={14}/></button></div>
                <h3>{item.company}</h3><p className="role-title">{item.role}</p><div className="card-divider"/>
                <div className="card-meta"><span><CalendarDays size={13}/>{formatDate(item.applied_on)}</span>{item.url && <a href={item.url} target="_blank" rel="noreferrer" title="Open job link"><ExternalLink size={13}/></a>}</div>
                <div className="card-bottom"><span className={`status-pill ${colors[item.status]}`}>{item.status === "OA" ? "Assessment" : item.status}</span><select aria-label={`Move ${item.company}`} value={item.status} onChange={(event) => void moveApplication(item,event.target.value as Status)}><option value={item.status}>Move to…</option>{statuses.filter((s)=>s!==item.status).map((s)=><option key={s} value={s}>{s}</option>)}</select></div>
              </article>)}
              {rows.length===0 && <div className="empty-column"><span><Plus size={16}/></span><p>Drop an application here</p></div>}
              {status === "Wishlist" && <button className="add-card" onClick={() => {setDraft((old)=>({...old,status}));setModal(true);}}><Plus size={15}/> Add opportunity</button>}
            </div></section>;
          })}</div>
          <div className="board-footer"><span><span className="live-dot"/> All changes are up to date</span><span>Drag cards or use the status menu to update progress</span></div>
        </section>
        <footer className="page-footer"><span>© 2026 CareerPilot</span><span>YOUR NEXT CHAPTER, ORGANIZED <span className="footer-star">✳</span></span></footer>
      </div>
    </main>
    {modal && <div className="modal-backdrop" onMouseDown={(event) => {if(event.target===event.currentTarget)setModal(false);}}><form className="application-modal" onSubmit={saveApplication}><div className="modal-heading"><div><span className="eyebrow">NEW OPPORTUNITY</span><h2>Add an application</h2><p>Every great next step starts somewhere.</p></div><button type="button" className="icon-button" onClick={() => setModal(false)}><X size={18}/></button></div>
      <label>Company name *<input autoFocus required maxLength={160} value={draft.company} onChange={(e)=>setDraft({...draft,company:e.target.value})} placeholder="e.g. Microsoft"/></label>
      <label>Role / position *<input required maxLength={160} value={draft.role} onChange={(e)=>setDraft({...draft,role:e.target.value})} placeholder="e.g. Software Engineer"/></label>
      <div className="form-row"><label>Status<select value={draft.status} onChange={(e)=>setDraft({...draft,status:e.target.value as Status})}>{statuses.map((s)=><option key={s}>{s}</option>)}</select></label><label>Date applied<input type="date" value={draft.applied_on} onChange={(e)=>setDraft({...draft,applied_on:e.target.value})}/></label></div>
      <label>Job posting URL<input type="url" value={draft.url} onChange={(e)=>setDraft({...draft,url:e.target.value})} placeholder="https://careers.company.com/role"/></label>
      <label>Notes <textarea rows={3} value={draft.notes} onChange={(e)=>setDraft({...draft,notes:e.target.value})} placeholder="Recruiter contact, next steps, interview notes…"/></label>
      <div className="modal-actions"><button type="button" className="secondary-button" onClick={()=>setModal(false)}>Cancel</button><button className="primary-button"><Plus size={16}/> Save application</button></div>
    </form></div>}
  </div>;
}
