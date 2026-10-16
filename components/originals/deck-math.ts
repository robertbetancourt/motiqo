import {spring} from 'motion';

export type DeckPoint=[number,number];
export type DeckKey={id:number;bank:number;row:number;column:number;x:number;y:number};
export const deckClamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,Number.isFinite(value)?value:min));
export const deckProject=(x:number,y:number,z=0):DeckPoint=>[500+(x-y)*Math.sqrt(3)/2,425+(x+y)/2-z];
export const deckKeys:DeckKey[]=Array.from({length:64},(_,id)=>{
  const bank=Math.floor(id/16),local=id%16,row=Math.floor(local/4),column=local%4;
  return{id,bank,row,column,x:(bank%2?142:-142)+(column-1.5)*32,y:(bank<2?-142:142)+(row-1.5)*32};
});
export const deckOrder=[...deckKeys].sort((a,b)=>a.x+a.y-b.x-b.y||a.id-b.id);
export const deckMatrix=(x:number,y:number)=>{const p=deckProject(x,y);return `matrix(.8660254 .5 -.8660254 .5 ${p[0].toFixed(3)} ${p[1].toFixed(3)})`;};
/** Inverse projection tests the stationary footprint, so a raised key cannot
 * lose hover merely because it has moved away from the pointer. */
export function deckHit(px:number,py:number):number|null{
  const a=(px-500)/(Math.sqrt(3)/2),b=(py-425)*2,x=(a+b)/2,y=(b-a)/2;
  if(Math.abs(x)<=72&&Math.abs(y)<=72)return 64;
  const key=deckKeys.find(k=>Math.abs(k.x-x)<=15&&Math.abs(k.y-y)<=15);return key?.id??null;
}
export function deckActivity(active:number|null,elapsed:number,time:number,autoPlay:boolean,pinned=false){
  let selected=active,age=elapsed,automatic=false;
  if(selected===null&&autoPlay){const cycle=time%18;automatic=true;if(cycle<5.4){selected=[5,10,22][Math.floor(cycle/1.8)];age=cycle%1.8;}else{selected=64;age=cycle-5.4;}}
  const lifts=new Float32Array(64),lights=new Float32Array(64);
  for(const key of deckKeys){
    if(selected!==null&&selected<64){const origin=deckKeys[selected],distance=Math.hypot(key.column-origin.column,key.row-origin.row);if(key.bank===origin.bank){lights[key.id]=Math.max(0,1-distance*.36);if(key.id===selected)lifts[key.id]=30;}}
    const cascade=selected===64||pinned&&age>.6;
    if(cascade){const offset=selected===64?age:age-.6,local=key.row*4+key.column,delay=key.bank*1.65+local*.085,phase=(offset-delay+9)%9;
      if(offset>=delay&&phase<1.05){const envelope=phase<.62?1:Math.max(0,1-(phase-.62)/.43);lifts[key.id]=Math.max(lifts[key.id],27*envelope);lights[key.id]=Math.max(lights[key.id],envelope);}
    }
  }
  const target=selected!==null&&selected<64?deckKeys[selected]:{x:0,y:0};
  return{selected,automatic,lifts,lights,x:target.x,y:target.y,z:selected===64?87:selected===null?76:94,pad:selected===64?1:0};
}
export type DeckSpring={value:number;velocity:number;target:number;speed:number;elapsed:number;generator:ReturnType<typeof spring>|null};
export const deckSpring=(value=0):DeckSpring=>({value,velocity:0,target:value,speed:1,elapsed:0,generator:null});
/** Framer Motion's analytic spring generator is sampled by one shared 60Hz
 * clock; target changes retain velocity instead of restarting the movement. */
export function deckStep(state:DeckSpring,target:number,dt:number,speed=1,instant=false){
  const rate=deckClamp(speed,.35,2);
  if(instant){state.value=state.target=target;state.velocity=0;state.generator=null;return target;}
  if(target!==state.target||rate!==state.speed){state.generator=spring({keyframes:[state.value,target],velocity:state.velocity,stiffness:145*rate*rate,damping:23*rate,mass:1,restDelta:.001,restSpeed:.01});state.target=target;state.speed=rate;state.elapsed=0;}
  if(state.generator&&dt>0){const old=state.value;state.elapsed+=dt*1000;const next=state.generator.next(state.elapsed);state.value=next.value;state.velocity=(state.value-old)/dt;if(next.done){state.value=target;state.velocity=0;state.generator=null;}}
  return state.value;
}
/** Screen-space cylinder with a solid front wall and an elliptical top. */
export function deckCylinder(radius:number,height:number){
  const rx=radius*Math.sqrt(1.5),ry=radius/Math.sqrt(2);
  return{rx,ry,wall:`M${-rx},${-height}A${rx},${ry} 0 0 0 ${rx},${-height}L${rx},0A${rx},${ry} 0 0 1 ${-rx},0Z`};
}
