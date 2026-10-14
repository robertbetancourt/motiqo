import { node, outline, path, type Point } from './line-scene';

export type V3 = [number, number, number];
export type Face = V3[];
export type Transform = (p: V3) => V3;
export const add = (a: V3, b: V3): V3 => [a[0]+b[0],a[1]+b[1],a[2]+b[2]];
export const mul = (a: V3, s: number): V3 => [a[0]*s,a[1]*s,a[2]*s];
export const dot = (a: V3, b: V3) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross = (a: V3,b: V3): V3 => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export const unit = (a: V3) => mul(a,1/(Math.hypot(...a)||1));
const subtract = (a: V3,b: V3): V3 => [a[0]-b[0],a[1]-b[1],a[2]-b[2]];
export const rotateX = (p: V3,a: number): V3 => [p[0],p[1]*Math.cos(a)-p[2]*Math.sin(a),p[1]*Math.sin(a)+p[2]*Math.cos(a)];
export const rotateY = (p: V3,a: number): V3 => [p[0]*Math.cos(a)+p[2]*Math.sin(a),p[1],-p[0]*Math.sin(a)+p[2]*Math.cos(a)];
export const rotateZ = (p: V3,a: number): V3 => [p[0]*Math.cos(a)-p[1]*Math.sin(a),p[0]*Math.sin(a)+p[1]*Math.cos(a),p[2]];
const VIEW: V3 = [.612372436,.612372436,.5];
const LIGHT: V3 = unit([-.3,-.5,1]);

