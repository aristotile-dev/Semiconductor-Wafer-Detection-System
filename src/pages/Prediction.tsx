import { useRef, useState } from "react";
import PageHeader from "../components/PageHeader";
import ResultPanel from "../components/ResultPanel";
import { predictImage, saveHistory, PredictResult } from "../api/client";
import { useHistory } from "../context/HistoryContext";

interface Props { waferId: string; dieArea: number; }

export default function Prediction({ waferId, dieArea }: Props) {
  const [file, setFile]       = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState<PredictResult | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addEntry } = useHistory();

  const handleFile = (f: File) => {
    setFile(f); setPreview(URL.createObjectURL(f));
    setResult(null); setError(null);
  };

  const clearImage = () => {
    setFile(null); setPreview(""); setResult(null); setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const isInvalidInput = error?.toLowerCase().includes("invalid input");

  const onRun = async () => {
    if (!file) return;
    setLoading(true); setError(null);
    try {
      const r = await predictImage(file, dieArea);
      setResult(r);
      addEntry(waferId, r);
      // Save to backend DB
      await saveHistory({
        wafer_id: waferId, defect_type: r.defect_type,
        confidence: r.confidence, yield_pct: r.yield_pct,
        decision: r.decision, defect_ratio: r.defect_ratio
      });
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || "Prediction failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Semiconductor Wafer Defect Detection"
        subtitle="EfficientNet-B3 · Murphy Yield Model · LLM Expert Analysis"
      />
      <div className="grid-2">
        <div className="card">
          <div className="card-title">Upload Wafer Image</div>
          <div
            className={`dropzone ${file ? "has-file" : ""}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
          >
            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/jpg"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            {!file ? (
              <>
                <div style={{ fontSize: "2rem", marginBottom: 6 }}>📤</div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Drop a wafer image here</div>
                <div className="dropzone-hint">PNG · JPG · JPEG — click or drag</div>
              </>
            ) : (
              <>
                <img src={preview} alt="preview" className="preview-img" />
                <div className="dropzone-hint mt-1">{file.name}</div>
              </>
            )}
          </div>

          <button className="btn btn-primary btn-block mt-2" onClick={onRun} disabled={!file || loading}>
            {loading ? <><span className="spinner" /> Analyzing…</> : "Run Prediction"}
          </button>

          {result && !error && (
            <button className="btn btn-ghost btn-block mt-1" onClick={clearImage} style={{ fontSize: "0.82rem" }}>
              🗑️ Clear Image
            </button>
          )}

          {error && (
            <div style={{ marginTop: 10 }}>
              <p style={{ color: "#B91C1C", fontSize: "0.85rem" }}>{error}</p>
              {isInvalidInput && (
                <button className="btn btn-ghost mt-1" onClick={clearImage} style={{ fontSize: "0.82rem", padding: "7px 14px" }}>
                  🗑️ Clear Image
                </button>
              )}
            </div>
          )}

          <div className="mt-3" style={{ fontSize: "0.78rem", color: "#64748B" }}>
            Wafer ID: <strong>{waferId}</strong> &nbsp;·&nbsp;
            Die Area: <strong>{dieArea.toFixed(1)} cm²</strong>
          </div>
        </div>

        <div>
          {result
            ? <ResultPanel result={result} />
            : <div className="card"><div className="empty-state">Results will appear here after you run a prediction.</div></div>
          }
        </div>
      </div>
    </>
  );
}
