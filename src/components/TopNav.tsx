import { Link, useLocation } from "react-router-dom";
import { BrandMark } from "./Brand";

/** Flat top bar for the public pages, with mono terminal-style tabs. */
export default function TopNav() {
  const token = localStorage.getItem("wafer_token");
  const { pathname } = useLocation();
  const on = (p: string) => (pathname === p ? " on" : "");
  return (
    <nav aria-label="Main">
      <Link className="brand" to="/"><BrandMark />WAFERSCOPE</Link>
      <div className="links">
        <a className="l" href="/#patterns"><i>01</i>Patterns</a>
        <Link className={"l" + on("/scan")} to="/scan"><i>02</i>Scan</Link>
        {token
          ? <Link className="l" to="/app"><i>03</i>Dashboard</Link>
          : <Link className={"l" + on("/login")} to="/login"><i>03</i>Sign in</Link>}
      </div>
      {token
        ? <Link className="req" to="/app">Open app<b aria-hidden="true">_</b></Link>
        : <Link className={"req" + on("/request")} to="/request">Request access<b aria-hidden="true">_</b></Link>}
    </nav>
  );
}
