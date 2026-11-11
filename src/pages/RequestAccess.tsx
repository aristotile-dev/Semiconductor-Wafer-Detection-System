import { useState } from "react";
import { Link } from "react-router-dom";
import TopNav from "../components/TopNav";
import FillWafer from "../components/FillWafer";
import SideRails from "../components/SideRails";
import { requestAccess } from "../api/client";
import "../styles/landing.css";
import "../styles/public.css";
import "../styles/app.css";

const okEmail = (v: string) => /^\S+@\S+\.\S+$/.test(v.trim());

/** Request access. The wafer on the right fills up as the form does. */
export default function RequestAccess() {
  const [form, setForm] = useState({ name: "", email: "", reason: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  const steps = [form.name.trim().length > 1, okEmail(form.email), form.reason.trim().length > 0];
  const done = steps.filter(Boolean).length;
  const fill = sent ? 1 : done / 3;

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
      <div className="app rqp" role="main">
        <SideRails steps={["Your name", "Your email", "Why you want in"]} tags={["Approved by hand", "Reply by mail", "Free"]} />
        <section className="rl">
          <h1 className="one"><span>Ask for </span><em>access.</em></h1>
          {sent ? (
            <div className="rdone" role="status">
              <b>Request sent.</b>
              <p>Your request is with the admin. Once it is approved, sign in with {form.email}.</p>
              <div className="gbtn"><Link className="btn main" to="/scan">Scan a wafer meanwhile</Link><Link className="btn" to="/login">Sign in</Link></div>
            </div>
          ) : (
            <>
              <p className="gsub">Accounts are approved by hand. Tell us who you are.</p>
              <form className="rform" onSubmit={submit}>
                {err && <p className="err" role="alert">{err}</p>}
                <div className="f"><label htmlFor="n">Name</label><input id="n" required autoComplete="name" placeholder="Priya N" value={form.name} onChange={set("name")} /></div>
                <div className="f"><label htmlFor="e">Email</label><input id="e" type="email" required autoComplete="email" placeholder="priya@fab.example" value={form.email} onChange={set("email")} /></div>
                <div className="f"><label htmlFor="r">What will you use it for? <small>Optional</small></label><textarea id="r" rows={2} placeholder="Checking wafer maps for my line" value={form.reason} onChange={set("reason")} /></div>
                <button className="btn main block" disabled={busy}>{busy ? "Sending…" : "Send request"}</button>
                <p className="alt">Already approved? <Link to="/login">Sign in</Link></p>
              </form>
            </>
          )}
        </section>

        <div className="rstagebox">
          <FillWafer fill={fill} className={sent ? "v-save" : ""}>
            <div className={"read " + (sent || done === 3 ? "save" : "")}>
              <div className="num">{sent ? "In" : `${done}/3`}</div>
              <span className={"sticker " + (sent || done === 3 ? "save" : "review")}>{sent ? "SENT" : done === 3 ? "FILLING DONE" : "FILLING"}</span>
            </div>
          </FillWafer>
        </div>
      </div>
    </div>
  );
}
