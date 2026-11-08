import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Select from "../components/Select";
import Icon from "../components/Icons";
import {
  adminGetUsers, adminCreateUser, adminUpdateUser, adminDeleteUser, adminGetUserHistory, HistoryEntry,
  adminGetRequests, adminDecideRequest, AccessRequest
} from "../api/client";

interface UserRow { id: number; email: string; name: string; role: string; is_active: boolean; created_at: string; total_predictions: number; }

const when = (iso: string) => new Date(iso.includes("T") || iso.includes("Z") ? iso : iso.replace(" ", "T")).getTime();
const ago = (iso: string) => {
  const s = Math.max(0, (Date.now() - when(iso)) / 1000);
  if (s < 90) return "just now";
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  if (s < 30 * 86400) return `${Math.round(s / 86400)}d ago`;
  return new Date(when(iso)).toLocaleDateString();
};

export default function UserManagement() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [menu, setMenu] = useState<number | null>(null);
  const [sure, setSure] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [view, setView] = useState<{ user: UserRow; entries: HistoryEntry[] } | null>(null);
  const [form, setForm] = useState({ email: "", name: "", password: "", role: "user" });
  const [addError, setAddError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const fetchUsers = async () => { try { setUsers(await adminGetUsers()); } catch { /* keep list */ } finally { setLoading(false); } };
  const fetchRequests = () => adminGetRequests().then(setRequests).catch(() => {});
  useEffect(() => { fetchUsers(); fetchRequests(); }, []);

  useEffect(() => {
    const off = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) { setMenu(null); setSure(null); } };
    document.addEventListener("mousedown", off);
    return () => document.removeEventListener("mousedown", off);
  }, []);
  useEffect(() => {
    if (!view && !adding) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { setView(null); setAdding(false); } };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [view, adding]);

  const decide = async (r: AccessRequest, action: "approve" | "reject") => {
    setRequests(rs => rs.filter(x => x.id !== r.id));
    await adminDecideRequest(r.id, action); fetchRequests(); fetchUsers();
  };
  const toggle = async (u: UserRow) => { setMenu(null); await adminUpdateUser(u.id, { is_active: !u.is_active }); fetchUsers(); };
  const remove = async (u: UserRow) => {
    if (sure !== u.id) { setSure(u.id); return; }
    setMenu(null); setSure(null); await adminDeleteUser(u.id); fetchUsers();
  };
  const open = async (u: UserRow) => { setMenu(null); setView({ user: u, entries: await adminGetUserHistory(u.id) }); };

  const create = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setAddError(null);
    try {
      await adminCreateUser(form); setAdding(false); setForm({ email: "", name: "", password: "", role: "user" }); fetchUsers();
    } catch (err: any) { setAddError(err?.response?.data?.detail || "Could not create the account."); }
    finally { setBusy(false); }
  };

  return (
    <div className="peoplepage">
      <header className="phead"><h1 className="one"><span>Who's </span><em>in.</em></h1></header>

      <section className="tile inbox">
        <h2>Waiting <small className={requests.length ? "hot" : ""}>{requests.length}</small></h2>
        <div className="inlist">
          {requests.length === 0 && (
            <div className="clear"><i><Icon name="check" size={30} /></i><b>All clear</b><p>New requests show up here, and also reach you by email.</p></div>
          )}
          <AnimatePresence initial={false}>
            {requests.map(r => (
              <motion.article key={r.id} className="req" layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 40 }} transition={{ duration: 0.25 }}>
                <div className="rtop"><i>{r.name.slice(0, 1).toUpperCase()}</i><div><b>{r.name}</b><small>{r.email}</small></div><em>{ago(r.created_at)}</em></div>
                {r.reason && <p>“{r.reason}”</p>}
                <div className="rbtn"><button className="btn main sm" onClick={() => decide(r, "approve")}>Approve</button><button className="btn warn sm" onClick={() => decide(r, "reject")}>Reject</button></div>
              </motion.article>
            ))}
          </AnimatePresence>
        </div>
      </section>

      <section className="tile roster">
        <h2>Everyone <small>{users.length}</small><button className="btn main sm" onClick={() => setAdding(true)}>Add a person</button></h2>
        <div className="rolist" ref={menuRef}>
          {loading && <p className="note">Loading…</p>}
          {users.map(u => (
            <div key={u.id} className={"person" + (u.is_active ? "" : " off")}>
              <i className={u.role}>{u.name.slice(0, 1).toUpperCase()}</i>
              <div className="who2"><b>{u.name}</b><small>{u.email}</small></div>
              <span className={"v " + (u.role === "admin" ? "review" : "mute")}>{u.role}</span>
              <span className="sc"><b>{u.total_predictions}</b> scans</span>
              <span className={"dot " + (u.is_active ? "on" : "")} title={u.is_active ? "Active" : "Turned off"} />
              <div className="pm">
                <button className="dots" aria-label={`Actions for ${u.name}`} aria-expanded={menu === u.id} onClick={() => { setMenu(menu === u.id ? null : u.id); setSure(null); }}>⋯</button>
                {menu === u.id && (
                  <div className="pmenu" role="menu">
                    <button role="menuitem" onClick={() => open(u)}>See scans</button>
                    {u.role !== "admin" && <>
                      <button role="menuitem" onClick={() => toggle(u)}>{u.is_active ? "Turn off" : "Turn on"}</button>
                      <button role="menuitem" className="bad" onClick={() => remove(u)}>{sure === u.id ? "Tap again to delete" : "Delete"}</button>
                    </>}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <AnimatePresence>
        {(adding || view) && <motion.div key="s" className="botscrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setAdding(false); setView(null); }} />}
        {adding && (
          <motion.aside key="a" className="botdrawer dtl" role="dialog" aria-label="Add a person" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}>
            <header><div><b>Add a person</b><small>They can sign in right away</small></div><button className="x" onClick={() => setAdding(false)}>Close</button></header>
            <form className="addform" onSubmit={create}>
              <div className="f"><label htmlFor="pn">Name</label><input id="pn" placeholder="Priya N" autoComplete="off" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required /></div>
              <div className="f"><label htmlFor="pe">Email</label><input id="pe" type="email" placeholder="priya@fab.example" autoComplete="off" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required /></div>
              <div className="f"><label htmlFor="pp">Password</label><input id="pp" type="password" placeholder="Pick a strong one" autoComplete="new-password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required /></div>
              <div className="f"><label>Role</label>
                <Select label="Role" value={form.role} onChange={(v: string) => setForm(p => ({ ...p, role: v }))} options={[{ value: "user", label: "User", sub: "Scans and sees their own history" }, { value: "admin", label: "Admin", sub: "Also approves people" }]} />
              </div>
              {addError && <p className="err" role="alert">{addError}</p>}
              <button className="btn main block" disabled={busy}>{busy ? "Creating…" : "Create account"}</button>
            </form>
          </motion.aside>
        )}
        {view && (
          <motion.aside key="v" className="botdrawer dtl" role="dialog" aria-label={`${view.user.name} scans`} initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}>
            <header><div><b>{view.user.name}</b><small>{view.user.email}</small></div><button className="x" onClick={() => setView(null)}>Close</button></header>
            <div className="vlist">
              {view.entries.length === 0 && <p className="note" style={{ textAlign: "center", padding: 32 }}>No scans yet.</p>}
              {view.entries.map(e => (
                <div key={e.id} className="vrow"><div><b>{e.wafer_id}</b><small>{e.defect_type} · {ago(e.timestamp)}</small></div><span className="vy">{e.yield_pct}%</span><span className={"v " + e.decision.toLowerCase()}>{e.decision}</span></div>
              ))}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
