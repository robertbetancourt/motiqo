const scales = [
  [0, 2, 4, 7, 9],
  [0, 2, 3, 7, 8],
  [0, 2, 4, 6, 7, 9, 11],
];

/** Constructed after a gesture. Each voice owns its complete audio graph. */
export function createChimeAudio(prism = false) {
  const context = new AudioContext(),
    output = context.createGain();
  const voices = new Set<() => void>();
  output.gain.value = 0.22;
  output.connect(context.destination);
  return {
    resume: () => context.resume(),
    suspend: () => context.suspend(),
    pluck(column: number, chapter: number, pan: number, energy: number) {
      if (context.state !== "running" || voices.size >= 8) return;
      const index = ((chapter % 3) + 3) % 3,
        now = context.currentTime;
      const scale = scales[prism ? [2, 0, 2][index] : index];
      const col = Math.max(0, Math.floor(column)),
        note = scale[col % scale.length] + Math.floor(col / scale.length) * 12;
      const frequency = 185 * Math.pow(2, note / 12);
      const gain = context.createGain(),
        panner = context.createStereoPanner(),
        filter = context.createBiquadFilter();
      const oscillators: OscillatorNode[] = [],
        nodes: AudioNode[] = [gain, panner, filter];
      panner.pan.value = Math.max(-1, Math.min(1, pan));
      filter.type = "lowpass";
      filter.frequency.value = index === 1 ? 1600 : 5000;
      filter.Q.value = index === 1 ? 2 : 0.6;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(
        Math.max(0.005, Math.min(0.13, energy * 0.05)),
        now + 0.008,
      );
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);
      gain.connect(filter);
      filter.connect(panner);
      panner.connect(output);
      // A short, bounded echo gives the third instrument a resonant tail.
      if (index === 2) {
        const delay = context.createDelay(0.5),
          wet = context.createGain();
        delay.delayTime.value = 0.23;
        wet.gain.value = 0.18;
        panner.connect(delay);
        delay.connect(wet);
        wet.connect(output);
        nodes.push(delay, wet);
      }
      let remaining = 2,
        disposed = false;
      const release = () => {
        if (disposed) return;
        disposed = true;
        for (const osc of oscillators) {
          osc.onended = null;
          try {
            osc.stop();
          } catch {}
          osc.disconnect();
        }
        for (const node of nodes) node.disconnect();
        voices.delete(release);
      };
      voices.add(release);
      for (let h = 1; h <= 2; h++) {
        const osc = context.createOscillator(),
          harmonic = context.createGain();
        osc.type = "sine";
        osc.frequency.value =
          frequency * (h === 1 ? 1 : index === 2 ? 2.01 : 3);
        harmonic.gain.value = h === 1 ? 1 : 0.18;
        osc.connect(harmonic);
        if (prism && index === 1 && h === 2) {
          // A quiet FM modulator, shaped by the same exponential envelope.
          harmonic.gain.setValueAtTime(frequency * 0.12, now);
          harmonic.gain.exponentialRampToValueAtTime(0.001, now + 1.6);
          harmonic.connect(oscillators[0].frequency);
        } else harmonic.connect(gain);
        nodes.push(harmonic);
        oscillators.push(osc);
        osc.onended = () => {
          if (!--remaining) release();
        };
        osc.start(now);
        osc.stop(now + 2);
      }
    },
    dispose() {
      for (const release of [...voices]) release();
      output.disconnect();
      void context.close();
    },
  };
}
