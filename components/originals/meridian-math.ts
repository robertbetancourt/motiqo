export type RoutePoint=readonly [number,number];
export const primaryRoute:RoutePoint[]=[[4,94],[4,62],[47,62],[47,24],[81,24],[81,-54]];
// Continue from the incoming tip; never reconnect to an already lit segment.
export const alternativeRoute:RoutePoint[]=[[81,-54],[47,-54],[47,-26],[-6,-26],[-6,-54],[-48,-54],[-48,24],[-74,24],[-74,62],[-48,62],[-48,94]];
export const meridianDuration=42;
export const routeLength=(points:readonly RoutePoint[])=>points.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p[0]-points[i][0],p[1]-points[i][1]),0);
export const meridianRoadWidth=6;
export const meridianCrossStreets=[-54,-26,24,62] as const;
export const meridianSideStreets=[-74,-48,47,81] as const;
export const routeClamp=(n:number,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(n)?n:a));
const routeMetrics=new WeakMap<readonly RoutePoint[],{lengths:number[];total:number}>();
/** Routes are immutable; reuse their arc lengths and the caller's output buffer. */
export function routeAt(points:readonly RoutePoint[],progress:number,out:[number,number]=[0,0]):[number,number]{
 let metrics=routeMetrics.get(points);
 if(!metrics){const lengths=points.slice(1).map((p,i)=>Math.hypot(p[0]-points[i][0],p[1]-points[i][1]));metrics={lengths,total:lengths.reduce((a,b)=>a+b,0)};routeMetrics.set(points,metrics);}
 const {lengths,total}=metrics;let d=routeClamp(progress)*total;
 for(let i=0;i<lengths.length;i++){if(d<=lengths[i]||i===lengths.length-1){const f=lengths[i]?d/lengths[i]:0;out[0]=points[i][0]+(points[i+1][0]-points[i][0])*f;out[1]=points[i][1]+(points[i+1][1]-points[i][1])*f;return out;}d-=lengths[i];}out[0]=out[1]=0;return out;
}
const primaryDistance=routeLength(primaryRoute),alternativeDistance=routeLength(alternativeRoute);
const primaryTime=10.3*primaryDistance/(primaryDistance+alternativeDistance);
export function routeSequence(time:number){const t=((time%13)+13)%13;return{primary:routeClamp((t-.4)/primaryTime),detour:routeClamp((t-.4-primaryTime)/(10.3-primaryTime)),opacity:1-routeClamp((t-11.5)/1.5),phase:t<.4+primaryTime?'primary':t<10.7?'detour':'complete'};}
export type CityKind='terrace'|'hotel'|'twins'|'cylinder'|'pyramid'|'dome'|'spire';
export type CityVolume={x:number;z:number;y:number;w:number;d:number;h:number;tone:number;block:number;kind:CityKind;shape:'box'|'cylinder'|'pyramid'|'dome';accent:boolean};
export type CitySign={x:number;z:number;y:number;width:number;label:string;kind:CityKind};
export type CityBlock={x:number;z:number;w:number;d:number};
export const avenueX=(z:number)=>z>=24?4:z<=-12?-6:-6+(z+12)/36*10;
export function cityPlan(){
 let seed=0x43495459;const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296;};
 const blocks:CityBlock[]=[],volumes:CityVolume[]=[],signs:CitySign[]=[];
 for(const [z0,z1] of [[-104,-57],[-51,-29],[-23,21],[27,59],[65,98]]){
  const left=Math.min(avenueX(z0),avenueX(z1))-meridianRoadWidth/2,right=Math.max(avenueX(z0),avenueX(z1))+meridianRoadWidth/2;
  for(const [x0,x1] of [[-110,-77],[-71,-51],[-45,left],[right,44],[50,78],[84,111]]){
   const block=blocks.length,w=x1-x0,d=z1-z0,x=(x0+x1)/2,z=(z0+z1)/2;blocks.push({x,z,w,d});
   if(block===2||block===26)continue;
   const columns=w>25?2:1,rows=d>29?2:1;
   for(let col=0;col<columns;col++)for(let row=0;row<rows;row++){
    const bw=(w-4)/columns-1.2-random()*1.8,bd=(d-4)/rows-1.4-random()*2,bx=x-w/2+2+(col+.5)*(w-4)/columns,bz=z-d/2+2+(row+.5)*(d-4)/rows;
    const kind=(['terrace','hotel','twins','cylinder','pyramid','dome','spire'] as const)[(block+col*2+row*3)%7];
    const downtown=Math.exp(-((bx-28)**2+(bz+32)**2)/3600),height=16+random()*18+downtown*15,tone=.85+random()*.3;
    const add=(x:number,z:number,base:number,w:number,d:number,h:number,shape:CityVolume['shape']='box',accent=false)=>volumes.push({x,z,y:base+h/2,w,d,h,tone,block,kind,shape,accent});
    add(bx,bz,.65,bw,bd,3,'box',true);
    const floor=3.65;
    if(kind==='terrace'){
     let y=floor;for(let tier=0;tier<5;tier++){const h=height*(tier===0?.28:.18),scale=1-tier*.13;add(bx,bz,y,bw*scale,bd*scale,h,'box',tier===4);y+=h;}
    }else if(kind==='hotel'){
     add(bx,bz,floor,bw*.56,bd*.86,height,'box');add(bx,bz,floor+height,bw*.67,bd*.93,1.5,'box',true);
     add(bx,bz,floor+height+1.5,bw*.25,bd*.35,2.5);
    }else if(kind==='twins'){
     for(const side of [-1,1]){add(bx+side*bw*.26,bz,floor,bw*.31,bd*.72,height);add(bx+side*bw*.26,bz,floor+height,bw*.36,bd*.77,1,'box',true);}
     add(bx,bz,floor+height*.65,bw*.8,bd*.25,2,'box',true);
    }else if(kind==='cylinder'){
     add(bx,bz,floor,bw*.74,bd*.74,height,'cylinder');
     for(const t of [.18,.52,.86,1])add(bx,bz,floor+height*t,bw*.84,bd*.84,.65,'cylinder',true);
    }else if(kind==='pyramid'){
     add(bx,bz,floor,bw*.94,bd*.94,Math.min(bw,bd)*1.15,'pyramid',true);
     for(let tier=0;tier<3;tier++)add(bx,bz,.65+tier,.97*bw,.97*bd,.3,'box',true);
    }else if(kind==='dome'){
     add(bx,bz,floor,bw*.93,bd*.93,Math.min(bw,bd)*.45,'dome',true);
     add(bx,bz,floor-.35,bw*.97,bd*.97,.45,'cylinder',true);
     for(const side of [-1,1])add(bx+side*bw*.4,bz+bd*.35,floor,bw*.08,bd*.08,7,'cylinder',true);
    }else{
     add(bx,bz,floor,bw*.29,bd*.29,height*.85,'cylinder');
     add(bx,bz,floor+height*.72,bw*.88,bd*.88,2.6,'cylinder',true);
     add(bx,bz,floor+height*.85,bw*.34,bd*.34,height*.3,'pyramid',true);
     add(bx,bz,floor+height*1.15,bw*.04,bd*.04,5,'cylinder',true);
    }
    signs.push({x:bx,z:bz+bd/2+.06,y:2.5,width:bw*.8,label:({terrace:'OASIS',hotel:'NOVA',twins:'VELVET',cylinder:'LUMEN',pyramid:'SOLAR',dome:'ORBIT',spire:'VISTA'})[kind],kind});
   }
  }
 }
 return{blocks,volumes,signs};
}
export const createCity=()=>cityPlan().volumes;

