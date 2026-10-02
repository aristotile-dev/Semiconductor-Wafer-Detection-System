import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../api/client";

export default function Login() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [floatY, setFloatY]     = useState(0);
  const navigate = useNavigate();

  // Float animation via JS
  useEffect(() => {
    let frame: number;
    let start: number | null = null;
    const animate = (ts: number) => {
      if (!start) start = ts;
      const t = (ts - start) / 1000;
      setFloatY(Math.sin(t * 1.2) * 10);
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const { token, user } = await login(email, password);
      localStorage.setItem("wafer_token", token);
      localStorage.setItem("wafer_user", JSON.stringify(user));
      navigate("/");
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes orbitDot {
          from { transform: rotate(var(--start)) translateX(88px) rotate(calc(-1 * var(--start))); }
          to   { transform: rotate(calc(var(--start) + 360deg)) translateX(88px) rotate(calc(-1 * (var(--start) + 360deg))); }
        }
        .login-input {
          width: 100%;
          padding: 14px 16px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 12px;
          color: #fff;
          font-size: 0.9rem;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.2s;
          font-family: inherit;
        }
        .login-input:focus { border-color: rgba(139,92,246,0.7); background: rgba(139,92,246,0.08); }
        .login-input::placeholder { color: rgba(255,255,255,0.22); }
      `}</style>

      <div style={{
        minHeight: "100vh", display: "flex",
        background: "#0F0E1A",
        fontFamily: "'Inter', -apple-system, sans-serif"
      }}>

        {/* ── Left Panel ── */}
        <div style={{
          flex: "0 0 46%",
          position: "relative", overflow: "hidden",
          display: "flex", flexDirection: "column",
          justifyContent: "space-between", padding: "40px",
          background: "linear-gradient(145deg, #2a1660 0%, #3d1f8a 35%, #5b2db5 65%, #7c3aed 100%)"
        }}>
          {/* Grid dots */}
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)",
            backgroundSize: "28px 28px", pointerEvents: "none"
          }} />
          {/* Glow blobs */}
          <div style={{ position: "absolute", top: -80, left: -80, width: 280, height: 280, borderRadius: "50%", background: "rgba(167,139,250,0.25)", filter: "blur(60px)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: -60, right: -60, width: 320, height: 320, borderRadius: "50%", background: "rgba(124,58,237,0.35)", filter: "blur(70px)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", top: "45%", left: "20%", width: 180, height: 180, borderRadius: "50%", background: "rgba(196,181,253,0.12)", filter: "blur(40px)", pointerEvents: "none" }} />

          {/* Logo */}
          <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 11,
              background: "rgba(255,255,255,0.15)",
              border: "1px solid rgba(255,255,255,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.25rem"
            }}>🔬</div>
            <div>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: "0.92rem", letterSpacing: "-0.2px" }}>Wafer Defect System</div>
              <div style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.68rem" }}>AI-Powered Inspection</div>
            </div>
          </div>

          {/* Wafer visual with JS float */}
          <div style={{ position: "relative", zIndex: 1, textAlign: "center" }}>
            <div style={{ display: "inline-block", transform: `translateY(${floatY}px)`, transition: "transform 0.05s linear", marginBottom: 28 }}>
              {/* Outer ring */}
              <div style={{ position: "relative", width: 190, height: 190, margin: "0 auto" }}>
                {/* Gradient ring */}
                <div style={{
                  width: 190, height: 190, borderRadius: "50%",
                  background: "conic-gradient(from 0deg, #c4b5fd, #8b5cf6, #6d28d9, #4c1d95, #c4b5fd)",
                  padding: 3,
                  boxShadow: "0 0 50px rgba(167,139,250,0.5), 0 0 100px rgba(109,40,217,0.3)"
                }}>
                  <div style={{
                    width: "100%", height: "100%", borderRadius: "50%",
                    background: "radial-gradient(circle at 40% 40%, #2d1b69, #1a1040)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexDirection: "column", gap: 6
                  }}>
                    <div style={{ fontSize: "2.6rem" }}>💠</div>
                    <div style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.6rem", letterSpacing: "2.5px", textTransform: "uppercase" }}>Silicon Wafer</div>
                  </div>
                </div>

                {/* Orbiting dots - positioned absolutely */}
                {[0, 60, 120, 180, 240, 300].map((deg, i) => {
                  const rad = (deg * Math.PI) / 180;
                  const x = 95 + 95 * Math.cos(rad) - 5;
                  const y = 95 + 95 * Math.sin(rad) - 5;
                  return (
                    <div key={i} style={{
                      position: "absolute",
                      left: x, top: y,
                      width: i % 2 === 0 ? 10 : 7,
                      height: i % 2 === 0 ? 10 : 7,
                      borderRadius: "50%",
                      background: i % 2 === 0 ? "#c4b5fd" : "#8b5cf6",
                      boxShadow: `0 0 ${i % 2 === 0 ? 10 : 6}px rgba(196,181,253,0.9)`,
                      transform: `translateY(${floatY * 0.3 * (i % 2 === 0 ? 1 : -1)}px)`
                    }} />
                  );
                })}
              </div>
            </div>

            <h2 style={{ color: "#fff", fontSize: "1.5rem", fontWeight: 800, margin: "0 0 10px", letterSpacing: "-0.4px", lineHeight: 1.3, textShadow: "0 2px 20px rgba(0,0,0,0.3)" }}>
              AI-Driven<br />Defect Detection
            </h2>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.82rem", lineHeight: 1.8, margin: 0 }}>
              EfficientNet-B3 · Murphy Yield Model<br />LLM Expert Analysis · Groq Powered
            </p>
          </div>

          {/* Stats */}
          <div style={{ position: "relative", zIndex: 1, display: "flex", gap: 10 }}>
            {[
              { label: "Defect Classes", value: "9" },
              { label: "Model Accuracy", value: "95%+" },
              { label: "Yield Model", value: "Murphy" }
            ].map((s, i) => (
              <div key={i} style={{
                flex: 1, background: "rgba(255,255,255,0.1)",
                borderRadius: 10, padding: "10px 12px",
                border: "1px solid rgba(255,255,255,0.15)",
                backdropFilter: "blur(10px)"
              }}>
                <div style={{ color: "#e9d5ff", fontSize: "1rem", fontWeight: 800 }}>{s.value}</div>
                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.65rem", marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right Panel ── */}
        <div style={{
          flex: 1, display: "flex", alignItems: "center",
          justifyContent: "center", padding: "40px",
          background: "#0F0E1A"
        }}>
          <div style={{ width: "100%", maxWidth: 380 }}>

            <div style={{ marginBottom: 32 }}>
              <h1 style={{ color: "#fff", fontSize: "2rem", fontWeight: 800, margin: "0 0 8px", letterSpacing: "-0.5px" }}>
                Welcome back
              </h1>
              <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.88rem", margin: 0 }}>
                Sign in to your account to continue
              </p>
            </div>

            <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              <div>
                <label style={{ display: "block", color: "rgba(255,255,255,0.5)", fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.6px", textTransform: "uppercase", marginBottom: 8 }}>
                  Email Address
                </label>
                <input
                  className="login-input"
                  type="email"
                  placeholder="admin@wafer.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", color: "rgba(255,255,255,0.5)", fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.6px", textTransform: "uppercase", marginBottom: 8 }}>
                  Password
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    className="login-input"
                    type={showPass ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    style={{ paddingRight: 48 }}
                  />
                  <button type="button" onClick={() => setShowPass(v => !v)} style={{
                    position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", color: "rgba(255,255,255,0.35)",
                    cursor: "pointer", fontSize: "0.9rem", padding: 4
                  }}>
                    {showPass ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>

              {error && (
                <div style={{
                  background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
                  borderRadius: 10, padding: "10px 14px",
                  color: "#FCA5A5", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: 8
                }}>
                  ⚠️ {error}
                </div>
              )}

              <button type="submit" disabled={loading} style={{
                width: "100%", padding: "14px",
                background: loading ? "rgba(109,40,217,0.5)" : "linear-gradient(135deg, #5b21b6, #7c3aed, #a78bfa)",
                border: "none", borderRadius: 12,
                color: "#fff", fontSize: "0.95rem", fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                marginTop: 4,
                boxShadow: loading ? "none" : "0 4px 28px rgba(124,58,237,0.5)",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                letterSpacing: "0.3px", transition: "all 0.2s"
              }}>
                {loading ? (
                  <>
                    <span style={{
                      width: 16, height: 16, borderRadius: "50%",
                      border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff",
                      animation: "spin 0.7s linear infinite", display: "inline-block"
                    }} />
                    Signing in…
                  </>
                ) : "Sign In →"}
              </button>
            </form>

            <p style={{ color: "rgba(255,255,255,0.15)", fontSize: "0.72rem", textAlign: "center", marginTop: 32, lineHeight: 1.6 }}>
              © 2026 Wafer Defect Detection System<br />Bethlahem Institute of Engineering
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
