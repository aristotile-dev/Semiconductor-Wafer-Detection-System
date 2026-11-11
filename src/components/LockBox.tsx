import { useEffect, useRef } from "react";

const R = 19; // rows in the dot grid

/** Cells of each part, as [col, row] pairs relative to the lock's top-left. */
const rect = (x0: number, x1: number, y0: number, y1: number) => { const o: [number, number][] = []; for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) o.push([x, y]); return o; };
const BODY = rect(0, 13, 10, 18).filter(([x, y]) => !(x >= 6 && x <= 7 && y >= 13 && y <= 16));
const SHACKLE = [...rect(5, 8, 2, 2), ...rect(3, 10, 3, 3), ...rect(2, 3, 4, 9), ...rect(10, 11, 4, 9)];
/** The key in profile, tip at x = 0 (the keyhole), shaft along y = 0, bow on the left, teeth below the shaft.
 *  "Turning" is a roll about the shaft: every y is scaled by cos(roll), so the key twists in place and never swings. */
const KEY: [number, number][] = (() => {
  const out: [number, number][] = [];
  for (let d = 0; d <= 13; d++) out.push([-d, 0]);
  for (let a = 0; a < 20; a++) out.push([Math.round(-16 + 2.8 * Math.cos(a * Math.PI / 10)), 2.8 * Math.sin(a * Math.PI / 10)]);
  out.push([-2, 1], [-2, 2], [-5, 1], [-5, 2], [-5, 3], [-8, 1]);
  return out;
})();

const hash = (i: number, j: number) => { const h = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return h - Math.floor(h); };

/** Phone and tablet version of the wafer: a dot-matrix padlock. Each finished field fills it with lime from the bottom;
 *  at 3/3 a pixel key slides in, the key fades, the shackle pops and the whole lock turns lime. */
export default function LockBox({ done, sent }: { done: number; sent: boolean }) {
  const wrap = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const state = useRef({ done, open: done === 3 || sent, t: 0 });
  const open = sent || done === 3;
  state.current.done = done;
  state.current.open = open;

  useEffect(() => {
    const box = wrap.current, c = cv.current; if (!box || !c) return;
    const g = c.getContext("2d")!;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let W = 0, H = 0, cell = 10, cols = 0, raf = 0, last = performance.now(), fillShown = 0;
    const size = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      W = box.clientWidth; H = box.clientHeight;
      c.width = W * dpr; c.height = H * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0);
      cell = H / R; cols = Math.floor(W / cell);
    };
    size();
    const ro = new ResizeObserver(size); ro.observe(box);

    const dot = (col: number, row: number, r: number, color: string) => {
      g.fillStyle = color; g.beginPath();
      g.arc(col * cell + cell / 2 + (W - cols * cell) / 2, row * cell + cell / 2, r * cell, 0, Math.PI * 2); g.fill();
    };

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const s = state.current;
      s.t = reduce ? (s.open ? 1 : 0) : Math.max(0, Math.min(1, s.t + (s.open ? dt / 2.2 : -dt / 0.5)));
      const t = s.t;
      fillShown += ((s.done / 3) - fillShown) * Math.min(1, dt * 6);
      g.clearRect(0, 0, W, H);

      const ox = Math.floor(cols / 2 - 7), oy = 0;
      const mid = cols / 2;
      // faint halftone field: dots swell near the lock, like a printed screen
      for (let j = 0; j < R; j++) for (let i = 0; i < cols; i++) {
        const d = Math.hypot((i - mid) / 1.6, j - 10);
        const h = hash(i, j), far = Math.abs(i - mid) > 9;
        const base = 0.08 + h * 0.2 + Math.max(0, 1 - d / 12) * 0.08;
        const wake = far && h < (t >= 0.85 ? 0.5 : fillShown * 0.35);
        dot(i, j, wake ? base + 0.1 : base, wake ? "#6f8a2b" : "#2e2e3d");
      }

      const litRow = 19 - fillShown * 9; // rows below this are lime
      const lime = "#c6ff3d", dim = "#3b3b4b";
      BODY.forEach(([x, y]) => dot(ox + x, oy + y, 0.42, t >= 0.58 || y + 0.5 >= litRow ? lime : dim));

      const pop = t < 0.58 ? 0 : Math.min(1, (t - 0.58) / 0.2);
      const lift = Math.round(pop * 3);
      SHACKLE.forEach(([x, y]) => dot(ox + x + (pop > 0.5 ? 0 : 0), oy + y - lift, 0.42, pop > 0.5 ? lime : "#8a8a99"));

      // key: slides in from the left to the keyhole, then fades
      if (t > 0 && t < 0.92) {
        // 1) the key slides in from the left until its stem sits in the keyhole
        const run = Math.min(1, t / 0.3), ease = 1 - Math.pow(1 - run, 3);
        const px = -16 + (ox + 6 + 16) * ease, py = 14; // tip rests in the keyhole
        // 2) it stays exactly where it is and rolls about its own shaft: a small wind-up, then a quarter turn
        const tw = Math.max(0, Math.min(1, (t - 0.34) / 0.26));
        const roll = tw < 0.15 ? -(tw / 0.15) * 0.2 : -0.2 + (1 - Math.pow(1 - (tw - 0.15) / 0.85, 3)) * (Math.PI / 2 + 0.2);
        const cs = Math.cos(roll);
        const fade = t < 0.72 ? 1 : 1 - (t - 0.72) / 0.2;
        g.globalAlpha = Math.max(0, fade);
        KEY.forEach(([x, y]) => dot(Math.round(px + x), Math.round(py + y * cs), 0.46, "#ff2e93"));
        g.globalAlpha = 1;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  return (
    <div ref={wrap} className={"lockbox d" + done + (open ? " open" : "")} role="img" aria-label={open ? "Access ready, lock open" : `Lock closed, ${done} of 3 fields done`}>
      <canvas ref={cv} aria-hidden="true" />
      <span className="lockcap" aria-hidden="true">{sent ? "Sent" : open ? "Unlocked" : `${done}/3`}</span>
    </div>
  );
}