/** One clock drives the routes and camera, including reverse scrubbing. */
export class MeridianTimeline{
 progress=0;intro=0;lastScroll=-Infinity;resume=0;opacity=1;autoFading=false;
 scrub(delta:number,now:number,sensitivity=1){this.progress=routeClamp(this.progress+delta*.0008*routeClamp(sensitivity,.1,4));this.lastScroll=now;this.resume=0;this.intro=1;this.opacity=1;this.autoFading=false;}
 reset(){this.progress=0;this.intro=0;this.lastScroll=-Infinity;this.resume=0;this.opacity=1;this.autoFading=false;}
 step(dt:number,now:number,autoPlay=true,speed=1){
  this.intro=routeClamp(this.intro+dt/1.8);
  this.autoFading=now-this.lastScroll>=2500&&autoPlay;
  if(!this.autoFading)return;
  this.resume=routeClamp(this.resume+dt/1.1);
  this.progress=routeClamp(this.progress+dt/meridianDuration*routeClamp(speed,.2,2)*(1-Math.pow(1-this.resume,3)));
  const fade=1-routeClamp((this.progress*13-11.5)/1.5);
  this.opacity+=(fade-this.opacity)*(1-Math.exp(-dt*6));
  if(this.progress===1&&this.opacity<.01){this.progress=0;this.opacity=1;}
 }
 get state(){return{...routeSequence(Math.min(this.progress*13,11.49)),opacity:this.autoFading?this.opacity:1};}
 get target():[number,number]{
  const state=this.state;
  return state.detour>0?routeAt(alternativeRoute,state.detour):routeAt(primaryRoute,state.primary);
 }
}

