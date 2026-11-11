import { useEffect, useRef } from "react";
import { dieMap } from "../lib/patterns";

interface Props { name: string; /** replay the center-out reveal when this changes */ replay?: string | number; children?: React.ReactNode; className?: string; }

const N = 31;

/** The big wafer. Good dies sit dark, bad dies light up pink from the center outward. */
export default function DieStage({ name, replay, children, className = "" }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = ref.current; if (!c) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const S = 640;
    c.width = S * dpr; c.height = S * dpr;
    const g = c.getContext("2d")!;
    g.scale(dpr, dpr);
    const { dies } = dieMap(name, N);
    const s = S / N, cx = S / 2;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now(), D = reduce ? 1 : 900;
    let raf = 0;

    const frame = (now: number) => {
      const t = Math.min(1, (now - start) / D);
      g.clearRect(0, 0, S, S);
      g.save(); g.beginPath(); g.arc(cx, cx, cx - 2, 0, Math.PI * 2); g.clip();
      const bg = g.createRadialGradient(cx * 0.8, cx * 0.7, 20, cx, cx, cx);
      bg.addColorStop(0, "#1d1d29"); bg.addColorStop(1, "#101016");
      g.fillStyle = bg; g.fillRect(0, 0, S, S);
      for (const d of dies) {
        const x = d.i * s, y = d.j * s;
        const r = Math.hypot(d.i - (N - 1) / 2, d.j - (N - 1) / 2) / ((N - 1) / 2);
        const on = d.bad && t > r * 0.8;
        if (on) { g.shadowColor = "#ff2e93"; g.shadowBlur = 14; g.fillStyle = "#ff2e93"; }
        else { g.shadowBlur = 0; g.fillStyle = "#2a2a37"; }
        g.fillRect(x + 1.5, y + 1.5, s - 3, s - 3);
      }
      g.restore();
      // rim + flat notch
      g.shadowBlur = 0; g.lineWidth = 2; g.strokeStyle = "#ffffff38";
      g.beginPath(); g.arc(cx, cx, cx - 2, 0, Math.PI * 2); g.stroke();
      g.fillStyle = "#0a0a0f"; g.beginPath(); g.arc(cx, S - 1, 13, 0, Math.PI * 2); g.fill();
      g.strokeStyle = "#ffffff38"; g.beginPath(); g.arc(cx, S - 1, 13, Math.PI, 0); g.stroke();
      if (t < 1) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [name, replay]);

  return (
    <div className={"stage " + className}>
      <i className="ticks" aria-hidden="true" />
      <canvas ref={ref} role="img" aria-label={`Die map for ${name}`} />
      {children}
    </div>
  );
}
