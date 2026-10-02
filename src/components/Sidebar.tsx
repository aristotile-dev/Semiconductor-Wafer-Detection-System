import { NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import { getMyHistory, HistoryEntry } from "../api/client";
import type { User } from "../api/client";
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
    if (user) {
      getMyHistory().then(setDbHistory).catch(() => {});
    }
  }, [user]);

  const total    = dbHistory.length;
  const saves    = dbHistory.filter(h => h.decision === "SAVE").length;
  const reviews  = dbHistory.filter(h => h.decision === "REVIEW").length;
  const scraps   = dbHistory.filter(h => h.decision === "SCRAP").length;
  const avgYield = total ? (dbHistory.reduce((s, h) => s + h.yield_pct, 0) / total).toFixed(2) : "0";

  const links = [
    { to: "/",        label: "Prediction",       icon: "🔍" },
    { to: "/batch",   label: "Batch Prediction",  icon: "📦" },
    { to: "/draw",    label: "Draw Mode",          icon: "🎨" },
    { to: "/yield",   label: "Yield Analysis",     icon: "📈" },
    { to: "/history", label: "History",            icon: "📋" },
    { to: "/reports", label: "Reports",            icon: "📊" },
    ...(user?.role === "admin" ? [{ to: "/users", label: "User Management", icon: "👥" }] : [])
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-icon">🔬</div>
        <div>
          <div className="brand-title">Wafer Defect System</div>
          <div className="brand-sub">EfficientNet-B3 · Murphy Yield</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {links.map(l => (
          <NavLink key={l.to} to={l.to} end={l.to === "/"} className="nav-link">
            <span className="nav-icon">{l.icon}</span>
            <span>{l.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-section">
        <p className="section-label">Wafer Config</p>
        <div className="field">
          <label>Wafer ID</label>
          <input type="text" value={waferId} onChange={e => onWaferIdChange(e.target.value)} />
        </div>
        <div className="field field-range">
          <label>Die Area (cm²) <span className="range-value">{dieArea.toFixed(1)}</span></label>
          <input type="range" min={0.1} max={2.0} step={0.1} value={dieArea}
            onChange={e => onDieAreaChange(parseFloat(e.target.value))} />
        </div>
      </div>

      <div className="sidebar-section">
        <p className="section-label">My Stats</p>
        {total > 0 ? (
          <>
            <div className="pill"><span>Total Wafers</span><strong>{total}</strong></div>
            <div className="pill"><span>Avg Yield</span><strong>{avgYield}%</strong></div>
            <div className="pill"><span>✅ Save</span><strong style={{ color: "#6EE7B7" }}>{saves}</strong></div>
            <div className="pill"><span>⚠️ Review</span><strong style={{ color: "#FCD34D" }}>{reviews}</strong></div>
            <div className="pill"><span>❌ Scrap</span><strong style={{ color: "#FCA5A5" }}>{scraps}</strong></div>
          </>
        ) : (
          <p className="empty-sub">No predictions yet</p>
        )}
      </div>

      {/* User info + logout */}
      {user && (
        <div className="sidebar-section" style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 12, marginTop: 12 }}>
          <div style={{
            background: "rgba(255,255,255,0.08)", borderRadius: 8,
            padding: "10px 12px", marginBottom: 8
          }}>
            <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#E2E8F0" }}>{user.name}</div>
            <div style={{ fontSize: "0.72rem", color: "#94A3B8" }}>{user.email}</div>
            <div style={{
              display: "inline-block", marginTop: 4,
              background: user.role === "admin" ? "#4338CA" : "#334155",
              color: "#E2E8F0", padding: "2px 8px",
              borderRadius: 999, fontSize: "0.65rem", fontWeight: 600
            }}>
              {user.role.toUpperCase()}
            </div>
          </div>
          <button className="btn btn-ghost btn-block" onClick={onLogout}
            style={{ fontSize: "0.78rem", color: "#FCA5A5", borderColor: "rgba(252,165,165,0.3)" }}>
            🚪 Logout
          </button>
        </div>
      )}
    </aside>
  );
}
