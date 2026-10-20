"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

export type PrismBloomProps = {
  strength?: number;
  radius?: number;
  returnSpeed?: number;
  iridescence?: number;
  bloom?: number;
  sculptureScale?: number;
  compact?: boolean;
  paused?: boolean;
  className?: string;
};
const bound = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Number.isFinite(n) ? n : lo));

/** A cupped, twisting lamina; the centreline and both edges are continuous. */
export function bloomSurface(t: number, v: number): THREE.Vector3 {
  const width = .018 + .57 * Math.pow(Math.sin(Math.PI * t), .85);
  const twist = -.3 + t * .95;
  return new THREE.Vector3(
    v * width * Math.cos(twist) + .12 * Math.sin(t * Math.PI),
    .12 + t * 1.72,
    .48 * Math.sin(t * Math.PI) + .30 * t * t + v * width * Math.sin(twist) + .24 * v * v * Math.sin(t * Math.PI),
  );
}

/** Closed thin volumes, including the rims, so transmission has actual depth. */
export function createBloomPetal(compact = false) {
  const rows = compact ? 22 : 36, cols = compact ? 10 : 16;
  const stride = cols + 1, layer = (rows + 1) * stride;
  const positions: number[] = [], indices: number[] = [];
  for (const side of [1, -1]) for (let i = 0; i <= rows; i++) for (let j = 0; j <= cols; j++) {
    const t = i / rows, v = j / cols * 2 - 1, p = bloomSurface(t, v);
    const dt = bloomSurface(Math.min(1, t + .0001), v).sub(bloomSurface(Math.max(0, t - .0001), v));
    const dv = bloomSurface(t, v + .0001).sub(bloomSurface(t, v - .0001));
    const normal = dv.cross(dt).normalize();
    p.addScaledVector(normal, side * (.018 + .008 * Math.sin(t * Math.PI)));
    positions.push(p.x, p.y, p.z);
  }
  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
    const a = i * stride + j, b = a + 1, c = a + stride, d = c + 1;
    indices.push(a, b, d, a, d, c, a + layer, d + layer, b + layer, a + layer, c + layer, d + layer);
  }
  const seam = (a: number, b: number) => indices.push(a, b + layer, a + layer, a, b, b + layer);
  for (let j = 0; j < cols; j++) { seam(j + 1, j); seam(rows * stride + j, rows * stride + j + 1); }
  for (let i = 0; i < rows; i++) { seam(i * stride, (i + 1) * stride); seam((i + 1) * stride + cols, i * stride + cols); }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals(); geometry.computeBoundingSphere();
  return geometry;
}

type BloomState = Required<Pick<PrismBloomProps, "strength" | "radius" | "returnSpeed" | "iridescence" | "bloom" | "sculptureScale" | "compact" | "paused">> & { theme: "dark" | "light" };

