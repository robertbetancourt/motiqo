// Original Motiqo engraving. Four masks share a single GPU texture.
export function cardArtwork(back = false, width = 1024) {
  const height = Math.round(width * 1.4);
  function layer() {
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, width, height);
    ctx.scale(width / 1000, height / 1400);
    ctx.strokeStyle = '#fff'; ctx.fillStyle = '#fff';
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    return { ctx, canvas };
  }
  const gold = layer(), ink = layer(), engraving = layer();
  const g = gold.ctx, i = ink.ctx, e = engraving.ctx;
  function box(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, line = 2) {
    ctx.lineWidth = line; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.stroke();
  }
  function text(ctx: CanvasRenderingContext2D, value: string, y: number, size: number, spacing: number, family = 'Georgia') {
    ctx.font = `${size}px ${family}`; ctx.textBaseline = 'middle';
    const chars = [...value], sizes = chars.map(c => ctx.measureText(c).width);
    let x = 500 - (sizes.reduce((a, b) => a + b, 0) + (chars.length - 1) * spacing) / 2;
    chars.forEach((c, n) => { ctx.fillText(c, x, y); x += sizes[n] + spacing; });
  }
  for (const [offset, line] of [[20, 3], [31, 1], [43, 3], [54, 1], [75, 2]] as const) {
    box(g, offset, offset, 1000 - offset * 2, 1400 - offset * 2, 42 - offset * .17, line);
  }
  // A beaded edge and interrupted traces give the frame a printed, physical scale.
  for (let y = 70; y < 1330; y += 12) for (const x of [63, 937]) {
    g.beginPath(); g.arc(x, y, 1.6, 0, Math.PI * 2); g.fill();
  }
  for (let x = 82; x < 920; x += 12) for (const y of [63, 1337]) {
    g.beginPath(); g.arc(x, y, 1.6, 0, Math.PI * 2); g.fill();
  }
  for (const [x, y] of [[52, 52], [948, 52], [52, 1348], [948, 1348]]) {
    for (const radius of [9, 16, 23]) {
      g.lineWidth = radius === 16 ? 3 : 1;
      g.beginPath(); g.arc(x, y, radius, 0, Math.PI * 2); g.stroke();
    }
  }
  box(g, 116, 102, 768, 121, 15, 3); box(g, 128, 114, 744, 97, 9, 1);
  text(g, 'MOTIQO', 163, 48, 16);
  for (const x of [146, 854]) { g.beginPath(); g.moveTo(x, 148); g.lineTo(x + 7, 163); g.lineTo(x, 178); g.lineTo(x - 7, 163); g.closePath(); g.stroke(); }
  box(g, 116, 1123, 768, 159, 17, 3); box(g, 128, 1135, 744, 135, 10, 1);
  text(g, back ? 'CURIOUS BY DESIGN' : 'MADE TO MOVE', 1192, back ? 30 : 40, back ? 5 : 9);
  text(i, 'INDEPENDENT MOTION COLLECTION', 1156, 9, 3, 'monospace');
  text(i, back ? 'KEEP THE GOOD ONES CLOSE' : 'SMALL DETAILS. STRONG IMPRESSIONS.', 1240, 10, 2.3, 'monospace');
  text(i, 'EXPERIMENT NO. 006', 1312, 10, 3, 'monospace');
  // Nested arch traces echo the window without borrowing the reference artwork.
  for (let n = 0; n < 6; n++) {
    const r = 360 + n * 5, bottom = 1088 + n * 3;
    g.lineWidth = n === 0 ? 4 : n === 3 ? 2 : .85;
    g.beginPath(); g.moveTo(500 - r, bottom); g.lineTo(500 - r, 622);
    g.arc(500, 622, r, Math.PI, Math.PI * 2); g.lineTo(500 + r, bottom);
    g.lineTo(500 - r, bottom); g.stroke();
  }
  for (let n = 0; n < 23; n++) {
    const r = 120 + n * 19;
    e.lineWidth = .7; e.beginPath();
    for (let j = 0; j <= 240; j++) {
      const a = j / 240 * Math.PI * 2, w = r + 7 * Math.sin(a * 11 + n * .37);
      const x = 500 + Math.cos(a) * w, y = 704 + Math.sin(a) * w;
      if (j) e.lineTo(x, y); else e.moveTo(x, y);
    }
    e.closePath(); e.stroke();
  }
  if (back) {
    for (const r of [196, 210, 240, 256, 272]) {
      g.lineWidth = r === 240 ? 3 : 1; g.beginPath(); g.arc(500, 704, r, 0, Math.PI * 2); g.stroke();
    }
    g.lineWidth = 6;
    for (let n = 0; n < 4; n++) { g.beginPath(); g.arc(500, 704, 90 + n * 26, n * Math.PI / 2, n * Math.PI / 2 + 1.1); g.stroke(); }
    text(i, 'A LITTLE MOTION / A LOT OF CHARACTER', 1023, 12, 2, 'monospace');
  }
  const blurred = layer();
  blurred.ctx.setTransform(1, 0, 0, 1, 0, 0); blurred.ctx.filter = `blur(${width / 700}px)`;
  blurred.ctx.drawImage(gold.canvas, 0, 0);
  const masks = [gold, blurred, ink, engraving].map(l => l.ctx.getImageData(0, 0, width, height).data);
  const data = new Uint8Array(width * height * 4);
  for (let p = 0; p < data.length; p += 4) for (let c = 0; c < 4; c++) data[p + c] = masks[c][p];
  return { data, width, height };
}
