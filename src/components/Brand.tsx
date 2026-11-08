export function BrandMark({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10.5" fill="none" stroke="#c6ff3d" strokeWidth="1.6" />
      <g fill="#f4f4f0">
        <rect x="7" y="7" width="3" height="3" rx=".5" /><rect x="11" y="7" width="3" height="3" rx=".5" />
        <rect x="7" y="11" width="3" height="3" rx=".5" /><rect x="15" y="11" width="3" height="3" rx=".5" />
        <rect x="11" y="15" width="3" height="3" rx=".5" />
      </g>
      <rect x="11" y="11" width="3" height="3" rx=".5" fill="#ff2e93" />
    </svg>
  );
}
