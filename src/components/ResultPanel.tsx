import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "./Icons";
import { motion, AnimatePresence } from "framer-motion";
import type { PredictResult } from "../api/client";
import { explain, chat } from "../api/client";
import DieStage from "./DieStage";
const WaferScene = lazy(() => import("./WaferScene"));

interface Props { result: PredictResult; variant?: "stack" | "scan"; liveSource?: React.RefObject<HTMLCanvasElement | null>; }
interface ChatMsg { role: "user" | "assistant"; content: string; }

const COLOR = { save: "#c6ff3d", review: "#ffd23d", scrap: "#ff2e93" } as const;

function Explanation({ text }: { text: string }) {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  return <div className="say">{lines.map((l, i) => <p key={i} className={/^step\s*\d+:/i.test(l) ? "h" : ""}>{l}</p>)}</div>;
}

export default function ResultPanel({ result, variant = "stack", liveSource }: Props) {
  const [expl, setExpl] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [showCam, setShowCam] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  const ctx = { defect_type: result.defect_type, confidence: result.confidence, yield_pct: result.yield_pct, decision: result.decision };

  useEffect(() => {
    let off = false;
    setExpl(""); setErr(null); setLoading(true); setChatOpen(false); setMessages([]); setShowCam(false);
    explain(ctx)
      .then(t => { if (!off) setExpl(t); })
      .catch(e => { if (!off) setErr(e?.response?.data?.detail || "Expert analysis is not available right now."); })
      .finally(() => { if (!off) setLoading(false); });
    return () => { off = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  useEffect(() => { logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" }); }, [messages, chatLoading]);

  const sendText = async (q: string) => {
    q = q.trim(); if (!q || chatLoading) return;
    const next: ChatMsg[] = [...messages, { role: "user", content: q }];
    setMessages(next); setInput(""); setChatLoading(true);
    try {
      const reply = await chat({ message: q, context: ctx, history: messages });
      setMessages([...next, { role: "assistant", content: reply }]);
    } catch {
      setMessages([...next, { role: "assistant", content: "That did not go through. Try again." }]);
    } finally { setChatLoading(false); }
  };
  const send = (e: React.FormEvent) => { e.preventDefault(); sendText(input); };

  useEffect(() => {
    if (!chatOpen) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setChatOpen(false); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [chatOpen]);

  const v = result.decision.toLowerCase() as keyof typeof COLOR;
  const probs = Object.entries(result.all_probs).sort((a, b) => b[1] - a[1]);

  const readout = (
    <div className={"read " + v}>
      <div className="num">{result.yield_pct.toFixed(result.yield_pct % 1 ? 1 : 0)}<sup>%</sup></div>
      <span className={"sticker " + v}>{result.decision}</span>
    </div>
  );
  const cells = (
    <>
      <div><span>Pattern</span><b>{result.defect_type}</b></div>
      <div><span>Confidence</span><b>{result.confidence.toFixed(1)}%</b></div>
      <div><span>Dies affected</span><b>{(result.defect_ratio * 100).toFixed(1)}%</b></div>
    </>
  );
  const gauge = (
    <div className="gauge"><span>Yield vs thresholds</span>
      <div className="zones"><i style={{ width: `${Math.min(100, result.yield_pct)}%`, background: COLOR[v] }} /><u style={{ left: "40%" }} /><u style={{ left: "70%" }} /></div>
      <div className="scale"><span style={{ left: 0 }}>0</span><span style={{ left: "40%" }}>40</span><span style={{ left: "70%" }}>70</span><span style={{ right: 0 }}>100</span></div>
    </div>
  );
  const factsEl = <section className="facts">{cells}{gauge}</section>;
  const factsMini = <section className="facts">{cells}</section>;
  const oddsEl = (
    <section className="tile">
        <h2>Pattern odds <small>{(result.defect_ratio * 100).toFixed(2)}% of dies affected</small></h2>
        <div className="probs">
          {probs.map(([name, p], i) => (
            <div key={name} className={"prob" + (i === 0 ? " top" : "")}>
              <span>{name}</span><div><i style={{ width: `${Math.max(1, p)}%` }} /></div><em>{p.toFixed(1)}%</em>
            </div>
          ))}
        </div>
      </section>
  );
  const camEl = (
    <>
      {result.gradcam && (
        <section className="tile">
          <h2>Where the model looked
            <button className="btn sm" onClick={() => setShowCam(s => !s)}>{showCam ? "Hide" : "Show heatmap"}</button>
          </h2>
          <AnimatePresence initial={false}>
            {showCam && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ overflow: "hidden" }}>
                <img src={result.gradcam} alt="Grad-CAM heatmap" style={{ width: "100%", maxWidth: 360, borderRadius: 12, display: "block", margin: "0 auto" }} />
                <p className="note" style={{ marginTop: 12 }}>Warm areas drew the most attention from the model, cool areas the least.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      )}
    </>
  );
  const expertEl = (
    <section className="tile">
        <h2>Expert read</h2>
        {loading && <p className="note"><span className="spin lt" style={{ display: "inline-block", verticalAlign: "-3px", marginRight: 8 }} />Reading the pattern…</p>}
        {err && <p className="err" style={{ marginTop: 0 }}>{err}</p>}
        {expl && (
          <>
            <Explanation text={expl} />
            <div className="acts"><button className="btn main" onClick={() => setChatOpen(o => !o)}><Icon name="chat" size={20} />Ask the bot</button></div>
          </>
        )}
      </section>
  );

  const drawer = (
    <AnimatePresence>
      {chatOpen && (
        <>
          <motion.div key="scrim" className="botscrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setChatOpen(false)} />
          <motion.aside key="drawer" className="botdrawer" role="dialog" aria-label="Wafer bot"
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}>
            <header>
              <div><b>Wafer bot</b><small>Knows this scan: {result.defect_type} · {result.yield_pct}% · {result.decision}</small></div>
              <button className="x" onClick={() => setChatOpen(false)} aria-label="Close chat">Close</button>
            </header>
            <div className="log" ref={logRef}>
              {messages.length === 0 && (
                <div className="hello">
                  <p>Ask about the cause, the fix, or whether to ship this wafer.</p>
                  <div className="sugg">
                    {["Why this pattern?", "Should I ship it?", "What usually causes this?"].map(q => <button key={q} onClick={() => sendText(q)}>{q}</button>)}
                  </div>
                </div>
              )}
              {messages.map((m, i) => <div key={i} className={"m " + (m.role === "user" ? "me" : "ai")}>{m.content}</div>)}
              {chatLoading && <div className="m ai">Thinking…</div>}
            </div>
            <form onSubmit={send}>
              <input autoFocus value={input} onChange={e => setInput(e.target.value)} placeholder="Ask about this wafer" aria-label="Your question" />
              <button className="btn main" disabled={!input.trim() || chatLoading}>Send</button>
            </form>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
  const portal = createPortal(drawer, document.querySelector(".app") ?? document.body);

  if (variant === "scan") {
    // Scan page pieces go straight into the page grid so the two columns line up row by row.
    return (
      <>
        <motion.div className="rstage" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
          {liveSource
            ? <div className="stage3d"><Suspense fallback={null}><WaferScene pattern="None" live={liveSource} /></Suspense>{readout}</div>
            : <DieStage name={result.defect_type} replay={result.yield_pct + result.defect_type} className={"v-" + v}>{readout}</DieStage>}
        </motion.div>
        <div className="rfacts">{factsMini}</div>
        <div className="rodds"><section className="tile gaugetile"><h2>Yield vs thresholds</h2>{gauge}</section>{oddsEl}</div>
        <div className="rexp">{camEl}{expertEl}</div>
        {portal}
      </>
    );
  }

  return (
    <motion.div className="res" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <DieStage name={result.defect_type} replay={result.yield_pct + result.defect_type} className={"v-" + v}>
        {readout}
      </DieStage>
      {factsEl}
      {oddsEl}
      {camEl}
      {expertEl}
      {portal}
    </motion.div>
  );
}
