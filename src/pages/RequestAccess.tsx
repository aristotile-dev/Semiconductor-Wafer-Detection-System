import { useState } from "react";
import { Link } from "react-router-dom";
import TopNav from "../components/TopNav";
import { requestAccess } from "../api/client";
import "../styles/landing.css";
import "../styles/public.css";

export default function RequestAccess() {
  const [form, setForm] = useState({ name: "", email: "", reason: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr(null);
    try { await requestAccess(form); setSent(true); }
    catch (x: any) { setErr(x?.response?.data?.detail || "Could not send your request. Try again."); }
    finally { setBusy(false); }
  };

  return (
    <div className="landing">
      <div className="grain" />
      <TopNav />
      <main className="pub pub-narrow">
        <div>
          <h1><span className="ln">Ask for</span><span className="ln a">access.</span></h1>
          <p className="lead">Accounts are approved by hand. Tell us who you are and you get an email when you are in.</p>

          {sent ? (
            <div className="done" role="status">
              <b>Request sent.</b>
              <p>We emailed the admin. You will hear back at {form.email} once your account is approved. Meanwhile you can <Link to="/scan" style={{ color: "var(--acid)" }}>scan a wafer as a guest</Link>.</p>
            </div>
          ) : (
            <form className="panel" onSubmit={submit}>
              {err && <p className="err" role="alert">{err}</p>}
              <div className="field"><label htmlFor="n">Name</label><input id="n" required autoComplete="name" value={form.name} onChange={set("name")} /></div>
              <div className="field"><label htmlFor="e">Email</label><input id="e" type="email" required autoComplete="email" value={form.email} onChange={set("email")} /></div>
              <div className="field"><label htmlFor="r">What will you use it for? <span style={{ color: "#6a6a78", fontWeight: 400 }}>(optional)</span></label><textarea id="r" value={form.reason} onChange={set("reason")} /></div>
              <button className="btn main" disabled={busy}>{busy ? "Sending…" : "Send request"}</button>
              <p className="alt">Already approved? <Link to="/login">Sign in</Link></p>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
