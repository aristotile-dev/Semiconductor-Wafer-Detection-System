import { useEffect, useRef } from "react";
import { PATTERNS, dieMap } from "../lib/patterns";

/** Die map of a pattern: bad dies hot pink, good dies dark. */
export default function DieMap({ name, className = "map" }: { name: string; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const g = c.getContext("2d")!, n = 25, s = c.width / n;
    g.clearRect(0, 0, c.width, c.height);
    for (const d of dieMap(name in PATTERNS ? name : "None", n).dies) {
      g.fillStyle = d.bad ? "#ff2e93" : "#2d2d3a";
      g.fillRect(d.i * s + 1, d.j * s + 1, s - 2, s - 2);
    }
  }, [name]);
  return <canvas ref={ref} className={className} width={300} height={300} role="img" aria-label={`Die map for ${name}`} />;
}
