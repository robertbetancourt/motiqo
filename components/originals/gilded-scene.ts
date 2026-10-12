import * as THREE from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { cardArtwork } from './gilded-artwork';
import { atmosphereFragment, driftFragment, foilFragment, interiorFragment, particleFragment, particleVertex, screenVertex, surfaceVertex, threadFragment, threadVertex } from './gilded-shaders';

export type GildedSceneOptions = {
  compact: boolean; backgroundSrc: string; emblemSrc: string;
  onReady: () => void; onLost: () => void;
};
export type GildedScene = { setPaused: (paused: boolean) => void; flip: () => void; dispose: () => void };

function rounded(w: number, h: number, r: number) {
  const shape = new THREE.Shape(), x = -w / 2, y = -h / 2;
  shape.moveTo(x + r, y); shape.lineTo(x + w - r, y); shape.quadraticCurveTo(x + w, y, x + w, y + r);
  shape.lineTo(x + w, y + h - r); shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  shape.lineTo(x + r, y + h); shape.quadraticCurveTo(x, y + h, x, y + h - r);
  shape.lineTo(x, y + r); shape.quadraticCurveTo(x, y, x + r, y); return shape;
}
function arch() {
  const s = new THREE.Shape(); s.moveTo(-.89, -.85); s.lineTo(-.89, .18);
  s.absarc(0, .18, .89, Math.PI, 0, true); s.lineTo(.89, -.85); s.closePath(); return s;
}
function faceUV(geometry: THREE.BufferGeometry) {
  const p = geometry.getAttribute('position'), uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) { uv[i * 2] = (p.getX(i) + 1.25) / 2.5; uv[i * 2 + 1] = (p.getY(i) + 1.75) / 3.5; }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return geometry;
}

