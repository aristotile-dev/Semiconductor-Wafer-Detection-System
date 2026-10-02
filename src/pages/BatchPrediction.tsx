import { useRef, useState } from "react";
import PageHeader from "../components/PageHeader";
import { predictImage, saveHistory, PredictResult } from "../api/client";
import { useHistory } from "../context/HistoryContext";

interface BatchItem {
  file:    File;
  preview: string;
  status:  "pending" | "processing" | "success" | "invalid" | "error";
  result?: PredictResult;
  error?:  string;
}

const decisionColor: Record<string, string> = { SAVE: "#10B981", REVIEW: "#F59E0B", SCRAP: "#EF4444" };
const decisionBadge: Record<string, string> = { SAVE: "badge-save", REVIEW: "badge-review", SCRAP: "badge-scrap" };

interface Props { dieArea: number; }

export default function BatchPrediction({ dieArea }: Props) {
  const [items, setItems]     = useState<BatchItem[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone]       = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addEntry } = useHistory();

  const handleFiles = (files: FileList) => {
    const arr = Array.from(files).slice(0, 10);
    setItems(arr.map(f => ({ file: f, preview: URL.createObjectURL(f), status: "pending" })));
    setDone(false);
  };

  const runBatch = async () => {
    if (items.length === 0) return;
    setRunning(true); setDone(false);

    for (let i = 0; i < items.length; i++) {
      setItems(prev => prev.map((it, idx) => idx === i ? { ...it, status: "processing" } : it));
      try {
        const r = await predictImage(items[i].file, dieArea);
        const batchWaferId = `BATCH-${String(i + 1).padStart(3, "0")}`;
        addEntry(batchWaferId, r);
        await saveHistory({
          wafer_id: batchWaferId, defect_type: r.defect_type,
          confidence: r.confidence, yield_pct: r.yield_pct,
          decision: r.decision, defect_ratio: r.defect_ratio
        });
        setItems(prev => prev.map((it, idx) => idx === i ? { ...it, status: "success", result: r } : it));
      } catch (e: any) {
        const msg = e?.response?.data?.detail || e?.message || "Prediction failed";
        const isInvalid = msg.toLowerCase().includes("invalid input");
        setItems(prev => prev.map((it, idx) => idx === i ? { ...it, status: isInvalid ? "invalid" : "error", error: msg } : it));
      }
    }
    setRunning(false); setDone(true);
  };

  const clearAll = () => {
    setItems([]); setDone(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const successItems = items.filter(i => i.status === "success");
  const invalidItems = items.filter(i => i.status === "invalid");

  return (
    <>
      <PageHeader title="Batch Prediction" subtitle="Upload multiple wafer images — processed one by one automatically" />

      <div className="card">
        <div className="card-title">Upload Wafer Images (max 10)</div>
        <div
          className={`dropzone ${items.length > 0 ? "has-file" : ""}`}
          onClick={() => !running && fileInputRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); if (!running && e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files); }}
          style={{ cursor: running ? "not-allowed" : "pointer" }}
        >
          <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/jpg" multiple
            onChange={e => { if (e.target.files?.length) handleFiles(e.target.files); }} />
          {items.length === 0 ? (
            <>
              <div style={{ fontSize: "2rem", marginBottom: 6 }}>📦</div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Drop multiple wafer images here</div>
              <div className="dropzone-hint">PNG · JPG · JPEG — up to 10 images</div>
            </>
          ) : (
            <div style={{ fontSize: "0.85rem", color: "#64748B" }}>
              {items.length} image{items.length > 1 ? "s" : ""} selected — click to change
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={runBatch} disabled={items.length === 0 || running}>
            {running ? <><span className="spinner" /> Processing…</> : `Run Batch (${items.length} images)`}
          </button>
          {items.length > 0 && !running && (
            <button className="btn btn-ghost" onClick={clearAll}>🗑️ Clear All</button>
          )}
        </div>
      </div>

      {done && (
        <div className="card" style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {[
            { label: "Total", value: items.length, color: "#1E293B" },
            { label: "✅ Success", value: successItems.length, color: "#10B981" },
            { label: "❌ Invalid", value: invalidItems.length, color: "#EF4444" },
            { label: "Avg Yield", value: successItems.length > 0 ? (successItems.reduce((s, i) => s + (i.result?.yield_pct ?? 0), 0) / successItems.length).toFixed(1) + "%" : "—", color: "#6D28D9" }
          ].map((s, i) => (
            <div key={i} className="metric-card" style={{ flex: 1, minWidth: 100 }}>
              <div className="m-label">{s.label}</div>
              <div className="m-value" style={{ color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {items.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {items.map((item, idx) => (
            <div key={idx} className="card" style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <img src={item.preview} alt={item.file.name} style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 8, flexShrink: 0, border: "1px solid #E2E8F0" }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "#1E293B", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {item.file.name}
                </div>
                {item.status === "pending"    && <span style={{ fontSize: "0.78rem", color: "#94A3B8" }}>⏳ Waiting…</span>}
                {item.status === "processing" && <span style={{ fontSize: "0.78rem", color: "#6D28D9", display: "flex", alignItems: "center", gap: 6 }}><span className="spinner" style={{ borderColor: "rgba(109,40,217,0.3)", borderTopColor: "#6D28D9", width: 14, height: 14 }} />Analyzing…</span>}
                {item.status === "invalid"    && <span style={{ fontSize: "0.78rem", color: "#B91C1C" }}>❌ Invalid input — not a wafer image</span>}
                {item.status === "error"      && <span style={{ fontSize: "0.78rem", color: "#B91C1C" }}>⚠️ {item.error}</span>}
                {item.status === "success" && item.result && (
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <span className={`badge ${decisionBadge[item.result.decision]}`} style={{ fontSize: "0.72rem", padding: "3px 10px" }}>
                      {item.result.decision === "SAVE" ? "✅" : item.result.decision === "REVIEW" ? "⚠️" : "❌"} {item.result.decision}
                    </span>
                    <span style={{ fontSize: "0.78rem", color: "#334155" }}>
                      <strong>{item.result.defect_type}</strong> · {item.result.confidence.toFixed(1)}% confidence
                    </span>
                    <span style={{ fontSize: "0.78rem", color: "#64748B" }}>
                      Yield: <strong style={{ color: decisionColor[item.result.decision] }}>{item.result.yield_pct}%</strong>
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
