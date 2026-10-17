export type ScorePreset = "inception" | "interstellar";
/** An original generative score, not a recording or transcription of a film soundtrack. */
export function createScoreEngine(
  audioUrl: string | undefined,
  preset: ScorePreset,
) {
  const context = new AudioContext(),
    analyser = context.createAnalyser();
  analyser.fftSize = 1024;
  analyser.smoothingTimeConstant = 0.85;
  const master = context.createGain(),
    limiter = context.createDynamicsCompressor();
  master.gain.value = 0.62;
  limiter.threshold.value = -18;
  limiter.knee.value = 18;
  limiter.ratio.value = 5;
  limiter.attack.value = 0.008;
  limiter.release.value = 0.3;
  master.connect(limiter);
  limiter.connect(analyser);
  analyser.connect(context.destination);
  const nodes = new Set<AudioNode>(),
    voices = new Set<OscillatorNode>();
  let timer: ReturnType<typeof setInterval> | undefined,
    disposed = false,
    beat = 0,
    nextBeat = 0.08;
  let media: HTMLAudioElement | undefined,
    mediaSource: MediaElementAudioSourceNode | undefined;
  const bus = context.createGain(),
    filter = context.createBiquadFilter(),
    delay = context.createDelay(2),
    feedback = context.createGain(),
    wet = context.createGain(),
    reverb = context.createConvolver();
  filter.type = "lowpass";
  filter.frequency.value = 900;
  filter.Q.value = 0.45;
  bus.connect(filter);
  filter.connect(master);
  filter.connect(reverb);
  reverb.connect(wet);
  wet.gain.value = 0.3;
  wet.connect(master);
  filter.connect(delay);
  delay.delayTime.value = 0.42;
  delay.connect(feedback);
  feedback.gain.value = 0.27;
  feedback.connect(delay);
  delay.connect(wet);
  const length = Math.floor(context.sampleRate * 2.8),
    impulse = context.createBuffer(2, length, context.sampleRate);
  let seed = 92;
  for (let channel = 0; channel < 2; channel++) {
    const samples = impulse.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
      samples[i] =
        ((seed >>> 0) / 2147483648 - 1) * Math.pow(1 - i / length, 3) * 0.55;
    }
  }
  reverb.buffer = impulse;
  if (audioUrl) {
    media = new Audio();
    media.crossOrigin = "anonymous";
    media.preload = "none";
    media.loop = true;
    media.src = audioUrl;
    mediaSource = context.createMediaElementSource(media);
    mediaSource.connect(master);
  }
  const frequency = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);
  function voice(
    midi: number,
    at: number,
    duration: number,
    volume: number,
    type: OscillatorType,
    detune = 0,
    attack = 0.1,
  ) {
    const oscillator = context.createOscillator(),
      gain = context.createGain();
    voices.add(oscillator);
    nodes.add(gain);
    oscillator.type = type;
    oscillator.frequency.value = frequency(midi);
    oscillator.detune.value = detune;
    gain.gain.setValueAtTime(0.00001, at);
    gain.gain.exponentialRampToValueAtTime(
      Math.max(0.00002, volume),
      at + attack,
    );
    gain.gain.exponentialRampToValueAtTime(0.00001, at + duration);
    oscillator.connect(gain);
    gain.connect(bus);
    oscillator.start(at);
    oscillator.stop(at + duration + 0.02);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
      voices.delete(oscillator);
      nodes.delete(gain);
    };
  }
  const progression =
    preset === "interstellar"
      ? [
          [45, 52, 57, 60, 64],
          [41, 48, 53, 57, 60],
          [48, 55, 60, 64, 67],
          [43, 50, 55, 59, 62],
        ]
      : [
          [45, 52, 57, 60, 64],
          [48, 55, 59, 64, 67],
          [41, 48, 53, 57, 60],
          [43, 50, 55, 62, 67],
        ];
  const seconds = 60 / (preset === "interstellar" ? 78 : 68);
  function schedule() {
    if (disposed || context.state !== "running") return;
    // A bounded look-ahead queue stays in audio-clock time, independent of render FPS.
    if (nextBeat < context.currentTime - 0.5)
      nextBeat = context.currentTime + 0.03;
    while (nextBeat < context.currentTime + 0.18) {
      const chord = progression[Math.floor(beat / 16) % progression.length],
        at = nextBeat;
      if (beat % 16 === 0) {
        const swell = 0.8 + 0.2 * Math.sin(beat * 0.021);
        chord.forEach((note, i) => {
          voice(
            note,
            at,
            seconds * 17,
            0.018 * swell,
            "triangle",
            -5 + i * 0.7,
            0.8,
          );
          voice(
            note,
            at,
            seconds * 17,
            0.006 * swell,
            "sawtooth",
            5 - i * 0.5,
            1.3,
          );
        });
        filter.frequency.cancelScheduledValues(at);
        filter.frequency.setValueAtTime(650, at);
        filter.frequency.exponentialRampToValueAtTime(1900, at + seconds * 12);
      }
      const arp =
        chord[(beat * 3 + Math.floor(beat / 8)) % chord.length] +
        (preset === "interstellar" ? 24 : 12);
      voice(arp, at, seconds * 2.5, 0.027, "sine", 0, 0.012);
      voice(arp + 12, at, seconds * 0.85, 0.0035, "triangle", 1, 0.008);
      if (beat % 4 === 0)
        voice(chord[0] - 12, at, seconds * 2, 0.07, "sine", 0, 0.025);
      nextBeat += seconds * 0.5;
      beat++;
    }
  }
  return {
    context,
    analyser,
    media,
    async play() {
      if (disposed) return;
      await context.resume();
      if (media) await media.play();
      else {
        schedule();
        timer ??= setInterval(schedule, 25);
      }
    },
    async pause() {
      if (disposed) return;
      media?.pause();
      if (timer) {
        clearInterval(timer);
        timer = undefined;
      }
      await context.suspend();
    },
    async dispose() {
      if (disposed) return;
      disposed = true;
      if (timer) clearInterval(timer);
      media?.pause();
      if (media) {
        media.removeAttribute("src");
        media.load();
      }
      mediaSource?.disconnect();
      voices.forEach((oscillator) => {
        oscillator.onended = null;
        try {
          oscillator.stop();
        } catch {}
        oscillator.disconnect();
      });
      nodes.forEach((node) => node.disconnect());
      [
        bus,
        filter,
        delay,
        feedback,
        wet,
        reverb,
        master,
        limiter,
        analyser,
      ].forEach((node) => node.disconnect());
      await context.close();
    },
  };
}