export function createPrismBloomRenderer(host: HTMLElement, canvas: HTMLCanvasElement, read: () => BloomState) {
  const scene = new THREE.Scene(), group = new THREE.Group(); scene.add(group);
  const camera = new THREE.PerspectiveCamera(36, 1, .1, 30); camera.position.set(0, 0, 6.5);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.transmissionResolutionScale = read().compact ? .35 : .5;
  let shaderFailed = false;
  renderer.debug.onShaderError = () => { shaderFailed = true; host.dataset.gl = "off"; host.dataset.ready = "true"; };
  renderer.setClearColor(0x000000, 0); renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.2;
  // Generated locally: broad studio reflections, with no HDR download or model.
  let environment: THREE.WebGLRenderTarget | undefined;
  const room = new RoomEnvironment(), pmrem = new THREE.PMREMGenerator(renderer);
  try { environment = pmrem.fromScene(room, .04); scene.environment = environment.texture; }
  catch (error) { renderer.dispose(); throw error; }
  finally { room.dispose(); pmrem.dispose(); }
  const geometry = createBloomPetal(read().compact || host.clientWidth < 500);
  const uniforms = { pbTime: { value: 0 }, pbTouch: { value: new THREE.Vector3(0, 0, 3) }, pbForce: { value: 0 }, pbRadius: { value: .85 }, pbBreathe: { value: 0 } };
  const material = new THREE.MeshPhysicalMaterial({
    color: 0xa7b0ce, metalness: .28, roughness: .14, transmission: .72,
    thickness: .24, ior: 1.45, iridescence: .85, iridescenceIOR: 1.32,
    iridescenceThicknessRange: [160, 480], clearcoat: 1, clearcoatRoughness: .13,
    envMapIntensity: 1.8, side: THREE.DoubleSide,
  });
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = `uniform float pbTime; uniform vec3 pbTouch; uniform float pbForce; uniform float pbRadius; uniform float pbBreathe;
      float bloomWave(vec3 p){
        vec3 world=(modelMatrix*vec4(p,1.)).xyz;
        float d=length(world-pbTouch),r=max(.15,pbRadius);
        float brush=exp(-d*d/(r*r));
        float tip=smoothstep(.15,1.6,p.y);
        return tip*(pbForce*brush*(.23+.06*sin(d*8.-pbTime*4.))+pbBreathe*.018*sin(pbTime*.65+p.y*2.));
      }
    ` + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace("#include <beginnormal_vertex>", `
      #include <beginnormal_vertex>
      vec3 gradient=vec3(bloomWave(position+vec3(.005,0.,0.))-bloomWave(position-vec3(.005,0.,0.)),bloomWave(position+vec3(0.,.005,0.))-bloomWave(position-vec3(0.,.005,0.)),bloomWave(position+vec3(0.,0.,.005))-bloomWave(position-vec3(0.,0.,.005)))/.01;
      objectNormal=normalize(objectNormal-gradient+normal*dot(gradient,normal));
    `).replace("#include <begin_vertex>", `#include <begin_vertex>
      transformed+=normal*bloomWave(position);
    `);
  };
  const petals: { mesh: THREE.Mesh; angle: number; length: number; tilt: number }[] = [];
  for (let i = 0; i < 11; i++) {
    const inner = i >= 7, k = inner ? i - 7 : i, count = inner ? 4 : 7;
    const mesh = new THREE.Mesh(geometry, material), angle = k / count * Math.PI * 2 + (inner ? .55 : .14);
    const length = (inner ? .64 : 1) * (1 + .10 * Math.sin(i * 2.3));
    const tilt = inner ? -.38 : -.12 + .17 * Math.sin(i * 1.7);
    mesh.position.z = inner ? .34 : -.10;
    mesh.scale.set(length * (inner ? .94 : 1), length, length);
    group.add(mesh); petals.push({ mesh, angle, length, tilt });
  }
  scene.add(new THREE.HemisphereLight(0xdde8ff, 0x403349, 1.1));
  const key = new THREE.DirectionalLight(0xfff4e9, 2.1); key.position.set(-3, 4, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(0x9baeff, 1.8); rim.position.set(4, -1, 2); scene.add(rim);
  const pink = new THREE.DirectionalLight(0xe7c3ef, 1.1); pink.position.set(-2, -3, 1); scene.add(pink);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)"), coarse = matchMedia("(pointer: coarse)");
  const ray = new THREE.Raycaster(), pointer = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -.25);
  const target = new THREE.Vector3(0, 0, 3), velocity = new THREE.Vector3(), touch = uniforms.pbTouch.value;
  let force = 0, forceVelocity = 0, active = false, visible = true, lost = false, disposed = false, frame = 0, last = 0, time = 0;
  let yaw = 0, pitch = 0, targetYaw = 0, targetPitch = 0, theme = "", width = 1, height = 1;
  const animate = () => !disposed && !shaderFailed && !lost && visible && !document.hidden && !read().paused && !reduced.matches;
  function resize() {
    width = host.clientWidth || 1; height = host.clientHeight || 1;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, read().compact || coarse.matches || width < 500 ? 1 : 1.5));
    renderer.setSize(width, height, false); camera.aspect = width / height;
    camera.position.z = camera.aspect < 1 ? 6.7 / camera.aspect : 6.7;
    camera.updateProjectionMatrix(); sync();
  }
  function draw(dt: number) {
    const state = read(), moving = animate();
    if (moving) time += dt;
    const stiffness = 65 * bound(state.returnSpeed, .3, 2), damping = 2 * Math.sqrt(stiffness) * .82;
    const desired = moving && active ? bound(state.strength, 0, 2) : 0;
    forceVelocity += ((desired - force) * stiffness - forceVelocity * damping) * dt;
    force = bound(force + forceVelocity * dt, -.15, 2.2);
    const delta = target.clone().sub(touch).multiplyScalar(90).addScaledVector(velocity, -19);
    velocity.addScaledVector(delta, dt); touch.addScaledVector(velocity, dt);
    if (!moving) { force = forceVelocity = 0; velocity.set(0, 0, 0); touch.copy(target); }
    const ease = 1 - Math.exp(-dt * 5);
    yaw += ((moving ? targetYaw : 0) - yaw) * ease; pitch += ((moving ? targetPitch : 0) - pitch) * ease;
    group.rotation.set(-.17 + pitch, -.25 + yaw, -.16);
    group.scale.setScalar(bound(state.sculptureScale, .6, 1.25));
    const openness = bound(state.bloom, .35, 1.25);
    for (const { mesh, angle, tilt } of petals) {
      mesh.rotation.set(tilt - (openness - .85) * .65, .16 * Math.sin(angle), angle);
    }
    uniforms.pbTime.value = time; uniforms.pbForce.value = force;
    uniforms.pbRadius.value = bound(state.radius, .3, 1.6); uniforms.pbBreathe.value = moving ? 1 : 0;
    const hadIridescence = material.iridescence > 0;
    material.iridescence = bound(state.iridescence, 0, 1);
    if (hadIridescence !== (material.iridescence > 0)) material.needsUpdate = true;
    if (theme !== state.theme) {
      theme = state.theme; material.color.set(theme === "light" ? 0x909ab8 : 0xa7b0ce);
      renderer.toneMappingExposure = theme === "light" ? .9 : .95;
    }
    renderer.render(scene, camera); host.dataset.ready = "true"; host.dataset.gl = shaderFailed ? "off" : "on";
  }
  function tick(now: number) {
    frame = 0; if (!animate()) return;
    if (last && now - last < 1000 / 60 - .5) { frame = requestAnimationFrame(tick); return; }
    const dt = last ? Math.min((now - last) / 1000, .032) : 1 / 60; last = now;
    draw(dt); if (animate()) frame = requestAnimationFrame(tick);
  }
  function sync() {
    cancelAnimationFrame(frame); frame = 0; last = 0;
    if (disposed || lost) return;
    if (animate()) frame = requestAnimationFrame(tick);
    else draw(1 / 60);
  }
  function point(x: number, y: number) {
    pointer.set(x / width * 2 - 1, 1 - y / height * 2);
    ray.setFromCamera(pointer, camera); ray.ray.intersectPlane(plane, target);
    targetYaw = pointer.x * .10; targetPitch = -pointer.y * .07; active = true;
  }
  function move(event: PointerEvent) {
    if (read().paused || reduced.matches || (event.pointerType === "touch" && !event.buttons)) return;
    const rect = host.getBoundingClientRect(); point(event.clientX - rect.left, event.clientY - rect.top);
  }
  function leave() { active = false; targetYaw = targetPitch = 0; }
  function up(event: PointerEvent) { if (event.pointerType === "touch") leave(); }
  function keydown(event: KeyboardEvent) {
    if (event.target !== host || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "Enter", " "].includes(event.key) || reduced.matches || read().paused) return;
    event.preventDefault();
    if (event.key === "Home") { leave(); return; }
    const x = bound((pointer.x + (event.key === "ArrowLeft" ? -.15 : event.key === "ArrowRight" ? .15 : 0)), -.8, .8);
    const y = bound((pointer.y + (event.key === "ArrowDown" ? -.15 : event.key === "ArrowUp" ? .15 : 0)), -.8, .8);
    point((x + 1) / 2 * width, (1 - y) / 2 * height);
  }
  const visibility = () => { if (document.hidden) leave(); sync(); };
  const contextLost = (event: Event) => { event.preventDefault(); lost = true; cancelAnimationFrame(frame); frame = 0; host.dataset.gl = "off"; };
  const contextRestored = () => {
    lost = false; shaderFailed = false;
    const restoredRoom = new RoomEnvironment(), generator = new THREE.PMREMGenerator(renderer);
    try { const previous = environment; environment = undefined; previous?.dispose(); environment = generator.fromScene(restoredRoom, .04); scene.environment = environment.texture; }
    catch { shaderFailed = true; host.dataset.gl = "off"; }
    finally { restoredRoom.dispose(); generator.dispose(); }
    sync();
  };
  const resizeObserver = new ResizeObserver(resize), intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
  host.addEventListener("pointermove", move); host.addEventListener("pointerdown", move); host.addEventListener("pointerup", up);
  host.addEventListener("pointerleave", leave); host.addEventListener("pointercancel", leave); host.addEventListener("blur", leave); host.addEventListener("keydown", keydown);
  canvas.addEventListener("webglcontextlost", contextLost); canvas.addEventListener("webglcontextrestored", contextRestored);
  document.addEventListener("visibilitychange", visibility); reduced.addEventListener("change", sync); coarse.addEventListener("change", resize);
  function dispose() {
    if (disposed) return; disposed = true; cancelAnimationFrame(frame);
    resizeObserver.disconnect(); intersection.disconnect();
    host.removeEventListener("pointermove", move); host.removeEventListener("pointerdown", move); host.removeEventListener("pointerup", up);
    host.removeEventListener("pointerleave", leave); host.removeEventListener("pointercancel", leave); host.removeEventListener("blur", leave); host.removeEventListener("keydown", keydown);
    canvas.removeEventListener("webglcontextlost", contextLost); canvas.removeEventListener("webglcontextrestored", contextRestored);
    document.removeEventListener("visibilitychange", visibility); reduced.removeEventListener("change", sync); coarse.removeEventListener("change", resize);
    geometry.dispose(); material.dispose(); environment?.dispose(); renderer.dispose(); scene.clear();
    delete host.dataset.gl; delete host.dataset.ready;
  }
  try { resizeObserver.observe(host); intersection.observe(host); resize(); }
  catch (error) { dispose(); throw error; }
  return { sync, dispose };
}

