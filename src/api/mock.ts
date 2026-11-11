/**
 * Local mock of the backend, switched on with `npm run dev:mock` (vite --mode mock).
 * It lets the whole access flow be tried without the Space: request access, approve, sign in, scan, admin.
 * State lives in localStorage so a reload keeps it. Nothing here ships to production builds.
 */
import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { PATTERN_NAMES, dieMap, murphy } from "../lib/patterns";

const KEY = "wafer_mock_db";

interface MUser { id: number; email: string; name: string; password: string; role: "admin" | "user"; is_active: boolean; created_at: string }
interface MReq { id: number; email: string; name: string; reason: string; created_at: string; status: "pending" | "approved" | "rejected" }
interface MHist { id: number; user_id: number; wafer_id: string; defect_type: string; confidence: number; yield_pct: number; decision: string; defect_ratio: number; timestamp: string }
interface DB { users: MUser[]; requests: MReq[]; history: MHist[]; seq: number }

const seed = (): DB => ({
  seq: 10,
  users: [
    { id: 1, email: "admin@waferscope.test", name: "Admin", password: "demo-admin", role: "admin", is_active: true, created_at: new Date().toISOString() },
    { id: 2, email: "demo@waferscope.test", name: "Demo User", password: "demo-user", role: "user", is_active: true, created_at: new Date().toISOString() }
  ],
  requests: [
    { id: 1, email: "priya@fab.example", name: "Priya N", reason: "Yield engineer, wants to test on our line data.", created_at: new Date(Date.now() - 3600e3).toISOString(), status: "pending" }
  ],
  history: []
});

const load = (): DB => { try { const r = localStorage.getItem(KEY); if (r) return JSON.parse(r); } catch { /* fall through */ } return seed(); };
const save = (db: DB) => localStorage.setItem(KEY, JSON.stringify(db));

const fail = (status: number, detail: string) => ({ status, data: { detail } });

function hashStr(s: string) { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }

/** Deterministic "prediction": the same file always gives the same result. */
function fakePredict(seedStr: string, dieArea: number) {
  const h = hashStr(seedStr);
  const fromName = PATTERN_NAMES.find(n => seedStr.toLowerCase().startsWith("sample-" + n.toLowerCase()));
  const name = fromName ?? PATTERN_NAMES[h % PATTERN_NAMES.length];
  const { ratio } = dieMap(name);
  const y = murphy(ratio, dieArea);
  const conf = 82 + (h % 170) / 10;
  const probs: Record<string, number> = {};
  let rest = 100 - conf;
  PATTERN_NAMES.filter(n => n !== name).forEach((n, i, a) => { const p = i === a.length - 1 ? rest : rest * 0.4; probs[n] = Math.round(p * 10) / 10; rest -= p; });
  probs[name] = Math.round(conf * 10) / 10;
  return {
    defect_type: name, confidence: Math.round(conf * 10) / 10, all_probs: probs,
    yield_pct: y, decision: y >= 70 ? "SAVE" : y >= 40 ? "REVIEW" : "SCRAP", defect_ratio: Math.round(ratio * 1000) / 1000, gradcam: null
  };
}

function token(u: MUser) { return "mock." + u.id; }
function authUser(db: DB, cfg: InternalAxiosRequestConfig): MUser | null {
  const h = String(cfg.headers?.Authorization ?? cfg.headers?.get?.("Authorization") ?? "");
  const m = h.match(/mock\.(\d+)/); return m ? db.users.find(u => u.id === +m[1]) ?? null : null;
}
const pub = (u: MUser) => ({ id: u.id, email: u.email, name: u.name, role: u.role });

function body(cfg: InternalAxiosRequestConfig): any {
  const d = cfg.data;
  if (typeof d === "string") { try { return JSON.parse(d); } catch { return Object.fromEntries(new URLSearchParams(d)); } }
  if (d instanceof URLSearchParams) return Object.fromEntries(d);
  return d ?? {};
}

