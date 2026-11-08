import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine } from "recharts";
import Select from "../components/Select";
import { getMyHistory, HistoryEntry } from "../api/client";

type Key = "summary" | "mix" | "patterns" | "trend" | "list";
const SECTIONS: { key: Key; name: string; hint: string }[] = [
  { key: "summary", name: "Summary numbers", hint: "Scans, average yield, confidence" },
  { key: "mix", name: "Verdict mix", hint: "How many SAVE, REVIEW, SCRAP" },
  { key: "patterns", name: "Patterns", hint: "Which defects show up most" },
  { key: "trend", name: "Yield trend", hint: "Last 20 scans in a line" },
  { key: "list", name: "Scan list", hint: "Every scan as a table row" }
];
const RANGES = [
  { value: "all", label: "All scans", sub: "Everything on record" },
  { value: "30", label: "Last 30 days", sub: "A month back" },
  { value: "7", label: "Last 7 days", sub: "This week" }
];

// Deeper tones so the sheet reads on light paper and prints.
const INK = { save: "#4f8a00", review: "#b87800", scrap: "#d4146a" } as const;
const verdictKey = (d: string) => d.toLowerCase() as "save" | "review" | "scrap";
const when = (iso: string) => new Date(iso.includes("T") || iso.includes("Z") ? iso : iso.replace(" ", "T")).getTime();

