export type RoutePoint=readonly [number,number];
export const primaryRoute:RoutePoint[]=[[4,94],[4,24],[-6,-12],[-6,-96]];
export const alternativeRoute:RoutePoint[]=[[4,24],[-48,24],[-48,-54],[-6,-54]];
export const routeClamp=(n:number,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(n)?n:a));
export function routeAt(points:readonly RoutePoint[],progress:number):[number,number]{
 const lengths=points.slice(1).map((p,i)=>Math.hypot(p[0]-points[i][0],p[1]-points[i][1])),total=lengths.reduce((a,b)=>a+b,0);let d=routeClamp(progress)*total;
 for(let i=0;i<lengths.length;i++){if(d<=lengths[i]||i===lengths.length-1){const f=lengths[i]?d/lengths[i]:0;return[points[i][0]+(points[i+1][0]-points[i][0])*f,points[i][1]+(points[i+1][1]-points[i][1])*f];}d-=lengths[i];}return[0,0];
}
export function routeSequence(time:number){const t=((time%13)+13)%13;return{primary:routeClamp((t-.4)/3),detour:routeClamp((t-4)/4.2),opacity:1-routeClamp((t-11.5)/1.5),phase:t<4?'primary':t<8.2?'detour':'complete'};}
export type CityVolume={x:number;z:number;y:number;w:number;d:number;h:number;tone:number;block:number};
export type CityBlock={x:number;z:number;w:number;d:number};
export const avenueX=(z:number)=>z>=24?4:z<=-12?-6:-6+(z+12)/36*10;
export function cityPlan(){
 let seed=0x43495459;const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296;};
 const blocks:CityBlock[]=[],volumes:CityVolume[]=[];
 for(const [z0,z1] of [[-104,-62],[-46,-30],[-22,16],[32,58],[66,98]]){
  const left=Math.min(avenueX(z0),avenueX(z1))-11,right=Math.max(avenueX(z0),avenueX(z1))+11;
  for(const [x0,x1] of [[-110,-78],[-70,-55],[-41,left],[right,43],[51,77],[85,111]]){
   const block=blocks.length,w=x1-x0,d=z1-z0,x=(x0+x1)/2,z=(z0+z1)/2;blocks.push({x,z,w,d});
   const columns=w>25?2:1,rows=d>29?2:1;
   for(let col=0;col<columns;col++)for(let row=0;row<rows;row++){
    const bw=(w-4)/columns-1.2-random()*1.8,bd=(d-4)/rows-1.4-random()*2,bx=x-w/2+2+(col+.5)*(w-4)/columns,bz=z-d/2+2+(row+.5)*(d-4)/rows;
    const height=7+random()*18,tone=.9+random()*.55,tiers=3+Math.floor(random()*3),hasWing=bw>9&&bd>10,mainWidth=hasWing?bw*.66:bw,mainX=bx-(hasWing?bw*.17:0);let floor=.65;
    for(let tier=0;tier<tiers;tier++){
     const inset=1-tier*.13,h=tier===0?height*.50:height*.5/(tiers-1);
     volumes.push({x:mainX+(tier%2?.3:0),z:bz,y:floor+h/2,w:mainWidth*inset,d:bd*inset,h,tone,block});floor+=h;
    }
    // A lower side wing and a recessed roof plant give each plot its own silhouette.
    if(hasWing){const h=height*.32;volumes.push({x:bx+bw*.25,z:bz+bd*.25,y:.65+h/2,w:bw*.5,d:bd*.5,h,tone:tone*.94,block});}
    volumes.push({x:mainX-mainWidth*.09,z:bz,y:floor+.5,w:mainWidth*.25,d:bd*.26,h:1,tone:tone*.8,block});
   }
  }
 }
 return{blocks,volumes};
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
  this.progress=routeClamp(this.progress+dt/13*routeClamp(speed,.2,2)*(1-Math.pow(1-this.resume,3)));
  const fade=1-routeClamp((this.progress*13-11.5)/1.5);
  this.opacity+=(fade-this.opacity)*(1-Math.exp(-dt*6));
  if(this.progress===1&&this.opacity<.01){this.progress=0;this.opacity=1;}
 }
 get state(){return{...routeSequence(Math.min(this.progress*13,11.49)),opacity:this.autoFading?this.opacity:1};}
 get target():[number,number]{
  const s=this.state,t=this.progress*13;
  if(t>=3.4&&t<=4){const from=routeAt(primaryRoute,1),to=alternativeRoute[0],p=routeClamp((t-3.4)/.6),ease=p*p*(3-2*p);return[from[0]+(to[0]-from[0])*ease,from[1]+(to[1]-from[1])*ease];}
  return s.detour>0?routeAt(alternativeRoute,s.detour):routeAt(primaryRoute,s.primary);
 }
}
