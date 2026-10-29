export const railClamp = (
  v: number | undefined,
  min: number,
  max: number,
  fallback: number,
) => (Number.isFinite(v) ? Math.max(min, Math.min(max, v!)) : fallback);
export const railWrap = (v: number, count: number) =>
  count > 0 ? ((v % count) + count) % count : 0;
export type RailMotion = {
  cursor: number;
  target: number;
  velocity: number;
  bend: number;
  bendVelocity: number;
  coast: number;
};
export function createRailMotion(): RailMotion {
  return {
    cursor: 0,
    target: 0,
    velocity: 0,
    bend: 0,
    bendVelocity: 0,
    coast: 0,
  };
}

/** Exact critically damped response: independent of the display refresh rate. */
export function railSpring(
  position: number,
  velocity: number,
  target: number,
  frequency: number,
  dt: number,
) {
  const offset = position - target,
    c = velocity + frequency * offset,
    decay = Math.exp(-frequency * dt);
  return [
    target + (offset + c * dt) * decay,
    (velocity - frequency * c * dt) * decay,
  ] as const;
}
export function advanceRail(
  s: RailMotion,
  dt: number,
  autoplay: number,
  response: number,
  count: number,
) {
  dt = railClamp(dt, 0, 0.05, 0);
  const friction = Math.exp(-5.5 * dt);
  s.target += autoplay * dt + (s.coast * (1 - friction)) / 5.5;
  s.coast *= friction;
  [s.cursor, s.velocity] = railSpring(
    s.cursor,
    s.velocity,
    s.target,
    10 + response * 12,
    dt,
  );
  [s.bend, s.bendVelocity] = railSpring(
    s.bend,
    s.bendVelocity,
    Math.tanh(s.velocity * 0.55),
    8,
    dt,
  );
  // Rebase complete revolutions, keeping float precision over long running sessions.
  if (count > 0 && Math.abs(s.cursor) > count * 8) {
    const turns = Math.trunc(s.cursor / count) * count;
    s.cursor -= turns;
    s.target -= turns;
  }
}
export function railImageSource(value: unknown) {
  if (typeof value !== "string") return "";
  if (/^\/(?!\/)/.test(value) && !/[\\\u0000-\u0020]/.test(value)) return value;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : "";
  } catch {
    return "";
  }
}

export const railVertex = `
  uniform float uVariant; uniform float uOffset;
  uniform float uViewportHeight; uniform float uVelocity; uniform float uMinWidth; uniform float uWaistSigma; uniform float uStretchAmount;
  varying float vFocus; varying float vWidthScale;
  uniform float uBend; uniform float uLiquid; uniform float uTime; varying vec2 vUv;
  void main(){
    vUv=uv; vFocus=1.;vWidthScale=1.;vec3 p=position;
    if((uVariant>.5&&uVariant<1.5)||uVariant>2.5){
      vec4 world=modelMatrix*vec4(position,1.);vec4 center=modelMatrix*vec4(0.,0.,0.,1.);
      float normY=world.y/uViewportHeight;
      float speedPinch=clamp(abs(uVelocity)*.18,0.,.22);
      float minW=max(uVariant>2.5?.38:.14,uMinWidth-speedPinch);
      float bell=exp(-(normY*normY)/(2.*uWaistSigma*uWaistSigma));
      float widthScale=mix(minW,1.,bell);
      float tension=uStretchAmount+min(abs(uVelocity),4.)*.25;
      world.x=center.x+(world.x-center.x)*widthScale;
      if(uVariant>2.5)world.x+=sin(normY*3.14159265)*uVelocity*.06*(1.-bell)*uViewportHeight*.1;
      // One monotonic world-space map keeps every inter-card gap open while stretching.
      world.y*=1.+(1.-bell)*tension*.35;
      vFocus=bell;vWidthScale=widthScale;
      gl_Position=projectionMatrix*viewMatrix*world;return;
    }
    float envelope=sin(uv.y*3.14159265);
    float flex=uBend*uLiquid;
    // The leading and trailing edges lag by different amounts, like a soft membrane.
    p.x+=flex*.11*envelope*sin(uv.y*4.2+uTime*.65);
    p.x*=1.-abs(flex)*.09*envelope;
    p.y+=flex*.085*sin(uv.x*3.14159265)*sin(uv.y*3.14159265);
    p.y*=1.+abs(flex)*.065;
    if(uVariant>1.5){
      p.y+=flex*.16*cos((uv.x-.5)*3.14159265);
      p.x-=flex*.07*sin(uv.x*3.14159265);
    }
    gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
  }`;

