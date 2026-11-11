import { useEffect, useRef, useState } from "react";
import { NavLink, Link } from "react-router-dom";
import { useCallback } from "react";
import { BrandMark } from "./Brand";
import Icon from "./Icons";
import type { User } from "../api/client";
import "../styles/app.css";

interface Props { user: User | null; onLogout: () => void; children: React.ReactNode; }

/** Thin brand strip on top, page switcher as a dock at the bottom. The wafer stage owns the screen between them. */
export default function AppShell({ user, onLogout, children }: Props) {
  const [menu, setMenu] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  // The dock gets out of the way: it hides right after a page is picked and only comes back on movement.
  const [show, setShow] = useState(true);
  const timer = useRef<number>(0);
  const quiet = useRef(0);
  const held = useRef(false);
  const wake = useCallback((force = false) => {
    if (!force && Date.now() < quiet.current) return;
    setShow(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => { if (!held.current) setShow(false); }, 1800);
  }, []);
  useEffect(() => {
    wake(true);
    const move = (e: PointerEvent) => {
      const nearBottom = e.clientY > window.innerHeight - 72;
      if (e.pointerType === "mouse" && !nearBottom && Math.abs(e.movementX) + Math.abs(e.movementY) < 3) return;
      wake(nearBottom);
    };
    const any = () => wake();
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("touchstart", any, { passive: true });
    window.addEventListener("scroll", any, { passive: true });
    window.addEventListener("keydown", any);
    return () => {
      window.removeEventListener("pointermove", move); window.removeEventListener("touchstart", any);
      window.removeEventListener("scroll", any); window.removeEventListener("keydown", any);
      window.clearTimeout(timer.current);
    };
  }, [wake]);
  const picked = () => { quiet.current = Date.now() + 1400; window.clearTimeout(timer.current); held.current = false; setShow(false); };
  // A click anywhere on the screen outside the dock tucks it away too.
  const dock = useRef<HTMLElement>(null);
  useEffect(() => {
    const tuck = (e: PointerEvent) => { if (dock.current && !dock.current.contains(e.target as Node)) picked(); };
    window.addEventListener("pointerdown", tuck, { passive: true });
    return () => window.removeEventListener("pointerdown", tuck);
  }, []);

  useEffect(() => {
    const off = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setMenu(false); };
    document.addEventListener("mousedown", off);
    return () => document.removeEventListener("mousedown", off);
  }, []);

  const tabs = [
    { to: "/app", label: "Scan", icon: "scan" },
    { to: "/app/batch", label: "Batch", icon: "batch" },
    { to: "/app/draw", label: "Draw", icon: "draw" },
    { to: "/app/yield", label: "Yield", icon: "yield" },
    { to: "/app/history", label: "History", icon: "history" },
    { to: "/app/reports", label: "Reports", icon: "reports" },
    ...(user?.role === "admin" ? [{ to: "/app/users", label: "People", icon: "people" }] : [])
  ];

  return (
    <div className="app">
      <div className="grain" />
      <header className="strip">
        <Link className="brand" to="/"><BrandMark />WAFERSCOPE</Link>
        {user && (
          <div className="me" ref={box}>
            <button className="who" onClick={() => setMenu(m => !m)} aria-expanded={menu} aria-haspopup="menu">
              <b>{user.name.slice(0, 1).toUpperCase()}</b>
              <span>{user.name}<small>{user.role}</small></span>
              <Icon name="chevron" size={16} />
            </button>
            {menu && (
              <div className="menu" role="menu">
                <div className="mi"><span>Signed in as</span><b>{user.email}</b></div>
                <button role="menuitem" onClick={onLogout}><Icon name="out" size={18} />Sign out</button>
              </div>
            )}
          </div>
        )}
      </header>

      <main>{children}</main>

      <nav ref={dock} className={"dock" + (show ? "" : " away")} aria-label="Pages"
        onPointerEnter={() => { held.current = true; wake(true); }}
        onPointerLeave={() => { held.current = false; wake(true); }}
        onFocus={() => wake(true)}>
        {tabs.map(t => (
          <NavLink key={t.to} to={t.to} end={t.to === "/app"} onClick={picked} className={({ isActive }) => (isActive ? "on" : "")}>
            <Icon name={t.icon} /><span>{t.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
