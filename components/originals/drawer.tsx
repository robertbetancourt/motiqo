'use client';

import LineStage, { edge, limit, node, outline, path, settle, spring, type Factory, type Input, type LineProps, type Point } from './line-scene';

const createDrawer: Factory = (group, id) => {
  const project = (x: number, y: number, z: number): Point => [320+(x*.83-y*.55)*1.32,312+(x*.55+y*.83)*.58-z*1.20];
  const polygon = (p: [number,number,number][]) => outline(p.map(v=>project(...v)),true);
  const defs = node(group,'defs');
  const gradient = node(defs,'linearGradient',{id:`${id}-case`,x1:0,y1:0,x2:1,y2:1});
  node(gradient,'stop',{offset:0,'stop-color':'#233033'}); node(gradient,'stop',{offset:1,'stop-color':'#0c1416'});
  const body = node(group,'g');
  path(body,{d:polygon([[-62,-47,0],[62,-47,0],[62,45,0],[-62,45,0]]),fill:'#0a1113',stroke:'#465850'});
  path(body,{d:polygon([[58,-42,5],[58,42,5],[58,42,150],[58,-42,150]]),fill:`url(#${id}-case)`,stroke:'#70857b'});
  path(body,{d:polygon([[-58,-42,150],[58,-42,150],[58,42,150],[-58,42,150]]),fill:'#1a2729',stroke:'#83988a'});
  path(body,{d:polygon([[-58,42,5],[58,42,5],[58,42,150],[-58,42,150]]),fill:'#0c1517',stroke:'#92a597'});
  path(body,{d:polygon([[-54,-38,150],[54,-38,150],[54,38,150],[-54,38,150]]),stroke:'#445951','stroke-width':.55});
  // Three inset bays, machined corners and a quiet reveal between the shell and tray.
  const plate = (x0: number,x1: number,y: number,z0: number,z1: number,r=2) => polygon([[x0+r,y,z0],[x1-r,y,z0],[x1,y,z0+r],[x1,y,z1-r],[x1-r,y,z1],[x0+r,y,z1],[x0,y,z1-r],[x0,y,z0+r]]);
  const drawers = Array.from({length:3},(_,i)=>{
    const z = 10+i*45;
    path(body,{d:plate(-52,52,42,z+2,z+39),fill:'#050d0f',stroke:'#2c4440'});
    const layer = node(group,'g',{'data-drawer':i});
    const floor = path(layer,{fill:'#142023',stroke:'#657e71','stroke-width':.65});
    const dividers = path(layer,{stroke:'#3f5b51','stroke-width':.6});
    const left = path(layer,{fill:'#172529',stroke:'#5c7569','stroke-width':.65});
    const right = path(layer,{fill:'#0e191c',stroke:'#5c7569','stroke-width':.65});
    const front = path(layer,{fill:`url(#${id}-case)`,stroke:'#9bb19f','stroke-width':.85,'data-front':i});
    const crease = path(layer,{stroke:'#425a50','stroke-width':.6});
    const pull = path(layer,{fill:'#172726',stroke:'#a6b6a3','stroke-width':.8});
    const mark = path(layer,{stroke:'#738f7c','stroke-width':.65});
    return {z,layer,floor,dividers,left,right,front,crease,pull,mark,open:spring(),light:spring()};
  });
  let pin = -1, keyboardIndex = 1;
  const pick = (input: Input, live = false) => {
    let nearest = 0, best = Infinity;
    drawers.forEach((d,i)=>{const p=project(0,live?43+d.open.x*64:42,d.z+20);const distance=Math.abs(p[1]-input.y)+Math.abs(p[0]-input.x)*.12;if(distance<best){best=distance;nearest=i;}});
    return nearest;
  };
  function paint() {
    drawers.forEach(d=>{
      const frontY = 43+d.open.x*64;
      const floorZ = d.z+7, wallZ=d.z+28;
      d.floor.setAttribute('d',polygon([[-48,42,floorZ],[48,42,floorZ],[48,frontY,floorZ],[-48,frontY,floorZ]]));
      d.dividers.setAttribute('d',[-17,17].map(x=>outline([project(x,42,floorZ+.7),project(x,frontY-3,floorZ+.7)])).join(''));
      d.left.setAttribute('d',polygon([[-48,42,floorZ],[-48,frontY,floorZ],[-48,frontY,wallZ],[-48,42,wallZ]]));
      d.right.setAttribute('d',polygon([[48,42,floorZ],[48,frontY,floorZ],[48,frontY,wallZ],[48,42,wallZ]]));
      d.front.setAttribute('d',plate(-53,53,frontY+1,d.z,d.z+40,3));
      d.crease.setAttribute('d',plate(-50,50,frontY+1.1,d.z+3,d.z+37,2));
      d.pull.setAttribute('d',plate(-18,18,frontY+3,d.z+16,d.z+22,2));
      d.mark.setAttribute('d',[0,1,2].map(i=>outline([project(-36+i*3,frontY+1.3,d.z+31),project(-36+i*3,frontY+1.3,d.z+33)])).join(''));
      d.front.setAttribute('stroke',edge(d.light.x)); d.pull.setAttribute('stroke',edge(d.light.x));
      d.layer.setAttribute('data-open',d.open.x.toFixed(3));
    });
  }
  return {
    reset() { pin=-1;drawers.forEach(d=>{d.open.x=d.open.v=d.light.x=d.light.v=0;}); },
    update(dt,input,small) {
      const active = pin>=0 ? pin : input.strength>.04 ? pick(input) : -1;
      let moving=false;
      drawers.forEach((d,i)=>{
        const amount=i===active ? (pin>=0?1:input.strength)*(small ? .8 : 1) : 0;
        moving=settle(d.open,amount,dt,98,18)||moving;
        moving=settle(d.light,i===active?input.strength*.8+.2:0,dt,110,20)||moving;
      });
      paint();return moving;
    },
    activate(input) { const selected=pick(input,true);pin=pin===selected?-1:selected; },
    key(key,input) {
      if(key!=='Enter'&&key!==' ')pin=-1;
      if(key==='ArrowUp'||key==='ArrowRight')keyboardIndex=limit(keyboardIndex+1,0,2);
      if(key==='ArrowDown'||key==='ArrowLeft')keyboardIndex=limit(keyboardIndex-1,0,2);
      if(key==='Home')keyboardIndex=0;if(key==='End')keyboardIndex=2;
      if(key==='Enter'||key===' ')pin=pin===keyboardIndex?-1:keyboardIndex;
      const p=project(0,42,drawers[keyboardIndex].z+20);input.x=p[0];input.y=p[1];
    },
  };
};
export default function Drawer(props: LineProps) {
  return <LineStage {...props} factory={createDrawer} className={`drawer ${props.className||''}`} label="Drawer, three responsive trays" help="Hover over a drawer to open it. Click or tap to keep it open, then click again to release it. Arrow keys select a drawer; Enter or Space pins it."/>;
}