export default function Reports() {
  const [all, setAll] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("all");
  const [on, setOn] = useState<Record<Key, boolean>>({ summary: true, mix: true, patterns: true, trend: true, list: false });

  useEffect(() => { getMyHistory().then(setAll).catch(() => {}).finally(() => setLoading(false)); }, []);

  const rows = useMemo(() => {
    const sorted = [...all].sort((a, b) => when(a.timestamp) - when(b.timestamp));
    if (range === "all") return sorted;
    const cut = Date.now() - parseInt(range) * 86400000;
    return sorted.filter(h => when(h.timestamp) >= cut);
  }, [all, range]);

  const d = useMemo(() => {
    const n = rows.length || 1;
    const avgYield = rows.reduce((s, h) => s + h.yield_pct, 0) / n;
    const avgConf = rows.reduce((s, h) => s + h.confidence, 0) / n;
    const mix = { save: 0, review: 0, scrap: 0 };
    rows.forEach(h => { mix[verdictKey(h.decision)]++; });
    const by: Record<string, { sum: number; n: number }> = {};
    rows.forEach(h => { (by[h.defect_type] ??= { sum: 0, n: 0 }); by[h.defect_type].sum += h.yield_pct; by[h.defect_type].n++; });
    const patterns = Object.entries(by).map(([name, v]) => ({ name, n: v.n, avg: v.sum / v.n })).sort((a, b) => b.n - a.n);
    const trend = rows.slice(-20).map((h, i) => ({ i: i + 1, y: h.yield_pct }));
    return { avgYield, avgConf, mix, patterns, trend };
  }, [rows]);

  const toggle = (k: Key) => setOn(p => ({ ...p, [k]: !p[k] }));
  const rangeName = RANGES.find(r => r.value === range)!.label;
  const empty = rows.length === 0;

  const exportPdf = () => {
    if (empty) return;
    const w = window.open("", "_blank"); if (!w) return;
    const cell = (l: string, v: string) => `<div class="s"><small>${l}</small><b>${v}</b></div>`;
    const parts: string[] = [];
    if (on.summary) parts.push(`<h2>Summary</h2><div class="g">${cell("Scans", String(rows.length))}${cell("Average yield", d.avgYield.toFixed(1) + "%")}${cell("Average confidence", d.avgConf.toFixed(1) + "%")}</div>`);
    if (on.mix) parts.push(`<h2>Verdict mix</h2><div class="g">${cell("SAVE", String(d.mix.save))}${cell("REVIEW", String(d.mix.review))}${cell("SCRAP", String(d.mix.scrap))}</div>`);
    if (on.patterns) parts.push(`<h2>Patterns</h2><table><thead><tr><th>Pattern</th><th>Scans</th><th>Average yield</th></tr></thead><tbody>${d.patterns.map(p => `<tr><td>${p.name}</td><td>${p.n}</td><td>${p.avg.toFixed(1)}%</td></tr>`).join("")}</tbody></table>`);
    if (on.trend) parts.push(`<h2>Yield trend</h2><p class="m">${d.trend.map(t => t.y.toFixed(0) + "%").join("  ")}</p>`);
    if (on.list) parts.push(`<h2>All scans</h2><table><thead><tr><th>Wafer</th><th>Pattern</th><th>Sure</th><th>Yield</th><th>Verdict</th><th>When</th></tr></thead><tbody>${[...rows].reverse().map(h => `<tr><td>${h.wafer_id}</td><td>${h.defect_type}</td><td>${h.confidence.toFixed(1)}%</td><td>${h.yield_pct}%</td><td>${h.decision}</td><td>${new Date(when(h.timestamp)).toLocaleString()}</td></tr>`).join("")}</tbody></table>`);
    w.document.write(`<html><head><title>Waferscope report</title><style>
      body{font-family:system-ui,'Segoe UI',Helvetica,sans-serif;padding:32px;color:#14141b}h1{font-size:24px;margin:0 0 4px}h2{font-size:15px;margin:26px 0 8px;border-bottom:2px solid #14141b;padding-bottom:4px}
      .g{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.s{border:1px solid #ccc;border-radius:8px;padding:12px;text-align:center}.s small{display:block;font-size:11px;color:#666}.s b{font-size:22px}
      table{width:100%;border-collapse:collapse;font-size:12px}th{text-align:left;background:#eee;padding:8px}td{padding:8px;border-bottom:1px solid #ddd}.m{font-family:monospace;font-size:12px}
      footer{margin-top:28px;font-size:11px;color:#666;text-align:center}</style></head><body>
      <h1>Waferscope report</h1><p style="color:#666;font-size:13px">${rangeName}. Generated ${new Date().toLocaleString()}</p>${parts.join("")}
      <footer>Waferscope · Murphy yield model</footer></body></html>`);
    w.document.close(); w.print();
  };

  return (
    <div className="reportpage">
      <header className="rhead">
        <h1 className="one"><span>Make </span><em>a report.</em></h1>
        <button className="btn main rexp" onClick={exportPdf} disabled={empty}>Export PDF</button>
      </header>

      <aside className="tile rctl" aria-label="Report options">
        <h2>What goes in <small>{Object.values(on).filter(Boolean).length} of 5</small></h2>
        <div className="sw">
          {SECTIONS.map(s => (
            <button key={s.key} type="button" role="switch" aria-checked={on[s.key]} className={on[s.key] ? "on" : ""} onClick={() => toggle(s.key)}>
              <i aria-hidden="true">{on[s.key] ? "✓" : ""}</i>
              <span><b>{s.name}</b><small>{s.hint}</small></span>
            </button>
          ))}
        </div>
        <div className="rrange"><span>Range</span><Select label="Range" value={range} onChange={(v: string) => setRange(v)} options={RANGES} /></div>
        <p className="rnote">Export opens your print window. Choose Save as PDF there.</p>
      </aside>

      <section className="paperwrap" aria-label="Report preview">
        <article className="paper">
          <div className="phd">
            <div><b>WAFERSCOPE</b><span>Report</span></div>
            <small>{rangeName} · {rows.length} {rows.length === 1 ? "scan" : "scans"}</small>
          </div>

          {loading && <p className="pnone">Loading…</p>}
          {!loading && empty && (
            <div className="pnone"><b>Nothing to report yet</b><p>Scan a few wafers first, then come back and build a report.</p><Link className="btn main" to="/app">Scan a wafer</Link></div>
          )}

          {!loading && !empty && (
            <>
              {on.summary && (
                <div className="psec"><h3>Summary</h3>
                  <div className="pg"><div><small>Scans</small><b>{rows.length}</b></div><div><small>Average yield</small><b>{d.avgYield.toFixed(1)}%</b></div><div><small>Average confidence</small><b>{d.avgConf.toFixed(1)}%</b></div></div>
                </div>
              )}
              {on.mix && (
                <div className="psec"><h3>Verdict mix</h3>
                  <div className="pmix">{(["save", "review", "scrap"] as const).map(k => (
                    <div key={k} className={k}><b>{d.mix[k]}</b><small>{k.toUpperCase()}</small><div className="pbar"><i style={{ width: `${(d.mix[k] / rows.length) * 100}%`, background: INK[k] }} /></div></div>
                  ))}</div>
                </div>
              )}
              {on.patterns && (
                <div className="psec"><h3>Patterns</h3>
                  <div className="prank">{d.patterns.map(p => (
                    <div key={p.name} className="pr"><span>{p.name}</span><div className="pbar"><i style={{ width: `${Math.max(3, p.avg)}%`, background: INK[p.avg >= 70 ? "save" : p.avg >= 40 ? "review" : "scrap"] }} /></div><b>{p.avg.toFixed(0)}%</b><em>{p.n}</em></div>
                  ))}</div>
                </div>
              )}
              {on.trend && (
                <div className="psec"><h3>Yield trend <small>last {d.trend.length} scans</small></h3>
                  <div className="ptrend">
                    <ResponsiveContainer>
                      <LineChart data={d.trend} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                        <CartesianGrid stroke="#14141b14" vertical={false} />
                        <XAxis dataKey="i" tickLine={false} axisLine={{ stroke: "#14141b30" }} tick={{ fill: "#5a5a66", fontSize: 10 }} />
                        <YAxis domain={[0, 100]} ticks={[0, 40, 70, 100]} tickLine={false} axisLine={false} tick={{ fill: "#5a5a66", fontSize: 10 }} />
                        <ReferenceLine y={70} stroke="#4f8a00" strokeDasharray="4 5" />
                        <ReferenceLine y={40} stroke="#b87800" strokeDasharray="4 5" />
                        <Line type="monotone" dataKey="y" stroke="#14141b" strokeWidth={2} dot={{ r: 3, fill: "#14141b" }} isAnimationActive={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
              {on.list && (
                <div className="psec"><h3>Scan list <small>newest first</small></h3>
                  <table className="ptable"><thead><tr><th>Wafer</th><th>Pattern</th><th>Yield</th><th>Verdict</th></tr></thead>
                    <tbody>{[...rows].reverse().slice(0, 10).map(h => (
                      <tr key={h.id}><td>{h.wafer_id}</td><td>{h.defect_type}</td><td>{h.yield_pct}%</td><td className={verdictKey(h.decision)}>{h.decision}</td></tr>
                    ))}</tbody>
                  </table>
                  {rows.length > 10 && <p className="pmore">+ {rows.length - 10} more rows in the PDF</p>}
                </div>
              )}
              {!Object.values(on).some(Boolean) && <p className="pnone">Switch on at least one section.</p>}
            </>
          )}
        </article>
      </section>
    </div>
  );
}
