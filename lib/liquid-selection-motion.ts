export type LiquidMass={x:number;y:number;rx:number;ry:number;round:number};
export type LiquidFrame={head:LiquidMass;tail:LiquidMass;neck:number};
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
const mix=(a:number,b:number,p:number)=>a+(b-a)*p;
const ease=(p:number)=>p*p*p*(p*(p*6-15)+10);
export function restingLiquid(center:number,width:number,height=38):LiquidFrame{
  return {head:{x:center,y:height/2,rx:width/2,ry:height/2,round:height/2},tail:{x:center,y:height/2,rx:0,ry:0,round:0},neck:0};
}
/** Two conserved-looking masses: stretch, pinch, detach, then reunite. */
export function sampleLiquid(start:LiquidFrame,target:number,width:number,progress:number,height=38):LiquidFrame{
  const p=clamp(progress);if(p===0)return start;if(p===1)return restingLiquid(target,width,height);
  const wave=Math.sin(Math.PI*p),half=width/2;
  const shed=Math.max(0,half*.65-start.tail.rx*.7)*wave**1.5;
  const tailRadius=start.tail.rx*(1-p)+shed;
  const lead=ease(clamp(p*1.4));
  const neck=p<.25?mix(start.neck,height*.22,ease(clamp(p/.22))):height*.22*(1-ease(clamp((p-.25)/.37)));
  return {
    head:{x:mix(start.head.x,target,lead),y:mix(start.head.y,height/2,lead)-wave*.7,rx:mix(start.head.rx,half,lead)-shed*.6,ry:mix(start.head.ry,height/2,lead)-wave*2.4,round:height/2},
    tail:{x:mix(start.tail.rx>.1?start.tail.x:start.head.x,target,p**4),y:mix(start.tail.y,height/2,p)+wave*1.5,rx:tailRadius,ry:start.tail.ry*(1-p)+height*.4*wave**1.1,round:height/2},
    neck,
  };
}
const n=(x:number)=>Math.round(x*100)/100;
export function liquidBodyPath(m:LiquidMass){
  if(m.rx<.05||m.ry<.05)return '';
  const x=n(m.x-m.rx),y=n(m.y-m.ry),w=n(m.rx*2),h=n(m.ry*2),r=n(Math.min(m.rx,m.ry));
  return `M${n(x+r)} ${y}H${n(x+w-r)}A${r} ${r} 0 0 1 ${n(x+w)} ${n(y+r)}V${n(y+h-r)}A${r} ${r} 0 0 1 ${n(x+w-r)} ${n(y+h)}H${n(x+r)}A${r} ${r} 0 0 1 ${x} ${n(y+h-r)}V${n(y+r)}A${r} ${r} 0 0 1 ${n(x+r)} ${y}Z`;
}
export function liquidNeckPath(frame:LiquidFrame){
  if(frame.neck<.025||frame.tail.rx<.5)return '';
  const [a,b]=frame.head.x<frame.tail.x?[frame.head,frame.tail]:[frame.tail,frame.head];
  const x1=a.x+a.rx*.52,x2=b.x-b.rx*.52;if(x2<=x1)return '';
  const mid=(x1+x2)/2,cy=(a.y+b.y)/2,span=x2-x1,ay=a.ry*.65,by=b.ry*.65,k=Math.min(frame.neck,ay,by);
  return `M${n(x1)} ${n(a.y-ay)}C${n(x1+span*.24)} ${n(a.y-ay)} ${n(mid-span*.13)} ${n(cy-k)} ${n(mid)} ${n(cy-k)}C${n(mid+span*.13)} ${n(cy-k)} ${n(x2-span*.24)} ${n(b.y-by)} ${n(x2)} ${n(b.y-by)}L${n(x2)} ${n(b.y+by)}C${n(x2-span*.24)} ${n(b.y+by)} ${n(mid+span*.13)} ${n(cy+k)} ${n(mid)} ${n(cy+k)}C${n(mid-span*.13)} ${n(cy+k)} ${n(x1+span*.24)} ${n(a.y+ay)} ${n(x1)} ${n(a.y+ay)}Z`;
}
