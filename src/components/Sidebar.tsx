import { NavLink, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { getMyHistory, HistoryEntry } from "../api/client";
import type { User } from "../api/client";
import { BrandMark } from "./Brand";
import "./Sidebar.css";

interface Props {
  waferId:  string;
  dieArea:  number;
  onWaferIdChange: (v: string) => void;
  onDieAreaChange: (v: number) => void;
  user:     User | null;
  onLogout: () => void;
}

export default function Sidebar({ waferId, dieArea, onWaferIdChange, onDieAreaChange, user, onLogout }: Props) {
  const [dbHistory, setDbHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    if (user) getMyHistory().then(setDbHistory).catch(() => {});
  }, [user]);

  const total    = dbHistory.length;
  const count    = (d: string) => dbHistory.filter(h => h.decision === d).length;
  const avgYield = total ? (dbHistory.reduce((s, h) => s + h.yield_pct, 0) / total).toFixed(1) : "0";

  const links = [
    { to: "/app",         label: "Scan",         glyph: "◎" },
    { to: "/app/batch",   label: "Batch",        glyph: "▦" },
    { to: "/app/draw",    label: "Draw a map",   glyph: "✎" },
    { to: "/app/yield",   label: "Yield curve",  glyph: "∿" },
    { to: "/app/history", label: "History",      glyph: "≡" },
    { to: "/app/reports", label: "Reports",      glyph: "▤" },
    ...(user?.role === "admin" ? [{ to: "/app/users", label: "People", glyph: "☺" }] : [])
  ];

  return (
    <aside className="sidebar">
      <Link to="/" className="sidebar-brand"><BrandMark />WAFERSCOPE</Link>

      <nav className="sidebar-nav">
        {links.map(l => (
          <NavLink key={l.to} to={l.to} end={l.to === "/app"} className="nav-link">
            <span className="nav-glyph" aria-hidden="true">{l.glyph}</span>
            <span>{l.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-section">
        <p className="section-label">Wafer settings</p>
        <div className="field">
          <label htmlFor="wid">Wafer ID</label>
          <input id="wid" type="text" value={waferId} onChange={e => onWaferIdChange(e.target.value)} />
        </div>
        <div className="field field-range">
          <label htmlFor="die">Die area (cm²) <span className="range-value">{dieArea.toFixed(1)}</span></label>
          <input id="die" type="range" min={0.1} max={2.0} step={0.1} value={dieArea}
            onChange={e => onDieAreaChange(parseFloat(e.target.value))} />
        </div>
      </div>

      <div className="sidebar-section">
        <p className="section-label">My stats</p>
        {total > 0 ? (
          <>
            <div className="pill"><span>Wafers</span><strong>{total}</strong></div>
            <div className="pill"><span>Average yield</span><strong>{avgYield}%</strong></div>
            <div className="pill"><span>Save</span><strong>{count("SAVE")}</strong></div>
            <div className="pill"><span>Review</span><strong>{count("REVIEW")}</strong></div>
            <div className="pill"><span>Scrap</span><strong>{count("SCRAP")}</strong></div>
          </>
        ) : (
          <p className="empty-sub">Nothing scanned yet.</p>
        )}
      </div>

      {user && (
        <div className="sidebar-user">
          <div className="who">
            <b>{user.name}</b>
            <span>{user.email}</span>
            <div className={"role-tag " + user.role}>{user.role}</div>
          </div>
          <button className="btn btn-ghost btn-block btn-sm" onClick={onLogout}>Sign out</button>
        </div>
      )}
    </aside>
  );
}
