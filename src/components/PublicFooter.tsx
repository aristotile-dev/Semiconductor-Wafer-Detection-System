import { Link } from "react-router-dom";
import { BrandMark } from "./Brand";

/** Closing strip for the public pages, so the page ends instead of stopping. */
export default function PublicFooter() {
  const signedIn = !!localStorage.getItem("wafer_token");
  return (
    <footer className="pfoot">
      <Link className="pf-brand" to="/"><BrandMark />WAFERSCOPE</Link>
      <p>A portfolio project. A trained model reads the wafer map; it does not replace a fab inspection.</p>
      <nav aria-label="Footer">
        <a href="https://github.com/aristotile-dev/Semiconductor-Wafer-Detection-System" target="_blank" rel="noreferrer">GitHub</a>
        <Link to="/scan">Try a scan</Link>
        {signedIn ? <Link to="/app">Open app</Link> : <Link to="/request">Request access</Link>}
      </nav>
    </footer>
  );
}
