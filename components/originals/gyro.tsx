'use client';

import LineStage, { edge, limit, node, settle, spring, type Factory, type LineProps } from './line-scene';
import { add, annulus, box, camera, circle3, cylinder, painter, rotateX, rotateY, rotateZ, type V3 } from './line-solid';

const createGyro:Factory = group => {
  const cam=camera(1.25,[320,303]),base=node(group,'g'),floor=painter(base,cam);
  floor.mesh(cylinder([0,0,-5],[0,0,3],72,64));
  floor.curve(circle3(72,3),{stroke:'#9caf9e',width:.8});
  floor.curve(circle3(62,3.15),{stroke:'#506960',width:.55});
  for(let i=0;i<24;i++){
    const a=i/24*Math.PI*2;
    floor.curve([[Math.cos(a)*64,Math.sin(a)*64,3.2],[Math.cos(a)*(i%3?68:71),Math.sin(a)*(i%3?68:71),3.2]],{stroke:'#657f71',width:.55});
  }floor.draw();
  const layer=node(group,'g'),paint=painter(layer,cam),centre:V3=[0,0,116];
  paint.mesh(box(-93,-4,3,-85,4,116),{stroke:'#7e978b'});
  paint.mesh(box(85,-4,3,93,4,116),{stroke:'#7e978b'});
  const rings=[90,71,52].map((r,i)=>({
    metal:paint.mesh(annulus(r,5, -2,4,56)),
    // Split contours into short arcs so nearer surfaces can hide the far arcs.
    edges:Array.from({length:64},(_,j)=>paint.curve(Array.from({length:8},(_,k)=>{
      const a=(j%16+k/7)/16*Math.PI*2,rr=j>=32?r-5:r;
      return [rr*Math.cos(a),rr*Math.sin(a),j%32>=16?-2.05:2.05] as V3;
    }),{stroke:i===1?'#ccb998':'#9caf9e',width:j>=32?.55:.82})),
    pin:paint.mesh(cylinder([-r,0,0],[r,0,0],2.2,12)),
  }));
  const core=paint.mesh(cylinder([0,0,-8],[0,0,8],7,20));
  const yaw=spring(),pitch=spring(),spin=spring(),shine=spring();let detent=0;
  return {
    reset(){detent=0;[yaw,pitch,spin,shine].forEach(s=>{s.x=s.v=0;});},
    update(dt,input,small){
      const amount=input.strength*(small?.7:1);
      let moving=settle(yaw,limit((input.x-320)/155,-1,1)*amount,dt,86,17);
      moving=settle(pitch,limit((220-input.y)/135,-1,1)*amount,dt,97,18)||moving;
      moving=settle(spin,detent,dt,45,11)||moving;moving=settle(shine,amount,dt,110,20)||moving;
      const pose=(p:V3,level:number):V3=>{
        let q=rotateZ(p,level===2?-.32+spin.x:0);
        if(level>0)q=rotateY(q,.72+yaw.x*.72+(level===2?.73:0));
        q=rotateX(q,Math.PI/2+pitch.x*.45+(level===2?yaw.x*.24:0));
        return add(rotateZ(q,-.08+yaw.x*.27),centre);
      };
      rings.forEach((ring,i)=>{
        ring.metal.transform=p=>pose(p,i);ring.pin.transform=p=>pose(p,i);ring.metal.glow=shine.x*(i+1)*.18;
        ring.edges.forEach(c=>{c.transform=p=>pose(p,i);c.stroke=edge(.32+shine.x*.45);});
      });
      core.transform=p=>pose(p,2);core.glow=shine.x*.6;paint.draw();
      group.setAttribute('data-gyro-angle',`${yaw.x.toFixed(4)},${pitch.x.toFixed(4)},${spin.x.toFixed(4)}`);return moving;
    },
    activate(){detent+=Math.PI/2;},
    key(key,input){if(key==='Enter'||key===' ')detent+=Math.PI/2;else if(key==='Home'){input.x=320;input.y=220;detent=0;}else if(key==='End'){input.x=465;input.y=140;}else {input.x=limit(input.x+(key==='ArrowLeft'?-50:key==='ArrowRight'?50:0),160,480);input.y=limit(input.y+(key==='ArrowUp'?-40:key==='ArrowDown'?40:0),100,330);}},
  };
};
export default function Gyro(props:LineProps){return <LineStage {...props} factory={createGyro} className={`gyro ${props.className||''}`} label="Gyro, a three-axis ring mechanism" help="Move or touch to tilt three solid rings around their independent axes. Click or press Space to turn the inner ring by a quarter turn. Arrow keys steer; Home resets the mechanism."/>;}
