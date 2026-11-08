import { useRef, useState } from "react";
import { PATTERN_NAMES, dieMap } from "../lib/patterns";
import Icon from "./Icons";

interface Props { file: File | null; preview: string; busy: boolean; onPick: (f: File, sample?: boolean) => void; label?: string; compact?: boolean; }

/** Sample wafer image for people who have no map to hand. Drawn the same way the model expects: dark dies, defects in pink. */
export function makeSample(name?: string): Promise<File> {
  const pick = name ?? PATTERN_NAMES[Math.floor(Math.random() * 8)];
  const c = document.createElement("canvas"); c.width = c.height = 256;
  const g = c.getContext("2d")!, n = 25, s = c.width / n;
  g.fillStyle = "#0d0d13"; g.fillRect(0, 0, 256, 256);
  for (const d of dieMap(pick, n).dies) { g.fillStyle = d.bad ? "#ff2e93" : "#2a2a36"; g.fillRect(d.i * s + 1, d.j * s + 1, s - 2, s - 2); }
  return new Promise(res => c.toBlob(b => res(new File([b!], `sample-${pick.toLowerCase()}.png`, { type: "image/png" })), "image/png"));
}

/** Round, notched drop target. While a scan is in flight a pink line sweeps across it. */
export default function WaferDrop({ file, preview, busy, onPick, label = "Drop a wafer map", compact = false }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  return (
    <div className={"wd-wrap" + (compact ? " compact" : "")}>
      <div className={"wd" + (over ? " over" : "") + (busy ? " busy" : "") + (file ? " has" : "")} role="button" tabIndex={0}
        aria-label={file ? `${file.name}. Click to choose another.` : label}
        onClick={() => input.current?.click()}
        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.current?.click(); } }}
        onDragOver={e => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
        onDrop={e => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files?.[0]; if (f) onPick(f); }}>
        <input ref={input} type="file" accept="image/png,image/jpeg" hidden onChange={e => { const f = e.target.files?.[0]; if (f) onPick(f); e.target.value = ""; }} />
        <i className="wd-grid" aria-hidden="true" />
        {preview
          ? <img src={preview} alt="" />
          : <div className="wd-in"><Icon name="up" size={34} /><b>Drop a<br />wafer map</b><span>PNG or JPG<br />Click or drag</span></div>}
        <i className="sweep" aria-hidden="true" />
      </div>
      <div className="wd-cap">
        <span>{file ? file.name : "No file yet"}</span>
        <button type="button" onClick={async () => onPick(await makeSample(), true)}>Try a sample wafer</button>
      </div>
    </div>
  );
}
