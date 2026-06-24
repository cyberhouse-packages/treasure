"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FormattedDateTime } from "@/app/FormattedDateTime";

export type AdminStone = {
  id: string;
  qrToken: string;
  tagUid: string | null;
  label: string | null;
  status: "empty" | "recorded" | "confirmed";
  durationMs: number | null;
  recordedAt: string | null;
  recordUrl: string;
};

const STATUS_LABEL: Record<AdminStone["status"], string> = {
  empty: "Leer",
  recorded: "Entwurf",
  confirmed: "Bestätigt",
};

function qrPngUrl(qrToken: string) {
  return `/api/admin/stones/${qrToken}/qr.png`;
}

export function AdminDashboard({ stones }: { stones: AdminStone[] }) {
  const router = useRouter();
  const [count, setCount] = useState(5);
  const [prefix, setPrefix] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function provision(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/stones/provision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          count,
          labelPrefix: prefix.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error("Anlegen fehlgeschlagen.");
      const data = (await res.json()) as { created: number };
      setMsg(`${data.created} Stein(e) angelegt.`);
      setPrefix("");
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Fehler");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    router.replace("/admin/login");
    router.refresh();
  }

  function printQr(s: AdminStone) {
    const w = window.open("", "_blank", "width=420,height=560");
    if (!w) return;
    const title = s.label ?? s.qrToken.slice(0, 8);
    w.document.write(`
      <html><head><title>QR · ${title}</title>
      <style>
        body{font-family:system-ui,sans-serif;text-align:center;padding:24px}
        img{width:320px;height:320px}
        .lbl{margin-top:12px;font-size:18px;font-weight:600}
        .tok{color:#666;font-size:11px;word-break:break-all;margin-top:6px}
      </style></head>
      <body onload="setTimeout(()=>window.print(),300)">
        <img src="${qrPngUrl(s.qrToken)}" alt="QR"/>
        <div class="lbl">${title}</div>
        <div class="tok">${s.recordUrl}</div>
      </body></html>`);
    w.document.close();
  }

  return (
    <main className="admin">
      <header className="admin-head">
        <div className="brand">immada · Admin</div>
        <button className="btn-secondary btn-inline" onClick={logout}>
          Abmelden
        </button>
      </header>

      <section className="panel">
        <h2>Steine anlegen</h2>
        <form className="form-row" onSubmit={provision}>
          <label>
            Anzahl
            <input
              className="input"
              type="number"
              min={1}
              max={1000}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
            />
          </label>
          <label>
            Label-Präfix (optional)
            <input
              className="input"
              type="text"
              placeholder="z.B. Charge-A"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
            />
          </label>
          <button className="btn-primary btn-inline" disabled={busy}>
            {busy ? "…" : "Anlegen"}
          </button>
        </form>
        {msg && <p className="admin-msg">{msg}</p>}
      </section>

      <section className="panel">
        <h2>Steine ({stones.length})</h2>
        {stones.length === 0 ? (
          <p className="hint">Noch keine Steine angelegt.</p>
        ) : (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>QR</th>
                  <th>Label</th>
                  <th>Status</th>
                  <th>Dauer</th>
                  <th>Aufgenommen</th>
                  <th>NFC-Tag</th>
                  <th>Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {stones.map((s) => (
                  <StoneRow key={s.id} stone={s} onPrint={() => printQr(s)} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

function StoneRow({
  stone,
  onPrint,
}: {
  stone: AdminStone;
  onPrint: () => void;
}) {
  const router = useRouter();
  const [tag, setTag] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function pair(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/stones/pair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrToken: stone.qrToken, tagUid: tag.trim() }),
      });
      if (res.status === 409) throw new Error("Tag bereits vergeben.");
      if (!res.ok) throw new Error("Fehler.");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Fehler");
    } finally {
      setBusy(false);
    }
  }

  const dur =
    stone.durationMs != null
      ? `${Math.round(stone.durationMs / 1000)}s`
      : "–";

  return (
    <tr>
      <td>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="qr-thumb"
          src={qrPngUrl(stone.qrToken)}
          alt="QR"
          width={56}
          height={56}
        />
      </td>
      <td>{stone.label ?? <span className="muted">—</span>}</td>
      <td>
        <span className={`badge status-${stone.status}`}>
          {STATUS_LABEL[stone.status]}
        </span>
      </td>
      <td>{dur}</td>
      <td>
        {stone.recordedAt ? (
          <FormattedDateTime iso={stone.recordedAt} />
        ) : (
          <span className="muted">—</span>
        )}
      </td>
      <td>
        {stone.tagUid ? (
          <code className="tag">{stone.tagUid}</code>
        ) : (
          <form className="pair-form" onSubmit={pair}>
            <input
              className="input input-sm"
              placeholder="Tag-UID"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
            />
            <button
              className="btn-secondary btn-xs"
              disabled={busy || !tag.trim()}
            >
              Verknüpfen
            </button>
            {err && <span className="error error-sm">{err}</span>}
          </form>
        )}
      </td>
      <td>
        <div className="actions">
          <button className="btn-secondary btn-xs" onClick={onPrint}>
            QR drucken
          </button>
          <a
            className="btn-secondary btn-xs link-btn"
            href={stone.recordUrl}
            target="_blank"
            rel="noreferrer"
          >
            Öffnen
          </a>
          <button
            className="btn-secondary btn-xs"
            onClick={() => navigator.clipboard.writeText(stone.recordUrl)}
          >
            Link kopieren
          </button>
        </div>
      </td>
    </tr>
  );
}
