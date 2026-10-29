export type Bead = {
  x: number;
  y: number;
  px: number;
  py: number;
  light: number;
};
export type Curtain = {
  nodes: Bead[];
  cols: number;
  rows: number;
  spacing: number;
  x: number;
  y: number;
};
export function makeCurtain(cols: number, rows: number): Curtain {
  return {
    cols,
    rows,
    spacing: 1,
    x: 0,
    y: 0,
    nodes: Array.from({ length: cols * rows }, (_, i) => ({
      x: Math.floor(i / rows),
      y: i % rows,
      px: Math.floor(i / rows),
      py: i % rows,
      light: 0,
    })),
  };
}
export function placeCurtain(c: Curtain, x: number, y: number, width: number) {
  c.spacing = width / (c.rows - 1);
  c.x = x;
  c.y = y;
  for (let col = 0; col < c.cols; col++)
    for (let row = 0; row < c.rows; row++) {
      const n = c.nodes[col * c.rows + row];
      n.x = n.px = x + (col / (c.cols - 1) - 0.5) * width;
      n.y = n.py = y + row * c.spacing;
      n.light = 0;
    }
}
/** Fixed-step Verlet with pinned heads and bounded swept-pointer impulses. */
export function stepCurtain(
  c: Curtain,
  x: number,
  y: number,
  pointer: { x: number; y: number; px: number; py: number; active: boolean },
  time: number,
  iterations: number,
) {
  const width = c.spacing * (c.rows - 1),
    r = Math.max(12, width * 0.135),
    dx = pointer.x - pointer.px,
    dy = pointer.y - pointer.py,
    den = dx * dx + dy * dy;
  for (let col = 0; col < c.cols; col++)
    for (let row = 0; row < c.rows; row++) {
      const n = c.nodes[col * c.rows + row];
      if (!row) {
        n.x = n.px = x + (col / (c.cols - 1) - 0.5) * width;
        n.y = n.py = y;
        continue;
      }
      const vx = (n.x - n.px) * 0.965,
        vy = (n.y - n.py) * 0.965;
      n.px = n.x;
      n.py = n.y;
      n.x += vx + Math.sin(time * 0.65 + row * 0.18 + col * 0.21) * 0.016;
      n.y += vy + 0.42;
      n.light *= 0.94;
      if (pointer.active) {
        const t = den
            ? Math.max(
                0,
                Math.min(
                  1,
                  ((n.x - pointer.px) * dx + (n.y - pointer.py) * dy) / den,
                ),
              )
            : 0,
          px = pointer.px + dx * t,
          py = pointer.py + dy * t,
          ox = n.x - px,
          oy = n.y - py,
          d = Math.hypot(ox, oy);
        if (d < r) {
          const a = 1 - d / r;
          n.x +=
            Math.max(
              -12,
              Math.min(12, dx * 0.15 + ((ox || 1) / Math.max(1, d)) * 3),
            ) * a;
          n.y += Math.max(-8, Math.min(8, dy * 0.12)) * a;
          n.light = 1;
        }
      }
    }
  for (let k = 0; k < iterations; k++)
    for (let col = 0; col < c.cols; col++)
      for (let row = 1; row < c.rows; row++) {
        const a = c.nodes[col * c.rows + row - 1],
          b = c.nodes[col * c.rows + row],
          dx = b.x - a.x,
          dy = b.y - a.y,
          len = Math.max(0.001, Math.hypot(dx, dy)),
          correction = (len - c.spacing) / len;
        if (row === 1) {
          b.x -= dx * correction;
          b.y -= dy * correction;
        } else {
          a.x += dx * correction * 0.5;
          a.y += dy * correction * 0.5;
          b.x -= dx * correction * 0.5;
          b.y -= dy * correction * 0.5;
        }
      }
  // A final pinned-to-tail pass keeps links inextensible after the relaxation solve.
  for (let col = 0; col < c.cols; col++)
    for (let row = 1; row < c.rows; row++) {
      const a = c.nodes[col * c.rows + row - 1],
        b = c.nodes[col * c.rows + row],
        dx = b.x - a.x,
        dy = b.y - a.y,
        len = Math.max(0.001, Math.hypot(dx, dy));
      b.x = a.x + (dx / len) * c.spacing;
      b.y = a.y + (dy / len) * c.spacing;
    }
  c.x = x;
  c.y = y;
}
