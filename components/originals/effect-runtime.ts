/** A demand-driven clock shared by the standalone optical effects. */
export function effectRuntime(host: HTMLElement, canvas: HTMLCanvasElement,
  render: (time: number, dt: number) => void | boolean, paused: () => boolean,
  resize?: (width: number, height: number, dpr: number) => void, compact = false) {
  let frame = 0, disposed = false, visible = true, last = 0, time = 2.5, dirty = true;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  function tick(now: number) {
    frame = 0;
    if (disposed || !visible || document.hidden) return;
    const still = paused() || reduced.matches;
    const dt = Math.min((now - (last || now)) / 1000, .04); last = now;
    if (!still) time += dt;
    if (dirty || !still) { dirty = false; if(render(time, still ? 0 : dt)!==false)host.dataset.ready = 'true'; }
    if (!still) frame = requestAnimationFrame(tick);
  }
  function invalidate() { dirty = true; if (!disposed && !frame && visible && !document.hidden) frame = requestAnimationFrame(tick); }
  const ro = new ResizeObserver(() => {
    const w = Math.max(1, host.clientWidth), h = Math.max(1, host.clientHeight), dpr = Math.min(devicePixelRatio || 1, compact ? 1.5 : 2);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    resize?.(w, h, dpr); invalidate();
  }); ro.observe(host);
  const io = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting; last = 0;
    if (visible) invalidate(); else { cancelAnimationFrame(frame); frame = 0; }
  }); io.observe(host);
  function visibility() { last = 0; if (document.hidden) { cancelAnimationFrame(frame); frame = 0; } else invalidate(); }
  document.addEventListener('visibilitychange', visibility); reduced.addEventListener('change', invalidate);
  invalidate();
  return { invalidate, dispose() { disposed = true; cancelAnimationFrame(frame); ro.disconnect(); io.disconnect(); document.removeEventListener('visibilitychange', visibility); reduced.removeEventListener('change', invalidate); } };
}
