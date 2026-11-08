import { useEffect, useState } from "react";
import RunSettings from "../components/RunSettings";
import ResultPanel from "../components/ResultPanel";
import WaferDrop, { makeSample } from "../components/WaferDrop";
import IdleStage from "../components/IdleStage";
import { predictImage, saveHistory, PredictResult } from "../api/client";
import { useHistory } from "../context/HistoryContext";

interface Props { waferId: string; dieArea: number; onWaferIdChange: (v: string) => void; onDieAreaChange: (v: number) => void; }

export default function Prediction({ waferId, dieArea, onWaferIdChange, onDieAreaChange }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { addEntry } = useHistory();

  useEffect(() => {
    if (!file) { setPreview(""); return; }
    const u = URL.createObjectURL(file); setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  const run = async (f: File | null = file) => {
    if (!f) return;
    setLoading(true); setError(null);
    try {
      const r = await predictImage(f, dieArea);
      setResult(r); addEntry(waferId, r);
      await saveHistory({ wafer_id: waferId, defect_type: r.defect_type, confidence: r.confidence, yield_pct: r.yield_pct, decision: r.decision, defect_ratio: r.defect_ratio });
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || "The scan failed. Try another image.");
    } finally { setLoading(false); }
  };

  const pick = (f: File, sample?: boolean) => { setFile(f); setResult(null); setError(null); if (sample) run(f); };
  const clear = () => { setFile(null); setResult(null); setError(null); };

  return (
    <div className={"scanpage" + (result ? " done" : "")}>
      <section className="left">
        <div className="titleblock">
          <h1 className="one"><span>Scan </span><em>a wafer.</em></h1>
        </div>
        <WaferDrop file={file} preview={preview} busy={loading} onPick={pick} />
        <div className="info2">
          <div className="bot2">
            <div className="capline">
              <span>{file ? file.name : "No file yet"}</span>
              <button type="button" onClick={async () => pick(await makeSample(), true)}>Try a sample wafer</button>
            </div>
            <div className="acts">
              <button className="btn main" onClick={() => run()} disabled={!file || loading}>
                {loading ? <><i className="spin" /> Scanning</> : "Scan wafer"}
              </button>
              {file && !loading && <button className="btn" onClick={clear}>Clear</button>}
            </div>
            {error && <p className="err" role="alert">{error}</p>}
          </div>
        </div>
      </section>
      <div className="setrow">
        <RunSettings waferId={waferId} dieArea={dieArea} onWaferIdChange={onWaferIdChange} onDieAreaChange={onDieAreaChange} />
      </div>
      {result ? <ResultPanel result={result} variant="scan" /> : <IdleStage />}
    </div>
  );
}
