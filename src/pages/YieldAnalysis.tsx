import { useEffect, useState } from "react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, Legend, Area, ComposedChart, BarChart, Bar, Cell
} from "recharts";
import PageHeader from "../components/PageHeader";
import { useHistory } from "../context/HistoryContext";
import { yieldCurve, YieldPoint } from "../api/client";

interface Props { dieArea: number; }

export default function YieldAnalysis({ dieArea }: Props) {
  const { history } = useHistory();
  const [curve, setCurve] = useState<YieldPoint[]>([]);
  const [loading, setLoading] = useState(false);

  const last = history[history.length - 1];

  useEffect(() => {
    if (!last) return;
    setLoading(true);
    yieldCurve(last.defectRatio)
      .then(setCurve)
      .finally(() => setLoading(false));
  }, [last?.defectRatio]);

  if (!last) {
    return (
      <>
        <PageHeader title="Yield Analysis" subtitle="Murphy yield curves across die area" />
        <div className="card"><div className="empty-state">Run at least one prediction to see yield analysis.</div></div>
      </>
    );
  }

  // Average yield grouped by defect type
  const byDefect: Record<string, { sum: number; count: number }> = {};
  history.forEach(h => {
    if (!byDefect[h.defect]) byDefect[h.defect] = { sum: 0, count: 0 };
    byDefect[h.defect].sum   += h.yieldPct;
    byDefect[h.defect].count += 1;
  });
  const avgData = Object.entries(byDefect).map(([d, v]) => ({
    defect: d,
    avg: Math.round((v.sum / v.count) * 100) / 100
  }));

  return (
    <>
      <PageHeader
        title="Yield Analysis"
        subtitle={`Last prediction · Defect: ${last.defect} · Yield: ${last.yieldPct}%`}
      />

      <div className="card">
        <div className="card-title">Murphy Yield Curve — {last.defect}</div>
        {loading ? (
          <div className="empty-state">Computing curve…</div>
        ) : (
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
              <ComposedChart data={curve} margin={{ top: 10, right: 24, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="die_area" tick={{ fontSize: 11, fill: "#64748B" }}
                       label={{ value: "Die Area (cm²)", position: "insideBottom", offset: -2, fontSize: 11, fill: "#64748B" }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#64748B" }}
                       label={{ value: "Yield (%)", angle: -90, position: "insideLeft", fontSize: 11, fill: "#64748B" }} />
                <Tooltip
                  formatter={(v: number) => `${v}%`}
                  contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="yield_pct" stroke="none" fill="#6D28D9" fillOpacity={0.08} />
                <Line type="monotone" dataKey="yield_pct" name="Yield" stroke="#6D28D9" strokeWidth={2.5} dot={false} />
                <ReferenceLine y={70} stroke="#10B981" strokeDasharray="4 4" label={{ value: "70% Save", position: "right", fontSize: 10, fill: "#10B981" }} />
                <ReferenceLine y={40} stroke="#F59E0B" strokeDasharray="4 4" label={{ value: "40% Min", position: "right", fontSize: 10, fill: "#F59E0B" }} />
                <ReferenceLine x={dieArea} stroke="#EF4444" strokeWidth={2} label={{ value: `${dieArea} cm²`, position: "top", fontSize: 10, fill: "#EF4444" }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {avgData.length > 1 && (
        <div className="card">
          <div className="card-title">Average Yield by Defect Type</div>
          <div style={{ width: "100%", height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={avgData} margin={{ top: 10, right: 16, left: 4, bottom: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="defect" tick={{ fontSize: 11, fill: "#334155" }} angle={-25} textAnchor="end" height={50} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#64748B" }} />
                <Tooltip
                  formatter={(v: number) => `${v}%`}
                  contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 12 }}
                />
                <ReferenceLine y={70} stroke="#10B981" strokeDasharray="4 4" />
                <ReferenceLine y={40} stroke="#F59E0B" strokeDasharray="4 4" />
                <Bar dataKey="avg" radius={[6, 6, 0, 0]}>
                  {avgData.map((d, i) => (
                    <Cell key={i} fill={d.avg >= 70 ? "#10B981" : d.avg >= 40 ? "#F59E0B" : "#EF4444"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </>
  );
}
