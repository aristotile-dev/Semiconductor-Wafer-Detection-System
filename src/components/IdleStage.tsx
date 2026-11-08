import { useEffect, useState } from "react";
import DieStage from "./DieStage";
import { PATTERN_NAMES } from "../lib/patterns";

/** Before the first result the stage plays through the nine patterns, and the facts row holds its place so nothing jumps later. */
export default function IdleStage({ hint = "Example pattern. Scan a wafer to replace it." }: { hint?: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI(n => (n + 1) % (PATTERN_NAMES.length - 1)), 2800);
    return () => clearInterval(t);
  }, []);
  const name = PATTERN_NAMES[i];
  return (
    <>
      <div className="rstage" aria-live="polite">
        <DieStage name={name} replay={name} className="idle">
          <div className="read idle"><div className="num sm">{name}</div><span className="cap">{hint}</span></div>
        </DieStage>
      </div>
      <div className="rfacts">
        <section className="facts idle">
          <div><span>Pattern</span><b>{name}</b></div>
          <div><span>Confidence</span><b className="dim">–</b></div>
          <div><span>Dies affected</span><b className="dim">–</b></div>
        </section>
      </div>
    </>
  );
}
