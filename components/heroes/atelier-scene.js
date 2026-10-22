import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { CONFIG } from './atelier-config.js';
import { createMaterials, setBoxUVScale } from './atelier-materials.js';
import {heroClock} from './hero-clock';

export function createHouseScene(container, {paused=false, autoRotate=true, onInspect=label=>{}}={}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(CONFIG.background);
  const camera = new THREE.PerspectiveCamera(CONFIG.camera.fov, 16 / 9, 0.1, 100);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.075;
  controls.enablePan = false;
  controls.enableZoom = false; // Keep wheel and vertical touch gestures for the page.
  controls.minPolarAngle = 0.45;
  controls.maxPolarAngle = Math.PI / 2.2;
  controls.enabled = true;
  controls.autoRotateSpeed = .35;
  let interactive = true;
  let inspection = false;
  let inspectionIndex = 0;
  let suspended = paused;
  let dirty = true;
  let contextLost = false;
  const homePosition = new THREE.Vector3(...CONFIG.camera.position);
  const homeTarget = new THREE.Vector3(...CONFIG.camera.target);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, 0.04);
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.32;
  room.dispose();
  pmrem.dispose();

  const { stone, terrace, roof, oak, metal, glass, linen, curtain, water, poolBed } = createMaterials();
  const house = new THREE.Group();
  scene.add(house);
  const pieces = [];
  function box(size, position, material, phase = 0) {
    const geometry = new THREE.BoxGeometry(...size);
    setBoxUVScale(geometry, size, material);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    mesh.castShadow = material !== glass;
    mesh.receiveShadow = true;
    house.add(mesh);
    pieces.push({ mesh, home: mesh.position.clone(), phase });
    mesh.userData.surface = material === glass ? 'Curtain wall · Low-E glass' : phase === .6 ? 'Roof overhang · Concrete slab' : phase === 0 ? 'Foundation · Limestone terrace' : 'Facade · Natural stone';
    return mesh;
  }
  // Dimensions in metres. Keep these fixed when replacing with a production GLB.
  box([10, 0.28, 7.2], [0, 0.14, 0], terrace, 0);
  box([7.8, 0.18, 4.8], [0, 0.37, 0], oak, 0.05);
  box([7.8, 2.8, 0.18], [0, 1.85, -2.35], stone, 0.18);
  box([0.2, 2.8, 4.8], [-3.8, 1.85, 0], stone, 0.25);
  box([2.6, 2.8, 4.8], [2.5, 1.85, 0], stone, 0.27);
  // Screened stone wing has a wooden vertical rhythm.
  for (let i = 0; i < 12; i++) box([0.095, 2.5, 0.13], [1.35 + i * 0.2, 1.9, 2.43], oak, 0.42);
  box([4.85, 2.55, 0.03], [-1.2, 1.88, 2.38], glass, 0.45);
  for (let i = 0; i < 4; i++) box([0.045, 2.6, 0.065], [-3.58 + i * 1.57, 1.87, 2.4], metal, 0.46);
  box([4.8, 0.045, 0.06], [-1.2, 0.6, 2.4], metal, 0.46);
  box([4.8, 0.045, 0.06], [-1.2, 3.15, 2.4], metal, 0.46);
  box([8.4, 0.24, 5.35], [0, 3.35, 0], roof, 0.6);
  box([8.1, 0.05, 5.1], [0, 3.2, 0], oak, 0.56);
  // Furnished interior and shallow reflecting pool.
  function cushion(size, position) {
    const mesh = new THREE.Mesh(new RoundedBoxGeometry(...size, 3, 0.06), linen);
    mesh.position.set(...position); mesh.castShadow = mesh.receiveShadow = true;
    house.add(mesh); pieces.push({ mesh, home: mesh.position.clone(), phase: 0.48 });
    return mesh;
  }
  box([2.3, 0.18, 0.85], [-1.7, 0.65, -0.9], oak, 0.48);
  for (let i = 0; i < 2; i++) {
    cushion([1.1, 0.22, 0.8], [-2.28 + i * 1.16, 0.82, -0.9]);
    cushion([1.1, 0.58, 0.19], [-2.28 + i * 1.16, 1.05, -1.23]);
  }
  cushion([0.18, 0.42, 0.85], [-2.8, 0.98, -0.9]);
  cushion([0.18, 0.42, 0.85], [-0.6, 0.98, -0.9]);
  box([1.4, 0.12, 0.85], [-1.7, 0.77, 0.48], terrace, 0.48);
  box([0.65, 0.22, 0.48], [-1.7, 0.61, 0.48], oak, 0.48);
  box([0.22, 0.02, 0.3], [-1.6, 0.843, 0.5], metal, 0.48);
  // Pleated linen curtains sit behind the glazing and remain real geometry on orbit.
  for (const [x, width] of [[-3.12, 0.82], [0.78, 0.42]]) {
    const geometry = new THREE.PlaneGeometry(width, 2.5, 48, 1);
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) positions.setZ(i, Math.sin((positions.getX(i) + width / 2) / width * Math.PI * 18) * 0.035);
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, curtain);
    mesh.position.set(x, 1.88, 2.08); mesh.castShadow = mesh.receiveShadow = true;
    house.add(mesh); pieces.push({ mesh, home: mesh.position.clone(), phase: 0.48 });
  }
  curtain.side = THREE.DoubleSide;
  box([3.9, 0.035, 1.1], [-1.7, 0.3, 2.87], poolBed, 0.06);
  box([3.82, 0.015, 1.02], [-1.7, 0.325, 2.87], water, 0.06);
  // A single low-resolution planar reflection makes the pool reflect this house.
  // It updates only when the demand-driven main renderer draws a frame.
  const poolMirror = new Reflector(new THREE.PlaneGeometry(3.78, 0.98), {
    textureWidth: 512, textureHeight: 256, multisample: 0, clipBias: 0.003,
    color: '#52766b',
    shader: {
      uniforms: Reflector.ReflectorShader.uniforms,
      vertexShader: Reflector.ReflectorShader.vertexShader,
      fragmentShader: `
        uniform vec3 color;
        uniform sampler2D tDiffuse;
        varying vec4 vUv;
        #include <logdepthbuf_pars_fragment>
        void main() {
          #include <logdepthbuf_fragment>
          vec2 uv = vUv.xy / vUv.w;
          uv.x += sin(uv.y * 380.0) * 0.0003;
          vec3 reflection = texture2D(tDiffuse, uv).rgb;
          gl_FragColor = vec4(mix(color, reflection, 0.48), 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    },
  });
  poolMirror.rotation.x = -Math.PI / 2;
  poolMirror.position.set(-1.7, 0.34, 2.87);
  house.add(poolMirror);
  pieces.push({ mesh: poolMirror, home: poolMirror.position.clone(), phase: 0.06 });
  for (const x of [-3.67, 0.27]) box([0.09, 0.08, 1.22], [x, 0.32, 2.87], terrace, 0.06);
  for (const z of [2.29, 3.45]) box([3.98, 0.08, 0.08], [-1.7, 0.32, z], terrace, 0.06);
  box([2.5, 0.13, 0.6], [2.7, 0.16, 3.8], terrace, 0.02);
  box([2.5, 0.08, 0.45], [2.7, 0.06, 4.2], terrace, 0.02);
  // Unlit ground keeps the web background and the 3D plate the same exact colour.
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshBasicMaterial({ color: CONFIG.background, toneMapped: false }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.025;
  scene.add(ground);
  const shadowGround = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ color: '#293e4a', opacity: 0.65, depthWrite: false }));
  shadowGround.rotation.x = -Math.PI / 2;
  shadowGround.position.y = -0.02;
  shadowGround.receiveShadow = true;
  scene.add(shadowGround);
  scene.add(new THREE.HemisphereLight('#e7e6df', '#7a7264', 0.85));
  const sun = new THREE.DirectionalLight('#ffecd1', 3.1);
  sun.position.set(-6, 10, 5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = sun.shadow.camera.bottom = -12;
  sun.shadow.camera.right = sun.shadow.camera.top = 12;
  sun.shadow.normalBias = 0.035;
  sun.shadow.bias = -0.0002;
  scene.add(sun);

  function reset() {
    // Dispose accumulated spherical deltas before restoring the locked camera.
    controls.enableDamping = false;
    controls.update();
    camera.position.copy(homePosition);
    controls.target.copy(homeTarget);
    controls.update();
    controls.enableDamping = true;
    dirty = true;
  }
  const bounds = new THREE.BoxHelper(house, '#2877bb');bounds.visible=false;scene.add(bounds);
  const pointer=new THREE.Vector2(),ray=new THREE.Raycaster();
  const inspect = event => {
    if(!inspection)return;
    const rect=container.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
    ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects(pieces.map(piece=>piece.mesh),false)[0];
    bounds.visible=!!hit;if(hit){bounds.setFromObject(hit.object);onInspect(hit.object.userData.surface||'Material surface');}else onInspect('Select a surface to inspect');
    clock.invalidate();
  };
  container.addEventListener('pointermove',inspect);
  const clock=heroClock(container,({still,dt})=>{
    if(contextLost)return;
    controls.autoRotate=autoRotate&&!still;
    if(interactive)controls.update(dt);
    renderer.render(scene,camera);
  },(width,height)=>{
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.zoom = Math.min(1, width / height / 1.4);
    camera.updateProjectionMatrix();
    dirty = true;
  },()=>suspended);
  controls.addEventListener('change', () => { dirty = true;clock.invalidate(); });
  const lost = (event) => { event.preventDefault(); contextLost = true; };
  const restored = () => { contextLost = false; dirty = true;clock.invalidate(); };
  renderer.domElement.addEventListener('webglcontextlost', lost);
  renderer.domElement.addEventListener('webglcontextrestored', restored);
  reset();

  function inspectSurface(index){
    inspectionIndex=index;
    const piece=index===0?pieces.find(item=>item.phase===.6):index===1?pieces.find(item=>item.mesh.material===glass):pieces[0];
    bounds.setFromObject(piece.mesh);bounds.visible=true;onInspect(piece.mesh.userData.surface);clock.invalidate();
  }

  return {
    setPaused(value){suspended=value;clock.invalidate();},
    setInspection(value){inspection=value;bounds.visible=value;if(value)inspectSurface(0);else onInspect('');clock.invalidate();},
    inspectNext(){if(inspection)inspectSurface((inspectionIndex+1)%3);},
    reset,
    rotate(angle) {
      if (!interactive) return;
      const offset = camera.position.clone().sub(controls.target);
      offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
      camera.position.copy(controls.target).add(offset);
      controls.update();
      dirty = true;
    },
    destroy() {
      clock.dispose();
      container.removeEventListener('pointermove',inspect);
      controls.dispose();
      renderer.domElement.removeEventListener('webglcontextlost', lost);
      renderer.domElement.removeEventListener('webglcontextrestored', restored);
      const materials = new Set();
      scene.traverse((object) => { if (object.isMesh) { object.geometry.dispose(); if (!object.isReflector) materials.add(object.material); } });
      poolMirror.dispose();
      const textures = new Set();
      for (const material of materials) {
        for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
        material.dispose();
      }
      for (const texture of textures) texture.dispose();
      environment.dispose();
      bounds.geometry.dispose();bounds.material.dispose();
      sun.shadow.map?.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
