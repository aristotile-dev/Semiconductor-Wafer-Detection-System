/** Two quiet measuring rulers in the side margins of a wide screen, one on each nav edge.
 *  Fine ticks, a longer tick every fifth, three numbers and one lime mark. Decoration only. */
export default function SideRulers() {
  return (
    <>
      <div className="ruler ruler-l" aria-hidden="true"><i style={{ top: "0%" }}>00</i><i style={{ top: "50%" }}>50</i><i style={{ top: "100%" }}>100</i></div>
      <div className="ruler ruler-r" aria-hidden="true"><i style={{ top: "0%" }}>00</i><i style={{ top: "50%" }}>50</i><i style={{ top: "100%" }}>100</i></div>
    </>
  );
}
