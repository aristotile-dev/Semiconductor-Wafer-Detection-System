import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopNav from "../components/TopNav";
import WaferScene from "../components/WaferScene";
import { PATTERN_NAMES, dieMap, drawGlyph, murphy, verdictFor } from "../lib/patterns";
import "../styles/landing.css";

function Chip({ name, on, onPick }: { name: string; on: boolean; onPick: () => void }) {
  const c = useRef<HTMLCanvasElement>(null);
  useEffect(() => { if (c.current) drawGlyph(c.current, name, on); }, [name, on]);
  return (
    <button className={"chip" + (on ? " on" : "")} onClick={onPick} aria-pressed={on}>
      <canvas ref={c} width={68} height={68} aria-hidden="true" /><span>{name}</span>
    </button>
  );
}

export default function Landing() {
  const [cur, setCur] = useState("Edge-ring");
  const nav = useNavigate();
  const upload = useRef<HTMLInputElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const stats = useMemo(() => {
    const y = murphy(dieMap(cur).ratio);
    return { y: (Number.isInteger(y) ? y : y.toFixed(1)) + "%", v: verdictFor(y, cur) };
  }, [cur]);

  // Ticker: repeat the unit until it is wider than the viewport, then duplicate it so the loop has no gap.
  useEffect(() => {
    const build = () => {
      const t = trackRef.current; if (!t) return;
      t.innerHTML = "";
      const html = PATTERN_NAMES.map(n => `${n} <i></i>`).join(" ");
      const one = document.createElement("span"); one.innerHTML = html; t.appendChild(one);
      let copies = 1;
      while (one.getBoundingClientRect().width < window.innerWidth && copies < 12) { one.innerHTML += " " + html; copies++; }
      t.appendChild(one.cloneNode(true));
    };
    build(); document.fonts?.ready.then(build);
    let rt = 0; const on = () => { clearTimeout(rt); rt = window.setTimeout(build, 150); };
    window.addEventListener("resize", on);
    return () => { window.removeEventListener("resize", on); clearTimeout(rt); };
  }, []);

  return (
    <div className="landing">
      <div className="grain" />
      <TopNav />
      <main className="hero">
        <div className="top">
          <div className="lede">
            <h1><span className="ln">Find</span><span className="ln">the<br className="m" /> <b className="d">defect</b></span><span className="ln a">before</span><span className="ln">it<br className="m" /> ships.</span></h1>
            <p className="sub">Drop a wafer map. Get the pattern, the yield call, and a save, review or scrap verdict.</p>
          </div>
          <div className="act">
            <div className="cta">
              <span className="fw">
                <button className="btn main" onClick={() => nav("/scan?sample=1")}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M4 12h16" /></svg>Scan wafer
                </button>
              </span>
              <button className="btn" onClick={() => upload.current?.click()}>Upload</button>
              <input ref={upload} type="file" accept="image/png,image/jpeg" hidden
                onChange={e => { const f = e.target.files?.[0]; if (f) nav("/scan", { state: { file: f } }); }} />
            </div>
            <p className="micro"><i />Runs a sample wafer. No account needed.</p>
          </div>
        </div>

        <WaferScene pattern={cur} />

        <div className="side" id="patterns">
          <div className="get">
            <div className="label"><b>What you get</b><span>for this sample</span></div>
            <div className="rows">
              <div className="row"><span className="k">Pattern</span><span className="v">{cur}</span></div>
              <div className="row"><span className="k">Yield</span><span className="v">{stats.y}</span></div>
              <div className="row verdict"><span className="k">Verdict</span><span className={"v " + stats.v}>{stats.v}</span></div>
            </div>
          </div>
          <div className="pat">
            <div className="label"><span><b>9 patterns</b> the model recognises</span><span>EfficientNet-B3</span></div>
            <div className="grid">
              {PATTERN_NAMES.map(n => <Chip key={n} name={n} on={n === cur} onPick={() => setCur(n)} />)}
            </div>
          </div>
        </div>
      </main>
      <div className="ticker" aria-hidden="true"><div className="track" ref={trackRef} /></div>
    </div>
  );
}
