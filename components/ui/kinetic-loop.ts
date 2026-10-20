/** Shared timing only. Pauses preserve simulation time; reduced motion is a still. */
export function createKineticLoop(host: HTMLElement, draw: (dt: number, still: boolean, reduced: boolean) => void | boolean, resize: () => void, paused: () => boolean) {
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0, last = 0, visible = true, disposed = false, failed = false;
  const running = () => !disposed && !failed && !document.hidden && visible && !paused() && !media.matches;
  function paint(dt: number, still: boolean) {
    try { const ready = draw(dt, still, media.matches); if (ready !== false) host.dataset.ready = 'true'; else delete host.dataset.ready; }
    catch { failed = true; host.dataset.gl = 'off'; host.dataset.ready = 'true'; }
  }
  function tick(now: number) {
    frame = 0; if (!running()) return;
    if (last && now - last < 16) { frame = requestAnimationFrame(tick); return; }
    const dt = last ? Math.min((now - last) / 1000, .04) : 1 / 60; last = now;
    paint(dt, false); if (running()) frame = requestAnimationFrame(tick);
  }
  function sync() {
    cancelAnimationFrame(frame); frame = 0; last = 0; failed = false;
    if (disposed) return;
    if (running()) frame = requestAnimationFrame(tick); else paint(0, true);
  }
  const ro = new ResizeObserver(() => { resize(); sync(); });
  const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
  ro.observe(host); io.observe(host);
  document.addEventListener('visibilitychange', sync); media.addEventListener('change', sync);
  resize(); sync();
  return { sync, reduced: () => media.matches, dispose() {
    if (disposed) return; disposed = true; cancelAnimationFrame(frame); ro.disconnect(); io.disconnect();
    document.removeEventListener('visibilitychange', sync); media.removeEventListener('change', sync);
  } };
}

/** Compact gradient simplex noise, authored from the tetrahedral construction. */
export const kineticNoise = `
vec3 khash(vec3 p){vec3 q=fract(p*vec3(.1031,.11369,.13787));q+=dot(q,q.yzx+19.19);return normalize(fract(vec3(q.x*q.y,q.y*q.z,q.z*q.x)*17.17)*2.-1.+vec3(.0001));}
float snoise(vec3 p){
 vec3 i=floor(p+dot(p,vec3(1./3.))),a=p-i+dot(i,vec3(1./6.));
 vec3 order=step(a.yzx,a.xyz),lo=1.-order;
 vec3 i1=min(order,lo.zxy),i2=max(order,lo.zxy);
 vec3 b=a-i1+1./6.,c=a-i2+1./3.,d=a-.5;
 vec4 w=max(.6-vec4(dot(a,a),dot(b,b),dot(c,c),dot(d,d)),0.);w*=w;w*=w;
 return 32.*dot(w,vec4(dot(khash(i),a),dot(khash(i+i1),b),dot(khash(i+i2),c),dot(khash(i+1.),d)));
}
float kfbm(vec3 p){float f=0.,a=.52;for(int i=0;i<4;i++){f+=a*snoise(p);p=p*2.03+vec3(1.7,4.1,2.8);a*=.5;}return f;}
`;
