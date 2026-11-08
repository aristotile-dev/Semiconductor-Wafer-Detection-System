import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Select from "../components/Select";
import DieMap from "../components/DieMap";
import { getMyHistory, adminGetUsers, adminGetUserHistory, HistoryEntry } from "../api/client";
import type { User } from "../api/client";

type Filter = "ALL" | "SAVE" | "REVIEW" | "SCRAP";
const PAGE = 48;

const ago = (iso: string) => {
  const t = new Date(iso.includes("T") || iso.includes("Z") ? iso : iso.replace(" ", "T")).getTime();
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 90) return "just now";
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  if (s < 7 * 86400) return `${Math.round(s / 86400)}d ago`;
  return new Date(t).toLocaleDateString();
};

export default function History() {
  const raw = localStorage.getItem("wafer_user");
  const me: User | null = raw ? JSON.parse(raw) : null;
  const isAdmin = me?.role === "admin";

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [users, setUsers] = useState<{ id: number; name: string; email: string }[]>([]);
  const [uid, setUid] = useState<number | null>(null);
  const [uname, setUname] = useState("");
  const [loading, setLoading] = useState(true);
  const [verdict, setVerdict] = useState<Filter>("ALL");
  const [pat, setPat] = useState("ALL");
  const [limit, setLimit] = useState(PAGE);
  const [open, setOpen] = useState<HistoryEntry | null>(null);

  useEffect(() => {
    if (isAdmin) adminGetUsers().then((d: any[]) => setUsers(d.map(u => ({ id: u.id, name: u.name, email: u.email })))).catch(() => {});
  }, [isAdmin]);

  useEffect(() => {
    setLoading(true); setVerdict("ALL"); setPat("ALL"); setLimit(PAGE);
    if (isAdmin && uid !== null) adminGetUserHistory(uid).then(setHistory).catch(() => {}).finally(() => setLoading(false));
    else if (!isAdmin) getMyHistory().then(setHistory).catch(() => {}).finally(() => setLoading(false));
    else { setHistory([]); setLoading(false); }
  }, [isAdmin, uid]);

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(null); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open]);

  const newest = useMemo(() => [...history].sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1)), [history]);
  const counts = useMemo(() => ({
    ALL: history.length,
    SAVE: history.filter(h => h.decision === "SAVE").length,
    REVIEW: history.filter(h => h.decision === "REVIEW").length,
    SCRAP: history.filter(h => h.decision === "SCRAP").length
  }), [history]);
  const patterns = useMemo(() => {
    const m: Record<string, number> = {}; history.forEach(h => { m[h.defect_type] = (m[h.defect_type] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [history]);

  const shown = newest.filter(h => (verdict === "ALL" || h.decision === verdict) && (pat === "ALL" || h.defect_type === pat));

  const csv = () => {
    if (!shown.length) return;
    const rows = shown.map(h => [h.timestamp, h.wafer_id, h.defect_type, h.confidence.toFixed(1), h.yield_pct, h.decision].join(","));
    const blob = new Blob([["Timestamp,Wafer ID,Defect,Confidence (%),Yield (%),Decision", ...rows].join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `wafer_history${uname ? "_" + uname.split(" ")[0] : ""}.csv`; a.click(); URL.revokeObjectURL(a.href);
  };

  const people = isAdmin && (
    <div className="hsel"><Select label="Person" value={uid} placeholder="Choose a person" options={users.map(u => ({ value: u.id, label: u.name, sub: u.email }))}
      onChange={(id: number) => { const u = users.find(x => x.id === id); setUid(id); setUname(u ? `${u.name} (${u.email})` : ""); }} /></div>
  );

  const chips: Filter[] = ["ALL", "SAVE", "REVIEW", "SCRAP"];

  return (
    <div className="histpage">
      <header className="hhead">
        <h1 className="one"><span>Rewind </span><em>scans.</em></h1>
        <div className="hright">
          {people}
          {history.length > 0 && <button className="btn" onClick={csv}>Export {shown.length === history.length ? "all" : shown.length} to CSV</button>}
        </div>
      </header>

      {history.length > 0 && (
        <div className="hbar">
          <div className="hchips" role="group" aria-label="Filter by verdict">
            {chips.map(c => (
              <button key={c} className={"hc " + c.toLowerCase() + (verdict === c ? " on" : "")} aria-pressed={verdict === c} onClick={() => { setVerdict(c); setLimit(PAGE); }}>
                {c === "ALL" ? "All" : c}<b>{counts[c]}</b>
              </button>
            ))}
          </div>
          <div className="hsel pat">
            <Select label="Pattern" value={pat} onChange={(v: string) => { setPat(v); setLimit(PAGE); }}
              options={[{ value: "ALL", label: "All patterns", sub: `${history.length} scans` }, ...patterns.map(([n, c]) => ({ value: n, label: n, sub: `${c} scans` }))]} />
          </div>
        </div>
      )}

      {loading && <p className="note">Loading…</p>}

      {!loading && history.length === 0 && (
        <div className="empty hempty"><div>
          <b>{isAdmin && !uid ? "Pick a person" : "No scans yet"}</b>
          <p>{isAdmin && !uid ? "Choose someone above to see their wafers." : "Scan a wafer and it lands here as a tile."}</p>
          {!isAdmin && <Link className="btn main" to="/app">Scan a wafer</Link>}
        </div></div>
      )}

      {!loading && history.length > 0 && (
        <>
          <div className="sheet">
            {shown.slice(0, limit).map(h => {
              const k = h.decision.toLowerCase();
              return (
                <button key={h.id} className={"ct " + k} onClick={() => setOpen(h)} aria-label={`${h.wafer_id}, ${h.defect_type}, ${h.yield_pct}% yield, ${h.decision}`}>
                  <span className="ctring"><DieMap name={h.defect_type} className="ctmap" /></span>
                  <b className="cty">{h.yield_pct}<sup>%</sup></b>
                  <i className={"v " + k}>{h.decision}</i>
                  <span className="ctp">{h.defect_type}</span>
                  <small className="ctw">{h.wafer_id} · {ago(h.timestamp)}</small>
                </button>
              );
            })}
          </div>
          {shown.length === 0 && <p className="note" style={{ marginTop: 16 }}>Nothing matches that filter.</p>}
          {shown.length > limit && <div className="more"><button className="btn" onClick={() => setLimit(l => l + PAGE)}>Show {Math.min(PAGE, shown.length - limit)} more</button></div>}
        </>
      )}

      <AnimatePresence>
        {open && (
          <>
            <motion.div key="s" className="botscrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(null)} />
            <motion.aside key="d" className="botdrawer dtl" role="dialog" aria-label={`${open.wafer_id} details`}
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}>
              <header>
                <div><b>{open.wafer_id}</b><small>{new Date(open.timestamp.includes("T") ? open.timestamp : open.timestamp.replace(" ", "T")).toLocaleString()}</small></div>
                <button className="x" onClick={() => setOpen(null)}>Close</button>
              </header>
              <div className="dbody">
                <div className={"dmap " + open.decision.toLowerCase()}><span className="ctring"><DieMap name={open.defect_type} className="ctmap" /></span></div>
                <div className="dyield"><b className={open.decision.toLowerCase()}>{open.yield_pct}<sup>%</sup></b><i className={"v " + open.decision.toLowerCase()}>{open.decision}</i></div>
                <div className="dgrid">
                  <div><span>Pattern</span><b>{open.defect_type}</b></div>
                  <div><span>Confidence</span><b>{open.confidence.toFixed(1)}%</b></div>
                  <div><span>Dies affected</span><b>{(open.defect_ratio * 100).toFixed(1)}%</b></div>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
