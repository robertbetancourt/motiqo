/** Motiqo's elastic material lattice. Strokes transport deformation and breakup
 * through neighboring cells; the material then relaxes back into its artwork. */
export class MaterialWake {
  readonly size = 56;
  readonly pixels = new Uint8Array(this.size * this.size * 4);
  private state = new Float32Array(this.size * this.size * 3);
  private next = new Float32Array(this.state.length);
  private scratch = new Float32Array(3);
  activity = 0;
  constructor() { this.clear(); }
  clear() {
    this.state.fill(0); this.next.fill(0); this.activity = 0;
    for (let i = 0; i < this.pixels.length; i += 4) {
      this.pixels[i] = this.pixels[i + 1] = 128;
      this.pixels[i + 2] = 0; this.pixels[i + 3] = 255;
    }
  }
  sample(x: number, y: number, width: number, height: number, out: Float32Array) {
    const n = this.size, gx = Math.max(0, Math.min(n - 1, x / width * n - .5)), gy = Math.max(0, Math.min(n - 1, y / height * n - .5));
    const ix = Math.floor(gx), iy = Math.floor(gy), tx = gx - ix, ty = gy - iy;
    const a = (iy * n + ix) * 3, b = (iy * n + Math.min(n - 1, ix + 1)) * 3,
      c = (Math.min(n - 1, iy + 1) * n + ix) * 3, d = (Math.min(n - 1, iy + 1) * n + Math.min(n - 1, ix + 1)) * 3;
    for (let k = 0; k < 3; k++) out[k] = (this.state[a + k] * (1 - tx) + this.state[b + k] * tx) * (1 - ty) + (this.state[c + k] * (1 - tx) + this.state[d + k] * tx) * ty;
  }
  step(dt: number, width: number, height: number, fromX: number, fromY: number, x: number, y: number, presence: number, pressed: boolean,
    options: {radius: number; strength: number; liquid: number; spread: number; turbulence: number; returnSpeed: number}, time: number) {
    const n = this.size, dx = x - fromX, dy = y - fromY, travel = dx * dx + dy * dy;
    const radius = Math.max(1, options.radius * .72), decay = Math.exp(-dt * (1.8 + options.returnSpeed * 1.6));
    const speed = Math.min(1, Math.sqrt(travel) / Math.max(.001, dt) / 650), limit = Math.min(126, Math.min(width, height) * .17);
    this.activity = 0;
    for (let row = 0; row < n; row++) for (let col = 0; col < n; col++) {
      const index = (row * n + col) * 3, px = (col + .5) / n * width, py = (row + .5) / n * height;
      this.sample(px - this.state[index] * dt * 1.8, py - this.state[index + 1] * dt * 1.8, width, height, this.scratch);
      const along = travel > .0001 ? Math.max(0, Math.min(1, ((px - fromX) * dx + (py - fromY) * dy) / travel)) : 1;
      const rx = px - fromX - along * dx, ry = py - fromY - along * dy;
      const influence = Math.exp(-(rx * rx + ry * ry) / (radius * radius)) * presence * options.strength;
      const twist = (pressed ? 30 : 9) * options.liquid * dt;
      const ripple = Math.sin(px * .022 + time * 1.7) * Math.cos(py * .019 - time) * options.turbulence;
      let ox = this.scratch[0] * decay + influence * (dx * .52 * options.liquid - ry / radius * twist + ripple * dt * 5);
      let oy = this.scratch[1] * decay + influence * (dy * .52 * options.liquid + rx / radius * twist - ripple * dt * 5);
      let breakup = Math.max(this.scratch[2] * decay, Math.min(1, influence * (speed * .85 + (pressed ? .32 : 0)) * options.spread));
      ox = Math.max(-limit, Math.min(limit, ox)); oy = Math.max(-limit, Math.min(limit, oy));
      if (Math.abs(ox) < .015) ox = 0; if (Math.abs(oy) < .015) oy = 0; if (breakup < .002) breakup = 0;
      this.next[index] = ox; this.next[index + 1] = oy; this.next[index + 2] = breakup;
      this.activity = Math.max(this.activity, Math.abs(ox), Math.abs(oy), breakup * 20);
      const pixel = (row * n + col) * 4;
      this.pixels[pixel] = Math.round(128 + ox / 128 * 127); this.pixels[pixel + 1] = Math.round(128 + oy / 128 * 127); this.pixels[pixel + 2] = Math.round(breakup * 255);
    }
    const previous = this.state; this.state = this.next; this.next = previous;
  }
}
