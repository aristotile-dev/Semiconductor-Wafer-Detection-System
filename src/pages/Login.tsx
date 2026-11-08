import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import TopNav from "../components/TopNav";
import { login } from "../api/client";
import "../styles/landing.css";
import "../styles/public.css";
import "../styles/app.css";

const ROWS = 5;

/** Sign in. Loud poster of marquee type, a tilted sticker card, and a password that turns into lime dies. */
export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [inside, setInside] = useState(false);
  const navigate = useNavigate();

  const burst = useMemo(() => Array.from({ length: 44 }, (_, i) => {
    const a = (i / 44) * Math.PI * 2 + (i % 3) * 0.3, d = 180 + ((i * 53) % 260);
    return { x: Math.cos(a) * d, y: Math.sin(a) * d, r: (i * 47) % 180 - 90, s: 10 + (i * 7) % 16, hot: i % 5 === 0 };
  }), []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr(null);
    try {
      const { token, user } = await login(email, password);
      localStorage.setItem("wafer_token", token);
      localStorage.setItem("wafer_user", JSON.stringify(user));
      setInside(true);
      setTimeout(() => navigate("/app"), 1000);
    } catch (x: any) {
      setErr(x?.response?.data?.detail || "Wrong email or password.");
    } finally { setBusy(false); }
  };

  return (
    <div className="landing">
      <div className="grain" />
      <TopNav />
      <div className="app lgp" role="main">
        <div className="lmq" aria-hidden="true">
          {Array.from({ length: ROWS }, (_, r) => (
            <div key={r} className={"lrow" + (r % 2 ? " rev" : "") + (r === 2 ? " fillrow" : "")}>
              <span>{"WELCOME BACK ↗ ".repeat(8)}</span>
            </div>
          ))}
        </div>

        <section className={"lcard" + (err ? " shake" : "") + (inside ? " out" : "")}>
          <span className={"lsticker" + (err ? " bad" : "")}>{err ? "NOPE" : inside ? "IN!" : "HEY AGAIN"}</span>
          <h1 className="one"><span>Sign </span><em>in.</em></h1>
          <form className="rform" onSubmit={submit}>
            {err && <p className="err" role="alert">{err}</p>}
            <div className="f"><label htmlFor="e">Email</label><input id="e" type="email" required autoComplete="username" placeholder="priya@fab.example" value={email} onChange={e => { setEmail(e.target.value); setErr(null); }} /></div>
            <div className="f"><label htmlFor="p">Password</label>
              <div className="pwdies">
                <input id="p" type="password" required autoComplete="current-password" placeholder="Your password" value={password} onChange={e => { setPassword(e.target.value); setErr(null); }} />
                <div className="dd" aria-hidden="true">{password.split("").slice(0, 24).map((_, i) => <i key={i} />)}</div>
              </div>
            </div>
            <button className="btn main block" disabled={busy || inside}>{inside ? "You are in" : busy ? "Signing in…" : "Sign in"}</button>
            <p className="alt">No account yet? <Link to="/request">Request access</Link> or <Link to="/scan">scan a wafer as a guest</Link>.</p>
          </form>
        </section>

        {inside && (
          <div className="lburst" aria-hidden="true">
            {burst.map((b, i) => (
              <i key={i} className={b.hot ? "hot" : ""} style={{ "--x": b.x + "px", "--y": b.y + "px", "--r": b.r + "deg", width: b.s, height: b.s } as React.CSSProperties} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
