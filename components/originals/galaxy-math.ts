export const galaxyClamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,Number.isFinite(value)?value:min));
export const galaxyHex=(value:string,fallback:string)=>/^#[\da-f]{6}$/i.test(value)?value:fallback;
export const galaxyRGB=(value:string)=>[1,3,5].map(i=>parseInt(value.slice(i,i+2),16)/255);
const fract=(value:number)=>((value%1)+1)%1;
const smooth=(a:number,b:number,value:number)=>{const t=galaxyClamp((value-a)/(b-a),0,1);return t*t*(3-2*t);};
/** Eight immutable attributes per star. Orbits are evaluated on the GPU. */
export function createGalaxySeeds(count=50000){
  count=Math.round(galaxyClamp(count,4000,90000));const data=new Float32Array(count*8);let seed=0x47616c61;
  const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296;};
  const normal=()=>Math.sqrt(-2*Math.log(Math.max(.00001,random())))*Math.cos(random()*Math.PI*2);
  for(let i=0;i<count;i++){const n=i*8;data[n]=random();data[n+1]=random()*Math.PI*2;data[n+2]=normal();data[n+3]=normal();data[n+4]=random();data[n+5]=random();data[n+6]=random();data[n+7]=random()*Math.PI*2;}
  return data;
}
/** CPU twin for the static fallback and projection/continuity checks. */
export function galaxyPoint(data:Float32Array,index:number,time=1,arms=7,tilt=55,handX=0,handY=0){
  const n=index*8,kind=data[n+4],size=data[n+5],core=kind<.16,field=kind>.994;
  const star=kind>.989&&!field,dust=kind>.68&&!core&&!star&&!field;
  const flow=fract(Math.pow(data[n],.72)-time*(dust?.018+size*.018:.022));
  const radius=core?Math.pow(data[n],1.8)*.24:star?.075+Math.pow(data[n],.72)*.89:.075+flow*.89;
  const lane=Math.floor(data[n+6]*galaxyClamp(Math.round(arms),3,12));
  const scatter=dust?.08+size*.14:star?.3:.003+radius*.004;
  let angle=lane*Math.PI*2/galaxyClamp(Math.round(arms),3,12)+radius*12.8+data[n+2]*scatter+data[n+1]*.025;
  if(core||field)angle=data[n+1];
  angle+=core?time*(.18+.024/(.18+radius)):star?time*(.14+size*.25/(.3+radius)):time*.08;
  if(dust)angle+=Math.sin(time*(.6+size)+data[n+7])*.08;
  const drift=star?.015+size*.025:dust?.009:.0015,r=radius+Math.sin(time*(.7+size)+data[n+7])*drift;
  let x=Math.cos(angle)*r,y=Math.sin(angle)*r,z=data[n+3]*(core?.025:star?.018+size*.035:dust?.018:.003);
  const turn=handX*.2,nx=x*Math.cos(turn)+z*Math.sin(turn);z=-x*Math.sin(turn)+z*Math.cos(turn);x=nx;
  const pitch=galaxyClamp(tilt,25,80)*Math.PI/180+handY*.15,ny=y*Math.cos(pitch)-z*Math.sin(pitch),depth=y*Math.sin(pitch)+z*Math.cos(pitch);
  const perspective=1/(1+depth*.18),spin=-.12;
  let px=(x*Math.cos(spin)-ny*Math.sin(spin))*perspective,py=(x*Math.sin(spin)+ny*Math.cos(spin))*perspective;
  if(field){px=Math.cos(data[n+1])*data[n]*1.3;py=Math.sin(data[n+1])*data[n];}
  const twinkle=.72+.28*Math.sin(data[n+7]+time*(.7+size));
  const pulseRadius=1-fract(time*.13+lane*.21),pulse=Math.exp(-(((radius-pulseRadius)/.025)**2))*smooth(.04,.12,pulseRadius)*(1-smooth(.86,1,pulseRadius))*(lane%3===0?0:1);
  const fade=core||star||field?1:smooth(0,.025,flow)*(1-smooth(.965,1,flow));
  return{x:px,y:py,depth,radius,angle,kind,size,twinkle,pulse,pulseRadius,fade};
}
