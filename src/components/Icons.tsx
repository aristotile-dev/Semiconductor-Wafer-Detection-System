/** One drawn icon set: 24px grid, 1.75 stroke, square caps, so it matches the hard-cornered dock. */
const P: Record<string, string> = {
  scan: "M4 9V4h5 M15 4h5v5 M20 15v5h-5 M9 20H4v-5 M12 9.5v5 M9.5 12h5",
  batch: "M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z",
  draw: "M4 20l1-5L16 4l4 4L9 19z M13 7l4 4",
  yield: "M3 4v16h18 M6 8c5 0 6 8 14 9",
  history: "M12 7v5l3 2 M4 12a8 8 0 1 0 2.4-5.7 M4 3.5V8h4.5",
  reports: "M6 3h9l4 4v14H6z M9 17v-3 M12 17v-6 M15 17v-4",
  people: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5 M16 6a3 3 0 0 1 0 6 M18 15c2 .6 3 2 3 5",
  chevron: "M6 9l6 6 6-6",
  check: "M5 12.5l4.5 4.5L19 7.5",
  out: "M10 4H5v16h5 M15 8l4 4-4 4 M19 12H9",
  chat: "M4 5h16v11H10l-5 4v-4H4z M8 9h8 M8 12h5",
  up: "M12 16V5 M7 10l5-5 5 5 M5 19h14"
};

export default function Icon({ name, size = 22 }: { name: keyof typeof P | string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true">
      <path d={P[name]} />
    </svg>
  );
}
