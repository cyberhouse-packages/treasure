import { findStoneByToken, latestRecording } from "@/lib/stoneRepo";
import { FormattedDateTime } from "@/app/FormattedDateTime";
import { Recorder } from "./Recorder";
import { Player } from "./Player";

export const dynamic = "force-dynamic";

export default async function StonePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const stone = await findStoneByToken(token);

  if (!stone) {
    return (
      <main className="page">
        <div className="card">
          <div className="brand">immada · Memory Orbs</div>
          <h1>Eine unbekannte Kugel</h1>
          <p className="lead">
            Dieser Pfad führt zu keiner uns bekannten Kugel. Prüfe das Zeichen,
            das sie trägt, und folge ihm noch einmal.
          </p>
        </div>
      </main>
    );
  }

  if (stone.status === "confirmed") {
    const rec = latestRecording(stone);
    return (
      <main className="page">
        <div className="card">
          <div className="brand">immada · Memory Orbs</div>
          <span className="badge locked">Besiegelt · für die Ewigkeit</span>
          <h1 style={{ marginTop: 14 }}>Die Stimme der Kugel</h1>
          <p className="lead">
            Diese Botschaft wurde besiegelt und ruht nun für immer im Inneren
            der Kugel. Du darfst ihr lauschen, sooft dein Herz es begehrt.
          </p>
          <Player token={token} durationMs={rec?.durationMs ?? 0} />
          {rec && (
            <p className="meta">
              🕑 Eingefangen am{" "}
              <FormattedDateTime iso={rec.createdAt.toISOString()} />
            </p>
          )}
        </div>
      </main>
    );
  }

  // status: empty | recorded  → Aufnahme erlaubt
  return (
    <main className="page">
      <div className="card">
        <div className="brand">immada · Memory Orbs</div>
        <h1>Vertraue der Kugel deine Worte an</h1>
        <p className="lead">
          Sprich aus, was bewahrt werden soll – bis zu zwei Minuten lang.
          Solange du deine Botschaft nicht besiegelst, darfst du sie so oft
          erneuern, wie deine Seele es wünscht.
        </p>
        <Recorder token={token} initialStatus={stone.status} />
      </div>
    </main>
  );
}
