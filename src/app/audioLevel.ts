// Misst den Lautstärkepegel (RMS) eines Audio-Knotens und meldet ihn pro Frame.
// Rückgabe: Stopp-Funktion, die Messung und Verbindungen wieder löst.

export function startLevelMeter(
  ctx: AudioContext,
  source: AudioNode,
  onLevel: (level: number) => void,
): () => void {
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 512;
  source.connect(analyser);

  const data = new Uint8Array(analyser.frequencyBinCount);
  let raf = 0;
  let running = true;

  const loop = () => {
    analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / data.length);
    // Skalieren und sanft begrenzen (0..1).
    onLevel(Math.min(1, rms * 2.4));
    if (running) raf = requestAnimationFrame(loop);
  };
  loop();

  return () => {
    running = false;
    cancelAnimationFrame(raf);
    try {
      analyser.disconnect();
    } catch {
      /* bereits getrennt */
    }
  };
}
