import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid
} from "recharts";
import type { PredictResult } from "../api/client";
import { explain, chat } from "../api/client";

interface Props { result: PredictResult; }
interface ChatMsg { role: "user" | "assistant"; content: string; }

const decisionColor: Record<string, string> = {
  SAVE:   "#10B981",
  REVIEW: "#F59E0B",
  SCRAP:  "#EF4444"
};

function formatExplanation(text: string) {
  const lines = text.split("\n").filter(l => l.trim() !== "");
  return lines.map((line, i) => {
    const isHeading = /^step\s*\d+:/i.test(line.trim());
    if (isHeading) {
      return (
        <p key={i} style={{ fontWeight: 700, marginTop: i === 0 ? 0 : 12, marginBottom: 2, color: "#3730A3" }}>
          {line.trim()}
        </p>
      );
    }
    return <p key={i} style={{ margin: "0 0 4px 0" }}>{line.trim()}</p>;
  });
}

export default function ResultPanel({ result }: Props) {
  const [expl, setExpl]           = useState<string>("");
  const [loading, setLoading]     = useState(false);
  const [err, setErr]             = useState<string | null>(null);
  const [chatOpen, setChatOpen]   = useState(false);
  const [messages, setMessages]   = useState<ChatMsg[]>([]);
  const [input, setInput]         = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [showGradcam, setShowGradcam] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setExpl(""); setErr(null); setLoading(true);
    setChatOpen(false); setMessages([]);
    setShowGradcam(false);
    explain({
      defect_type: result.defect_type,
      confidence:  result.confidence,
      yield_pct:   result.yield_pct,
      decision:    result.decision
    })
      .then(text => { if (!cancelled) setExpl(text); })
      .catch(e => { if (!cancelled) setErr(e?.response?.data?.detail || "Expert analysis unavailable."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [result]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatLoading]);

  const sendMessage = async () => {
    if (!input.trim() || chatLoading) return;
    const userMsg: ChatMsg = { role: "user", content: input.trim() };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput("");
    setChatLoading(true);
    try {
      const reply = await chat({
        message: userMsg.content,
        context: {
          defect_type: result.defect_type,
          confidence:  result.confidence,
          yield_pct:   result.yield_pct,
          decision:    result.decision
        },
        history: messages
      });
      setMessages([...newHistory, { role: "assistant", content: reply }]);
    } catch {
      setMessages([...newHistory, { role: "assistant", content: "Sorry, something went wrong. Please try again." }]);
    } finally {
      setChatLoading(false);
    }
  };

  const probData = Object.entries(result.all_probs)
    .map(([cls, p]) => ({ cls, p }))
    .sort((a, b) => a.p - b.p);

  const barColor   = decisionColor[result.decision];
  const badgeEmoji = result.decision === "SAVE" ? "✅" : result.decision === "REVIEW" ? "⚠️" : "❌";
  const badgeCls   = `badge badge-${result.decision.toLowerCase()}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="card"
    >
      {/* Header */}
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div className="card-title">Prediction Result</div>
        <span className={badgeCls}>{badgeEmoji} {result.decision}</span>
      </div>

      {/* Metrics */}
      <div className="metric-grid">
        <div className="metric-card">
          <div className="m-label">Defect Type</div>
          <div className="m-value" style={{ fontSize: "1rem" }}>{result.defect_type}</div>
        </div>
        <div className="metric-card">
          <div className="m-label">Confidence</div>
          <div className="m-value">{result.confidence.toFixed(1)}%</div>
        </div>
        <div className="metric-card">
          <div className="m-label">Murphy Yield</div>
          <div className="m-value">{result.yield_pct}%</div>
        </div>
      </div>

      {/* Yield bar */}
      <div style={{ marginTop: 6 }}>
        <div style={{ background: "#E2E8F0", borderRadius: 10, height: 14, overflow: "hidden" }}>
          <div style={{ width: `${result.yield_pct}%`, height: "100%", background: barColor, transition: "width 0.35s ease" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "#64748B", marginTop: 4 }}>
          <span>0%</span><span style={{ color: "#F59E0B" }}>40%</span><span style={{ color: "#10B981" }}>70%</span><span>100%</span>
        </div>
      </div>

      {/* ── Grad-CAM Section ── */}
      {result.gradcam && (
        <div className="mt-3">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div className="card-title" style={{ marginBottom: 0 }}>🔥 Grad-CAM Heatmap</div>
            <button
              className="btn btn-ghost"
              style={{ fontSize: "0.75rem", padding: "5px 12px" }}
              onClick={() => setShowGradcam(v => !v)}
            >
              {showGradcam ? "Hide" : "Show Heatmap"}
            </button>
          </div>

          <AnimatePresence>
            {showGradcam && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                style={{ overflow: "hidden" }}
              >
                <div style={{
                  background: "#0F0E1A",
                  borderRadius: 12, padding: 12,
                  border: "1px solid #E2E8F0",
                  textAlign: "center"
                }}>
                  <img
                    src={result.gradcam}
                    alt="Grad-CAM Heatmap"
                    style={{ maxWidth: "100%", borderRadius: 8, display: "block", margin: "0 auto" }}
                  />
                  <p style={{ fontSize: "0.72rem", color: "#94A3B8", marginTop: 8, marginBottom: 0 }}>
                    🔴 Red/Yellow → High activation regions (where AI focused) &nbsp;·&nbsp; 🔵 Blue → Low activation
                  </p>
                </div>

                {/* Defect ratio info */}
                <div style={{
                  marginTop: 10, background: "#EEF2FF",
                  borderLeft: "4px solid #6D28D9",
                  borderRadius: "0 8px 8px 0", padding: "10px 14px",
                  fontSize: "0.82rem", color: "#3730A3"
                }}>
                  <strong>Defect Density:</strong> {(result.defect_ratio * 100).toFixed(2)}% of wafer surface affected.
                  The highlighted regions show where the EfficientNet-B3 model detected the <strong>{result.defect_type}</strong> defect pattern.
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Class probabilities */}
      <div className="mt-3">
        <div className="card-title">Class Probabilities</div>
        <div style={{ width: "100%", height: 240 }}>
          <ResponsiveContainer>
            <BarChart data={probData} layout="vertical" margin={{ top: 4, right: 20, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "#64748B" }} />
              <YAxis dataKey="cls" type="category" tick={{ fontSize: 11, fill: "#334155" }} width={70} />
              <Tooltip formatter={(v: number) => `${v}%`} contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 12 }} />
              <Bar dataKey="p" radius={[0, 6, 6, 0]}>
                {probData.map((d, i) => (
                  <Cell key={i} fill={d.cls === result.defect_type ? "#6D28D9" : "#CBD5E1"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Expert Analysis */}
      <div className="mt-3">
        <div className="card-title">Expert Analysis</div>
        {loading && <p style={{ color: "#64748B", fontSize: "0.85rem" }}>Fetching expert analysis…</p>}
        {err    && <p style={{ color: "#B91C1C", fontSize: "0.85rem" }}>{err}</p>}
        {expl && (
          <>
            <div className="expert-box" style={{ fontSize: "0.88rem", lineHeight: 1.7 }}>
              {formatExplanation(expl)}
            </div>
            <button
              className="btn btn-primary mt-2"
              style={{ fontSize: "0.82rem", padding: "8px 18px" }}
              onClick={() => setChatOpen(v => !v)}
            >
              {chatOpen ? "✕ Close Chat" : "💬 Know More"}
            </button>
          </>
        )}
      </div>

      {/* Chat */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22 }}
            style={{ overflow: "hidden" }}
          >
            <div className="mt-2" style={{ border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden", background: "#FAFAFF" }}>
              <div style={{
                background: "linear-gradient(135deg, #1E1B4B, #3730A3)",
                padding: "10px 16px", color: "#fff",
                fontSize: "0.82rem", fontWeight: 600,
                display: "flex", alignItems: "center", gap: 8
              }}>
                🤖 Wafer Expert Chat
                <span style={{ fontSize: "0.72rem", fontWeight: 400, opacity: 0.75, marginLeft: 4 }}>
                  Ask anything about this wafer
                </span>
              </div>

              <div style={{ height: 280, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
                {messages.length === 0 && (
                  <p style={{ color: "#94A3B8", fontSize: "0.82rem", textAlign: "center", marginTop: 80 }}>
                    Ask me anything about this wafer defect, yield, or corrective actions!
                  </p>
                )}
                {messages.map((m, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                    <div style={{
                      maxWidth: "80%", padding: "8px 12px",
                      borderRadius: m.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                      background: m.role === "user" ? "linear-gradient(135deg, #3730A3, #6D28D9)" : "#fff",
                      color: m.role === "user" ? "#fff" : "#1E293B",
                      fontSize: "0.84rem", lineHeight: 1.6,
                      boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                      border: m.role === "assistant" ? "1px solid #E2E8F0" : "none"
                    }}>
                      {m.content}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div style={{ display: "flex", justifyContent: "flex-start" }}>
                    <div style={{ padding: "8px 14px", borderRadius: "12px 12px 12px 2px", background: "#fff", border: "1px solid #E2E8F0", fontSize: "0.84rem", color: "#94A3B8" }}>
                      Thinking…
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              <div style={{ borderTop: "1px solid #E2E8F0", padding: "10px 12px", display: "flex", gap: 8, background: "#fff" }}>
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && sendMessage()}
                  placeholder="Ask about this defect…"
                  style={{ flex: 1, padding: "8px 12px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: "0.85rem", outline: "none", background: "#FAFAFF", color: "#1E293B" }}
                />
                <button className="btn btn-primary" onClick={sendMessage} disabled={!input.trim() || chatLoading} style={{ padding: "8px 16px", fontSize: "0.82rem" }}>
                  Send
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
