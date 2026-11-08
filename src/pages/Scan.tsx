import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import TopNav from "../components/TopNav";
import { predictGuest, PredictResult } from "../api/client";
import { PATTERN_NAMES, dieMap } from "../lib/patterns";
import "../styles/landing.css";
import "../styles/public.css";

/** Draw a die map to a canvas. Used for the result thumbnail and to build the sample wafer image. */
function drawMap(c: HTMLCanvasElement, name: string, bg = "#14141b") {
  const g = c.getContext("2d")!, n = 25, s = c.width / n;
  g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height);
  for (const d of dieMap(name, n).dies) {
    g.fillStyle = d.bad ? "#ff2e93" : "#2a2a36";
    g.fillRect(d.i * s + 1, d.j * s + 1, s - 2, s - 2);
  }
}

function sampleFile(): Promise<File> {
  const name = PATTERN_NAMES[Math.floor(Math.random() * 8)]; // skip "None" so the sample shows something
  const c = document.createElement("canvas"); c.width = c.height = 256;
  drawMap(c, name, "#0d0d13");
  return new Promise(res => c.toBlob(b => res(new File([b!], `sample-${name.toLowerCase()}.png`, { type: "image/png" })), "image/png"));
}

function MapThumb({ name }: { name: string }) {
  const c = useRef<HTMLCanvasElement>(null);
  useEffect(() => { if (c.current) drawMap(c.current, name); }, [name]);
  return <canvas ref={c} className="map" width={400} height={400} role="img" aria-label={`Die map for ${name}`} />;
}

export default function Scan() {
  const loc = useLocation();
  const [params] = useSearchParams();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>((loc.state as any)?.file ?? null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [res, setRes] = useState<PredictResult | null>(null);
  const [isSample, setIsSample] = useState(false);

  useEffect(() => {
    if (!file) { setPreview(""); return; }
    const u = URL.createObjectURL(file); setPreview(u); return () => URL.revokeObjectURL(u);
  }, [file]);

  const run = async (f: File) => {
    setBusy(true); setErr(null); setRes(null);
    try { setRes(await predictGuest(f)); }
    catch (e: any) { setErr(e?.response?.data?.detail || "The scan failed. Try another image."); }
    finally { setBusy(false); }
  };

  const useSample = async () => { const f = await sampleFile(); setIsSample(true); setFile(f); run(f); };

  useEffect(() => {
    if (params.get("sample")) useSample();
    else if (file) run(file);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pick = (f?: File | null) => { if (f) { setIsSample(false); setFile(f); run(f); } };
  const verdict = res?.decision.toLowerCase();

  return (
    <div className="landing">
      <div className="grain" />
      <TopNav />
      <main className="pub">
        <div className="scan">
          <div>
            <h1><span className="ln">Scan</span><span className="ln a">a wafer.</span></h1>
            <p className="lead">Upload a wafer map image. You get the pattern, the yield and a verdict in a few seconds. No account needed.</p>

            <div className="drop" role="button" tabIndex={0}
              onClick={() => input.current?.click()}
              onKeyDown={e => { if (e.key === "Enter" || e.key === " ") input.current?.click(); }}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); pick(e.dataTransfer.files?.[0]); }}>
              <input ref={input} type="file" accept="image/png,image/jpeg" hidden onChange={e => pick(e.target.files?.[0])} />
              {preview ? <><img src={preview} alt="Your wafer map" /><span>{file?.name}{isSample ? " (sample)" : ""}</span></>
                       : <><b>Drop a wafer map here</b><span>PNG or JPG, or click to choose</span></>}
            </div>
            <div className="acts">
              <button className="btn" onClick={useSample} disabled={busy}>Try a sample wafer</button>
              {file && <button className="btn" onClick={() => { setFile(null); setRes(null); setErr(null); }}>Clear</button>}
            </div>
            {err && <p className="err" style={{ marginTop: 16 }}>{err}</p>}
          </div>

          <div>
            {busy && <div className="empty">Reading the die map…</div>}
            {!busy && !res && !err && <div className="empty">Your result shows up here.</div>}
            {res && !busy && (
              <div className="result">
                <MapThumb name={res.defect_type} />
                <div className="rows">
                  <div className="row"><span className="k">Pattern</span><span className="v">{res.defect_type}</span></div>
                  <div className="row"><span className="k">Confidence</span><span className="v">{res.confidence.toFixed(1)}%</span></div>
                  <div className="row"><span className="k">Yield</span><span className="v">{res.yield_pct.toFixed(1)}%</span></div>
                  <div className="row verdict"><span className="k">Verdict</span><span className={"v " + verdict}>{res.decision}</span></div>
                </div>
                <div className="upsell">
                  <p>Want expert analysis, batch scans, drawing a map and a history of every wafer? Ask for access.</p>
                  <Link className="btn main" to="/request" style={{ display: "inline-flex" }}>Request access</Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
