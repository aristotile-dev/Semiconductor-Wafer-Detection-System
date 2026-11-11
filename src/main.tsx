import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { HistoryProvider } from "./context/HistoryContext";
import "@fontsource-variable/unbounded/wght.css";
import "@fontsource-variable/schibsted-grotesk/wght.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/600.css";
import "./styles/global.css";

/** Keep the opening screen up until the three typefaces are in and the first page has painted twice,
 *  then fade it out. Capped, so a slow font never traps the visitor behind it. */
function openSite() {
  const boot = document.getElementById("boot");
  if (!boot) return;
  const started = performance.now();
  const fonts = Promise.all([
    document.fonts.load('900 1em "Unbounded Variable"'),
    document.fonts.load('400 1em "Schibsted Grotesk Variable"'),
    document.fonts.load('600 1em "JetBrains Mono"')
  ]).catch(() => undefined);
  // Timers, not requestAnimationFrame: a tab opened in the background pauses rAF and would never open the site.
  const firstPage = new Promise<void>(resolve => {
    const t0 = performance.now();
    const tick = () => {
      const ready = document.querySelector("#root nav, #root .app, #root .strip");
      if (ready || performance.now() - t0 > 4000) setTimeout(resolve, 120); // let the first frames paint behind the screen
      else setTimeout(tick, 40);
    };
    tick();
  });
  Promise.race([Promise.all([fonts, firstPage]), new Promise(r => setTimeout(r, 5000))]).then(() => {
    const wait = Math.max(0, 650 - (performance.now() - started)); // long enough to read as a moment, not a flicker
    setTimeout(() => {
      boot.classList.add("done");
      performance.mark("boot-done");
      setTimeout(() => boot.remove(), 600);
    }, wait);
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <HistoryProvider>
        <App />
      </HistoryProvider>
    </BrowserRouter>
  </React.StrictMode>
);

openSite();
