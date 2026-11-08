import { lazy, Suspense, useEffect, useRef, useState } from "react";
import RunSettings from "../components/RunSettings";
import ResultPanel from "../components/ResultPanel";
import Icon from "../components/Icons";
import { predictDraw, PredictResult } from "../api/client";
import { useHistory } from "../context/HistoryContext";
import { PATTERN_NAMES, dieMap } from "../lib/patterns";

interface Props { waferId: string; dieArea: number; onWaferIdChange: (v: string) => void; onDieAreaChange: (v: number) => void; }
const SIZE = 360;
const WaferScene = lazy(() => import("../components/WaferScene"));

/**
 * Two canvases: the one you see (dark, pink strokes) and a hidden one in the exact grey-and-black format the model reads.
 * Every stroke goes to both.
 */
export default function DrawMode({ waferId, dieArea, onWaferIdChange, onDieAreaChange }: Props) {
  const view = useRef<HTMLCanvasElement>(null);
  const model = useRef<HTMLCanvasElement | null>(null);
  const down = useRef(false);
  const [touched, setTouched] = useState(false);
  const [result, setResult] = useState<PredictResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addEntry } = useHistory();

  const reset = () => {
    const v = view.current; if (!v) return;
    if (!model.current) { model.current = document.createElement("canvas"); model.current.width = model.current.height = SIZE; }
    const g = v.getContext("2d")!; g.shadowBlur = 0; g.fillStyle = "#14141c"; g.fillRect(0, 0, SIZE, SIZE);
    const m = model.current.getContext("2d")!; m.fillStyle = "#9a9aa8"; m.fillRect(0, 0, SIZE, SIZE);
    setTouched(false);
  };
  useEffect(reset, []);

  const stamp = (x: number, y: number, r = 9) => {
    const g = view.current!.getContext("2d")!;
    g.shadowColor = "#ff2e93"; g.shadowBlur = 10; g.fillStyle = "#ff2e93";
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    const m = model.current!.getContext("2d")!;
    m.fillStyle = "#000"; m.beginPath(); m.arc(x, y, r, 0, Math.PI * 2); m.fill();
  };

  const preset = (name: string) => {
    reset();
    const k = SIZE / 25;
    for (const d of dieMap(name, 25).dies) if (d.bad) {
      const g = view.current!.getContext("2d")!;
      g.shadowColor = "#ff2e93"; g.shadowBlur = 8; g.fillStyle = "#ff2e93"; g.fillRect(d.i * k + 1, d.j * k + 1, k - 2, k - 2);
      const m = model.current!.getContext("2d")!; m.fillStyle = "#000"; m.fillRect(d.i * k, d.j * k, k, k);
    }
    setTouched(true);
  };

  const pos = (e: React.PointerEvent) => {
    const c = view.current!, r = c.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (SIZE / r.width), y: (e.clientY - r.top) * (SIZE / r.height) };
  };
  const dot = (e: React.PointerEvent) => { const { x, y } = pos(e); stamp(x, y); setTouched(true); };

  const run = async () => {
    if (!model.current) return;
    setLoading(true); setError(null);
    try {
      const r = await predictDraw(model.current.toDataURL("image/png"), dieArea);
      setResult(r); addEntry(waferId + "-DRAW", r);
    } catch (e: any) { setError(e?.response?.data?.detail || e?.message || "The scan failed."); }
    finally { setLoading(false); }
  };

  return (
    <div className={"scanpage drawpage" + (result ? " done" : "")}>
      <section className="left">
        <div className="titleblock">
          <h1 className="one"><span>Draw </span><em>a defect.</em></h1>
        </div>
        <div className="wd-wrap">
          <div className={"wd drawwd" + (loading ? " busy" : "")}>
            <i className="wd-grid" aria-hidden="true" />
            <canvas ref={view} className="dcanvas" width={SIZE} height={SIZE} aria-label="Wafer canvas. Click or drag to paint bad dies."
              onPointerDown={e => { down.current = true; (e.target as Element).setPointerCapture(e.pointerId); dot(e); }}
              onPointerMove={e => down.current && dot(e)}
              onPointerUp={() => { down.current = false; }} onPointerCancel={() => { down.current = false; }} />
            {!touched && <div className="wd-in hint"><Icon name="draw" size={34} /><b>Paint bad<br />dies here</b><span>Click or drag</span></div>}
            <i className="sweep" aria-hidden="true" />
          </div>
        </div>
        <div className="info2">
          <div className="chips1" aria-label="Start from a pattern">
            {PATTERN_NAMES.slice(0, 8).map(n => <button key={n} onClick={() => preset(n)}>{n}</button>)}
          </div>
          <div className="acts">
            <button className="btn main" onClick={run} disabled={loading || !touched}>{loading ? <><i className="spin" /> Scanning</> : "Scan drawing"}</button>
            <button className="btn" onClick={reset}>Clear</button>
          </div>
          {error && <p className="err" role="alert">{error}</p>}
        </div>
      </section>
      <div className="setrow">
        <RunSettings waferId={waferId} dieArea={dieArea} onWaferIdChange={onWaferIdChange} onDieAreaChange={onDieAreaChange} />
      </div>
      {result ? <ResultPanel result={result} variant="scan" liveSource={view} /> : (
        <>
          <div className="rstage">
            <div className="stage3d">
              <Suspense fallback={null}><WaferScene pattern="None" live={view} /></Suspense>
              <div className="read idle"><div className="num sm">{touched ? "Your drawing" : "Blank wafer"}</div><span className="cap">The 3D wafer mirrors what you paint.</span></div>
            </div>
          </div>
          <div className="rfacts">
            <section className="facts idle">
              <div><span>Pattern</span><b className="dim">–</b></div>
              <div><span>Confidence</span><b className="dim">–</b></div>
              <div><span>Dies affected</span><b className="dim">–</b></div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