export function railLayout(
  offset: number,
  width: number,
  height: number,
  variant = "rail",
  spacing = 0.055,
) {
  const focus = Math.exp(-offset * offset * 2.4),
    scale = 0.94 + 0.06 * focus;
  const base = Math.min(width * (width < 580 ? 0.62 : 0.34), height * 0.53);
  if (variant === "horizontal") {
    const w = Math.min(width * 0.56, height * 0.65),
      h = w * 1.18;
    return {
      w: w * (0.86 + 0.14 * focus),
      h: h * (0.86 + 0.14 * focus),
      x: offset * w * (1 + spacing),
      y: Math.min(2, offset * offset) * h * 0.055,
      rotation: -Math.max(-1, Math.min(1, offset)) * 0.09,
    };
  }
  const taper = 1;
  const cardScale = variant === "stream" || variant === "elastic" ? 1 : scale;
  return {
    w: base * cardScale * taper,
    h: base * 1.23 * cardScale,
    x: width < 580 ? -width * 0.025 : width * 0.025,
    y: offset * base * 1.23 * (1 + spacing),
    rotation: 0,
  };
}
export const railFragment = `
  varying float vFocus;varying float vWidthScale;
  uniform sampler2D uMap; uniform vec2 uCover; uniform float uBend; uniform float uLiquid;
  uniform float uTime; uniform float uLoaded; varying vec2 vUv;
  void main(){
    vec2 uv=(vUv-.5)*uCover+.5;
    float wake=uBend*uLiquid;
    uv.y+=wake*.026*sin(vUv.x*3.14159265)*sin(vUv.y*6.28318-uTime*.4);
    uv.x+=wake*.012*sin(vUv.y*6.28318);
    uv=(uv-.5)*(1.-(1.-vFocus)*.15)+.5;
    vec3 ink=texture2D(uMap,clamp(uv,.002,.998)).rgb;
    vec3 paper=mix(vec3(.34,.32,.29),vec3(.63,.60,.55),vUv.y);
    float edge=smoothstep(0.,max(fwidth(vUv.x)*1.2,.00001),min(vUv.x,1.-vUv.x));
    gl_FragColor=vec4(mix(paper,ink,uLoaded)*mix(.45,1.,vFocus),edge);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

/** CPU mirror of the rubber vertex map, used by labels and the DOM fallback. */
export function rubberProfile(
  y: number,
  height: number,
  velocity: number,
  minWidth = 0.54,
  sigma = 0.42,
  stretch = 0.3,
  elastic = true,
) {
  velocity = railClamp(velocity, -4, 4, 0);
  sigma = railClamp(sigma, 0.15, 0.8, 0.42);
  const norm = y / Math.max(1, height),
    focus = Math.exp((-norm * norm) / (2 * sigma * sigma));
  const min = Math.max(
    elastic ? 0.38 : 0.14,
    minWidth - Math.min(0.22, Math.abs(velocity) * 0.18),
  );
  return {
    focus,
    width: min + (1 - min) * focus,
    y: y * (1 + (1 - focus) * (stretch + Math.abs(velocity) * 0.25) * 0.35),
    shear: elastic
      ? Math.sin(norm * Math.PI) * velocity * 0.06 * (1 - focus) * height * 0.1
      : 0,
  };
}
export function advanceElasticRail(s: RailMotion, dt: number, count: number) {
  dt = railClamp(dt, 0, 0.05, 0);
  const steps = Math.max(1, Math.ceil(dt * 120)),
    h = dt / steps;
  for (let i = 0; i < steps; i++) {
    const decay = Math.exp(-5.5 * h);
    s.target += (s.coast * (1 - decay)) / 5.5;
    s.coast *= decay;
    s.velocity += ((s.target - s.cursor) * 95 - s.velocity * 14.5) * h;
    s.cursor += s.velocity * h;
  }
  [s.bend, s.bendVelocity] = railSpring(
    s.bend,
    s.bendVelocity,
    Math.tanh(s.velocity * 0.55),
    8,
    dt,
  );
  if (count && Math.abs(s.cursor) > count * 8) {
    const turn = Math.trunc(s.cursor / count) * count;
    s.cursor -= turn;
    s.target -= turn;
  }
}

/** Place whole text runs outside the warped silhouette, with an inset at card seams. */
export function rubberLabels(
  top: number,
  bottom: number,
  width: number,
  height: number,
  velocity: number,
  min: number,
  sigma: number,
  stretch: number,
  elastic: boolean,
  firstLength: number,
  secondLength: number,
) {
  const profile = (y: number) =>
    rubberProfile(y, height, velocity, min, sigma, stretch, elastic);
  const upper = profile(top).y,
    lower = profile(bottom).y,
    h = upper - lower;
  const inset = Math.min(22, h * 0.12),
    gap = elastic ? 30 : 24;
  const a = Math.min(firstLength, h * 0.36),
    b = Math.min(secondLength, h * 0.36);
  function right(start: number, length: number) {
    let edge = -Infinity;
    for (let i = 0; i <= 8; i++) {
      const mapped = upper - start - (length * i) / 8;
      let lo = bottom,
        hi = top;
      for (let k = 0; k < 16; k++) {
        const mid = (lo + hi) / 2;
        if (profile(mid).y < mapped) lo = mid;
        else hi = mid;
      }
      const p = profile((lo + hi) / 2);
      edge = Math.max(edge, width * 0.5 * p.width + p.shear);
    }
    return edge + gap;
  }
  return {
    top: upper,
    height: h,
    first: { x: right(inset, a), y: inset, length: a },
    second: { x: right(h - inset - b, b), y: h - inset - b, length: b },
  };
}
