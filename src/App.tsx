import { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Prediction from "./pages/Prediction";
import BatchPrediction from "./pages/BatchPrediction";
import DrawMode from "./pages/DrawMode";
import YieldAnalysis from "./pages/YieldAnalysis";
import History from "./pages/History";
import Login from "./pages/Login";
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
  if (!user || user.role !== "admin") return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  const [waferId, setWaferId] = useState("WAFER-001");
  const [dieArea, setDieArea] = useState(0.5);
  const [user, setUser]       = useState<User | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const raw = localStorage.getItem("wafer_user");
    if (raw) setUser(JSON.parse(raw));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("wafer_token");
    localStorage.removeItem("wafer_user");
    setUser(null);
    navigate("/login");
  };

  const token = localStorage.getItem("wafer_token");

  return (
    <Routes>
      <Route path="/login" element={token ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/*" element={
        <AuthGuard>
          <div className="app-shell">
            <Sidebar
              waferId={waferId}
              dieArea={dieArea}
              onWaferIdChange={setWaferId}
              onDieAreaChange={setDieArea}
              user={user}
              onLogout={handleLogout}
            />
            <main className="main-area">
              <Routes>
                <Route path="/"        element={<Prediction waferId={waferId} dieArea={dieArea} />} />
                <Route path="/batch"   element={<BatchPrediction dieArea={dieArea} />} />
                <Route path="/draw"    element={<DrawMode waferId={waferId} dieArea={dieArea} />} />
                <Route path="/yield"   element={<YieldAnalysis dieArea={dieArea} />} />
                <Route path="/history" element={<History />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/users"   element={
                  <AdminGuard><UserManagement /></AdminGuard>
                } />
              </Routes>
            </main>
          </div>
        </AuthGuard>
      } />
    </Routes>
  );
}
