'use client';

import LineStage, { edge, limit, node, settle, spring, type Factory, type Input, type LineProps } from './line-scene';
import { add, box, camera, cylinder, painter, rotateY, type V3 } from './line-solid';

const createRelay:Factory=group=>{
  const cam=camera(1.34,[320,271]),base=node(group,'g'),floor=painter(base,cam);
  floor.mesh(box(-164,-40,-9,164,40,0),{stroke:'#859d8c',width:.8});
  for(const y of [-29,29])floor.curve([[-150,y,.3],[150,y,.3]],{stroke:'#47665a',width:.6});floor.draw();
  const layer=node(group,'g'),paint=painter(layer,cam),positions=[-112,-56,0,56,112];
  const levers=positions.map((x,i)=>{
    paint.mesh(box(x-10,-12,0,x+10,12,21),{stroke:'#698578',width:.55});
    paint.mesh(cylinder([x,-16,24],[x,16,24],5,20));
    const arm=paint.mesh(box(-22,-12,-2,22,12,3),{stroke:'#97ad98',width:.65});arm.element.setAttribute('data-lever',String(i));
    const cap=paint.mesh(cylinder([10,0,3],[10,0,8],6,24));
    const seam=paint.curve([[-16,-7,3.1],[-16,7,3.1]],{stroke:'#c6bc98',width:.85});
    return {x,arm,cap,seam,tilt:spring(),shine:spring()};
  });
  const links=positions.slice(1).map(()=>paint.mesh(cylinder([0,0,0],[1,0,0],1.7,12)));
  let pulseAge=10,origin=0;
  const nearest=(input:Input)=>{
    let best=1e9,index=0;
    positions.forEach((x,i)=>{const p=cam.project([x,0,24]),d=Math.hypot(input.x-p[0],input.y-p[1]);if(d<best){best=d;index=i;}});
    return {index,distance:best};
  };
  const pose=(p:V3,i:number)=>add(rotateY(p,levers[i].tilt.x),[positions[i],0,24]);
  return {
    reset(){pulseAge=10;levers.forEach(v=>{v.tilt.x=v.tilt.v=v.shine.x=v.shine.v=0;});},
    update(dt,input,small){
      pulseAge+=dt;const hot=nearest(input);let moving=false;
      levers.forEach((v,i)=>{
        const age=pulseAge-Math.abs(i-origin)*.17;
        const wave=age>0&&age<.6?Math.sin(age/.6*Math.PI)**2:0;
        const hover=input.strength*Math.exp(-(((i-hot.index)/.85)**2))*Math.exp(-((hot.distance/65)**2));
        moving=settle(v.tilt,(hover*.25+wave*.65)*(small?.75:1),dt,125,17)||moving;
        moving=settle(v.shine,Math.max(hover,wave),dt,100,20)||moving;
        v.arm.transform=p=>pose(p,i);v.cap.transform=p=>pose(p,i);v.seam.transform=p=>pose(p,i);
        v.arm.glow=v.shine.x*.6;v.cap.glow=v.shine.x;v.seam.stroke=edge(.35+v.shine.x*.6);
        v.arm.element.setAttribute('data-tilt',v.tilt.x.toFixed(4));v.arm.element.setAttribute('data-pulse',wave.toFixed(4));
      });
      links.forEach((link,i)=>{
        const a=pose([23,0,0],i),b=pose([-23,0,0],i+1),dx=b[0]-a[0],dz=b[2]-a[2],length=Math.hypot(dx,dz);
        link.transform=p=>add(rotateY([p[0]*length,p[1],p[2]],-Math.atan2(dz,dx)),a);
        link.glow=Math.max(levers[i].shine.x,levers[i+1].shine.x)*.7;
      });paint.draw();group.setAttribute('data-relay-age',pulseAge.toFixed(4));return moving||pulseAge<1.35;
    },
    activate(input){origin=nearest(input).index;pulseAge=0;},
    key(key,input){
      if(key==='Enter'||key===' '){origin=nearest(input).index;pulseAge=0;}
      else {let i=nearest(input).index;if(key==='Home')i=0;else if(key==='End')i=4;else i=limit(i+(key==='ArrowLeft'||key==='ArrowUp'?-1:1),0,4);const p=cam.project([positions[i],0,24]);input.x=p[0];input.y=p[1];}
    },
  };
};
export default function Relay(props:LineProps){return <LineStage {...props} factory={createRelay} className={`relay ${props.className||''}`} label="Relay, five connected mechanical rockers" help="Move or touch to lean the nearest rocker. Click or press Space to send a pulse through the connected mechanism. Arrow keys select a rocker; Home and End select the first and last."/>;}
