// Leuchtende Erinnerungskugel – rein dekoratives CSS-Visual.
// Mit `cradle` ruht die Kugel in einer Schale. Maßstab real: Kugel 3 cm,
// Schale 5 cm Durchmesser → Schale = Kugel × 5/3.

const CRADLE_RATIO = 5 / 3;

export function Orb({
  size = 132,
  cradle = false,
}: {
  size?: number;
  cradle?: boolean;
}) {
  const orb = (
    <div className="orb" style={{ width: size, height: size }} aria-hidden="true" />
  );
  if (!cradle) return orb;
  const bowl = Math.round(size * CRADLE_RATIO);
  return (
    <div className="orb-wrap" style={{ width: bowl }}>
      {orb}
      <div className="orb-cradle" aria-hidden="true" />
    </div>
  );
}
