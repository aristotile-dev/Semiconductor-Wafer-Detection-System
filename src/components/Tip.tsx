/** Dark tooltip for recharts. */
export default function Tip({ active, payload, label, unit = "" }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="tip">
      {label !== undefined && <div style={{ color: "#9a9aa8", marginBottom: 4 }}>{label}</div>}
      {payload.map((p: any, i: number) => <div key={i}><b>{p.name ?? p.dataKey}</b> {typeof p.value === "number" ? Math.round(p.value * 10) / 10 : p.value}{unit}</div>)}
    </div>
  );
}
