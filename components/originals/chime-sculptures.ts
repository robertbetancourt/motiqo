/** Procedural architecture, not image-based replicas of the supplied reference. */
export function sculpture(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  index: number,
  prism: boolean,
  time: number,
) {
  g.save();
  g.translate(x, y);
  const metal = g.createLinearGradient(-w * 0.5, -w * 0.2, w * 0.5, 0);
  const tones = prism
    ? ["#38bdf8", "#c4b5fd", "#34d399"]
    : index === 0
      ? ["#5a380c", "#f4c44e", "#a76610"]
      : index === 1
        ? ["#1a1817", "#e0483e", "#721b19"]
        : ["#7a3e26", "#f5f2eb", "#b69d81"];
  metal.addColorStop(0, tones[0]);
  metal.addColorStop(0.4, tones[1]);
  metal.addColorStop(0.65, tones[0]);
  metal.addColorStop(1, tones[2]);
  g.fillStyle = metal;
  g.strokeStyle = tones[1];
  g.lineWidth = 0.7;
  if (prism && index === 0) {
    for (let i = 0; i < 2; i++) {
      const s = w * (i ? 0.27 : 0.46),
        cy = -w * 0.19;
      g.beginPath();
      g.moveTo(0, cy - s * 0.55);
      g.lineTo(s, cy);
      g.lineTo(0, cy + s * 0.55);
      g.lineTo(-s, cy);
      g.closePath();
      g.globalAlpha = 0.25;
      g.fill();
      g.globalAlpha = 1;
      g.stroke();
      g.beginPath();
      g.moveTo(-s, cy);
      g.lineTo(0, cy + s * 1.1);
      g.lineTo(s, cy);
      g.moveTo(0, cy - s * 0.55);
      g.lineTo(0, cy + s * 1.1);
      g.stroke();
    }
  } else if (prism && index === 1) {
    g.strokeStyle = "#dfb365";
    for (let i = 0; i < 14; i++) {
      g.beginPath();
      g.ellipse(
        0,
        -w * 0.1,
        w * (0.48 - i * 0.018),
        w * (0.15 + i * 0.003),
        Math.sin(time * 0.2) * 0.1,
        0,
        Math.PI * 2,
      );
      g.stroke();
    }
    g.fillRect(-w * 0.19, -w * 0.12, w * 0.38, 2);
  } else if (prism) {
    g.beginPath();
    g.moveTo(0, -w * 0.65);
    g.lineTo(w * 0.18, -w * 0.18);
    g.lineTo(w * 0.1, 0);
    g.lineTo(-w * 0.13, -w * 0.04);
    g.lineTo(-w * 0.2, -w * 0.2);
    g.closePath();
    g.fill();
    g.stroke();
    g.beginPath();
    g.moveTo(0, -w * 0.65);
    g.lineTo(w * 0.02, -w * 0.1);
    g.lineTo(w * 0.1, 0);
    g.stroke();
    g.beginPath();
    g.ellipse(0, -w * 0.2, w * 0.36, w * 0.08, -0.25, 0, Math.PI * 2);
    g.stroke();
  } else if (index === 1) {
    for (let i = 0; i < 4; i++) {
      g.fillStyle = i % 2 ? "#292423" : metal;
      g.beginPath();
      g.moveTo(-w * (0.45 - i * 0.06), -i * w * 0.055);
      g.lineTo(w * (0.5 - i * 0.08), -i * w * 0.055 - w * 0.08);
      g.lineTo(w * (0.43 - i * 0.08), -i * w * 0.055 + w * 0.04);
      g.lineTo(-w * (0.4 - i * 0.06), -i * w * 0.055 + w * 0.05);
      g.closePath();
      g.fill();
      g.stroke();
    }
  } else {
    const rings = index === 0 ? 8 : 10;
    for (let i = rings; i >= 0; i--) {
      const rw = w * (0.15 + i * 0.035),
        ry = -w * 0.31 + i * w * 0.032;
      g.beginPath();
      g.ellipse(0, ry, rw, w * 0.055, 0, 0, Math.PI * 2);
      g.fill();
      g.stroke();
    }
    for (let i = 0; i < 22; i++) {
      const a = (i / 21) * Math.PI;
      g.beginPath();
      g.moveTo(Math.cos(a) * w * 0.15, -w * 0.32);
      g.quadraticCurveTo(
        Math.cos(a) * w * 0.33,
        -w * 0.15,
        Math.cos(a) * w * 0.5,
        w * 0.02,
      );
      g.stroke();
    }
  }
  g.fillStyle = metal;
  g.fillRect(-w * 0.5, -2, w, 5);
  g.restore();
}
