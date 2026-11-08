/** The nine WM-811K defect classes, drawn as die maps. Shared by the landing wafer, the pattern chips and the mock API. */
const hash = (i: number, j: number) => i * 7919 + j * 104729;

type Fn = (r: number, x: number, y: number, i: number, j: number) => boolean;

export const PATTERNS: Record<string, Fn> = {
  "Edge-ring": r => r > 0.84,
  "Center":    r => r < 0.28,
  "Donut":     r => r > 0.46 && r < 0.68,
  "Scratch":   (_r, x, y) => Math.abs(y - 0.5 * x) < 0.07,
  "Loc":       (_r, x, y) => (x - 0.35) ** 2 + (y + 0.3) ** 2 < 0.05,
  "Edge-loc":  (r, x, y) => r > 0.78 && x > 0.25 && y > -0.45 && y < 0.55,
  "Near-full": (_r, _x, _y, i, j) => hash(i, j) % 10 !== 0,
  "Random":    (_r, _x, _y, i, j) => hash(i, j) % 11 === 0,
  "None":      () => false
};

export const PATTERN_NAMES = Object.keys(PATTERNS);

/** Same formula and thresholds as backend/model_utils.py: defects per die equals the defect ratio. */
export function murphy(ratio: number): number {
  if (ratio <= 0) return 100;
  const y = ((1 - Math.exp(-ratio)) / ratio) ** 2;
  return Math.round(y * 1000) / 10;
}

export type Verdict = "save" | "review" | "scrap";
export const verdictFor = (y: number): Verdict => (y >= 70 ? "save" : y >= 40 ? "review" : "scrap");

/** Walk the die grid once: which dies are bad, and how many. */
export function dieMap(name: string, n = 25) {
  const dies: { i: number; j: number; bad: boolean }[] = [];
  let total = 0, bad = 0;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const x = (i - (n - 1) / 2) / ((n - 1) / 2), y = (j - (n - 1) / 2) / ((n - 1) / 2), r = Math.hypot(x, y);
    if (r > 0.98) continue;
    total++;
    const b = PATTERNS[name](r, x, y, i, j);
    if (b) bad++;
    dies.push({ i, j, bad: b });
  }
  return { dies, total, bad, ratio: total ? bad / total : 0 };
}

/** Mini thumbnail of a pattern, used on the chips. */
export function drawGlyph(c: HTMLCanvasElement, name: string, active: boolean) {
  const g = c.getContext("2d"); if (!g) return;
  const n = 13, s = c.width / n;
  g.clearRect(0, 0, c.width, c.height);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const x = (i - (n - 1) / 2) / ((n - 1) / 2), y = (j - (n - 1) / 2) / ((n - 1) / 2), r = Math.hypot(x, y);
    if (r > 1.0) continue;
    const bad = PATTERNS[name](r, x, y, i, j);
    g.fillStyle = bad ? (active ? "#0a0a0f" : "#ff2e93") : (active ? "#ffffff66" : "#3a3a48");
    g.fillRect(i * s + 0.5, j * s + 0.5, s - 1, s - 1);
  }
}
