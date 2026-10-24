export type VoyageMotionOptions = {
  paused: boolean; playing: boolean; speed: number; intensity: number; zoom: number;
};
export const bounded = (value: number, fallback: number, min: number, max: number) =>
  Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
export const wrap = (value: number, count: number) => count > 0 ? ((value % count) + count) % count : 0;

/** Only local paths and explicit HTTPS images; never interpret a string as markup. */
export function voyageImage(value: unknown): string {
  if (typeof value !== 'string' || /[\\\u0000-\u0020]/.test(value)) return '';
  if (/^\/(?!\/)/.test(value) || /^\.\.?\//.test(value)) return value;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : ''; }
  catch { return ''; }
}

/** POV rail: orbit, rise above the rim, descend inside, look outward and leave. */
export function voyageCamera(phase:number,angle:number,intensity=1){
 const track=[[0,1320,-180,0],[.22,1040,-560,0],[.4,420,-510,120],[.55,75,-30,500],[.72,140,70,520],[.88,810,260,90],[1,1320,-180,0]];
 const p=wrap(phase,1);let i=0;while(i<track.length-2&&p>track[i+1][0])i++;
 const a=track[i],b=track[i+1],t=(p-a[0])/(b[0]-a[0]),u=t*t*(3-2*t),mix=(j:number)=>a[j]+(b[j]-a[j])*u;
 const strength=bounded(intensity,1,0,2),distance=1320+(mix(1)-1320)*Math.min(1,strength);
 return {eye:[Math.sin(angle)*distance,mix(2)*strength,Math.cos(angle)*distance],target:[Math.sin(angle+.8)*mix(3)*Math.min(1,strength),0,Math.cos(angle+.8)*mix(3)*Math.min(1,strength)],distance,inside:distance<400};
}
export function voyageView(eye:number[],target:number[]){
 const normalize=(v:number[])=>{const d=Math.hypot(...v)||1;return v.map(n=>n/d)};
 const back=normalize(eye.map((v,i)=>v-target[i]));
 const right=normalize([back[2],0,-back[0]]);
 const up=[back[1]*right[2]-back[2]*right[1],back[2]*right[0]-back[0]*right[2],back[0]*right[1]-back[1]*right[0]];
 const dot=(v:number[])=>v.reduce((sum,n,i)=>sum+n*eye[i],0);
 return [right[0],up[0],back[0],0,right[1],up[1],back[1],0,right[2],up[2],back[2],0,-dot(right),-dot(up),-dot(back),1];
}

/** Deterministic dust follows the cylinder; gesture velocity lengthens its tangential wake. */
export function voyageDust(index:number,time:number,energy:number){
 const seed=wrap(index*.61803398875,1),angle=index*2.39996323+time*.13;
 const radius=438+wrap(index*.754877666,1)*110;
 return {x:Math.sin(angle)*radius,y:(seed-.5)*370+Math.sin(time*.4+index)*12,z:Math.cos(angle)*radius,
   yaw:angle*180/Math.PI,width:2+bounded(energy,0,0,1)*30,opacity:.18+seed*.2+bounded(energy,0,0,1)*.45};
}

/** DOM 3D camera. No WebGL context, textures, framework imports or perpetual idle clock. */
export function createVoyageMotion(
  host: HTMLElement, world: HTMLElement, cards: HTMLElement[],
  read: () => VoyageMotionOptions, changed: (index: number) => void,
) {
  const count = cards.length, media = matchMedia('(prefers-reduced-motion: reduce)');
  const flat = typeof CSS !== 'undefined' && !CSS.supports('transform-style', 'preserve-3d');
  const particles=[...world.querySelectorAll<HTMLElement>('.vg-particle')];
  let frame = 0, disposed = false, visible = true, previous = 0, scale = 1, fit = 1;
  let current = 0, target = 0, selected = 0;
  let pointerX = 0, pointerY = 0, lookX = 0, lookY = 0, dragging = false;
  let reduced = media.matches || flat, journey = 0, journeyTarget=0, energy=0;

  function draw() {
    const options=read(),angle=current/Math.max(1,count)*Math.PI*2;
    const camera=voyageCamera(journey/34,angle,options.intensity);
    camera.target[0]+=lookX*90;camera.target[1]+=lookY*65;
    host.dataset.reduced=String(reduced);host.dataset.cursor=String(current);
    host.dataset.pov=camera.inside?'inside':'orbit';host.dataset.phase=String(wrap(journey/34,1));
    host.dataset.travel=String(journey);host.style.setProperty('--vg-energy',String(energy));
    host.style.setProperty('--vg-perspective',`${1000*scale}px`);
    const magnification=scale*bounded(options.zoom,1,.7,1.35);
    world.style.transform=reduced?`scale(${fit*.85})`:
      `translateZ(${1000*scale}px) scale3d(${magnification},${magnification},${magnification}) matrix3d(${voyageView(camera.eye,camera.target).join(',')})`;
    cards.forEach((card,index)=>{
      const theta=index/Math.max(1,count)*Math.PI*2,active=index===selected;
      card.dataset.active=String(active);
      card.style.transform=reduced?'none':`translate3d(${Math.sin(theta)*400}px,${Math.sin(theta*2)*24}px,${Math.cos(theta)*400}px) rotateY(${theta*180/Math.PI}deg)`;
      card.style.opacity=reduced?(active?'1':'0'):'1';
      card.style.visibility=reduced&&!active?'hidden':'visible';
    });
    particles.forEach((particle,index)=>{
      const dust=voyageDust(index,journey+current*.5,energy);
      particle.style.transform=`translate3d(${dust.x}px,${dust.y}px,${dust.z}px) rotateY(${dust.yaw}deg)`;
      particle.style.width=`${dust.width}px`;particle.style.opacity=String(dust.opacity);
    });
    host.dataset.ready = 'true';
  }
  function choose() {
    const index = wrap(Math.round(current), count);
    if (selected !== index) { selected = index; changed(index); }
  }
  function tick(now: number) {
    frame = 0;
    if (disposed || !visible || document.hidden || read().paused) return;
    const dt = Math.min(.05, Math.max(0, (now - (previous || now - 16.67)) / 1000)); previous = now;
    const options = read(), auto = options.playing && !reduced && count > 1;
    if (auto) { const pace=bounded(options.speed,1,.2,3); journeyTarget+=dt*pace; if(!dragging) target+=dt*pace*.18; }
    const damping = 1 - Math.exp(-dt * 6);
    const before=journey;
    journey=reduced?journeyTarget:journey+(journeyTarget-journey)*(1-Math.exp(-dt*5));
    energy+=(Math.min(1,Math.abs(journey-before)/Math.max(.001,dt)/18)-energy)*damping;
    if(Math.abs(journeyTarget-journey)<.0001)journey=journeyTarget;
    current = reduced ? target : current + (target - current) * damping;
    lookX += (pointerX - lookX) * damping; lookY += (pointerY - lookY) * damping;
    if (Math.abs(current - target) < .0001) current = target;
    choose(); draw();
    if (auto || Math.abs(journeyTarget-journey)>.0001 || energy>.001 || Math.abs(current - target) > .0001 ||
      (!reduced && (Math.abs(pointerX - lookX) > .001 || Math.abs(pointerY - lookY) > .001))) wake();
  }
  function wake() {
    if (!disposed && !frame && visible && !document.hidden && !read().paused) frame = requestAnimationFrame(tick);
  }
  function cancel() { cancelAnimationFrame(frame); frame = 0; previous = 0; }
  function sync() {
    cancel(); reduced = media.matches || flat;
    if (reduced) { energy=0;journey=journeyTarget;target = Math.round(target); current = target; pointerX = pointerY = lookX = lookY = 0; choose(); }
    draw(); wake();
  }
  function resize() {
    scale = Math.max(.15, Math.min(host.clientWidth / 1000, host.clientHeight / 590, 1.8));
    const stageHeight = world.parentElement?.clientHeight || Math.max(100, host.clientHeight - 220);
    fit = Math.max(.2, Math.min((host.clientWidth - 56) / 260, (stageHeight - 24) / 210));
    draw(); wake();
  }
  const ro = new ResizeObserver(resize); ro.observe(host);
  const io = new IntersectionObserver(entries => {
    visible = entries[0]?.isIntersecting ?? false; cancel(); if (visible) wake();
  }); io.observe(host);
  function visibility() { cancel(); if (!document.hidden) wake(); }
  document.addEventListener('visibilitychange', visibility); media.addEventListener('change', sync);
  resize();
  return {
    sync,
    position: () => target,
    scrub(delta:number) {
      if(!Number.isFinite(delta)||!count||disposed)return;
      const amount=bounded(delta,0,-1,1);
      journeyTarget+=amount*34;target+=amount*count*1.1;
      if(reduced){target=Math.round(target);journey=journeyTarget;}
      wake();
    },
    go(index: number) {
      if (!Number.isFinite(index) || count < 2) return;
      const next = wrap(Math.round(index), count);
      target = Math.round(target) + wrap(next - wrap(Math.round(target), count) + count / 2, count) - count / 2;
      wake();
    },
    step(direction: number) { if (count > 1) { target = Math.round(target) + direction; wake(); } },
    drag(delta: number) { if (!reduced && count > 1 && Number.isFinite(delta)) { target += bounded(delta, 0, -.5, .5); wake(); } },
    dragging(value: boolean) { dragging = value; if (!value) target = Math.round(target); wake(); },
    pointer(x: number, y: number) { if (!reduced) { pointerX = bounded(x, 0, -1, 1); pointerY = bounded(y, 0, -1, 1); wake(); } },
    dispose() {
      if (disposed) return; disposed = true; cancel(); ro.disconnect(); io.disconnect();
      document.removeEventListener('visibilitychange', visibility); media.removeEventListener('change', sync);
    },
  };
}
