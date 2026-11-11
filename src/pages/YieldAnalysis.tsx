import { useMemo } from "react";
import { ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ComposedChart, Line, AreaChart, Area } from "recharts";
import Tip from "../components/Tip";
import { useHistory } from "../context/HistoryContext";
import { murphy } from "../lib/patterns";

interface Props { dieArea: number; onDieAreaChange: (v: number) => void; }
interface Scan { n: number; y: number; pattern: string; ratio: number; }

const verdictOf = (y: number) => (y >= 70 ? "save" : y >= 40 ? "review" : "scrap");
const COLOR = { save: "#c6ff3d", review: "#ffd23d", scrap: "#ff2e93" } as const;

/** Synthetic scans shown before the user has any history. They are labelled as an example on the page. */
function exampleScans(): Scan[] {
  const names = ["Donut", "Edge-ring", "Center", "Scratch", "Loc", "None", "Edge-loc", "Random", "Near-full"];
  return Array.from({ length: 28 }, (_, i) => {
    const wobble = Math.sin(i * 0.9) * 5 + Math.cos(i * 2.3) * 3;
    let y = 87 + wobble;
    if (i === 11) y = 58;
    if (i === 22) y = 46;
    y = Math.round(Math.min(99, y) * 10) / 10;
    return { n: i + 1, y, pattern: names[i % names.length], ratio: Math.max(0.01, -Math.log(y / 100) / 2.2) };
  });
}