/** The same distance-driven tip anchors the camera during forward and reverse travel. */
export function routeTarget(progress:number,out:[number,number]=[0,0]):[number,number]{
 const state=routeSequence(Math.min(routeClamp(progress)*13,11.49));
 return state.detour>0?routeAt(alternativeRoute,state.detour,out):routeAt(primaryRoute,state.primary,out);
}
const ease=(n:number)=>{const t=routeClamp(n);return t*t*(3-2*t);};
const turnEase=(n:number)=>{const t=routeClamp(n);return t*t*t*(t*(t*6-15)+10);};
const tour=[...primaryRoute,...alternativeRoute.slice(1)],turns:{distance:number;delta:number}[]=[];
const initialHeading=Math.atan2(tour[1][0]-tour[0][0],tour[1][1]-tour[0][1]);
let tourDistance=0,previousHeading=initialHeading;
for(let i=1;i<tour.length-1;i++){
 tourDistance+=Math.hypot(tour[i][0]-tour[i-1][0],tour[i][1]-tour[i-1][1]);
 const heading=Math.atan2(tour[i+1][0]-tour[i][0],tour[i+1][1]-tour[i][1]);
 turns.push({distance:tourDistance,delta:Math.atan2(Math.sin(heading-previousHeading),Math.cos(heading-previousHeading))});previousHeading=heading;
}
/** Unwrapped angles avoid sudden flips when neighboring turns overlap. */
export function meridianHeading(progress:number){
 const state=routeSequence(Math.min(routeClamp(progress)*13,11.49));
 const distance=state.primary*primaryDistance+state.detour*alternativeDistance;
 let angle=initialHeading;
 for(const turn of turns)angle+=turn.delta*turnEase((distance-turn.distance+80)/160);
 return angle;
}
export const meridianDamping=(dt:number,rate=2.6)=>1-Math.exp(-Math.max(0,dt)*rate);
/** Correct the deadline rather than dropping to 48 FPS on a 144 Hz display. */
export class MeridianFrameClock{
 private phase=0;private previous=0;
 reset(now:number){this.phase=this.previous=now;}
 sample(now:number):number|null{
  const elapsed=now-this.phase,period=1000/60;
  if(elapsed<period-.5)return null;
  this.phase+=Math.max(1,Math.floor((elapsed+.5)/period))*period;
  const dt=Math.min(.05,Math.max(0,(now-this.previous)/1000));this.previous=now;return dt;
 }
}
export function meridianShot(progress:number){
 const p=routeClamp(progress),tip=routeTarget(p),blend=ease(p/.07)*(1-ease((p-.92)/.08));
 const angle=meridianHeading(p),dx=Math.sin(angle),dz=Math.cos(angle),offsetX=-dx*60+dz*5,offsetZ=-dz*60-dx*5;
 const mix=(a:number,b:number)=>a+(b-a)*blend;
 return{position:[mix(185,tip[0]+offsetX),mix(190,104+Math.sin(p*Math.PI)*4),mix(215,tip[1]+offsetZ)] as [number,number,number],look:[mix(0,tip[0]),3*blend,mix(0,tip[1])] as [number,number,number],fov:38+9*blend};
}
