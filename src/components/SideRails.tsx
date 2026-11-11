/** Two slim rails that sit in the side margins of a wide screen: the steps on the left, small stickers on the right.
 *  Decoration only, so a big window feels filled instead of empty. Hidden below 1500px, where there is no spare margin. */
export default function SideRails({ steps, tags }: { steps: string[]; tags: string[] }) {
  return (
    <>
      <ol className="rail rail-l" aria-hidden="true">
        {steps.map((s, i) => <li key={s}><b>{String(i + 1).padStart(2, "0")}</b><span>{s}</span></li>)}
      </ol>
      <ul className="rail rail-r" aria-hidden="true">
        {tags.map((t, i) => <li key={t} className={"t" + i}><span>{t}</span></li>)}
      </ul>
    </>
  );
}
