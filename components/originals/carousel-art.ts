/** Original, asset-free Motiqo studies. Custom photographs can replace any study. */
export type GallerySlide = {
  image?: string;
  title?: string;
  caption?: string;
  alt?: string;
  palette?: "tide" | "ember" | "glacier" | "violet";
  seed?: number;
};
export const tidalSlides: GallerySlide[] = [
  {
    image: "/media/gallery/image-01.webp",
    alt: "Motiqo image study 1",
  },
  {
    image: "/media/gallery/image-02.webp",
    alt: "Motiqo image study 2",
  },
  {
    image: "/media/gallery/image-03.webp",
    alt: "Motiqo image study 3",
  },
  {
    image: "/media/gallery/image-04.webp",
    alt: "Motiqo image study 4",
  },
  {
    image: "/media/gallery/image-05.webp",
    alt: "Motiqo image study 5",
  },
  {
    image: "/media/gallery/image-06.webp",
    alt: "Motiqo image study 6",
  },
];
export const irisSlides: GallerySlide[] = [
  {
    image: "/media/gallery/image-04.webp",
    alt: "Motiqo image study 4",
  },
  {
    image: "/media/gallery/image-05.webp",
    alt: "Motiqo image study 5",
  },
  {
    image: "/media/gallery/image-06.webp",
    alt: "Motiqo image study 6",
  },
  {
    image: "/media/gallery/image-01.webp",
    alt: "Motiqo image study 1",
  },
  {
    image: "/media/gallery/image-02.webp",
    alt: "Motiqo image study 2",
  },
  {
    image: "/media/gallery/image-03.webp",
    alt: "Motiqo image study 3",
  },
];
export function galleryWrap(index: number, count: number) {
  return count > 0 ? ((index % count) + count) % count : 0;
}
export function galleryCover(box: number, image: number): [number, number] {
  return box > image ? [1, image / box] : [box / image, 1];
}
function random(seed: number) {
  let n = seed | 0;
  return () => {
    n = (Math.imul(n ^ (n >>> 15), 1 | n) + 0x6d2b79f5) | 0;
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}
export function paintGalleryStudy(slide: GallerySlide) {
  const c = document.createElement("canvas");
  c.width = 1200;
  c.height = 900;
  const g = c.getContext("2d")!;
  const colors = {
    tide: ["#071c2b", "#b3ced0", "#0d4f60", "#061e2c", "#d9ebe3"],
    ember: ["#251f38", "#edb18d", "#9a605c", "#282c46", "#ffe5b7"],
    glacier: ["#132e4b", "#d1e6e4", "#6490a2", "#153449", "#efffff"],
    violet: ["#161930", "#bd9eae", "#5c648a", "#1d284a", "#e2d5e3"],
  }[slide.palette ?? "tide"];
  const r = random(slide.seed ?? 17),
    sky = g.createLinearGradient(0, 0, 0, 650);
  sky.addColorStop(0, colors[0]);
  sky.addColorStop(1, colors[1]);
  g.fillStyle = sky;
  g.fillRect(0, 0, 1200, 900);
  const sx = 760 + r() * 160,
    sy = 210 + r() * 70;
  const haze = g.createRadialGradient(sx, sy, 5, sx, sy, 460);
  haze.addColorStop(0, colors[4] + "8a");
  haze.addColorStop(0.35, colors[1] + "2a");
  haze.addColorStop(1, colors[1] + "00");
  g.fillStyle = haze;
  g.fillRect(0, 0, 1200, 800);
  g.fillStyle = colors[4] + "b0";
  g.beginPath();
  g.arc(sx, sy, 32, 0, Math.PI * 2);
  g.fill();
  // Long atmospheric wisps, interrupted by the darker land masses below.
  for (let j = 0; j < 75; j++) {
    const y = r() * 490;
    g.strokeStyle =
      colors[1] +
      Math.floor(r() * 12 + 2)
        .toString(16)
        .padStart(2, "0");
    g.lineWidth = 2 + r() * 9;
    g.beginPath();
    g.ellipse(
      r() * 1200,
      y,
      140 + r() * 500,
      1 + r() * 3,
      -0.05,
      0,
      Math.PI * 2,
    );
    g.stroke();
  }
  for (let layer = 0; layer < 7; layer++) {
    const phase = r() * 7,
      base = 400 + layer * 38;
    g.fillStyle =
      colors[layer < 3 ? 2 : 3] +
      ["55", "77", "99", "aa", "cc", "ee", "ff"][layer];
    g.beginPath();
    g.moveTo(0, 900);
    for (let x = 0; x <= 1200; x += 3) {
      const u = x / 1200,
        peak = Math.pow(Math.max(0, Math.sin(u * 4.1 + phase)), 3);
      const y =
        base -
        peak * (120 + layer * 14) -
        Math.sin(u * 17 + phase) * 23 -
        Math.sin(u * 53 + phase) * 5;
      g.lineTo(x, y);
    }
    g.lineTo(1200, 900);
    g.closePath();
    g.fill();
  }
  const sea = g.createLinearGradient(0, 565, 0, 900);
  sea.addColorStop(0, colors[1]);
  sea.addColorStop(0.06, colors[2]);
  sea.addColorStop(1, colors[0]);
  g.fillStyle = sea;
  g.beginPath();
  g.moveTo(380, 565);
  g.bezierCurveTo(670, 585, 140, 790, 0, 900);
  g.lineTo(1200, 900);
  g.lineTo(1200, 565);
  g.fill();
  g.save();
  g.clip();
  for (let i = 0; i < 2400; i++) {
    const y = 565 + r() * 335,
      x = r() * 1200;
    g.strokeStyle =
      colors[4] +
      Math.floor(6 + r() * 24)
        .toString(16)
        .padStart(2, "0");
    g.lineWidth = 0.4 + r() * 0.7;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + 3 + r() * (y - 550) * 0.25, y);
    g.stroke();
  }
  g.restore();
  const pixels = g.getImageData(0, 0, 1200, 900);
  for (let i = 0; i < pixels.data.length; i += 4) {
    const grain = (r() - 0.5) * 9;
    for (let k = 0; k < 3; k++) pixels.data[i + k] += grain;
  }
  g.putImageData(pixels, 0, 0);
  return c;
}
