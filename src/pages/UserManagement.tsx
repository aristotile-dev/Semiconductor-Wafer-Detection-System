import { useEffect, useState } from "react";
import PageHeader from "../components/PageHeader";
import {
  adminGetUsers, adminCreateUser, adminUpdateUser,
  adminDeleteUser, adminGetUserHistory, HistoryEntry
} from "../api/client";

interface UserRow {
  id: number; email: string; name: string;
  role: string; is_active: boolean;
  created_at: string; total_predictions: number;
}

export default function UserManagement() {
  const [users, setUsers]           = useState<UserRow[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showAdd, setShowAdd]       = useState(false);
  const [viewHistory, setViewHistory] = useState<{ user: UserRow; entries: HistoryEntry[] } | null>(null);
  const [newUser, setNewUser]       = useState({ email: "", name: "", password: "", role: "user" });
  const [addError, setAddError]     = useState<string | null>(null);
  const [addLoading, setAddLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await adminGetUsers();
      setUsers(data);
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleToggleActive = async (u: UserRow) => {
    await adminUpdateUser(u.id, { is_active: !u.is_active });
    fetchUsers();
  };

  const handleDelete = async (u: UserRow) => {
    if (!confirm(`Delete user ${u.email}? This will also delete all their predictions.`)) return;
    await adminDeleteUser(u.id);
    fetchUsers();
  };

  const handleViewHistory = async (u: UserRow) => {
    const entries = await adminGetUserHistory(u.id);
    setViewHistory({ user: u, entries });
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddLoading(true); setAddError(null);
    try {
      await adminCreateUser(newUser);
      setShowAdd(false);
      setNewUser({ email: "", name: "", password: "", role: "user" });
      fetchUsers();
    } catch (err: any) {
      setAddError(err?.response?.data?.detail || "Failed to create user");
    } finally { setAddLoading(false); }
  };

  const decisionColor: Record<string, string> = { SAVE: "#065F46", REVIEW: "#92400E", SCRAP: "#991B1B" };
  const decisionBg: Record<string, string>    = { SAVE: "#D1FAE5", REVIEW: "#FEF3C7", SCRAP: "#FEE2E2" };

  return (
    <>
      <PageHeader title="User Management" subtitle="Admin · Manage users and view prediction history" />

      {/* History Modal */}
      {viewHistory && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
          zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24
        }}>
          <div style={{
            background: "#fff", borderRadius: 16, padding: 24,
            width: "100%", maxWidth: 700, maxHeight: "80vh", overflow: "hidden",
            display: "flex", flexDirection: "column"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: "1rem" }}>{viewHistory.user.name}'s History</div>
                <div style={{ color: "#64748B", fontSize: "0.8rem" }}>{viewHistory.user.email}</div>
              </div>
              <button className="btn btn-ghost" onClick={() => setViewHistory(null)} style={{ padding: "6px 12px" }}>✕ Close</button>
            </div>
            <div style={{ overflowY: "auto", flex: 1 }}>
              {viewHistory.entries.length === 0 ? (
                <p style={{ color: "#94A3B8", textAlign: "center", padding: 32 }}>No predictions yet</p>
              ) : (
                <table className="data-table" style={{ width: "100%" }}>
                  <thead>
                    <tr>
                      <th>Wafer ID</th><th>Defect</th><th>Confidence</th>
                      <th>Yield</th><th>Decision</th><th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewHistory.entries.map(e => (
                      <tr key={e.id}>
                        <td style={{ fontSize: "0.8rem" }}>{e.wafer_id}</td>
                        <td style={{ fontSize: "0.8rem" }}>{e.defect_type}</td>
                        <td style={{ fontSize: "0.8rem" }}>{e.confidence.toFixed(1)}%</td>
                        <td style={{ fontSize: "0.8rem" }}>{e.yield_pct}%</td>
                        <td>
                          <span className="cell-decision" style={{
                            background: decisionBg[e.decision],
                            color: decisionColor[e.decision],
                            fontSize: "0.72rem"
                          }}>
                            {e.decision}
                          </span>
                        </td>
                        <td style={{ fontSize: "0.75rem", color: "#64748B" }}>
                          {new Date(e.timestamp).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add User Form */}
      {showAdd && (
        <div className="card" style={{ marginBottom: 16, border: "2px solid #6D28D9" }}>
          <div className="card-title">Add New User</div>
          <form onSubmit={handleAddUser}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="field">
                <label>Name</label>
                <input type="text" value={newUser.name} onChange={e => setNewUser(p => ({ ...p, name: e.target.value }))} required />
              </div>
              <div className="field">
                <label>Email</label>
                <input type="email" value={newUser.email} onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))} required />
              </div>
              <div className="field">
                <label>Password</label>
                <input type="password" value={newUser.password} onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))} required />
              </div>
              <div className="field">
                <label>Role</label>
                <select value={newUser.role} onChange={e => setNewUser(p => ({ ...p, role: e.target.value }))}
                  style={{ padding: "10px 12px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: "0.9rem", width: "100%" }}>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            {addError && <p style={{ color: "#B91C1C", fontSize: "0.85rem", marginTop: 8 }}>{addError}</p>}
            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <button type="submit" className="btn btn-primary" disabled={addLoading}>
                {addLoading ? "Creating…" : "Create User"}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Users Table */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div className="card-title" style={{ marginBottom: 0 }}>All Users ({users.length})</div>
          <button className="btn btn-primary" style={{ fontSize: "0.82rem", padding: "8px 16px" }} onClick={() => setShowAdd(v => !v)}>
            {showAdd ? "✕ Cancel" : "＋ Add User"}
          </button>
        </div>

        {loading ? (
          <p style={{ color: "#64748B", fontSize: "0.85rem" }}>Loading users…</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th><th>Email</th><th>Role</th>
                  <th>Status</th><th>Predictions</th><th>Joined</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600 }}>{u.name}</td>
                    <td style={{ fontSize: "0.82rem", color: "#64748B" }}>{u.email}</td>
                    <td>
                      <span style={{
                        background: u.role === "admin" ? "#EEF2FF" : "#F1F5F9",
                        color: u.role === "admin" ? "#3730A3" : "#475569",
                        padding: "3px 10px", borderRadius: 999, fontSize: "0.72rem", fontWeight: 600
                      }}>
                        {u.role}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        background: u.is_active ? "#D1FAE5" : "#FEE2E2",
                        color: u.is_active ? "#065F46" : "#991B1B",
                        padding: "3px 10px", borderRadius: 999, fontSize: "0.72rem", fontWeight: 600
                      }}>
                        {u.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td style={{ textAlign: "center", fontWeight: 600 }}>{u.total_predictions}</td>
                    <td style={{ fontSize: "0.75rem", color: "#64748B" }}>
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          className="btn btn-ghost"
                          style={{ fontSize: "0.72rem", padding: "4px 10px" }}
                          onClick={() => handleViewHistory(u)}
                        >
                          📋 History
                        </button>
                        {u.role !== "admin" && (
                          <>
                            <button
                              className="btn btn-ghost"
                              style={{ fontSize: "0.72rem", padding: "4px 10px" }}
                              onClick={() => handleToggleActive(u)}
                            >
                              {u.is_active ? "🔒 Deactivate" : "✅ Activate"}
                            </button>
                            <button
                              className="btn btn-danger"
                              style={{ fontSize: "0.72rem", padding: "4px 10px" }}
                              onClick={() => handleDelete(u)}
                            >
                              🗑️ Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