export function createGildedScene(canvas: HTMLCanvasElement, options: GildedSceneOptions): GildedScene {
  const { compact, onLost, onReady } = options;
  const root = canvas.parentElement!;
  const small = root.clientWidth < 600;
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  // Retain the last frame when paused, offscreen, or captured by a host preview.
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: false, antialias: !small, stencil: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.setPixelRatio(Math.min(devicePixelRatio, small || compact ? 1 : 1.5));
  renderer.setClearColor(0x07090b);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(30, 1, .1, 80);
  const studio = new RoomEnvironment(), pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(studio, .04);
  scene.environment = environment.texture; studio.dispose(); pmrem.dispose();
  const card = new THREE.Group(); scene.add(card);
  const materials = new Set<THREE.Material>(), geometries = new Set<THREE.BufferGeometry>(), textures = new Set<THREE.Texture>();
  let disposed = false, contextLost = false, paused = false, visible = false, frame = 0, last = 0, time = 0, started = performance.now();
  let width = 1, height = 1, slowFrames = 0;
  const motion = { x: 0, y: 0, tx: 0, ty: 0, spin: 0, goal: 0, velocity: 0, drag: false, dragX: 0, dragAt: 0, inside: false };
  const pointer = new THREE.Vector2(.5, .5), previousPointer = pointer.clone();
  const uTime = { value: 0 }, uPointer = { value: new THREE.Vector2() }, uReveal = { value: media.matches ? 2 : -.1 };
  const low = small || compact;
  const ownGeometry = <T extends THREE.BufferGeometry>(g: T): T => { geometries.add(g); return g; };
  const ownMaterial = <T extends THREE.Material>(m: T): T => { materials.add(m); return m; };
  const ownTexture = <T extends THREE.Texture>(t: T): T => { textures.add(t); return t; };
  function addMesh(g: THREE.BufferGeometry, m: THREE.Material, parent: THREE.Object3D = card) {
    const mesh = new THREE.Mesh(ownGeometry(g), ownMaterial(m)); parent.add(mesh); return mesh;
  }
  function maskMaterial<T extends THREE.Material>(m: T) {
    m.stencilWrite = true; m.stencilRef = 1; m.stencilFunc = THREE.EqualStencilFunc;
    m.stencilFail = THREE.KeepStencilOp; m.stencilZFail = THREE.KeepStencilOp; m.stencilZPass = THREE.KeepStencilOp;
    return m;
  }
  const empty = ownTexture(new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1)); empty.needsUpdate = true;
  const skyUniforms = {
    uTime, uBackdrop: { value: empty as THREE.Texture }, uDrift: { value: empty as THREE.Texture },
    uAspect: { value: 1 }, uImageAspect: { value: 1400 / 1694 }, uHasDrift: { value: 0 }, uImageReady: { value: 0 }, uPointer,
  };
  const skyMaterial = ownMaterial(new THREE.ShaderMaterial({ uniforms: skyUniforms, defines: { OCTAVES: low ? 3 : 5 }, vertexShader: screenVertex, fragmentShader: atmosphereFragment, depthTest: false, depthWrite: false }));
  const sky = addMesh(new THREE.PlaneGeometry(2, 2), skyMaterial, scene); sky.frustumCulled = false; sky.renderOrder = -100;
  new THREE.TextureLoader().load(options.backgroundSrc, texture => {
    if (disposed) { texture.dispose(); return; }
    ownTexture(texture); texture.colorSpace = THREE.SRGBColorSpace;
    skyUniforms.uBackdrop.value = texture; skyUniforms.uImageAspect.value = texture.image.width / texture.image.height;
    skyUniforms.uImageReady.value = 1; wake();
  }, undefined, () => { /* Procedural atmosphere remains usable without an image. */ });

  // Low-resolution advected displacement: the smoke remembers pointer strokes.
  let driftA: THREE.WebGLRenderTarget | null = null, driftB: THREE.WebGLRenderTarget | null = null;
  const driftScene = new THREE.Scene(), driftCamera = new THREE.Camera();
  const driftUniforms = { uField: { value: empty as THREE.Texture }, uPointer: { value: pointer }, uVelocity: { value: new THREE.Vector2() }, uDt: { value: 1 / 60 }, uActive: { value: 0 } };
  if (!low && renderer.extensions.has('EXT_color_buffer_float')) {
    driftA = new THREE.WebGLRenderTarget(160, 100, { type: THREE.HalfFloatType, depthBuffer: false });
    driftB = driftA.clone();
    addMesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ uniforms: driftUniforms, vertexShader: screenVertex, fragmentShader: driftFragment, depthTest: false, depthWrite: false }), driftScene);
    const color = renderer.getClearColor(new THREE.Color()); renderer.setClearColor(0, 0);
    for (const target of [driftA, driftB]) { renderer.setRenderTarget(target); renderer.clear(); }
    renderer.setRenderTarget(null); renderer.setClearColor(color, 1); skyUniforms.uHasDrift.value = 1;
  }

  const windowShape = arch();
  const frontShape = rounded(2.5, 3.5, .12); frontShape.holes.push(windowShape);
  const bodyGeometry = new THREE.ExtrudeGeometry(frontShape, { depth: .065, bevelEnabled: true, bevelSize: .013, bevelThickness: .016, bevelSegments: 3, curveSegments: 48 });
  bodyGeometry.translate(0, 0, -.035);
  const gold = ownMaterial(new THREE.MeshStandardMaterial({ color: 0xb39154, metalness: .9, roughness: .27 }));
  addMesh(bodyGeometry, gold);
  function foil(back: boolean) {
    const atlas = cardArtwork(back, low ? 640 : 1024);
    const texture = ownTexture(new THREE.DataTexture(atlas.data, atlas.width, atlas.height));
    texture.needsUpdate = true; texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter; texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    return new THREE.ShaderMaterial({ uniforms: { uArt: { value: texture }, uTexel: { value: new THREE.Vector2(1 / atlas.width, 1 / atlas.height) }, uTime, uReveal, uPointer, uFoil: { value: 1 } }, defines: { OCTAVES: 3 }, vertexShader: surfaceVertex, fragmentShader: foilFragment });
  }
  const front = addMesh(faceUV(new THREE.ShapeGeometry(frontShape, 64)), foil(false)); front.position.z = .05; front.renderOrder = 4;
  const back = addMesh(faceUV(new THREE.ShapeGeometry(rounded(2.5, 3.5, .12), 48)), foil(true)); back.rotation.y = Math.PI; back.position.z = -.07; back.renderOrder = 4;
  // Invisible stencil keeps the miniature world inside the aperture as the card turns.
  const stencil = addMesh(new THREE.ShapeGeometry(windowShape, 48), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, depthTest: false, stencilWrite: true, stencilRef: 1, stencilFunc: THREE.AlwaysStencilFunc, stencilZPass: THREE.ReplaceStencilOp }));
  stencil.position.z = .049; stencil.renderOrder = 1;
  const niche = addMesh(faceUV(new THREE.ShapeGeometry(windowShape, 48)), maskMaterial(new THREE.ShaderMaterial({ uniforms: { uTime }, vertexShader: surfaceVertex, fragmentShader: interiorFragment }))); niche.position.z = -.28; niche.renderOrder = 2;
  const relief = new THREE.Group(); relief.position.set(0, .12, -.02); card.add(relief);
  new SVGLoader().load(options.emblemSrc, svg => {
    if (disposed) return;
    const emblem = new THREE.Group();
    svg.paths.forEach((path, i) => SVGLoader.createShapes(path).forEach(shape => {
      const geometry = new THREE.ExtrudeGeometry(shape, { depth: 9, bevelEnabled: true, bevelSize: 1, bevelThickness: 1.4, bevelSegments: 3, curveSegments: 24 });
      geometry.translate(-109, -105, -4.5);
      const material = maskMaterial(new THREE.MeshPhysicalMaterial({ color: [0xe6aa72, 0xd48785, 0x928979, 0xc8b99b, 0xf0d6ae][i] || 0xd6b682, metalness: .86, roughness: .23, clearcoat: 1, clearcoatRoughness: .15, side: THREE.DoubleSide }));
      const mesh = addMesh(geometry, material, emblem); mesh.renderOrder = 3;
    }));
    emblem.scale.set(.0056, -.0056, .0056); relief.add(emblem); wake();
  }, undefined, () => { /* Orbital rings preserve the centerpiece if SVG loading fails. */ });
  const orbit = new THREE.Group(); orbit.position.y = .12; orbit.position.z = -.14; card.add(orbit);
  for (let i = 0; i < 3; i++) {
    const ring = addMesh(new THREE.TorusGeometry(.72 + i * .052, .003 + (i === 0 ? .004 : 0), 6, low ? 80 : 140), maskMaterial(new THREE.MeshStandardMaterial({ color: 0xb18c57, metalness: .88, roughness: .35 })), orbit);
    ring.rotation.x = .24 + i * .21; ring.rotation.y = i * .34; ring.renderOrder = 3;
  }
  const sphereMaterial = ownMaterial(new THREE.MeshPhysicalMaterial({ color: 0xffd2a0, emissive: 0xc76a32, emissiveIntensity: .3, metalness: .75, roughness: .17 }));
  for (const [x, y, color] of [[-1.11, 1.6, 0xe49296], [1.11, 1.6, 0x90abb5], [-1.11, -1.6, 0x90abb5], [1.11, -1.6, 0xe49296]] as const) {
    const m = sphereMaterial.clone(); m.color.setHex(color);
    const gem = addMesh(new THREE.SphereGeometry(.039, 14, 10), m); gem.position.set(x, y, .063); gem.renderOrder = 5;
  }
  const bead = addMesh(new THREE.SphereGeometry(.062, 16, 12), sphereMaterial); bead.position.set(0, 1.07, .076);
  // These are ambient filaments; there is no card-to-card connector in this slice.
  const filaments = new THREE.Group(); scene.add(filaments);
  const threadMaterial = ownMaterial(new THREE.ShaderMaterial({ uniforms: { uTime }, vertexShader: threadVertex, fragmentShader: threadFragment, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  for (let n = 0; n < (low ? 16 : 42); n++) {
    const seed = n * 1.91, y = Math.sin(seed) * 3.8, z = -2.5 - (n % 7) * .18;
    const points: THREE.Vector3[] = [];
    for (let j = 0; j <= 12; j++) {
      const x = -10 + j / 12 * 20;
      points.push(new THREE.Vector3(x, y * (.08 + .92 * (Math.abs(x) / 10) ** .8) + Math.sin(x * .45 + seed) * .055, z));
    }
    addMesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), low ? 60 : 130, .0035 + n % 3 * .0015, 3, false), threadMaterial, filaments);
  }
  const count = low ? 65 : 190, positions = new Float32Array(count * 3), sizes = new Float32Array(count), seeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const random = (v: number) => { const s = Math.sin((i + 1) * v) * 43758.5; return s - Math.floor(s); };
    positions.set([(random(127.1) - .5) * 16, (random(311.7) - .5) * 10, -1.2 - random(73.3) * 5], i * 3);
    sizes[i] = .7 + random(21.9) * 2.5; seeds[i] = random(15.4);
  }
  const dustGeo = ownGeometry(new THREE.BufferGeometry()); dustGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3)); dustGeo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1)); dustGeo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  const dustMaterial = ownMaterial(new THREE.ShaderMaterial({ uniforms: { uTime, uPixelRatio: { value: renderer.getPixelRatio() } }, vertexShader: particleVertex, fragmentShader: particleFragment, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(new THREE.Points(dustGeo, dustMaterial));
  scene.add(new THREE.HemisphereLight(0xffe7ca, 0x293541, 2));
  const key = new THREE.DirectionalLight(0xffe3b3, 4); key.position.set(-3, 4, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(0xa7b8d0, 3); rim.position.set(4, -1, 3); scene.add(rim);

  function resize() {
    width = Math.max(1, root.clientWidth); height = Math.max(1, root.clientHeight);
    camera.aspect = width / height;
    const desiredHeight = compact ? height * .82 : Math.min(height * .62, 480);
    camera.position.set(0, 0, 3.5 * height / Math.max(150, desiredHeight) / (2 * Math.tan(Math.PI / 12)));
    camera.updateProjectionMatrix();
    const dpr = renderer.getPixelRatio();
    if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) renderer.setSize(width, height, false);
    skyUniforms.uAspect.value = camera.aspect;
    wake();
  }
  function stop() { cancelAnimationFrame(frame); frame = 0; last = 0; }
  function wake() { if (!disposed && !contextLost && !frame && visible && !document.hidden) frame = requestAnimationFrame(tick); }
  function tick(now: number) {
    frame = 0;
    if (disposed || contextLost || !visible || document.hidden) return;
    const cap = low ? 30 : 60;
    if (last && now - last < 1000 / cap - .8) { wake(); return; }
    const dt = last ? Math.min((now - last) / 1000, .05) : 1 / cap; last = now;
    const still = paused || media.matches;
    if (!still) time += dt;
    uTime.value = time;
    const alpha = 1 - Math.exp(-dt * 6);
    const tx = still ? 0 : motion.tx, ty = still ? 0 : motion.ty;
    motion.x += (tx - motion.x) * alpha; motion.y += (ty - motion.y) * alpha;
    if (!still && motion.drag) motion.spin += (motion.goal - motion.spin) * (1 - Math.exp(-dt * 18));
    if (!still && !motion.drag) {
      motion.spin += motion.velocity * dt; motion.velocity *= Math.exp(-dt * 3.8);
      if (Math.abs(motion.velocity) < .12) motion.spin += (motion.goal - motion.spin) * (1 - Math.exp(-dt * 3.2));
    }
    card.rotation.set(motion.y * .16, motion.x * .27 + motion.spin, still ? 0 : Math.sin(time * .4) * .008);
    card.position.y = (compact ? 0 : .56) + (still ? 0 : Math.sin(time * .7) * .018);
    relief.rotation.y = still ? 0 : Math.sin(time * .48) * .23; relief.rotation.z = still ? -.05 : -.05 + Math.sin(time * .36) * .05;
    orbit.rotation.z = still ? 0 : Math.sin(time * .25) * .13;
    uPointer.value.x += (tx - uPointer.value.x) * alpha;
    uPointer.value.y += (-ty - uPointer.value.y) * alpha;
    root.style.setProperty('--gc-px', ((motion.x + 1) * 50).toFixed(2) + '%');
    uReveal.value = still ? 2 : Math.min(2, (now - started) / 2200 - .08);
    if (driftA && driftB && !still) {
      driftUniforms.uField.value = driftA.texture; driftUniforms.uDt.value = dt;
      driftUniforms.uVelocity.value.copy(pointer).sub(previousPointer).multiplyScalar(5);
      driftUniforms.uActive.value = motion.inside ? 1 : 0;
      renderer.setRenderTarget(driftB); renderer.render(driftScene, driftCamera); renderer.setRenderTarget(null);
      [driftA, driftB] = [driftB, driftA]; skyUniforms.uDrift.value = driftA.texture;
    }
    previousPointer.lerp(pointer, alpha);
    renderer.render(scene, camera);
    if (!low && dt > .036) slowFrames++; else slowFrames = Math.max(0, slowFrames - 1);
    if (slowFrames > 90 && renderer.getPixelRatio() > 1) { renderer.setPixelRatio(1); dustMaterial.uniforms.uPixelRatio.value = 1; resize(); slowFrames = 0; }
    if (!still || Math.abs(motion.x) + Math.abs(motion.y) > .001) wake();
  }
  function coordinates(event: PointerEvent) {
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
    pointer.set(x, 1 - y); motion.tx = x * 2 - 1; motion.ty = y * 2 - 1;
  }
  function move(event: PointerEvent) {
    motion.inside = true; coordinates(event);
    if (motion.drag && !paused && !media.matches) {
      const now = performance.now(), delta = (event.clientX - motion.dragX) / Math.max(100, height * .7) * 3.3;
      motion.goal += delta; motion.velocity = THREE.MathUtils.clamp(delta / Math.max(.008, (now - motion.dragAt) / 1000), -7, 7);
      motion.dragX = event.clientX; motion.dragAt = now;
    }
    wake();
  }
  function down(event: PointerEvent) {
    if (compact || paused || media.matches || event.button !== 0) return;
    const rect = canvas.getBoundingClientRect();
    if (Math.abs(event.clientX - rect.left - width / 2) > Math.min(height * .27, 190)) return;
    coordinates(event); motion.drag = true; motion.goal = motion.spin; motion.velocity = 0; motion.dragX = event.clientX; motion.dragAt = performance.now();
    canvas.setPointerCapture(event.pointerId); canvas.style.cursor = 'grabbing';
  }
  function up(event: PointerEvent) {
    motion.drag = false; motion.goal = Math.round(motion.goal / Math.PI) * Math.PI;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    canvas.style.cursor = compact ? 'pointer' : 'grab'; wake();
  }
  function leave() { if (!motion.drag) { motion.inside = false; motion.tx = motion.ty = 0; wake(); } }
  function flip() { if (!paused && !media.matches) { motion.velocity = 0; motion.goal += Math.PI; wake(); } }
  function resetMotion() { motion.tx = motion.ty = 0; motion.velocity = 0; motion.drag = false; motion.spin = motion.goal = 0; wake(); }
  function visibility() { if (document.hidden) stop(); else wake(); }
  function lost(event: Event) { event.preventDefault(); contextLost = true; stop(); onLost(); }
  const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) wake(); else stop(); }); observer.observe(canvas);
  const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(root);
  canvas.addEventListener('pointermove', move, { passive: true }); canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up); canvas.addEventListener('pointerleave', leave);
  canvas.addEventListener('webglcontextlost', lost); canvas.addEventListener('dblclick', flip);
  media.addEventListener('change', resetMotion); document.addEventListener('visibilitychange', visibility);
  canvas.style.cursor = compact ? 'pointer' : 'grab';
  resize(); onReady();
  return {
    setPaused(value) { paused = value; motion.tx = motion.ty = 0; wake(); }, flip,
    dispose() {
      disposed = true; stop(); observer.disconnect(); resizeObserver.disconnect();
      canvas.removeEventListener('pointermove', move); canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointercancel', up); canvas.removeEventListener('pointerleave', leave); canvas.removeEventListener('dblclick', flip); canvas.removeEventListener('webglcontextlost', lost);
      media.removeEventListener('change', resetMotion); document.removeEventListener('visibilitychange', visibility);
      for (const texture of textures) texture.dispose(); for (const material of materials) material.dispose(); for (const geometry of geometries) geometry.dispose();
      driftA?.dispose(); driftB?.dispose(); environment.dispose(); scene.clear(); renderer.dispose(); renderer.forceContextLoss();
    },
  };
}
