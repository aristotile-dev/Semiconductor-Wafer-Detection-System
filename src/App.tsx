import { lazy, Suspense, useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import AppShell from "./components/AppShell";
import Prediction from "./pages/Prediction";
import BatchPrediction from "./pages/BatchPrediction";
import DrawMode from "./pages/DrawMode";
import YieldAnalysis from "./pages/YieldAnalysis";
import History from "./pages/History";
import Login from "./pages/Login";
import RequestAccess from "./pages/RequestAccess";
import Scan from "./pages/Scan";
const Landing = lazy(() => import("./pages/Landing"));
import UserManagement from "./pages/UserManagement";
import Reports from "./pages/Reports";
import type { User } from "./api/client";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem("wafer_token");
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AdminGuard({ children }: { children: React.ReactNode }) {
  const raw  = localStorage.getItem("wafer_user");
  const user: User | null = raw ? JSON.parse(raw) : null;
  if (!user || user.role !== "admin") return <Navigate to="/app" replace />;
  return <>{children}</>;
}

export default function App() {
  const [waferId, setWaferId] = useState("WAFER-001");
  const [dieArea, setDieArea] = useState(0.5);
  const [user, setUser]       = useState<User | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Re-read the signed-in user on every navigation, so signing in (or out) shows up straight away.
  useEffect(() => {
    const raw = localStorage.getItem("wafer_user");
    setUser(raw ? JSON.parse(raw) : null);
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem("wafer_token");
    localStorage.removeItem("wafer_user");
    setUser(null);
    navigate("/");
  };

  const token = localStorage.getItem("wafer_token");

  return (
    <Suspense fallback={null}>
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/scan" element={<Scan />} />
      <Route path="/request" element={<RequestAccess />} />
      <Route path="/login" element={token ? <Navigate to="/app" replace /> : <Login />} />
      <Route path="/app/*" element={
        <AuthGuard>
          <AppShell user={user} onLogout={handleLogout}>
            <Routes>
              <Route path="/"        element={<Prediction waferId={waferId} dieArea={dieArea} onWaferIdChange={setWaferId} onDieAreaChange={setDieArea} />} />
              <Route path="batch"    element={<BatchPrediction dieArea={dieArea} onDieAreaChange={setDieArea} />} />
              <Route path="draw"     element={<DrawMode waferId={waferId} dieArea={dieArea} onWaferIdChange={setWaferId} onDieAreaChange={setDieArea} />} />
              <Route path="yield"    element={<YieldAnalysis dieArea={dieArea} onDieAreaChange={setDieArea} />} />
              <Route path="history"  element={<History />} />
              <Route path="reports"  element={<Reports />} />
              <Route path="users"    element={<AdminGuard><UserManagement /></AdminGuard>} />
            </Routes>
          </AppShell>
        </AuthGuard>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  );
}
