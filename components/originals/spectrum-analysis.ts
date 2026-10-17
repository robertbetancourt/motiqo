/** Logarithmic FFT sampling keeps bass, voices and upper harmonics visible. */
export function spectrumBand(
  bins: Uint8Array,
  position: number,
  sampleRate = 48000,
) {
  const frequency = 40 * Math.pow(300, Math.max(0, Math.min(1, position)));
  const center = (frequency / (sampleRate / 2)) * bins.length;
  const spread = Math.max(1, center * 0.08);
  let total = 0,
    weight = 0;
  for (
    let i = Math.max(1, Math.floor(center - spread));
    i <= Math.min(bins.length - 1, Math.ceil(center + spread));
    i++
  ) {
    const w = Math.max(0.05, 1 - Math.abs(i - center) / (spread + 1));
    total += (bins[i] / 255) * w;
    weight += w;
  }
  return weight ? Math.pow(total / weight, 1.35) : 0;
}

export function spectrumRms(samples: Uint8Array) {
  let sum = 0;
  for (const sample of samples) sum += Math.pow((sample - 128) / 128, 2);
  return Math.sqrt(sum / Math.max(1, samples.length));
}
