import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import TopNav from "../components/TopNav";
import { login } from "../api/client";
import "../styles/landing.css";
import "../styles/public.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr(null);
    try {
      const { token, user } = await login(email, password);
      localStorage.setItem("wafer_token", token);
      localStorage.setItem("wafer_user", JSON.stringify(user));
      navigate("/app");
    } catch (x: any) {
      setErr(x?.response?.data?.detail || "Wrong email or password.");
    } finally { setBusy(false); }
  };

  return (
    <div className="landing">
      <div className="grain" />
      <TopNav />
      <main className="pub pub-narrow">
        <div>
          <h1><span className="ln">Sign</span><span className="ln a">in.</span></h1>
          <p className="lead">For approved accounts. No account yet? Ask for access, or scan a wafer as a guest.</p>
          <form className="panel" onSubmit={submit}>
            {err && <p className="err" role="alert">{err}</p>}
            <div className="field"><label htmlFor="e">Email</label><input id="e" type="email" required autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} /></div>
            <div className="field"><label htmlFor="p">Password</label><input id="p" type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} /></div>
            <button className="btn main" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
            <p className="alt">No account? <Link to="/request">Request access</Link></p>
          </form>
        </div>
      </main>
    </div>
  );
}
