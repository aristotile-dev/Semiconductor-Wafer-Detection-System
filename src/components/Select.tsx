import { useEffect, useRef, useState } from "react";
import Icon from "./Icons";

export interface Option { value: string | number; label: string; sub?: string; }
interface Props { value: string | number | null; options: Option[]; onChange: (v: any) => void; placeholder?: string; label: string; }

/** Listbox that replaces the browser's native select: keyboard works, options carry an initial and a second line. */
export default function Select({ value, options, onChange, placeholder = "Choose", label }: Props) {
  const [open, setOpen] = useState(false);
  const [cur, setCur] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const picked = options.find(o => o.value === value);

  useEffect(() => {
    const off = (e: MouseEvent) => { if (root.current && !root.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", off);
    return () => document.removeEventListener("mousedown", off);
  }, []);

  const choose = (o: Option) => { onChange(o.value); setOpen(false); };
  const key = (e: React.KeyboardEvent) => {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ")) { e.preventDefault(); setOpen(true); setCur(Math.max(0, options.findIndex(o => o.value === value))); return; }
    if (!open) return;
    if (e.key === "Escape") setOpen(false);
    else if (e.key === "ArrowDown") { e.preventDefault(); setCur(c => Math.min(options.length - 1, c + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setCur(c => Math.max(0, c - 1)); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (options[cur]) choose(options[cur]); }
  };

  return (
    <div className="sel" ref={root}>
      <button type="button" className="sel-btn" aria-haspopup="listbox" aria-expanded={open} aria-label={label} onClick={() => setOpen(o => !o)} onKeyDown={key}>
        {picked ? <><i>{picked.label.slice(0, 1).toUpperCase()}</i><span>{picked.label}{picked.sub && <small>{picked.sub}</small>}</span></> : <span className="ph">{placeholder}</span>}
        <Icon name="chevron" size={18} />
      </button>
      {open && (
        <ul className="sel-list" role="listbox" aria-label={label}>
          {options.map((o, i) => (
            <li key={o.value} role="option" aria-selected={o.value === value} className={(i === cur ? "cur " : "") + (o.value === value ? "on" : "")}
              onMouseEnter={() => setCur(i)} onMouseDown={e => { e.preventDefault(); choose(o); }}>
              <i>{o.label.slice(0, 1).toUpperCase()}</i>
              <span>{o.label}{o.sub && <small>{o.sub}</small>}</span>
              {o.value === value && <Icon name="check" size={18} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
