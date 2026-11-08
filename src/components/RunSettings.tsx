interface Props { waferId?: string; dieArea: number; onWaferIdChange?: (v: string) => void; onDieAreaChange: (v: number) => void; }

/** Wafer id and die area. These used to live in the sidebar; now they sit next to the page title. */
export default function RunSettings({ waferId, dieArea, onWaferIdChange, onDieAreaChange }: Props) {
  return (
    <div className="ctl">
      {onWaferIdChange && (
        <label>Wafer ID
          <input type="text" value={waferId} onChange={e => onWaferIdChange(e.target.value)} />
        </label>
      )}
      <label>Die area <output>{dieArea.toFixed(1)} cm²</output>
        <input type="range" min={0.1} max={2} step={0.1} value={dieArea} onChange={e => onDieAreaChange(parseFloat(e.target.value))} />
      </label>
    </div>
  );
}
