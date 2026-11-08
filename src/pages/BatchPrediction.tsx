import { useRef, useState } from "react";
import RunSettings from "../components/RunSettings";
import { predictImage, saveHistory, PredictResult } from "../api/client";
import { useHistory } from "../context/HistoryContext";

interface Item { file: File; preview: string; status: "pending" | "processing" | "success" | "invalid" | "error"; result?: PredictResult; error?: string; }
interface Props { dieArea: number; onDieAreaChange: (v: number) => void; }

export default function BatchPrediction({ dieArea, onDieAreaChange }: Props) {
  const [items, setItems] = useState<Item[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const { addEntry } = useHistory();

  const pick = (files: FileList) => {
    setItems(Array.from(files).slice(0, 10).map(f => ({ file: f, preview: URL.createObjectURL(f), status: "pending" })));
    setDone(false);
  };

  const run = async () => {
    if (!items.length) return;
    setRunning(true); setDone(false);
    for (let i = 0; i < items.length; i++) {
      setItems(p => p.map((it, k) => k === i ? { ...it, status: "processing" } : it));
      try {
        const r = await predictImage(items[i].file, dieArea);
        const id = `BATCH-${String(i + 1).padStart(3, "0")}`;
        addEntry(id, r);
        await saveHistory({ wafer_id: id, defect_type: r.defect_type, confidence: r.confidence, yield_pct: r.yield_pct, decision: r.decision, defect_ratio: r.defect_ratio });
        setItems(p => p.map((it, k) => k === i ? { ...it, status: "success", result: r } : it));
      } catch (e: any) {
        const msg = e?.response?.data?.detail || e?.message || "Scan failed";
        setItems(p => p.map((it, k) => k === i ? { ...it, status: msg.toLowerCase().includes("invalid input") ? "invalid" : "error", error: msg } : it));
      }
    }
    setRunning(false); setDone(true);
  };

  const clear = () => { setItems([]); setDone(false); if (input.current) input.current.value = ""; };
  const finished = items.filter(i => i.status === "success" || i.status === "invalid" || i.status === "error");
  const ok = items.filter(i => i.status === "success");
  const bad = items.filter(i => i.status === "invalid");
  const started = running || done;
  const avg = ok.length ? (ok.reduce((s, i) => s + (i.result?.yield_pct ?? 0), 0) / ok.length).toFixed(1) + "%" : "–";
  const label = items.length === 0 ? "Scan wafers" : items.length === 1 ? "Scan 1 wafer" : `Scan ${items.length} wafers`;
  const short = (n: string) => (n.length > 14 ? n.slice(0, 11) + "..." : n);

  return (
    <div className="batchpage">
      <section className="bleft">
        <h1 className="one"><span>Scan </span><em>a stack.</em></h1>
        <div className={"bdrop" + (items.length ? " has" : "")} role="button" tabIndex={0}
          onClick={() => !running && input.current?.click()}
          onKeyDown={e => { if ((e.key === "Enter" || e.key === " ") && !running) { e.preventDefault(); input.current?.click(); } }}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); if (!running && e.dataTransfer.files?.length) pick(e.dataTransfer.files); }}>
          <input ref={input} type="file" accept="image/png,image/jpeg" multiple hidden onChange={e => e.target.files?.length && pick(e.target.files)} />
          <i className="ring" />
          {items.length === 0
            ? <div><b>Drop up to 10<br />wafer maps</b><span>PNG or JPG. Click or drag.</span></div>
            : <div><b>{items.length} {items.length === 1 ? "map" : "maps"}<br />ready</b><span>Click to pick different ones</span></div>}
        </div>
        <div className="acts">
          <button className="btn main" onClick={run} disabled={!items.length || running}>
            {running ? <><i className="spin" /> Scanning {Math.min(finished.length + 1, items.length)} of {items.length}</> : label}
          </button>
          {items.length > 0 && !running && <button className="btn" onClick={clear}>Clear</button>}
        </div>
        <RunSettings dieArea={dieArea} onDieAreaChange={onDieAreaChange} />
      </section>

      <section className="bright">
        <div className="tile rackbox">
          <h2>Wafer rack <small>{items.length} of 10 slots</small></h2>
          <div className="rack" aria-label="Wafer slots"><div className="rackin">
            {Array.from({ length: 10 }).map((_, i) => {
              const it = items[i];
              const tone = it?.status === "success" ? it.result!.decision.toLowerCase() : it?.status === "invalid" || it?.status === "error" ? "scrap" : "";
              return (
                <div key={i} className="cell">
                  <div className={"slot " + (it ? it.status : "vacant") + " " + tone}>
                    {it ? <img src={it.preview} alt="" /> : <b>{i + 1}</b>}
                  </div>
                  <span className="lab">{it ? short(it.file.name) : "Empty"}</span>
                  <span className={"st " + tone}>
                    {!it ? "" : it.status === "success" ? `${it.result!.yield_pct}% ${it.result!.decision}` : it.status === "processing" ? "Scanning" : it.status === "invalid" ? "Not a map" : it.status === "error" ? "Failed" : "Waiting"}
                  </span>
                </div>
              );
            })}
          </div>
          </div>
          <div className="key" aria-label="Verdict key">
            <span><i className="save" />SAVE 70%+</span>
            <span><i className="review" />REVIEW 40-69%</span>
            <span><i className="scrap" />SCRAP under 40%</span>
          </div>
        </div>
        <section className="facts four" aria-label="Batch totals">
          <div><span>Scanned</span><b>{started ? finished.length : "–"}</b></div>
          <div><span>Read OK</span><b>{started ? ok.length : "–"}</b></div>
          <div><span>Not a map</span><b>{started ? bad.length : "–"}</b></div>
          <div><span>Average yield</span><b>{started ? avg : "–"}</b></div>
        </section>
      </section>

      {finished.length > 0 && (
        <section className="bjobs">
          <div className="jobs">
            {items.map((it, i) => (
              <div key={i} className="job">
                <img src={it.preview} alt="" />
                <div style={{ minWidth: 0 }}>
                  <div className="n">{it.file.name}</div>
                  <div className="s">
                    {it.status === "pending" && "Waiting"}
                    {it.status === "processing" && "Scanning…"}
                    {it.status === "invalid" && "Not a wafer map"}
                    {it.status === "error" && it.error}
                    {it.status === "success" && it.result && `${it.result.defect_type} · ${it.result.confidence.toFixed(1)}% sure`}
                  </div>
                </div>
                {it.status === "success" && it.result && (
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span className="y">{it.result.yield_pct}%</span>
                    <span className={"v " + it.result.decision.toLowerCase()}>{it.result.decision}</span>
                  </div>
                )}
                {it.status === "processing" && <i className="spin lt" />}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
