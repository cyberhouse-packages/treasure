"use client";

import { useEffect, useRef, useState } from "react";
import { Orb } from "@/app/Orb";
import { ReactiveOrb } from "@/app/ReactiveOrb";
import { startLevelMeter } from "@/app/audioLevel";

function fmt(ms: number): string {
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function Player({
  token,
  durationMs,
}: {
  token: string;
  durationMs: number;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState(0);

  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const stopMeterRef = useRef<(() => void) | null>(null);

  // Web-Audio-Analyse einmalig beim ersten Abspielen einrichten (Nutzergeste).
  function setupAnalyser() {
    const audio = audioElRef.current;
    if (!audio || ctxRef.current) return;
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx = new Ctx();
      ctxRef.current = ctx;
      const src = ctx.createMediaElementSource(audio);
      src.connect(ctx.destination); // Ton weiterhin hörbar
      stopMeterRef.current = startLevelMeter(ctx, src, setLevel);
    } catch {
      /* Reaktion optional – ohne sie bleibt die Kugel ruhig */
    }
  }

  useEffect(() => {
    return () => {
      stopMeterRef.current?.();
      ctxRef.current?.close().catch(() => {});
    };
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/stones/${token}/playback`);
      if (!res.ok)
        throw new Error("Die Stimme der Kugel ließ sich nicht erwecken.");
      const data = (await res.json()) as { url: string };
      setUrl(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="orb-stage">
        {url ? <ReactiveOrb level={level} size={138} /> : <Orb size={138} />}
      </div>

      {url ? (
        <audio
          ref={audioElRef}
          src={url}
          controls
          autoPlay
          preload="auto"
          onPlay={setupAnalyser}
          onEnded={() => setLevel(0)}
          onPause={() => setLevel(0)}
        >
          Dein Browser unterstützt keine Audiowiedergabe.
        </audio>
      ) : (
        <>
          <button className="btn-primary" onClick={load} disabled={loading}>
            {loading ? "Wird erweckt…" : "▶ Der Stimme lauschen"}
          </button>
          {durationMs > 0 && (
            <p className="hint">Dauer der Botschaft: {fmt(durationMs)} Minuten</p>
          )}
          {error && <p className="error">{error}</p>}
        </>
      )}
    </div>
  );
}
