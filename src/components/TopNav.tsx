import { Link } from "react-router-dom";
import { BrandMark } from "./Brand";

export default function TopNav() {
  const token = localStorage.getItem("wafer_token");
  return (
    <nav>
      <Link className="brand" to="/"><BrandMark />WAFERSCOPE</Link>
      <a className="l" href="/#patterns">Patterns</a>
      <Link className="l" to="/scan">Scan</Link>
      {token ? <Link className="l" to="/app">Dashboard</Link> : <Link className="l" to="/login">Sign in</Link>}
      {!token && <Link className="req" to="/request">Request access</Link>}
    </nav>
  );
}
