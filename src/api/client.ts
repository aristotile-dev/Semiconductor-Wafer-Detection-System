import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:7860";

export const api = axios.create({ baseURL, timeout: 120000 });

api.interceptors.request.use(config => {
  const token = localStorage.getItem("wafer_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem("wafer_token");
      localStorage.removeItem("wafer_user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export interface User {
  id:    number;
  email: string;
  name:  string;
  role:  "admin" | "user";
}

export interface PredictResult {
  defect_type:  string;
  confidence:   number;
  all_probs:    Record<string, number>;
  yield_pct:    number;
  decision:     "SAVE" | "REVIEW" | "SCRAP";
  defect_ratio: number;
  gradcam:      string | null;
}

export interface YieldPoint { die_area: number; yield_pct: number; }
export interface ChatMessage { role: "user" | "assistant"; content: string; }
export interface ChatRequest {
  message: string;
  context: { defect_type: string; confidence: number; yield_pct: number; decision: string; };
  history: ChatMessage[];
}

export interface HistoryEntry {
  id:           number;
  wafer_id:     string;
  defect_type:  string;
  confidence:   number;
  yield_pct:    number;
  decision:     string;
  defect_ratio: number;
  timestamp:    string;
}

export async function login(email: string, password: string): Promise<{ token: string; user: User }> {
  const form = new URLSearchParams();
  form.append("username", email);
  form.append("password", password);
  const { data } = await api.post("/auth/login", form, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" }
  });
  return { token: data.access_token, user: data.user };
}

export async function predictImage(file: File, dieArea: number): Promise<PredictResult> {
  const form = new FormData();
  form.append("file", file);
  form.append("die_area", String(dieArea));
  const { data } = await api.post<PredictResult>("/predict", form, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  return data;
}

export async function predictDraw(imageBase64: string, dieArea: number): Promise<PredictResult> {
  const { data } = await api.post<PredictResult>("/predict-draw", { image_base64: imageBase64, die_area: dieArea });
  return data;
}

export async function explain(params: { defect_type: string; confidence: number; yield_pct: number; decision: string }): Promise<string> {
  const { data } = await api.post<{ explanation: string }>("/explain", params);
  return data.explanation;
}

export async function chat(req: ChatRequest): Promise<string> {
  const { data } = await api.post<{ reply: string }>("/chat", req);
  return data.reply;
}

export async function yieldCurve(defectRatio: number): Promise<YieldPoint[]> {
  const { data } = await api.post<{ points: YieldPoint[] }>("/yield-curve", { defect_ratio: defectRatio });
  return data.points;
}

export async function saveHistory(entry: { wafer_id: string; defect_type: string; confidence: number; yield_pct: number; decision: string; defect_ratio: number }): Promise<void> {
  await api.post("/history/save", entry);
}

export async function getMyHistory(): Promise<HistoryEntry[]> {
  const { data } = await api.get("/history/me");
  return data;
}

export async function adminGetUsers() {
  const { data } = await api.get("/admin/users");
  return data;
}

export async function adminCreateUser(payload: { email: string; name: string; password: string; role: string }) {
  const { data } = await api.post("/admin/users", payload);
  return data;
}

export async function adminUpdateUser(id: number, payload: Partial<{ name: string; password: string; is_active: boolean; role: string }>) {
  const { data } = await api.put(`/admin/users/${id}`, payload);
  return data;
}

export async function adminDeleteUser(id: number) {
  await api.delete(`/admin/users/${id}`);
}

export async function adminGetUserHistory(userId: number): Promise<HistoryEntry[]> {
  const { data } = await api.get(`/admin/users/${userId}/history`);
  return data;
}
