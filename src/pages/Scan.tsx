import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import TopNav from "../components/TopNav";
import DieStage from "../components/DieStage";
import DieMap from "../components/DieMap";
import Icon from "../components/Icons";
import { makeSample } from "../components/WaferDrop";
import { predictGuest, PredictResult } from "../api/client";
import { PATTERN_NAMES, dieMap, murphy, verdictFor } from "../lib/patterns";
import sampleResults from "../lib/sampleResults.json";
import "../styles/landing.css";
import "../styles/public.css";
import "../styles/app.css";

const COLOR = { save: "#c6ff3d", review: "#ffd23d", scrap: "#ff2e93" } as const;

/**
 * Public guest scan. Most visitors have no wafer map, so the nine patterns are tappable samples
 * and a result is already on screen when the page opens.
 */
export default function Scan() {
  const loc = useLocation();
  const [params] = useSearchParams();
  const input = useRef<HTMLInputElement>(null);
  const [res, setRes] = useState<PredictResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [picked, setPicked] = useState<string>("Edge-loc");
  const [own, setOwn] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const run = useRef(0);

  const scan = async (f: File, label: string, isOwn: boolean) => {
    const id = ++run.current;
    setBusy(true); setErr(null); setPicked(isOwn ? "" : label); setOwn(isOwn ? f.name : null);
    try {
      const r = await predictGuest(f);
      if (id === run.current) setRes(r);
    } catch (e: any) {
      if (id === run.current) setErr(e?.response?.data?.detail || "The scan failed. Try another wafer.");
    } finally { if (id === run.current) setBusy(false); }
  };

  // The nine samples are demos. The pattern and confidence are what the live model said about a real wafer map
  // of that class, bundled so a tap answers at once. "Dies affected" and the yield come from the die map drawn on
  // screen, so they always agree with what the visitor sees (a clean wafer shows 0% and 100%). Only a map the
  // visitor brings goes to the API, and then every number is the live one.
  const bundled = (name: string): PredictResult | null => {
    const key = Object.keys(sampleResults).find(k => k.toLowerCase() === name.toLowerCase());
    if (!key) return null;
    const ratio = dieMap(name).ratio;
    const y = murphy(ratio);
    return { ...(sampleResults as Record<string, any>)[key], defect_ratio: ratio, yield_pct: y, decision: verdictFor(y).toUpperCase(), gradcam: null } as PredictResult;
  };
  const sample = async (name: string) => {
    const ready = bundled(name);
    if (!ready) return scan(await makeSample(name), name, false);
    run.current++;
    setErr(null); setBusy(false); setPicked(name); setOwn(null); setRes(ready);
  };
  const mine = (f?: File | null) => { if (f) scan(f, "", true); };

  useEffect(() => {
    const f = (loc.state as any)?.file as File | undefined;
    if (f) mine(f); else sample(params.get("p") && PATTERN_NAMES.includes(params.get("p")!) ? params.get("p")! : "Edge-loc");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const v = res ? (res.decision.toLowerCase() as keyof typeof COLOR) : "save";

  return (
    <div className="landing">
      <div className="grain" />
      <TopNav />
      <div className="app gst" role="main"
        onDragOver={e => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
        onDrop={e => { e.preventDefault(); setOver(false); mine(e.dataTransfer.files?.[0]); }}>
        <section className="gl">
          <h1 className="one"><span>Try </span><em>it now.</em></h1>
          <p className="gsub">No account. Tap a wafer, or drop your own map.</p>

          <div className="gchips" role="group" aria-label="Sample wafers">
            {PATTERN_NAMES.map(n => (
              <button key={n} className={"gc" + (picked === n ? " on" : "")} aria-pressed={picked === n} onClick={() => sample(n)} disabled={busy && picked === n}>
                <span className="gcw"><DieMap name={n} className="gcm" /></span>
                <b>{n}</b>
              </button>
            ))}
          </div>

          <input ref={input} type="file" accept="image/png,image/jpeg" hidden onChange={e => { mine(e.target.files?.[0]); e.target.value = ""; }} />
          <button className={"gown" + (own ? " on" : "") + (over ? " over" : "")} onClick={() => input.current?.click()}>
            <Icon name="up" size={22} /><span><b>{own ? own : "Drop your own wafer map"}</b><small>{own ? "Your image. Tap to pick another." : "PNG or JPG. Or drag it anywhere on this page."}</small></span>
          </button>
          {err && <p className="err" role="alert">{err}</p>}
        </section>

        <div className="gstage">
          {res ? (
            <div className={"gbox" + (busy ? " busy" : "")}>
              <DieStage name={res.defect_type} replay={res.yield_pct + res.defect_type + (busy ? "b" : "")} className={"v-" + v}>
                <div className={"read " + v}>
                  <div className="num">{res.yield_pct.toFixed(res.yield_pct % 1 ? 1 : 0)}<sup>%</sup></div>
                  <span className={"sticker " + v}>{res.decision}</span>
                </div>
              </DieStage>
              <i className="gsweep" aria-hidden="true" />
            </div>
          ) : <div className="gbox idle busy" aria-busy="true"><i className="gsweep" aria-hidden="true" /><span className="gscan">Scanning…</span></div>}
        </div>

        <aside className="tile gup">
          <h2>Want the rest?</h2>
          <p>Scan ten wafers at once, draw your own defect, keep a history of every scan, export reports and ask the expert bot.</p>
          <div className="gbtn"><Link className="btn main" to="/request">Request access</Link><Link className="btn" to="/login">Sign in</Link></div>
        </aside>

        <section className="facts gfacts" aria-label="Scan result">
          <div><span>Pattern</span><b>{res ? res.defect_type : "–"}</b></div>
          <div><span>Confidence</span><b>{res ? res.confidence.toFixed(1) + "%" : "–"}</b></div>
          <div><span>Dies affected</span><b>{res ? (res.defect_ratio * 100).toFixed(1) + "%" : "–"}</b></div>
        </section>
      </div>
    </div>
  );
}
