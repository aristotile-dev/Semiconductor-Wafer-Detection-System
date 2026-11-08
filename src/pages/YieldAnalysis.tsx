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
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff2e" />
                <XAxis dataKey="die_area" tick={{ fontSize: 11, fill: "#9a9aa8" }}
                       label={{ value: "Die Area (cm²)", position: "insideBottom", offset: -2, fontSize: 11, fill: "#9a9aa8" }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#9a9aa8" }}
                       label={{ value: "Yield (%)", angle: -90, position: "insideLeft", fontSize: 11, fill: "#9a9aa8" }} />
                <Tooltip
                  formatter={(v: number) => `${v}%`}
                  contentStyle={{ borderRadius: 8, border: "1px solid #ffffff2e", fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="yield_pct" stroke="none" fill="#c6ff3d" fillOpacity={0.08} />
                <Line type="monotone" dataKey="yield_pct" name="Yield" stroke="#c6ff3d" strokeWidth={2.5} dot={false} />
                <ReferenceLine y={70} stroke="#c6ff3d" strokeDasharray="4 4" label={{ value: "70% Save", position: "right", fontSize: 10, fill: "#c6ff3d" }} />
                <ReferenceLine y={40} stroke="#ffd23d" strokeDasharray="4 4" label={{ value: "40% Min", position: "right", fontSize: 10, fill: "#ffd23d" }} />
                <ReferenceLine x={dieArea} stroke="#ff2e93" strokeWidth={2} label={{ value: `${dieArea} cm²`, position: "top", fontSize: 10, fill: "#ff2e93" }} />
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
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff2e" />
                <XAxis dataKey="defect" tick={{ fontSize: 11, fill: "#ffffff2e" }} angle={-25} textAnchor="end" height={50} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#9a9aa8" }} />
                <Tooltip
                  formatter={(v: number) => `${v}%`}
                  contentStyle={{ borderRadius: 8, border: "1px solid #ffffff2e", fontSize: 12 }}
                />
                <ReferenceLine y={70} stroke="#c6ff3d" strokeDasharray="4 4" />
                <ReferenceLine y={40} stroke="#ffd23d" strokeDasharray="4 4" />
                <Bar dataKey="avg" radius={[6, 6, 0, 0]}>
                  {avgData.map((d, i) => (
                    <Cell key={i} fill={d.avg >= 70 ? "#c6ff3d" : d.avg >= 40 ? "#ffd23d" : "#ff2e93"} />
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