function route(cfg: InternalAxiosRequestConfig): { status: number; data: any } {
  const db = load();
  const url = (cfg.url ?? "").replace(/\?.*$/, "");
  const method = (cfg.method ?? "get").toLowerCase();
  const me = authUser(db, cfg);
  const b = body(cfg);
  const need = () => (me ? null : fail(401, "Not signed in"));
  const needAdmin = () => (!me ? fail(401, "Not signed in") : me.role !== "admin" ? fail(403, "Admin only") : null);

  if (url === "/auth/login" && method === "post") {
    const u = db.users.find(x => x.email.toLowerCase() === String(b.username).toLowerCase());
    if (!u || u.password !== b.password) {
      const pend = db.requests.find(r => r.email.toLowerCase() === String(b.username).toLowerCase() && r.status === "pending");
      return fail(401, pend ? "Your request is still waiting for approval." : "Wrong email or password");
    }
    if (!u.is_active) return fail(403, "This account is disabled");
    return { status: 200, data: { access_token: token(u), user: pub(u) } };
  }
  if (url === "/auth/register" && method === "post") {
    const email = String(b.email ?? "").trim().toLowerCase();
    if (!email || !b.name) return fail(422, "Name and email are required");
    if (db.users.some(u => u.email === email)) return fail(409, "This email already has an account. Try signing in.");
    if (db.requests.some(r => r.email === email && r.status === "pending")) return fail(409, "A request for this email is already waiting.");
    db.requests.push({ id: ++db.seq, email, name: b.name, reason: b.reason ?? "", created_at: new Date().toISOString(), status: "pending" });
    save(db); return { status: 201, data: { status: "pending" } };
  }
  if (url === "/predict-guest" && method === "post") {
    const f = b instanceof FormData ? (b.get("file") as File | null) : null;
    return { status: 200, data: fakePredict(f ? f.name + f.size : "sample", 0.5) };
  }

  const bad = need(); if (bad) return bad;

  if (url === "/predict" && method === "post") {
    const f = b instanceof FormData ? (b.get("file") as File | null) : null;
    const area = b instanceof FormData ? parseFloat(String(b.get("die_area") ?? "0.5")) : 0.5;
    return { status: 200, data: fakePredict(f ? f.name + f.size : "x", area) };
  }
  if (url === "/predict-draw" && method === "post") return { status: 200, data: fakePredict(String(b.image_base64 ?? "").slice(-64), b.die_area ?? 0.5) };
  if (url === "/explain") return { status: 200, data: { explanation: `Step 1: Pattern\nThe model reads this as ${b.defect_type} with ${b.confidence}% confidence.\nStep 2: Likely cause\nThis signature usually points at a process step that acts on the whole wafer edge or a localised tool issue. Check the last equipment run on the lot.\nStep 3: Action\n${b.decision === "SAVE" ? "Ship it. Keep monitoring the lot." : b.decision === "REVIEW" ? "Hold for engineering review before shipping." : "Scrap the wafer and open a defect report."}\n(Mock analysis, not the real model.)` } };
  if (url === "/chat") return { status: 200, data: { reply: "This is the mock assistant. Connect the real backend to get live expert answers." } };
  if (url === "/yield-curve") {
    const pts = []; for (let a = 0.1; a <= 2.01; a += 0.1) pts.push({ die_area: Math.round(a * 10) / 10, yield_pct: murphy(b.defect_ratio, a) });
    return { status: 200, data: { points: pts } };
  }
  if (url === "/history/save") {
    db.history.push({ id: ++db.seq, user_id: me!.id, timestamp: new Date().toISOString(), ...b }); save(db); return { status: 200, data: { ok: true } };
  }
  if (url === "/history/me") return { status: 200, data: db.history.filter(h => h.user_id === me!.id).reverse() };

  if (url.startsWith("/admin")) {
    const a = needAdmin(); if (a) return a;
    if (url === "/admin/requests" && method === "get") return { status: 200, data: db.requests.filter(r => r.status === "pending") };
    const rq = url.match(/^\/admin\/requests\/(\d+)\/(approve|reject)$/);
    if (rq && method === "post") {
      const r = db.requests.find(x => x.id === +rq[1]); if (!r) return fail(404, "Request not found");
      r.status = rq[2] === "approve" ? "approved" : "rejected";
      if (r.status === "approved") db.users.push({ id: ++db.seq, email: r.email, name: r.name, password: "welcome-123", role: "user", is_active: true, created_at: new Date().toISOString() });
      save(db); return { status: 200, data: { status: r.status } };
    }
    if (url === "/admin/users" && method === "get") return { status: 200, data: db.users.map(u => ({ ...pub(u), is_active: u.is_active, created_at: u.created_at, total_predictions: db.history.filter(h => h.user_id === u.id).length })) };
    if (url === "/admin/users" && method === "post") {
      if (db.users.some(u => u.email === b.email)) return fail(409, "Email already exists");
      db.users.push({ id: ++db.seq, email: b.email, name: b.name, password: b.password, role: b.role, is_active: true, created_at: new Date().toISOString() }); save(db); return { status: 201, data: { ok: true } };
    }
    const um = url.match(/^\/admin\/users\/(\d+)(\/history)?$/);
    if (um) {
      const id = +um[1], u = db.users.find(x => x.id === id);
      if (um[2]) return { status: 200, data: db.history.filter(h => h.user_id === id).reverse() };
      if (!u) return fail(404, "User not found");
      if (method === "put") { Object.assign(u, b); save(db); return { status: 200, data: pub(u) }; }
      if (method === "delete") { db.users = db.users.filter(x => x.id !== id); save(db); return { status: 204, data: null }; }
    }
  }
  return fail(404, `Mock has no route for ${method.toUpperCase()} ${url}`);
}

export const mockAdapter: AxiosAdapter = (cfg) =>
  new Promise((resolve, reject) => {
    setTimeout(() => {
      const r = route(cfg as InternalAxiosRequestConfig);
      const res = { data: r.data, status: r.status, statusText: String(r.status), headers: {}, config: cfg, request: {} } as AxiosResponse;
      if (r.status >= 200 && r.status < 300) resolve(res);
      else reject(Object.assign(new Error("Request failed with status code " + r.status), { isAxiosError: true, response: res, config: cfg }));
    }, 450);
  });
