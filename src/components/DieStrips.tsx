import { useEffect, useRef, useState } from "react";

/** Two strips of dies that run the full height of a wide screen, a few of them lit like a real wafer map.
 *  They sit exactly on the nav's left and right edges and fill the side margins. Decoration only. */
function Strip({ seed }: { seed: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [rows, setRows] = useState(0);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const fit = () => setRows(Math.max(6, Math.floor((el.clientHeight + 5) / 17)));
    fit();
    const ro = new ResizeObserver(fit); ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} className="strip-col" style={{ gridTemplateRows: `repeat(${rows}, 1fr)` }} aria-hidden="true">
      {Array.from({ length: rows * 2 }, (_, i) => {
        const n = (i * 37 + seed * 11) % 23;
        return <s key={i} className={n === 0 ? "on" : n === 9 ? "hot" : n % 5 === 0 ? "dim" : undefined} />;
      })}
    </div>
  );
}

export default function DieStrips() {
  return (
    <>
      <div className="dstrip dstrip-l"><Strip seed={0} /></div>
      <div className="dstrip dstrip-r"><Strip seed={1} /></div>
    </>
  );
}