export default function PrismBloom({ strength = 1, radius = .85, returnSpeed = 1, iridescence = .85, bloom = .85, sculptureScale = 1, compact = false, paused = false, className = "" }: PrismBloomProps) {
  const host = useRef<HTMLDivElement>(null), canvas = useRef<HTMLCanvasElement>(null);
  const renderer = useRef<ReturnType<typeof createPrismBloomRenderer> | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const state = useRef<BloomState>({ strength, radius, returnSpeed, iridescence, bloom, sculptureScale, compact, paused, theme });
  state.current = { strength, radius, returnSpeed, iridescence, bloom, sculptureScale, compact, paused, theme };
  useEffect(() => {
    const sync = () => setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark"); sync();
    const observer = new MutationObserver(sync); observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    try { renderer.current = createPrismBloomRenderer(host.current!, canvas.current!, () => state.current); }
    catch { host.current!.dataset.gl = "off"; host.current!.dataset.ready = "true"; }
    return () => { renderer.current?.dispose(); renderer.current = null; };
  }, [compact]);
  useEffect(() => renderer.current?.sync(), [strength, radius, returnSpeed, iridescence, bloom, sculptureScale, paused, theme]);
  return <div ref={host} className={`prism-bloom ${className}`} data-theme={theme} role="img" aria-label="Prism Bloom, an interactive sculpture of pearlescent glass petals" tabIndex={compact ? -1 : 0}>
    <style>{`.prism-bloom{position:relative;isolation:isolate;width:100%;height:100%;min-height:220px;overflow:hidden;background:#0b0d13;outline-offset:-4px;touch-action:pan-y}.prism-bloom[data-theme=light]{background:#f4f3f0}.prism-bloom canvas,.pb-fallback{position:absolute;inset:0;width:100%;height:100%}.prism-bloom canvas{opacity:0;transition:opacity .4s}.prism-bloom[data-gl=on] canvas{opacity:1}.prism-bloom[data-gl=on] .pb-fallback{opacity:0}.pb-fallback{pointer-events:none;transition:opacity .4s}@media(prefers-reduced-motion:reduce){.prism-bloom canvas,.pb-fallback{transition:none}}`}</style>
    <svg className="pb-fallback" viewBox="-220 -220 440 440" aria-hidden="true"><defs><linearGradient id="pb-pearl" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#e8e4ef"/><stop offset=".4" stopColor="#8796bc"/><stop offset=".7" stopColor="#d6b5d6"/><stop offset="1" stopColor="#f1eddf"/></linearGradient></defs>{Array.from({ length: 9 }, (_, i) => <path key={i} d="M 0 15 C -78 -24 -65 -144 0 -182 C 68 -144 83 -25 0 15 Z" transform={`rotate(${i * 137.5}) scale(${i < 5 ? 1 : .62})`} fill="url(#pb-pearl)" stroke="#e9e8f1" strokeWidth=".5" opacity=".85"/>)}</svg>
    <canvas ref={canvas} aria-hidden="true"/>
  </div>;
}
