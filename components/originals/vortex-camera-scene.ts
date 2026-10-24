import * as THREE from "three";

export const DEFAULT_VORTEX_IMAGES = [
  "/media/gallery/image-01.webp",
  "/media/gallery/image-02.webp",
  "/media/gallery/image-03.webp",
  "/media/gallery/image-04.webp",
  "/media/gallery/image-05.webp",
  "/media/gallery/image-06.webp",
  "/media/gallery/image-07.webp",
  "/media/gallery/image-08.webp",
  "/media/gallery/image-09.webp",
  "/media/gallery/image-10.webp",
  "/media/gallery/image-11.webp",
  "/media/gallery/image-12.webp",
  "/media/gallery/image-13.webp",
  "/media/gallery/image-14.webp",
  "/media/gallery/image-15.webp",
  "/media/gallery/image-16.webp",
  "/media/gallery/image-17.webp",
  "/media/gallery/image-18.webp",
];

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vUv = uv;
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vView = -viewPosition.xyz;
    gl_Position = projectionMatrix * viewPosition;
  }
`;

const FRAGMENT = /* glsl */ `
  uniform sampler2D uImage;
  uniform float uImageAspect;
  uniform float uPanelAspect;
  uniform float uDarkness;
  uniform float uLoaded;
  uniform float uIndex;
  uniform vec2 uPointer;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vec2 cover = vec2(min(uPanelAspect / uImageAspect, 1.0), min(uImageAspect / uPanelAspect, 1.0));
    vec2 imageUv = (vUv - 0.5) * cover + 0.5;
    vec3 image = texture2D(uImage, imageUv).rgb;
    vec3 fallback = mix(vec3(0.07, 0.12, 0.19), vec3(0.37, 0.48, 0.52), vUv.y);
    fallback += 0.06 * sin(vUv.x * 16.0 + vUv.y * 9.0 + uIndex);
    vec3 color = mix(fallback, image, uLoaded);
    color = (color - 0.5) * 1.08 + 0.5;
    color *= 1.0 - uDarkness;
    vec3 n = normalize(vNormal) * (gl_FrontFacing ? 1.0 : -1.0);
    vec3 viewDir = normalize(vView);
    float fresnel = pow(1.0 - abs(dot(n, viewDir)), 3.0);
    vec3 lightDir = normalize(vec3(0.4 + uPointer.x * 0.2, 0.8 + uPointer.y * 0.2, 1.0));
    float specular = pow(max(dot(reflect(-lightDir, n), viewDir), 0.0), 64.0);
    float edgeDist = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
    float edge = 1.0 - smoothstep(0.001, 0.009, edgeDist);
    color += vec3(0.55, 0.81, 0.93) * (edge * 0.32 + fresnel * 0.075 + specular * 0.28);
    gl_FragColor = vec4(max(color, 0.0), 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const RINGS = [
  { radius: 2.85, height: 1.55, y: -0.28, tilt: 0, speed: 1, phase: 0 },
  {
    radius: 2.35,
    height: 1.45,
    y: 0.26,
    tilt: 0.08,
    speed: -0.75,
    phase: 0.36,
  },
  { radius: 1.92, height: 1.35, y: 0.72, tilt: 0, speed: 1.25, phase: 0.7 },
] as const;

export function createVortexScene(
  scene: THREE.Scene,
  images: readonly string[],
  darkness: number,
  particleColor: string,
  onImagesSettled: (failed: number) => void,
) {
  const drum = new THREE.Group();
  scene.add(drum);
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures = new Set<THREE.Texture>();
  const panelMaterials: THREE.ShaderMaterial[] = [];
  const rings: THREE.Group[] = [];
  let disposed = false;
  let settled = 0;
  let failed = 0;
  const urls = images.length ? images : DEFAULT_VORTEX_IMAGES;
  const sources = [
    ...new Set(Array.from({ length: 18 }, (_, i) => urls[i % urls.length])),
  ];
  const loader = new THREE.TextureLoader().setCrossOrigin("anonymous");
  const placeholder = new THREE.DataTexture(
    new Uint8Array([28, 44, 60, 255]),
    1,
    1,
  );
  placeholder.needsUpdate = true;
  textures.add(placeholder);

  RINGS.forEach((ring, ringIndex) => {
    const group = new THREE.Group();
    group.position.y = ring.y;
    group.rotation.z = ring.tilt;
    drum.add(group);
    rings.push(group);
    for (let j = 0; j < 6; j++) {
      const panelIndex = ringIndex * 6 + j;
      const angleLength = ((Math.PI * 2) / 6) * 0.84;
      const geometry = new THREE.CylinderGeometry(
        ring.radius,
        ring.radius,
        ring.height,
        32,
        1,
        true,
        (j * Math.PI * 2) / 6,
        angleLength,
      );
      const material = new THREE.ShaderMaterial({
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        side: THREE.DoubleSide,
        uniforms: {
          uImage: { value: placeholder },
          uImageAspect: { value: 1 },
          uPanelAspect: { value: (ring.radius * angleLength) / ring.height },
          uDarkness: { value: darkness },
          uLoaded: { value: 0 },
          uIndex: { value: panelIndex },
          uPointer: { value: new THREE.Vector2() },
        },
      });
      geometries.push(geometry);
      materials.push(material);
      panelMaterials.push(material);
      group.add(new THREE.Mesh(geometry, material));
    }
  });

  function complete() {
    settled++;
    if (!disposed && settled === sources.length) onImagesSettled(failed);
  }
  for (const url of sources) {
    const texture = loader.load(
      url,
      (loaded) => {
        if (disposed) {
          loaded.dispose();
          return;
        }
        loaded.colorSpace = THREE.SRGBColorSpace;
        loaded.anisotropy = 4;
        const image = loaded.image as HTMLImageElement;
        panelMaterials.forEach((material, i) => {
          if (urls[i % urls.length] !== url) return;
          material.uniforms.uImage.value = loaded;
          material.uniforms.uImageAspect.value = image.width / image.height;
          material.uniforms.uLoaded.value = 1;
        });
        complete();
      },
      undefined,
      () => {
        failed++;
        complete();
      },
    );
    textures.add(texture);
  }

  const trails = Array.from({ length: 28 }, (_, i) => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(40 * 3);
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage),
    );
    const material = new THREE.LineBasicMaterial({
      color: i % 3 === 0 ? "#e0f2fe" : particleColor,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const line = new THREE.Line(geometry, material);
    line.frustumCulled = false;
    scene.add(line);
    geometries.push(geometry);
    materials.push(material);
    return {
      line,
      positions,
      material,
      phase: (i * 0.6180339887) % 1,
      radius: i % 2 ? 1.45 : 3.35,
    };
  });

  return {
    update(
      rotation: number,
      velocity: number,
      pointer: THREE.Vector2,
      dt: number,
      reduced: boolean,
      appearance: { darkness: number; particleColor: string },
    ) {
      drum.rotation.x = pointer.y * 0.025;
      drum.rotation.z = pointer.x * 0.025;
      rings.forEach((group, i) => {
        group.rotation.y = rotation * RINGS[i].speed + RINGS[i].phase;
      });
      panelMaterials.forEach((material) => {
        material.uniforms.uPointer.value.copy(pointer);
        material.uniforms.uDarkness.value = appearance.darkness;
      });
      // Normalize to a 60 Hz frame so streak intensity is refresh-rate independent.
      const speed = velocity / Math.max(dt * 60, 0.001);
      const targetOpacity = reduced ? 0 : Math.min(Math.abs(speed) * 280, 0.92);
      const angleSpan = 0.045 + Math.min(Math.abs(speed) * 17, 1.4);
      if (particleColor !== appearance.particleColor) {
        particleColor = appearance.particleColor;
        trails.forEach((trail, i) => {
          if (i % 3 !== 0) trail.material.color.set(particleColor);
        });
      }
      for (const trail of trails) {
        trail.material.opacity +=
          (targetOpacity - trail.material.opacity) * (1 - Math.exp(-dt * 9));
        for (let j = 0; j < 40; j++) {
          const t = j / 39;
          const angle =
            trail.phase * Math.PI * 2 +
            rotation * 0.5 +
            t * angleSpan * (speed < 0 ? -1 : 1);
          trail.positions[j * 3] = Math.sin(angle) * trail.radius;
          trail.positions[j * 3 + 1] =
            (trail.phase - 0.5) * 5 + (t - 0.5) * angleSpan * 1.2;
          trail.positions[j * 3 + 2] = Math.cos(angle) * trail.radius;
        }
        trail.line.geometry.attributes.position.needsUpdate = true;
      }
    },
    dispose() {
      disposed = true;
      scene.remove(drum, ...trails.map((trail) => trail.line));
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      textures.forEach((texture) => texture.dispose());
    },
  };
}
