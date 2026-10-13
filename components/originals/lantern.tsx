'use client';

import LineStage, { edge, limit, node, settle, spring, type Factory, type LineProps } from './line-scene';
import { add, annulus, camera, circle3, cylinder, painter, rotateY, rotateZ, sphere, type Face, type V3 } from './line-solid';

/** Curved, tapered panels with inner walls and sealed edges, hinged at their feet. */
function petal(){
  const sections=Array.from({length:13},(_,i)=>{const t=i/12;return {r:35+7*Math.sin(t*Math.PI),w:9+5*Math.sin(t*Math.PI*.85),z:12+124*t};});
  const points=(i:number,inside=false):[V3,V3]=>{const s=sections[i];return [[s.r-(inside?2:0),-s.w,s.z],[s.r-(inside?2:0),s.w,s.z]];};
  const faces:Face[]=[];
  for(let i=0;i<12;i++){
    const [a,b]=points(i),[c,d]=points(i+1),[A,B]=points(i,true),[C,D]=points(i+1,true);
    faces.push([a,b,d,c],[B,A,C,D],[a,c,C,A],[b,B,D,d]);
  }
  const [a,b]=points(0),[A,B]=points(0,true),[c,d]=points(12),[C,D]=points(12,true);
  faces.push([a,A,B,b],[c,d,D,C]);
  return {faces,edges:[sections.map(s=>[s.r,-s.w,s.z] as V3),sections.map(s=>[s.r,s.w,s.z] as V3),[c,d]]};
}
const createLantern:Factory=(group,id)=>{
  const cam=camera(1.45,[320,295]),defs=node(group,'defs'),haze=node(defs,'radialGradient',{id:`${id}-warm`});
  node(haze,'stop',{offset:0,'stop-color':'#d8ae6c','stop-opacity':.55});node(haze,'stop',{offset:1,'stop-color':'#d8ae6c','stop-opacity':0});
  const glow=node(group,'ellipse',{cx:320,cy:264,rx:132,ry:67,fill:`url(#${id}-warm)`,'data-lantern-light':''});
  const base=node(group,'g'),floor=painter(base,cam);
  floor.mesh(cylinder([0,0,-4],[0,0,5],59,48));floor.curve(circle3(59,5),{stroke:'#b2ac8b',width:.85});
  floor.mesh(annulus(40,5,5,6,48));floor.curve(circle3(40,11),{stroke:'#9aaf9b',width:.65});floor.draw();
  const layer=node(group,'g'),paint=painter(layer,cam),shape=petal();
  const bulb=sphere(layer,`${id}-light`,cam,paint,18,['#f4db9e','#a98c52','#423927']);bulb.item.centre=[0,0,72];bulb.draw();
  paint.mesh(cylinder([0,0,5],[0,0,54],3,16));
  paint.mesh(cylinder([0,0,52],[0,0,56],10,24));
  const vanes=Array.from({length:8},(_,i)=>{
    const a=i/8*Math.PI*2,hinge=paint.mesh(cylinder([35,-8,11],[35,8,11],2.2,12));hinge.transform=p=>rotateZ(p,a);
    const body=paint.mesh(shape.faces);body.element.setAttribute('data-vane',String(i));
    return {a,body,edges:shape.edges.map(p=>paint.curve(p,{stroke:'#a9b29a',width:.75})),open:spring()};
  });
  const light=spring();let pinned=false;
  return {
    reset(){pinned=false;light.x=light.v=0;vanes.forEach(v=>{v.open.x=v.open.v=0;});},
    update(dt,input,small){
      const centre=cam.project([0,0,68]),distance=Math.hypot(input.x-centre[0],input.y-centre[1]);
      const proximity=Math.exp(-((distance/155)**4))*input.strength;
      const target=pinned?1:proximity,world=cam.ground([input.x,input.y],70),azimuth=Math.atan2(world[1],world[0]);
      let moving=settle(light,target,dt,75,17);
      vanes.forEach((v,i)=>{
        const angle=target*(small?.55:.82)*(.9+.1*Math.cos(v.a-azimuth));
        moving=settle(v.open,angle,dt,78+i*5,17+i*.4)||moving;
        const pose=(p:V3)=>rotateZ(add(rotateY(add(p,[-35,0,-12]),v.open.x),[35,0,12]),v.a);
        v.body.transform=pose;v.body.glow=light.x*.4;
        v.body.element.setAttribute('data-open',v.open.x.toFixed(4));
        v.edges.forEach(e=>{e.transform=pose;e.stroke=edge(.3+light.x*.5);});
      });
      glow.setAttribute('opacity',String(.055+light.x*.62));bulb.item.glow=light.x;bulb.draw();paint.draw();
      group.setAttribute('data-lantern-open',light.x.toFixed(4));return moving;
    },
    activate(){pinned=!pinned;},
    key(key,input){if(key==='Enter'||key===' ')pinned=!pinned;else if(key==='Home'){pinned=false;input.x=100;input.y=100;}else if(key==='End'){input.x=320;input.y=210;}else {input.x=limit(input.x+(key==='ArrowLeft'?-45:key==='ArrowRight'?45:0),160,480);input.y=limit(input.y+(key==='ArrowUp'?-40:key==='ArrowDown'?40:0),120,320);}},
  };
};
export default function Lantern(props:LineProps){return <LineStage {...props} factory={createLantern} className={`lantern ${props.className||''}`} label="Lantern, eight hinged metal petals around a warm light" help="Move or touch near the lantern to open its curved petals and reveal the light. Click or press Space to hold it open; repeat to release it. Arrow keys steer; Home closes it."/>;}