export default function YieldAnalysis({ dieArea, onDieAreaChange }: Props) {
  const { history } = useHistory();
  const example = history.length < 5;

  const scans = useMemo<Scan[]>(() => {
    if (example) return exampleScans();
    return history.slice(-40).map((h, i) => ({ n: i + 1, y: h.yieldPct, pattern: h.defect, ratio: h.defectRatio }));
  }, [history, example]);

  const stats = useMemo(() => {
    const ys = scans.map(s => s.y);
    const mean = ys.reduce((a, b) => a + b, 0) / ys.length;
    const sd = Math.sqrt(ys.reduce((a, b) => a + (b - mean) ** 2, 0) / ys.length);
    const ucl = Math.min(100, mean + 2 * sd), lcl = Math.max(0, mean - 2 * sd);
    const out = scans.filter(s => s.y > ucl || s.y < lcl).length;
    const saveRate = Math.round((ys.filter(y => y >= 70).length / ys.length) * 100);
    return { mean, sd, ucl, lcl, out, saveRate, latest: ys[ys.length - 1] };
  }, [scans]);

  const rank = useMemo(() => {
    const by: Record<string, { sum: number; n: number }> = {};
    scans.forEach(s => { (by[s.pattern] ??= { sum: 0, n: 0 }); by[s.pattern].sum += s.y; by[s.pattern].n++; });
    return Object.entries(by).map(([name, v]) => ({ name, avg: v.sum / v.n, n: v.n })).sort((a, b) => b.avg - a.avg);
  }, [scans]);

  const avgRatio = scans.reduce((a, s) => a + s.ratio, 0) / scans.length;
  const whatIf = useMemo(() => {
    const pts: { a: number; y: number }[] = [];
    for (let a = 0.1; a <= 2.001; a += 0.1) pts.push({ a: Math.round(a * 10) / 10, y: murphy(avgRatio, a) });
    return pts;
  }, [avgRatio]);
  const whatNow = murphy(avgRatio, dieArea);

  const mix = useMemo(() => ({
    save: scans.filter(s => s.y >= 70).length,
    review: scans.filter(s => s.y >= 40 && s.y < 70).length,
    scrap: scans.filter(s => s.y < 40).length
  }), [scans]);

  // The y axis starts just below the lowest dot or limit instead of at zero, so the plot is not half empty.
  const lo = Math.max(0, Math.floor((Math.min(stats.lcl, ...scans.map(s => s.y)) - 8) / 10) * 10);
  const yTicks = [lo, 40, 70, 100].filter((t, i, a) => t >= lo && a.indexOf(t) === i);

  const v = verdictOf(stats.mean);
  const tag = example ? "Example data" : `Last ${scans.length} scans`;

  return (
    <div className="yieldpage">
      <section className="yleft">
        <h1 className="one"><span>Catch </span><em>dips.</em></h1>

        <div className="tile avgtile">
          <div className="avgtop">
            <h2>Average yield <small>{tag}</small></h2>
            <div className="dieval"><b style={{ color: COLOR[v] }}>{stats.mean.toFixed(1)}</b><span>%</span></div>
            <p className="avgsub">{scans.length} scans. Spread of {stats.sd.toFixed(1)} points either side. {example ? "Scan five wafers and this becomes your own process." : ""}</p>
          </div>
          <div className="avgbot">
            <div className="lvls" aria-label="Scans per verdict level">
              {([["SAVE", "save", mix.save], ["REVIEW", "review", mix.review], ["SCRAP", "scrap", mix.scrap]] as const).map(([name, k, n]) => (
                <div key={name} className={"lv " + k}>
                  <span>{name}</span>
                  <div className="track"><i style={{ width: `${(n / scans.length) * 100}%` }} /></div>
                  <b>{n}</b><em>{Math.round((n / scans.length) * 100)}%</em>
                </div>
              ))}
            </div>
            <div className="bw">
              <div><span>Strongest pattern</span><b>{rank[0].name} <em>{rank[0].avg.toFixed(0)}%</em></b></div>
              <div><span>Weakest pattern</span><b>{rank[rank.length - 1].name} <em>{rank[rank.length - 1].avg.toFixed(0)}%</em></b></div>
            </div>
          </div>
        </div>

        <section className="facts three" aria-label="Process summary">
          <div><span>SAVE rate</span><b>{stats.saveRate}%</b></div>
          <div className={stats.out ? "hl scrap" : "hl save"}><span>Outside limits</span><b>{stats.out}</b></div>
          <div><span>Latest scan</span><b>{stats.latest.toFixed(1)}%</b></div>
        </section>
      </section>

      <section className="tile ychart">
        <h2>Yield per scan <span className="key2"><span><i className="ok" />on track</span><span><i className="off" />off track</span></span></h2>
        <div className="chartfill">
          <ResponsiveContainer>
            <ComposedChart data={scans} margin={{ top: 16, right: 18, left: -8, bottom: 6 }}>
              <CartesianGrid stroke="#ffffff10" vertical={false} />
              <XAxis dataKey="n" type="number" domain={[1, scans.length]} allowDecimals={false} tickLine={false} axisLine={{ stroke: "#ffffff2e" }} />
              <YAxis domain={[lo, 100]} ticks={yTicks} tickLine={false} axisLine={false} unit="%" />
              <Tooltip content={<Tip unit="%" />} cursor={{ stroke: "#ffffff33" }} />
              {lo < 70 && <ReferenceLine y={70} stroke="#ffffff18" label={{ value: "SAVE 70", position: "insideBottomRight", fill: "#9a9aa8", fontSize: 10 }} />}
              {lo < 40 && <ReferenceLine y={40} stroke="#ffffff18" label={{ value: "REVIEW 40", position: "insideBottomRight", fill: "#9a9aa8", fontSize: 10 }} />}
              <ReferenceLine y={stats.ucl} stroke="#c6ff3d" strokeDasharray="5 5" label={{ value: `UPPER ${stats.ucl.toFixed(0)}`, position: "insideTopRight", fill: "#c6ff3d", fontSize: 11 }} />
              <ReferenceLine y={stats.lcl} stroke="#c6ff3d" strokeDasharray="5 5" label={{ value: `LOWER ${stats.lcl.toFixed(0)}`, position: "insideBottomRight", fill: "#c6ff3d", fontSize: 11 }} />
              <ReferenceLine y={stats.mean} stroke="#f4f4f0" strokeWidth={1.5} label={{ value: `MEAN ${stats.mean.toFixed(1)}`, position: "insideTopLeft", fill: "#f4f4f0", fontSize: 11 }} />
              <Line type="linear" dataKey="y" name="Yield" stroke="#ffffff30" strokeWidth={1.5} isAnimationActive={false}
                dot={(p: any) => {
                  const out = p.payload.y > stats.ucl || p.payload.y < stats.lcl;
                  return out
                    ? <g key={p.index}><circle cx={p.cx} cy={p.cy} r={10} fill="none" stroke="#ff2e93" strokeWidth={1.5} /><circle cx={p.cx} cy={p.cy} r={5.5} fill="#ff2e93" /></g>
                    : <circle key={p.index} cx={p.cx} cy={p.cy} r={4.5} fill="#c6ff3d" />;
                }}
                activeDot={{ r: 7, fill: "#f4f4f0", stroke: "#0a0a0f", strokeWidth: 2 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="tile yavg">
        <h2>Which patterns cost yield <small>ranked by average</small></h2>
        <div className="rank">
          {rank.map(r => {
            const k = verdictOf(r.avg);
            return (
              <div key={r.name} className="rk">
                <span className="nm">{r.name}</span>
                <div className="bar"><i style={{ width: `${Math.max(2, r.avg)}%`, background: COLOR[k] }} /></div>
                <b style={{ color: COLOR[k] }}>{r.avg.toFixed(0)}%</b>
                <em>{r.n}</em>
              </div>
            );
          })}
        </div>
      </section>

      <section className="tile ywhat">
        <h2>What if the die were bigger? <small>drag the slider</small></h2>
        <p className="whatsay">At <b>{dieArea.toFixed(1)} cm²</b> the same defects would give about <b style={{ color: COLOR[verdictOf(whatNow)] }}>{whatNow}%</b> yield.</p>
        <div className="whatchart">
          <ResponsiveContainer>
            <AreaChart data={whatIf} margin={{ top: 6, right: 6, left: -22, bottom: 0 }}>
              <XAxis dataKey="a" type="number" domain={[0.1, 2]} ticks={[0.1, 1, 2]} tickLine={false} axisLine={false} tickFormatter={(x: number) => x.toFixed(1)} />
              <YAxis domain={[0, 100]} ticks={[0, 100]} tickLine={false} axisLine={false} />
              <ReferenceLine x={dieArea} stroke="#ff2e93" strokeWidth={2} />
              <Area type="monotone" dataKey="y" stroke="#c6ff3d" strokeWidth={2} fill="#c6ff3d" fillOpacity={0.1} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <input type="range" min={0.1} max={2} step={0.1} value={dieArea} onChange={e => onDieAreaChange(parseFloat(e.target.value))} aria-label="Die area in square centimetres" />
      </section>
    </div>
  );
}
