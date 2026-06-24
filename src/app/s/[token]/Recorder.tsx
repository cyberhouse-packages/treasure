"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MAX_RECORDING_MS } from "@/lib/constants";
import { Orb } from "@/app/Orb";
import { ReactiveOrb } from "@/app/ReactiveOrb";
import { startLevelMeter } from "@/app/audioLevel";

type Phase =
  | "idle"
  | "recording"
  | "uploading"
  | "preview"
  | "confirm"
  | "saving"
  | "error";

/** Wählt einen vom Browser unterstützten, vom Server akzeptierten MIME-Typ. */
function pickMime(): string {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ];
  if (typeof MediaRecorder === "undefined") return "audio/webm";
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c)) return c;
  }
  return "audio/webm";
}

function fmt(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function Recorder({
  token,
  initialStatus,
}: {
  token: string;
  initialStatus: "empty" | "recorded";
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [level, setLevel] = useState(0);

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startTsRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const mimeRef = useRef<string>("audio/webm");
  const durationRef = useRef(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const stopMeterRef = useRef<(() => void) | null>(null);

  const stopMeter = useCallback(() => {
    stopMeterRef.current?.();
    stopMeterRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    setLevel(0);
  }, []);

  const stopTimer = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  // Aufräumen beim Unmount.
  useEffect(() => {
    return () => {
      stopTimer();
      releaseStream();
      stopMeter();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [stopTimer, releaseStream, stopMeter, previewUrl]);

  const tick = useCallback(() => {
    const ms = performance.now() - startTsRef.current;
    setElapsed(ms);
    if (ms >= MAX_RECORDING_MS) {
      // Hard-Stop bei exakt 120 Sekunden.
      mediaRef.current?.state === "recording" && mediaRef.current.stop();
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Pegelmessung für die reaktive Kugel.
      try {
        const Ctx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        const ctx = new Ctx();
        audioCtxRef.current = ctx;
        const src = ctx.createMediaStreamSource(stream);
        stopMeterRef.current = startLevelMeter(ctx, src, setLevel);
      } catch {
        /* Pegelmessung optional – ohne sie bleibt die Kugel ruhig */
      }

      const mime = pickMime();
      mimeRef.current = mime;
      const mr = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        stopTimer();
        stopMeter();
        durationRef.current = performance.now() - startTsRef.current;
        releaseStream();
        const blob = new Blob(chunksRef.current, { type: mimeRef.current });
        const objUrl = URL.createObjectURL(blob);
        setPreviewUrl(objUrl);
        void uploadDraft(blob);
      };
      mediaRef.current = mr;
      mr.start();
      startTsRef.current = performance.now();
      setElapsed(0);
      setPhase("recording");
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      setError(
        "Die Kugel kann deine Stimme nicht vernehmen. Bitte gewähre den Zugriff auf dein Mikrofon und versuche es erneut.",
      );
      setPhase("error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewUrl, stopTimer, releaseStream, tick]);

  const stopRecording = useCallback(() => {
    stopTimer();
    if (mediaRef.current?.state === "recording") {
      mediaRef.current.stop();
    }
    setPhase("uploading");
  }, [stopTimer]);

  // Lädt die Aufnahme direkt hoch (Server speichert sie im Storage und legt den Entwurf an).
  async function uploadDraft(blob: Blob) {
    setPhase("uploading");
    try {
      const res = await fetch(`/api/stones/${token}/recording`, {
        method: "POST",
        headers: {
          "Content-Type": mimeRef.current,
          "X-Duration-Ms": String(Math.round(durationRef.current)),
        },
        body: blob,
      });
      if (res.status === 409) throw new Error("locked");
      if (!res.ok) throw new Error("Speichern fehlgeschlagen.");

      setPhase("preview");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "unknown";
      if (msg === "locked") {
        setError(
          "Diese Botschaft wurde bereits besiegelt und ist nun auf ewig in der Kugel gebannt.",
        );
      } else {
        setError(msg);
      }
      setPhase("error");
    }
  }

  async function confirmRecording() {
    setPhase("saving");
    try {
      const res = await fetch(`/api/stones/${token}/confirm`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Bestätigen fehlgeschlagen.");
      // Seite neu laden -> Server rendert nun die unveränderliche Wiedergabe.
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "unknown");
      setPhase("error");
    }
  }

  const pct = Math.min(100, (elapsed / MAX_RECORDING_MS) * 100);

  return (
    <div>
      <div className="orb-stage">
        {phase === "recording" ? (
          <ReactiveOrb level={level} size={138} />
        ) : (
          <Orb size={138} />
        )}
      </div>

      {(phase === "idle" || phase === "recording") && (
        <>
          <div className="timer">
            {fmt(elapsed)}
            <small>von höchstens 2:00 Minuten</small>
          </div>
          <div className="bar">
            <span style={{ width: `${pct}%` }} />
          </div>
        </>
      )}

      {phase === "idle" && (
        <>
          <button className="btn-record" onClick={startRecording}>
            ● Die Kugel lauschen lassen
          </button>
          {initialStatus === "recorded" && (
            <p className="hint">
              In dieser Kugel ruht bereits eine ungesiegelte Botschaft. Sprichst
              du aufs Neue, so löst deine Stimme die alte ab.
            </p>
          )}
        </>
      )}

      {phase === "recording" && (
        <button className="btn-primary" onClick={stopRecording}>
          ■ Lauschen beenden
        </button>
      )}

      {phase === "uploading" && (
        <p className="lead" style={{ textAlign: "center" }}>
          Deine Worte werden in die Kugel gebettet…
        </p>
      )}

      {(phase === "preview" || phase === "confirm" || phase === "saving") &&
        previewUrl && (
          <>
            <p className="hint">
              Lausche deiner Botschaft, ehe du sie besiegelst:
            </p>
            <audio src={previewUrl} controls preload="auto" />
          </>
        )}

      {phase === "preview" && (
        <>
          <button
            className="btn-primary"
            onClick={() => setPhase("confirm")}
          >
            ✦ Für die Ewigkeit besiegeln
          </button>
          <div className="row">
            <button className="btn-secondary" onClick={startRecording}>
              ↺ Neu sprechen
            </button>
          </div>
          <p className="hint">
            Solange du nicht besiegelst, bleibt deine Botschaft wandelbar wie
            Wasser.
          </p>
        </>
      )}

      {phase === "confirm" && (
        <>
          <div className="warn">
            <strong>Achtung:</strong> Ist die Botschaft erst besiegelt, ist sie
            <strong> auf ewig in der Kugel gebannt</strong> und kann niemals
            wieder verändert werden. Möchtest du fortfahren?
          </div>
          <button className="btn-primary" onClick={confirmRecording}>
            Ja, für immer besiegeln
          </button>
          <div className="row">
            <button
              className="btn-secondary"
              onClick={() => setPhase("preview")}
            >
              Zurück
            </button>
          </div>
        </>
      )}

      {phase === "saving" && (
        <p className="lead" style={{ textAlign: "center" }}>
          Die Botschaft wird in die Kugel gebannt…
        </p>
      )}

      {phase === "error" && (
        <>
          <p className="error">{error}</p>
          <button
            className="btn-secondary"
            onClick={() => {
              setError(null);
              setPhase("idle");
            }}
          >
            Noch einmal versuchen
          </button>
        </>
      )}
    </div>
  );
}
