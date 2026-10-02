import { useEffect, useState } from "react";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, ReferenceLine
} from "recharts";
import PageHeader from "../components/PageHeader";
import { getMyHistory, adminGetUsers, adminGetUserHistory, HistoryEntry } from "../api/client";
import type { User } from "../api/client";

const PURPLE_PALETTE = ["#6D28D9","#3730A3","#7C3AED","#A78BFA","#C4B5FD","#DDD6FE","#EDE9FE","#F5F3FF","#8B5CF6"];
const DECISION_COLORS: Record<string, string> = { SAVE: "#10B981", REVIEW: "#F59E0B", SCRAP: "#EF4444" };

export default function History() {
  const rawUser = localStorage.getItem("wafer_user");
  const currentUser: User | null = rawUser ? JSON.parse(rawUser) : null;
  const isAdmin = currentUser?.role === "admin";

  const [history, setHistory]         = useState<HistoryEntry[]>([]);
  const [users, setUsers]             = useState<{ id: number; name: string; email: string }[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedUserName, setSelectedUserName] = useState<string>("");
  const [loading, setLoading]         = useState(true);

  // Load users list for admin
  useEffect(() => {
    if (isAdmin) {
      adminGetUsers().then((data: any[]) => {
        setUsers(data.map(u => ({ id: u.id, name: u.name, email: u.email })));
      }).catch(() => {});
    }
  }, [isAdmin]);

  // Load history based on role + selection
  useEffect(() => {
    setLoading(true);
    if (isAdmin && selectedUserId !== null) {
      adminGetUserHistory(selectedUserId)
        .then(data => { setHistory(data); setLoading(false); })
        .catch(() => setLoading(false));
    } else if (!isAdmin) {
      getMyHistory()
        .then(data => { setHistory(data); setLoading(false); })
        .catch(() => setLoading(false));
    } else {
      setHistory([]);
      setLoading(false);
    }
  }, [isAdmin, selectedUserId]);

  const handleUserSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = parseInt(e.target.value);
    const user = users.find(u => u.id === id);
    setSelectedUserId(id);
    setSelectedUserName(user ? `${user.name} (${user.email})` : "");
  };

  const downloadCsv = () => {
    if (!history.length) return;
    const headers = ["Timestamp", "Wafer ID", "Defect", "Confidence (%)", "Yield (%)", "Decision"];
    const rows = history.map(h => [
      h.timestamp, h.wafer_id, h.defect_type,
      h.confidence.toFixed(1), h.yield_pct, h.decision
    ].join(","));
    const csv  = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = `wafer_history${selectedUserName ? `_${selectedUserName.split(" ")[0]}` : ""}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Charts data
  const defectCounts: Record<string, number> = {};
  history.forEach(h => { defectCounts[h.defect_type] = (defectCounts[h.defect_type] || 0) + 1; });
  const pieData = Object.entries(defectCounts).map(([name, value]) => ({ name, value }));

  const decCounts: Record<string, number> = {};
  history.forEach(h => { decCounts[h.decision] = (decCounts[h.decision] || 0) + 1; });
  const decData = Object.entries(decCounts).map(([decision, count]) => ({ decision, count }));

  const trendData = [...history].reverse().map((h, i) => ({ idx: i + 1, yieldPct: h.yield_pct }));

  const subtitle = isAdmin
    ? selectedUserName ? `${history.length} inspections — ${selectedUserName}` : "Select a user to view their history"
    : `${history.length} inspections recorded`;

  return (
    <>
      <PageHeader title="Prediction History" subtitle={subtitle} />

      {/* Admin user selector */}
      {isAdmin && (
        <div className="card" style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#64748B", whiteSpace: "nowrap" }}>
            👤 View history for:
          </div>
          <select
            value={selectedUserId ?? ""}
            onChange={handleUserSelect}
            style={{
              flex: 1, padding: "10px 14px",
              border: "1px solid #E2E8F0", borderRadius: 10,
              fontSize: "0.88rem", color: "#1E293B",
              background: "#F8FAFC", outline: "none", cursor: "pointer"
            }}
          >
            <option value="" disabled>— Select a user —</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>
                {u.name} · {u.email}
              </option>
            ))}
          </select>
          {selectedUserId && (
            <button
              className="btn btn-ghost"
              style={{ fontSize: "0.78rem", padding: "8px 14px", whiteSpace: "nowrap" }}
              onClick={() => { setSelectedUserId(null); setSelectedUserName(""); setHistory([]); }}
            >
              ✕ Clear
            </button>
          )}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="card"><p style={{ color: "#64748B", fontSize: "0.85rem" }}>Loading history…</p></div>
      )}

      {/* Empty state */}
      {!loading && !history.length && (
        <div className="card">
          <div className="empty-state">
            {isAdmin && !selectedUserId
              ? "Select a user from the dropdown above to view their prediction history."
              : "No history yet — run some predictions first."
            }
          </div>
        </div>
      )}

      {/* History table */}
      {!loading && history.length > 0 && (
        <>
          <div className="table-wrap mt-1">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Wafer ID</th>
                  <th>Defect</th>
                  <th>Confidence</th>
                  <th>Yield</th>
                  <th>Decision</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h, i) => (
                  <tr key={i}>
                    <td style={{ fontFamily: "monospace", fontSize: "0.78rem", color: "#64748B" }}>
                      {new Date(h.timestamp).toLocaleString()}
                    </td>
                    <td><strong>{h.wafer_id}</strong></td>
                    <td>{h.defect_type}</td>
                    <td>{h.confidence.toFixed(1)}%</td>
                    <td>{h.yield_pct}%</td>
                    <td><span className={`cell-decision ${h.decision}`}>{h.decision}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-2">
            <button className="btn btn-ghost" onClick={downloadCsv}>⬇️ Download CSV</button>
          </div>

          <div className="grid-2 grid-2-even mt-3">
            <div className="card">
              <div className="card-title">Defect Distribution</div>
              <div style={{ width: "100%", height: 260 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={90} innerRadius={45}
                         labelLine={false} label={(e: any) => `${e.name} ${(e.percent * 100).toFixed(0)}%`}>
                      {pieData.map((_, i) => <Cell key={i} fill={PURPLE_PALETTE[i % PURPLE_PALETTE.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card">
              <div className="card-title">Decision Breakdown</div>
              <div style={{ width: "100%", height: 260 }}>
                <ResponsiveContainer>
                  <BarChart data={decData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="decision" tick={{ fontSize: 12, fill: "#334155" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#64748B" }} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 12 }} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {decData.map((d, i) => <Cell key={i} fill={DECISION_COLORS[d.decision] || "#94A3B8"} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-title">Yield Trend</div>
            <div style={{ width: "100%", height: 240 }}>
              <ResponsiveContainer>
                <LineChart data={trendData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="idx" tick={{ fontSize: 11, fill: "#64748B" }}
                    label={{ value: "Prediction #", position: "insideBottom", offset: -2, fontSize: 11, fill: "#64748B" }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#64748B" }} />
                  <Tooltip formatter={(v: number) => `${v}%`} contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 12 }} />
                  <ReferenceLine y={70} stroke="#10B981" strokeDasharray="4 4" />
                  <ReferenceLine y={40} stroke="#F59E0B" strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="yieldPct" stroke="#6D28D9" strokeWidth={2.5} dot={{ r: 4, fill: "#6D28D9" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </>
  );
}
