import { useEffect, useState } from "react";
import PageHeader from "../components/PageHeader";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid
} from "recharts";
import { getMyHistory, HistoryEntry } from "../api/client";

const COLORS = ["#6D28D9", "#10B981", "#F59E0B", "#EF4444", "#3B82F6", "#EC4899", "#14B8A6", "#F97316", "#8B5CF6"];
const DECISION_COLORS: Record<string, string> = { SAVE: "#10B981", REVIEW: "#F59E0B", SCRAP: "#EF4444" };

export default function Reports() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyHistory().then(data => { setHistory(data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="card"><p style={{ color: "#64748B" }}>Loading reports…</p></div>;

  if (history.length === 0) return (
    <>
      <PageHeader title="Reports" subtitle="Prediction analytics and export" />
      <div className="card"><div className="empty-state">No predictions yet. Run some predictions to see reports!</div></div>
    </>
  );

  // Compute stats
  const total    = history.length;
  const saves    = history.filter(h => h.decision === "SAVE").length;
  const reviews  = history.filter(h => h.decision === "REVIEW").length;
  const scraps   = history.filter(h => h.decision === "SCRAP").length;
  const avgYield = (history.reduce((s, h) => s + h.yield_pct, 0) / total).toFixed(1);
  const avgConf  = (history.reduce((s, h) => s + h.confidence, 0) / total).toFixed(1);

  // Defect distribution
  const defectCounts: Record<string, number> = {};
  history.forEach(h => { defectCounts[h.defect_type] = (defectCounts[h.defect_type] || 0) + 1; });
  const defectData = Object.entries(defectCounts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  // Decision pie
  const decisionData = [
    { name: "SAVE", value: saves },
    { name: "REVIEW", value: reviews },
    { name: "SCRAP", value: scraps }
  ].filter(d => d.value > 0);

  // Yield trend (last 20)
  const yieldTrend = [...history].reverse().slice(-20).map((h, i) => ({
    index: i + 1,
    yield: h.yield_pct,
    decision: h.decision
  }));

  const handleExportPDF = () => {
    const printContent = document.getElementById("report-content");
    if (!printContent) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Wafer Defect Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 32px; color: #1E293B; }
            h1 { color: #1E1B4B; font-size: 1.5rem; margin-bottom: 4px; }
            h2 { color: #3730A3; font-size: 1rem; margin: 24px 0 8px; border-bottom: 2px solid #E2E8F0; padding-bottom: 4px; }
            .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 16px 0; }
            .stat { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; text-align: center; }
            .stat-label { font-size: 0.7rem; color: #64748B; text-transform: uppercase; }
            .stat-value { font-size: 1.5rem; font-weight: 800; color: #1E1B4B; }
            table { width: 100%; border-collapse: collapse; font-size: 0.82rem; margin-top: 8px; }
            th { background: #F1F5F9; padding: 8px 10px; text-align: left; font-size: 0.72rem; text-transform: uppercase; color: #64748B; }
            td { padding: 8px 10px; border-bottom: 1px solid #E2E8F0; }
            .save { color: #065F46; background: #D1FAE5; padding: 2px 8px; border-radius: 999px; font-size: 0.72rem; font-weight: 700; }
            .review { color: #92400E; background: #FEF3C7; padding: 2px 8px; border-radius: 999px; font-size: 0.72rem; font-weight: 700; }
            .scrap { color: #991B1B; background: #FEE2E2; padding: 2px 8px; border-radius: 999px; font-size: 0.72rem; font-weight: 700; }
            footer { margin-top: 32px; color: #94A3B8; font-size: 0.75rem; text-align: center; }
          </style>
        </head>
        <body>
          <h1>🔬 Wafer Defect Detection — Report</h1>
          <p style="color:#64748B;font-size:0.85rem;">Generated on ${new Date().toLocaleString()}</p>
          <h2>Summary</h2>
          <div class="stats">
            <div class="stat"><div class="stat-label">Total Predictions</div><div class="stat-value">${total}</div></div>
            <div class="stat"><div class="stat-label">Avg Yield</div><div class="stat-value">${avgYield}%</div></div>
            <div class="stat"><div class="stat-label">Avg Confidence</div><div class="stat-value">${avgConf}%</div></div>
            <div class="stat"><div class="stat-label">✅ Save</div><div class="stat-value" style="color:#10B981">${saves}</div></div>
            <div class="stat"><div class="stat-label">⚠️ Review</div><div class="stat-value" style="color:#F59E0B">${reviews}</div></div>
            <div class="stat"><div class="stat-label">❌ Scrap</div><div class="stat-value" style="color:#EF4444">${scraps}</div></div>
          </div>
          <h2>Defect Distribution</h2>
          <table>
            <thead><tr><th>Defect Type</th><th>Count</th><th>Percentage</th></tr></thead>
            <tbody>${defectData.map(d => `<tr><td>${d.name}</td><td>${d.value}</td><td>${((d.value / total) * 100).toFixed(1)}%</td></tr>`).join("")}</tbody>
          </table>
          <h2>Full Prediction History</h2>
          <table>
            <thead><tr><th>Wafer ID</th><th>Defect</th><th>Confidence</th><th>Yield</th><th>Decision</th><th>Timestamp</th></tr></thead>
            <tbody>${history.map(h => `
              <tr>
                <td>${h.wafer_id}</td>
                <td>${h.defect_type}</td>
                <td>${h.confidence.toFixed(1)}%</td>
                <td>${h.yield_pct}%</td>
                <td><span class="${h.decision.toLowerCase()}">${h.decision}</span></td>
                <td>${new Date(h.timestamp).toLocaleString()}</td>
              </tr>`).join("")}
            </tbody>
          </table>
          <footer>Wafer Defect Detection System · EfficientNet-B3 · Murphy Yield Model · Groq LLM</footer>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <>
      <PageHeader title="Reports" subtitle="Prediction analytics and PDF export" />

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <button className="btn btn-primary" onClick={handleExportPDF} style={{ fontSize: "0.85rem" }}>
          📄 Export PDF Report
        </button>
      </div>

      <div id="report-content">
        {/* Summary cards */}
        <div className="metric-grid" style={{ gridTemplateColumns: "repeat(6, 1fr)", marginBottom: 16 }}>
          {[
            { label: "Total", value: total, color: "#6D28D9" },
            { label: "Avg Yield", value: `${avgYield}%`, color: "#1E293B" },
            { label: "Avg Conf", value: `${avgConf}%`, color: "#1E293B" },
            { label: "✅ Save", value: saves, color: "#10B981" },
            { label: "⚠️ Review", value: reviews, color: "#F59E0B" },
            { label: "❌ Scrap", value: scraps, color: "#EF4444" },
          ].map((s, i) => (
            <div key={i} className="metric-card">
              <div className="m-label">{s.label}</div>
              <div className="m-value" style={{ color: s.color, fontSize: "1.1rem" }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          {/* Defect Distribution Bar */}
          <div className="card">
            <div className="card-title">Defect Distribution</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={defectData} margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748B" }} />
                <YAxis tick={{ fontSize: 10, fill: "#64748B" }} />
                <Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {defectData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Decision Pie */}
          <div className="card">
            <div className="card-title">Batch Decision Breakdown</div>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={decisionData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {decisionData.map((d, i) => <Cell key={i} fill={DECISION_COLORS[d.name]} />)}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Yield Trend */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-title">Yield Trend (Last {yieldTrend.length} Predictions)</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={yieldTrend} margin={{ top: 4, right: 20, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="index" tick={{ fontSize: 10, fill: "#64748B" }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#64748B" }} />
              <Tooltip formatter={(v: number) => `${v}%`} />
              <Line type="monotone" dataKey="yield" stroke="#6D28D9" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* History Table */}
        <div className="card">
          <div className="card-title">Full Prediction History</div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Wafer ID</th><th>Defect</th><th>Confidence</th>
                  <th>Yield</th><th>Defect Ratio</th><th>Decision</th><th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {history.map(h => (
                  <tr key={h.id}>
                    <td style={{ fontWeight: 600, fontSize: "0.82rem" }}>{h.wafer_id}</td>
                    <td style={{ fontSize: "0.82rem" }}>{h.defect_type}</td>
                    <td style={{ fontSize: "0.82rem" }}>{h.confidence.toFixed(1)}%</td>
                    <td style={{ fontSize: "0.82rem" }}>{h.yield_pct}%</td>
                    <td style={{ fontSize: "0.82rem" }}>{(h.defect_ratio * 100).toFixed(2)}%</td>
                    <td>
                      <span className={`cell-decision ${h.decision}`} style={{ fontSize: "0.72rem" }}>
                        {h.decision}
                      </span>
                    </td>
                    <td style={{ fontSize: "0.75rem", color: "#64748B" }}>
                      {new Date(h.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
