import { useEffect, useRef, useState } from "react";
import PageHeader from "../components/PageHeader";
import ResultPanel from "../components/ResultPanel";
import { predictDraw, PredictResult } from "../api/client";
import { useHistory } from "../context/HistoryContext";

interface Props { waferId: string; dieArea: number; }

const CANVAS_SIZE = 320;

export default function DrawMode({ waferId, dieArea }: Props) {
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const drawingRef  = useRef(false);
  const [result, setResult]   = useState<PredictResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const { addEntry } = useHistory();

  const resetCanvas = () => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#C8C8C8";
    ctx.fillRect(0, 0, c.width, c.height);
    // Soft wafer outline for the user
    ctx.save();
    ctx.strokeStyle = "rgba(0,0,0,0.15)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(c.width / 2, c.height / 2, Math.min(c.width, c.height) / 2 - 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  };

  useEffect(() => { resetCanvas(); }, []);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    const pt = "touches" in e ? e.touches[0] : e;
    return {
      x: (pt.clientX - rect.left) * (c.width / rect.width),
      y: (pt.clientY - rect.top)  * (c.height / rect.height)
    };
  };

  const start = (e: React.MouseEvent | React.TouchEvent) => {
    drawingRef.current = true;
    const { x, y } = getPos(e);
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(x, y, 9, 0, Math.PI * 2);
    ctx.fill();
  };

  const move = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawingRef.current) return;
    const { x, y } = getPos(e);
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(x, y, 9, 0, Math.PI * 2);
    ctx.fill();
  };

  const end = () => { drawingRef.current = false; };

  const onRun = async () => {
    const c = canvasRef.current;
    if (!c) return;
    setLoading(true); setError(null);
    try {
      const dataUrl = c.toDataURL("image/png");
      const r = await predictDraw(dataUrl, dieArea);
      setResult(r);
      addEntry(waferId + "-DRAW", r);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || "Prediction failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Draw Mode"
        subtitle="Sketch a defect pattern on the wafer and run instant prediction"
      />

      <div className="grid-2 grid-2-even">
        <div className="card">
          <div className="card-title">Defect Pattern Canvas</div>
          <p style={{ color: "#64748B", fontSize: "0.82rem", marginBottom: 10 }}>
            Click / drag to mark defect dies (black).
          </p>

          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            style={{
              width: "100%",
              maxWidth: CANVAS_SIZE,
              aspectRatio: "1 / 1",
              borderRadius: 12,
              border: "1px solid var(--border)",
              cursor: "crosshair",
              display: "block",
              margin: "0 auto"
            }}
            onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
            onTouchStart={start} onTouchMove={move} onTouchEnd={end}
          />

          <div className="row mt-2">
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={onRun} disabled={loading}>
              {loading ? <><span className="spinner" /> Predicting…</> : "Run Prediction"}
            </button>
            <button className="btn btn-ghost" onClick={resetCanvas}>Clear Canvas</button>
          </div>

          {error && <p style={{ color: "#B91C1C", fontSize: "0.85rem", marginTop: 10 }}>{error}</p>}
        </div>

        <div>
          {result
            ? <ResultPanel result={result} />
            : (
              <div className="card">
                <div className="empty-state">Draw a pattern and click Run Prediction.</div>
              </div>
            )
          }
        </div>
      </div>
    </>
  );
}
