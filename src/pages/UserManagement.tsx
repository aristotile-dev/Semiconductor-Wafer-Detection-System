import { useEffect, useState } from "react";
import PageHeader from "../components/PageHeader";
import {
  adminGetUsers, adminCreateUser, adminUpdateUser,
  adminDeleteUser, adminGetUserHistory, HistoryEntry,
  adminGetRequests, adminDecideRequest, AccessRequest
} from "../api/client";

interface UserRow {
  id: number; email: string; name: string;
  role: string; is_active: boolean;
  created_at: string; total_predictions: number;
}

export default function UserManagement() {
  const [users, setUsers]           = useState<UserRow[]>([]);
  const [requests, setRequests]     = useState<AccessRequest[]>([]);
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

  const fetchRequests = () => adminGetRequests().then(setRequests).catch(() => {});
  useEffect(() => { fetchUsers(); fetchRequests(); }, []);

  const decide = async (r: AccessRequest, action: "approve" | "reject") => {
    await adminDecideRequest(r.id, action);
    fetchRequests(); fetchUsers();
  };

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

  const decisionColor: Record<string, string> = { SAVE: "#c6ff3d", REVIEW: "#ffd23d", SCRAP: "#ff2e93" };
  const decisionBg: Record<string, string>    = { SAVE: "#1b1b25", REVIEW: "#1b1b25", SCRAP: "#1b1b25" };

  return (
    <>
      <PageHeader title="People" subtitle="Approve access requests, manage accounts and see what each person scanned." />

      <div className="card" style={{ borderColor: requests.length ? "#c6ff3d" : undefined }}>
        <div className="card-title">Waiting for approval ({requests.length})</div>
        {requests.length === 0 ? (
          <p style={{ color: "#9a9aa8" }}>No requests right now. New ones also arrive by email.</p>
        ) : requests.map(r => (
          <div key={r.id} className="row" style={{ justifyContent: "space-between", padding: "12px 0", borderTop: "1px solid #ffffff1a" }}>
            <div style={{ minWidth: 0 }}>
              <b>{r.name}</b> <span style={{ color: "#9a9aa8" }}>{r.email}</span>
              {r.reason && <div style={{ color: "#b9b9c6", fontSize: 14, marginTop: 4 }}>{r.reason}</div>}
              <div style={{ color: "#9a9aa8", fontSize: 12, marginTop: 4 }}>{new Date(r.created_at).toLocaleString()}</div>
            </div>
            <div className="row">
              <button className="btn btn-primary btn-sm" onClick={() => decide(r, "approve")}>Approve</button>
              <button className="btn btn-danger btn-sm" onClick={() => decide(r, "reject")}>Reject</button>
            </div>
          </div>
        ))}
      </div>

      {/* History Modal */}
      {viewHistory && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
          zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24
        }}>
          <div style={{
            background: "#14141b", border: "1px solid #ffffff2e", borderRadius: 16, padding: 24,
            width: "100%", maxWidth: 700, maxHeight: "80vh", overflow: "hidden",
            display: "flex", flexDirection: "column"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: "1rem" }}>{viewHistory.user.name}'s History</div>
                <div style={{ color: "#9a9aa8", fontSize: "0.8rem" }}>{viewHistory.user.email}</div>
              </div>
              <button className="btn btn-ghost" onClick={() => setViewHistory(null)} style={{ padding: "6px 12px" }}>Close</button>
            </div>
            <div style={{ overflowY: "auto", flex: 1 }}>
              {viewHistory.entries.length === 0 ? (
                <p style={{ color: "#9a9aa8", textAlign: "center", padding: 32 }}>No predictions yet</p>
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
                        <td style={{ fontSize: "0.75rem", color: "#9a9aa8" }}>
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
        <div className="card" style={{ marginBottom: 16, border: "2px solid #c6ff3d" }}>
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
                  style={{ padding: "10px 12px", border: "1px solid #ffffff2e", borderRadius: 8, fontSize: "0.9rem", width: "100%" }}>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            {addError && <p style={{ color: "#ff2e93", fontSize: "0.85rem", marginTop: 8 }}>{addError}</p>}
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
            {showAdd ? "Cancel" : "＋ Add User"}
          </button>
        </div>

        {loading ? (
          <p style={{ color: "#9a9aa8", fontSize: "0.85rem" }}>Loading users…</p>
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
                    <td style={{ fontSize: "0.82rem", color: "#9a9aa8" }}>{u.email}</td>
                    <td>
                      <span style={{
                        background: u.role === "admin" ? "#1b1b25" : "#1b1b25",
                        color: u.role === "admin" ? "#f4f4f0" : "#9a9aa8",
                        padding: "3px 10px", borderRadius: 999, fontSize: "0.72rem", fontWeight: 600
                      }}>
                        {u.role}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        background: u.is_active ? "#1b1b25" : "#1b1b25",
                        color: u.is_active ? "#c6ff3d" : "#ff2e93",
                        padding: "3px 10px", borderRadius: 999, fontSize: "0.72rem", fontWeight: 600
                      }}>
                        {u.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td style={{ textAlign: "center", fontWeight: 600 }}>{u.total_predictions}</td>
                    <td style={{ fontSize: "0.75rem", color: "#9a9aa8" }}>
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          className="btn btn-ghost"
                          style={{ fontSize: "0.72rem", padding: "4px 10px" }}
                          onClick={() => handleViewHistory(u)}
                        >
                          History
                        </button>
                        {u.role !== "admin" && (
                          <>
                            <button
                              className="btn btn-ghost"
                              style={{ fontSize: "0.72rem", padding: "4px 10px" }}
                              onClick={() => handleToggleActive(u)}
                            >
                              {u.is_active ? "Deactivate" : "Activate"}
                            </button>
                            <button
                              className="btn btn-danger"
                              style={{ fontSize: "0.72rem", padding: "4px 10px" }}
                              onClick={() => handleDelete(u)}
                            >
                              Delete
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
