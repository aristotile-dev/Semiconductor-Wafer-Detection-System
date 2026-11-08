import { useEffect, useRef } from "react";

const N = 31;

/** A blank wafer whose dies light up lime from the centre outward as `fill` (0 to 1) grows. */
export default function FillWafer({ fill, color = "#c6ff3d", children, className = "" }: { fill: number; color?: string; children?: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const shown = useRef(0);
  const target = useRef(fill);
  target.current = fill;
  const tint = useRef(color);
  tint.current = color;

  useEffect(() => {
    const c = ref.current; if (!c) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const S = 640;
    c.width = S * dpr; c.height = S * dpr;
    const g = c.getContext("2d")!;
    g.scale(dpr, dpr);
    const s = S / N, cx = S / 2, mid = (N - 1) / 2;
    const dies: { x: number; y: number; r: number }[] = [];
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const r = Math.hypot(i - mid, j - mid) / mid;
      if (r <= 1.02) dies.push({ x: i * s, y: j * s, r });
    }
    dies.sort((a, b) => a.r - b.r);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;

    const draw = () => {
      g.clearRect(0, 0, S, S);
      g.save(); g.beginPath(); g.arc(cx, cx, cx - 2, 0, Math.PI * 2); g.clip();
      const bg = g.createRadialGradient(cx * 0.8, cx * 0.7, 20, cx, cx, cx);
      bg.addColorStop(0, "#1d1d29"); bg.addColorStop(1, "#101016");
      g.fillStyle = bg; g.fillRect(0, 0, S, S);
      const lit = shown.current * dies.length;
      dies.forEach((d, k) => {
        if (k < lit) { g.shadowColor = tint.current; g.shadowBlur = 12; g.fillStyle = tint.current; }
        else { g.shadowBlur = 0; g.fillStyle = "#2a2a37"; }
        g.fillRect(d.x + 1.5, d.y + 1.5, s - 3, s - 3);
      });
      g.restore();
      g.shadowBlur = 0; g.lineWidth = 2; g.strokeStyle = "#ffffff38";
      g.beginPath(); g.arc(cx, cx, cx - 2, 0, Math.PI * 2); g.stroke();
      g.fillStyle = "#0a0a0f"; g.beginPath(); g.arc(cx, S - 1, 13, 0, Math.PI * 2); g.fill();
      g.strokeStyle = "#ffffff38"; g.beginPath(); g.arc(cx, S - 1, 13, Math.PI, 0); g.stroke();
    };
    const tick = () => {
      const d = target.current - shown.current;
      shown.current = reduce || Math.abs(d) < 0.002 ? target.current : shown.current + d * 0.1;
      draw();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className={"stage " + className}>
      <i className="ticks" aria-hidden="true" />
      <canvas ref={ref} role="img" aria-label={`Wafer ${Math.round(fill * 100)} percent filled`} />
      {children}
    </div>
  );
}