/** Orthonormal 45°/30° camera: 2:1 ground diagonals, verticals remain vertical. */
export function camera(scale=1.3,origin: Point=[320,270]) {
  return {
    scale,
    project: (p: V3): Point => [origin[0]+(p[0]-p[1])*Math.SQRT1_2*scale,origin[1]+((p[0]+p[1])*.353553391-p[2]*.866025404)*scale],
    depth: (p: V3) => dot(p,VIEW),
    ground: (p: Point,z=0): Point => {
      const x=(p[0]-origin[0])/scale,y=((p[1]-origin[1])/scale+z*.866025404)/.5;
      return [(x+y)*Math.SQRT1_2,(y-x)*Math.SQRT1_2];
    },
  };
}
export type Camera = ReturnType<typeof camera>;
type Style = {color?:string;stroke?:string;width?:number;glow?:number;cull?:boolean;shade?:boolean};
type Draw = {element:SVGElement;key:number;id:number};
const identity: Transform = p=>p;
/** Keep opaque depth and lighting in both host themes; artwork is never image-inverted. */
function lightColour(value:string,surface=false){
  let rgb:number[];
  if(/^#[\da-f]{3}$/i.test(value))value='#'+value.slice(1).split('').map(c=>c+c).join('');
  if(/^#[\da-f]{6}$/i.test(value))rgb=[1,3,5].map(i=>parseInt(value.slice(i,i+2),16));
  else if(value.startsWith('rgb('))rgb=value.match(/[\d.]+/g)!.slice(0,3).map(Number);
  else return value;
  return `rgb(${rgb.map((v,i)=>Math.round(surface?Math.min(253,210+v*.65):v*(rgb[0]-rgb[1]>20?[.78,.72,.68][i]:.46))).join(',')})`;
}

/** Own SVG painter. Opaque surfaces and curves share depth order; no React work per frame. */
export function painter(group:SVGGElement,cam:Camera) {
  const tasks:(()=>Draw[])[]=[];let serial=0,signature='',lightTheme=false;
  const write=(el:SVGElement,name:string,value:string)=>{if(el.getAttribute(name)!==value)el.setAttribute(name,value);};
  function mesh(faces:Face[],style:Style={}) {
    const entries=faces.map(points=>({points,el:path(group,{'stroke-width':style.width??.6,'data-solid-face':''}),id:serial++}));
    const item={transform:identity,glow:style.glow??0,visible:true,element:entries[0].el};
    tasks.push(()=>entries.map(({points,el,id})=>{
      const vertices=points.map(item.transform);
      const normal=unit(cross(subtract(vertices[1],vertices[0]),subtract(vertices[2],vertices[0])));
      const visible=item.visible&&(style.cull===false||dot(normal,VIEW)>-.001);
      write(el,'visibility',visible?'visible':'hidden');
      if(visible){
        const light=style.shade===false?0:Math.max(0,dot(normal,LIGHT))*.8+.18;
        write(el,'d',outline(vertices.map(cam.project),true));
        const fill=style.color??(lightTheme?`rgb(${Math.round(215+light*28+item.glow*10)},${Math.round(215+light*28)},${Math.round(215+light*28-item.glow*5)})`:`rgb(${Math.round(15+light*29+item.glow*19)},${Math.round(29+light*29+item.glow*11)},${Math.round(32+light*22)})`);
        write(el,'fill',lightTheme&&style.color?lightColour(fill,true):fill);
        write(el,'stroke',lightTheme?lightColour(style.stroke??'none'):style.stroke??'none');
      }
      const centre=mul(vertices.reduce(add,[0,0,0]),1/vertices.length);
      return {element:el,key:cam.depth(centre),id};
    }));return item;
  }
  function curve(points:V3[],style:Style={}) {
    const el=path(group,{stroke:style.stroke??'#91a79d','stroke-width':style.width??.7,'data-solid-curve':''});
    const id=serial++,item={points,transform:identity,visible:true,opacity:1,stroke:style.stroke??'#91a79d',bias:.1};
    tasks.push(()=>{
      const vertices=item.points.map(item.transform);
      write(el,'d',vertices.length>1?outline(vertices.map(cam.project)):'');
      write(el,'visibility',item.visible?'visible':'hidden');write(el,'opacity',String(item.opacity));write(el,'stroke',lightTheme?lightColour(item.stroke):item.stroke);
      return [{element:el,key:cam.depth(mul(vertices.reduce(add,[0,0,0]),1/(vertices.length||1)))+item.bias,id}];
    });return item;
  }
  function custom(element:SVGElement,depth:()=>number){const id=serial++;tasks.push(()=>[{element,key:depth(),id}]);}
  return {mesh,curve,custom,draw(){
    lightTheme=document.documentElement.dataset.theme==='light';
    const draws=tasks.flatMap(task=>task()).sort((a,b)=>a.key-b.key||a.id-b.id),next=draws.map(d=>d.id).join(',');
    if(next!==signature){let cursor=group.firstElementChild;for(const {element} of draws){if(element===cursor)cursor=cursor.nextElementSibling;else group.insertBefore(element,cursor);}signature=next;}
  }};
}
/** Outward-wound faces: rear surfaces cannot leak through a foreground object. */
export function box(x0:number,y0:number,z0:number,x1:number,y1:number,z1:number):Face[] {
  const a:V3=[x0,y0,z0],b:V3=[x1,y0,z0],c:V3=[x1,y1,z0],d:V3=[x0,y1,z0];
  const e:V3=[x0,y0,z1],f:V3=[x1,y0,z1],g:V3=[x1,y1,z1],h:V3=[x0,y1,z1];
  return [[a,d,c,b],[e,f,g,h],[a,b,f,e],[b,c,g,f],[c,d,h,g],[d,a,e,h]];
}
export function cylinder(a:V3,b:V3,radius:number,segments=24):Face[] {
  const axis=unit(subtract(b,a)),u=unit(cross(axis,Math.abs(axis[2])<.9?[0,0,1]:[0,1,0])),v=cross(axis,u);
  const ring=(centre:V3)=>Array.from({length:segments},(_,i)=>add(centre,add(mul(u,Math.cos(i/segments*Math.PI*2)*radius),mul(v,Math.sin(i/segments*Math.PI*2)*radius))));
  const near=ring(a),far=ring(b);
  return [near.slice().reverse(),far,...near.map((p,i)=>[p,near[(i+1)%segments],far[(i+1)%segments],far[i]])];
}
export function annulus(radius:number,tube:number,z:number,thickness:number,segments=64):Face[] {
  const at=(r:number,i:number,h:number):V3=>[Math.cos(i/segments*Math.PI*2)*r,Math.sin(i/segments*Math.PI*2)*r,h],faces:Face[]=[];
  for(let i=0;i<segments;i++){
    const o0=at(radius,i,z),o1=at(radius,i+1,z),O0=at(radius,i,z+thickness),O1=at(radius,i+1,z+thickness);
    const i0=at(radius-tube,i,z),i1=at(radius-tube,i+1,z),I0=at(radius-tube,i,z+thickness),I1=at(radius-tube,i+1,z+thickness);
    faces.push([o0,o1,O1,O0],[I0,I1,i1,i0],[O0,O1,I1,I0],[i0,i1,o1,o0]);
  }return faces;
}
export const circle3=(r:number,z:number,samples=64):V3[]=>Array.from({length:samples+1},(_,i)=>[r*Math.cos(i/samples*Math.PI*2),r*Math.sin(i/samples*Math.PI*2),z]);

/** Circular silhouette plus correctly clipped surface arcs: a sphere in an orthographic view. */
export function sphere(group:SVGGElement,id:string,cam:Camera,paint:ReturnType<typeof painter>,radius:number,colors=['#718d85','#344f4f','#101d23']){
  const defs=node(group,'defs'),gradient=node(defs,'radialGradient',{id:`${id}-orb`,cx:'.29',cy:'.23',r:'.8'});
  node(gradient,'stop',{offset:0,'stop-color':colors[0]});node(gradient,'stop',{offset:'.38','stop-color':colors[1]});node(gradient,'stop',{offset:1,'stop-color':colors[2]});
  const g=node(group,'g',{'data-orb':''}),body=node(g,'circle',{fill:`url(#${id}-orb)`,stroke:'#9bb1a3','stroke-width':.8});
  const arcs=Array.from({length:4},()=>path(g,{stroke:'#a9b9a2','stroke-width':.5,'stroke-opacity':.45}));
  const shadow=node(group,'ellipse',{fill:'#02090c','fill-opacity':.5});
  const item={centre:[0,0,0] as V3,scale:1,angle:0,glow:0};
  paint.custom(g,()=>cam.depth(item.centre)+radius*item.scale*.55);
  paint.custom(shadow,()=>cam.depth([item.centre[0],item.centre[1],.5]));
  function surfacePath(samples:V3[]){
    let d='',previous=false;
    for(const q of samples){const front=dot(q,VIEW)>=0;if(front){const p=cam.project(add(item.centre,q));d+=(previous?'L':'M')+p.map(v=>v.toFixed(2)).join(',');}previous=front;}return d;
  }
  return {item,element:g,draw(){
    const r=radius*item.scale,p=cam.project(item.centre),screenR=r*cam.scale;
    body.setAttribute('cx',String(p[0]));body.setAttribute('cy',String(p[1]));body.setAttribute('r',String(screenR));
    body.setAttribute('stroke',item.glow>.1?'#e0c699':'#9bb1a3');g.setAttribute('data-scale',item.scale.toFixed(4));g.setAttribute('data-x',item.centre[0].toFixed(3));g.setAttribute('visibility',r>.15?'visible':'hidden');
    [-.55,0,.55].forEach((h,i)=>{const rr=Math.sqrt(1-h*h)*r;arcs[i].setAttribute('d',surfacePath(Array.from({length:97},(_,j)=>{const a=j/96*Math.PI*2;return [rr*Math.cos(a),rr*Math.sin(a),h*r];})));});
    arcs[3].setAttribute('d',surfacePath(Array.from({length:97},(_,j)=>{const a=j/96*Math.PI*2;return rotateZ([r*Math.cos(a),0,r*Math.sin(a)],item.angle);})));
    const ground=cam.project([item.centre[0],item.centre[1],.6]);shadow.setAttribute('cx',String(ground[0]));shadow.setAttribute('cy',String(ground[1]));shadow.setAttribute('rx',String(screenR*.92));shadow.setAttribute('ry',String(screenR*.4));shadow.setAttribute('visibility',r>.15?'visible':'hidden');
  }};
}
