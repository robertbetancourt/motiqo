'use client';

import LineStage, { limit, mix, node, outline, path, settle, spring, type Factory, type LineProps } from './line-scene';
import { box, camera, painter, sphere } from './line-solid';

const count=6, length=408, radius=17, gateX=48;
/** Fifth-order envelope: zero velocity and acceleration at both ends. */
const envelope=(u:number)=>{const t=limit(Math.min(u,1-u)/.105,0,1);return t*t*t*(t*(t*6-15)+10);};
const createTempo: Factory = (group,id) => {
  const cam=camera(1.22,[320,257]),base=node(group,'g'),floor=painter(base,cam);
  floor.mesh(box(-204,-27,-9,204,27,0),{stroke:'#778f86',width:.7});floor.draw();
  const slats=path(base,{stroke:'#46615b','stroke-width':.6});
  const layer=node(group,'g'),paint=painter(layer,cam);
  // Separate solid posts and lintel participate in the same depth order as the spheres.
  const gate=[paint.mesh(box(gateX-3,-36,0,gateX+3,-30,86),{stroke:'#91a59a'}),
    paint.mesh(box(gateX-3,30,0,gateX+3,36,86),{stroke:'#91a59a'}),
    paint.mesh(box(gateX-3,-36,86,gateX+3,36,93),{stroke:'#b8bda0',width:.85})];
  const orbs=Array.from({length:count},(_,i)=>({...sphere(layer,`${id}-${i}`,cam,paint,radius),lift:spring()}));
  const rate=spring(1);let clock=.035,locked=false;
  return {
    reset(){locked=false;rate.x=1;rate.v=0;orbs.forEach(o=>{o.lift.x=o.lift.v=0;});},
    update(dt,input,small){
      settle(rate,locked?.16:mix(1,.16,input.strength),dt,85,18);
      clock=(clock+dt*rate.x/12)%1;
      let closest=-1,best=60;
      const positions=orbs.map((_,i)=>{const u=(clock+i/count)%1;return {u,x:(u-.5)*length,s:envelope(u)};});
      positions.forEach((p,i)=>{const q=cam.project([p.x,0,radius]),d=Math.hypot(input.x-q[0],input.y-q[1]);if(input.strength>.05&&p.s>.7&&d<best){best=d;closest=i;}});
      let glow=0;
      orbs.forEach((orb,i)=>{
        const p=positions[i];settle(orb.lift,i===closest?input.strength*(small?9:16):0,dt,110,19);
        orb.item.scale=p.s;orb.item.centre=[p.x,0,radius*p.s+1+orb.lift.x];orb.item.angle=-p.x/radius;
        orb.item.glow=i===closest?input.strength:0;orb.draw();orb.element.setAttribute('data-lift',orb.lift.x.toFixed(3));
        glow=Math.max(glow,Math.exp(-(((p.x-gateX)/26)**2))*p.s);
      });
      gate.forEach(g=>{g.glow=glow;});
      const offset=clock*length%22;
      slats.setAttribute('d',Array.from({length:20},(_,i)=>-201+i*22+offset).filter(x=>x<200).map(x=>outline([cam.project([x,-21,.2]),cam.project([x,21,.2])])).join(''));
      paint.draw();group.setAttribute('data-rate',rate.x.toFixed(3));group.setAttribute('data-clock',clock.toFixed(5));return true;
    },
    activate(){locked=!locked;},
    key(key,input){if(key==='Enter'||key===' ')locked=!locked;else if(key==='Home')input.x=170;else if(key==='End')input.x=480;else input.x=limit(input.x+(key==='ArrowLeft'||key==='ArrowDown'?-45:45),120,520);input.y=245;},
  };
};
export default function Tempo(props:LineProps){return <LineStage {...props} factory={createTempo} className={`tempo ${props.className||''}`} label="Tempo, six spheres on an isometric conveyor" help="Move or touch to slow the procession and lift the nearest sphere. The spheres grow in at one end and shrink away at the other. Click or press Space to keep the slower tempo; repeat to release. Arrow keys move your attention."/>;}
