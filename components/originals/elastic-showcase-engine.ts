import * as THREE from 'three';
import { elasticVertex, elasticFragment } from './elastic-showcase-shaders';

export function bounded(value: number, fallback: number, min: number, max: number) {
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}
export function safeImage(value: unknown) {
  if (typeof value !== 'string') return '';
  // Local assets or explicit HTTPS images only; no scripts, data URLs or implicit hosts.
  if (/^\/(?!\/)[^\s\\]*$/.test(value)) return value;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : ''; } catch { return ''; }
}

/** Transition clock is independent of refresh rate and freezes while suspended. */
export function elasticClock(count: number) {
  let current = 0, next = 0, elapsed = 0, moving = false;
  return {
    get current() { return current; }, get next() { return next; }, get moving() { return moving; },
    go(index: number) {
      if (moving || count < 2 || !Number.isFinite(index)) return false;
      next = ((Math.trunc(index) % count) + count) % count;
      if (next === current) return false;
      elapsed = 0; moving = true; return true;
    },
    advance(dt: number, duration: number, suspended = false, instant = false) {
      if (!moving) return 0;
      if (!suspended) elapsed += Math.max(0, dt);
      const p = instant ? 1 : Math.min(1, elapsed / bounded(duration, 1100, 200, 5000));
      if (p === 1) { current = next; moving = false; }
      return p;
    },
  };
}

type Events = { start: (from: number, to: number) => void; progress: (p: number) => void; end: (to: number) => void; gpu: (available: boolean) => void };
type Options = { duration: number; suspended: boolean; reduced: boolean };
export function createElasticEngine(host: HTMLElement, sources: string[], read: () => Options, events: Events) {
  const clock = elasticClock(sources.length);
  let dead = false, lost = false, frame = 0, last = 0, time = 0, dirty = true;
  const pointer = new THREE.Vector2(), target = new THREE.Vector2();
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setClearColor(0, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(34, 1.08, .1, 10);
  camera.position.z = 1.9;
  const geometry = new THREE.PlaneGeometry(2, 2, 48, 48);
  const uniforms = {
    uTexCurrent: { value: null as THREE.Texture | null }, uTexNext: { value: null as THREE.Texture | null },
    uProgress: { value: 0 }, uTime: { value: 0 }, uPointer: { value: pointer },
    uCoverCurrent: { value: new THREE.Vector2(1, 1) }, uCoverNext: { value: new THREE.Vector2(1, 1) },
  };
  const material = new THREE.ShaderMaterial({ uniforms, vertexShader: elasticVertex, fragmentShader: elasticFragment, transparent: true });
  const mesh = new THREE.Mesh(geometry, material); scene.add(mesh);
  host.appendChild(renderer.domElement);
  const textures: (THREE.Texture | null)[] = sources.map(() => null);
  const owned = new Set<THREE.Texture>();
  const loader = new THREE.TextureLoader(); loader.setCrossOrigin('anonymous');
  function cover(texture: THREE.Texture, out: THREE.Vector2) {
    const image = texture.image as { width: number; height: number };
    const box = Math.max(1, host.clientWidth) / Math.max(1, host.clientHeight), ratio = image.width / image.height;
    out.set(box > ratio ? 1 : box / ratio, box > ratio ? ratio / box : 1);
  }
  function paint(p: number) {
    const a = textures[clock.current], b = textures[clock.next];
    if (!a || !b || lost) { events.gpu(false); return; }
    uniforms.uTexCurrent.value = a; uniforms.uTexNext.value = b;
    uniforms.uProgress.value = p; uniforms.uTime.value = time;
    cover(a, uniforms.uCoverCurrent.value); cover(b, uniforms.uCoverNext.value);
    renderer.render(scene, camera); events.gpu(true);
  }
  function tick(now: number) {
    frame = 0; if (dead || lost) return;
    const options = read();
    if (last && now - last < 1000 / 60 - .5 && !options.suspended && !options.reduced) { frame = requestAnimationFrame(tick); return; }
    const dt = last ? Math.min(50, Math.max(0, now - last)) : 0; last = now;
    const moving = clock.moving;
    const p = clock.advance(dt, options.duration, options.suspended, options.reduced);
    if (!options.suspended) time += dt / 1000;
    if (options.reduced) { pointer.set(0, 0); target.set(0, 0); }
    else pointer.lerp(target, 1 - Math.exp(-dt / 110));
    if (dirty || moving || pointer.distanceTo(target) > .001) { dirty = false; paint(p); }
    if (moving) { events.progress(p); if (!clock.moving) { paint(0); events.end(clock.current); } }
    if (!options.suspended && !options.reduced && (clock.moving || pointer.distanceTo(target) > .001)) frame = requestAnimationFrame(tick);
    else last = 0;
  }
  function wake() { dirty = true; if (!dead && !frame && !lost) frame = requestAnimationFrame(tick); }
  function resize() {
    if (dead) return;
    const w = Math.max(1, host.clientWidth), h = Math.max(1, host.clientHeight);
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    const height = 2 * Math.tan(34 * Math.PI / 360) * camera.position.z;
    mesh.scale.set(height * camera.aspect / 2, height / 2, 1); wake();
  }
  const observer = new ResizeObserver(resize); observer.observe(host); resize();
  function contextLost(event: Event) { event.preventDefault(); lost = true; cancelAnimationFrame(frame); frame = 0; last = 0; events.gpu(false); }
  function contextRestored() { lost = false; for (const texture of owned) texture.needsUpdate = true; wake(); }
  renderer.domElement.addEventListener('webglcontextlost', contextLost);
  renderer.domElement.addEventListener('webglcontextrestored', contextRestored);
  sources.forEach((source, index) => {
    if (!source) return;
    const texture = loader.load(source, loaded => {
      if (dead) return;
      loaded.colorSpace = THREE.SRGBColorSpace; textures[index] = loaded; wake();
    }, undefined, () => { if (!dead && index === clock.current) events.gpu(false); });
    owned.add(texture);
  });
  return {
    go(index: number) {
      if (dead || !clock.go(index)) return false;
      events.start(clock.current, clock.next);
      if (read().reduced || read().suspended || !textures[clock.current] || !textures[clock.next] || lost) {
        clock.advance(0, read().duration, false, true); events.progress(1); paint(0); events.end(clock.current);
      } else wake();
      return true;
    },
    pointer(x: number, y: number) { if (dead || read().reduced || read().suspended) return; target.set(x, y); wake(); },
    sync() { if (read().suspended) { cancelAnimationFrame(frame); frame = 0; last = 0; } wake(); },
    dispose() {
      if (dead) return; dead = true; cancelAnimationFrame(frame); observer.disconnect();
      renderer.domElement.removeEventListener('webglcontextlost', contextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', contextRestored);
      geometry.dispose(); material.dispose(); for (const texture of owned) texture.dispose();
      renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
    },
  };
}
