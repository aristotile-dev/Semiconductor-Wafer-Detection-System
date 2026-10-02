import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { PredictResult } from "../api/client";

export interface HistoryEntry {
  timestamp: string;
  waferId:   string;
  defect:    string;
  confidence: number;
  yieldPct:  number;
  decision:  "SAVE" | "REVIEW" | "SCRAP";
  defectRatio: number;
}

interface Ctx {
  history: HistoryEntry[];
  addEntry: (waferId: string, result: PredictResult) => void;
  clear: () => void;
}

const HistoryContext = createContext<Ctx | undefined>(undefined);
const STORAGE_KEY = "wafer_history_v1";

export function HistoryProvider({ children }: { children: ReactNode }) {
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  }, [history]);

  const addEntry = (waferId: string, r: PredictResult) => {
    setHistory(h => [...h, {
      timestamp:   new Date().toISOString().slice(0, 19).replace("T", " "),
      waferId,
      defect:      r.defect_type,
      confidence:  Math.round(r.confidence * 100) / 100,
      yieldPct:    r.yield_pct,
      decision:    r.decision,
      defectRatio: r.defect_ratio
    }]);
  };

  const clear = () => setHistory([]);

  return (
    <HistoryContext.Provider value={{ history, addEntry, clear }}>
      {children}
    </HistoryContext.Provider>
  );
}

export function useHistory() {
  const ctx = useContext(HistoryContext);
  if (!ctx) throw new Error("useHistory must be used within HistoryProvider");
  return ctx;
}
