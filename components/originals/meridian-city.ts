import * as THREE from 'three';
import {avenueX,cityPlan,meridianRoadWidth,meridianCrossStreets,meridianSideStreets,type CityVolume} from './meridian-math';

const facade='#1c2230',architecturalLight='#738094';
// Small vector marquees keep the standalone city free of font or texture assets.
const glyphs:Record<string,number[][]>={
 A:[[0,0,0,1],[0,1,.5,1.4],[.5,1.4,1,1],[1,1,1,0],[0,.6,1,.6]],
 E:[[1,0,0,0],[0,0,0,1.4],[0,1.4,1,1.4],[0,.7,.8,.7]],
 I:[[0,0,1,0],[.5,0,.5,1.4],[0,1.4,1,1.4]],
 L:[[0,1.4,0,0],[0,0,1,0]],M:[[0,0,0,1.4],[0,1.4,.5,.6],[.5,.6,1,1.4],[1,1.4,1,0]],
 N:[[0,0,0,1.4],[0,1.4,1,0],[1,0,1,1.4]],
 O:[[0,0,1,0],[1,0,1,1.4],[1,1.4,0,1.4],[0,1.4,0,0]],
 R:[[0,0,0,1.4],[0,1.4,1,1.4],[1,1.4,1,.7],[1,.7,0,.7],[.4,.7,1,0]],
 B:[[0,0,0,1.4],[0,1.4,.8,1.4],[.8,1.4,1,1],[1,1,.8,.7],[.8,.7,0,.7],[.8,.7,1,.3],[1,.3,.8,0],[.8,0,0,0]],
 S:[[1,1.4,0,1.4],[0,1.4,0,.7],[0,.7,1,.7],[1,.7,1,0],[1,0,0,0]],
 T:[[0,1.4,1,1.4],[.5,1.4,.5,0]],U:[[0,1.4,0,0],[0,0,1,0],[1,0,1,1.4]],
 V:[[0,1.4,.5,0],[.5,0,1,1.4]],
};

export function buildMeridianCity(scene:THREE.Scene,geometry:<T extends THREE.BufferGeometry>(g:T)=>T,material:<T extends THREE.Material>(m:T)=>T){
 const {blocks,volumes,signs}=cityPlan(),shape=new THREE.Shape();
 shape.moveTo(-.5,-.5);shape.lineTo(.5,-.5);shape.lineTo(.5,.5);shape.lineTo(-.5,.5);shape.closePath();
 const bevel=geometry(new THREE.ExtrudeGeometry(shape,{depth:1,steps:1,bevelEnabled:true,bevelSize:.012,bevelThickness:.012,bevelSegments:1}).rotateX(-Math.PI/2).translate(0,-.5,0));
 const box=geometry(new THREE.BoxGeometry(1,1,1)),matrix=new THREE.Matrix4(),rotation=new THREE.Quaternion();
 const wall=material(new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.48,metalness:.42}));
 const shapes:Record<CityVolume['shape'],THREE.BufferGeometry>={box:bevel,
  cylinder:geometry(new THREE.CylinderGeometry(.5,.5,1,24)),
  pyramid:geometry(new THREE.ConeGeometry(Math.SQRT1_2,1,4).rotateY(Math.PI/4)),
  dome:geometry(new THREE.SphereGeometry(.5,24,12,0,Math.PI*2,0,Math.PI/2).translate(0,-.25,0).scale(1,2,1)),
 };
 const buildings:THREE.InstancedMesh[]=[];
 const windows:number[]=[],windowColors:number[]=[],edges:number[]=[],glow:number[]=[],glowColors:number[]=[];
 function lightLine(a:number[],b:number[],color:THREE.Color){glow.push(...a,...b);for(let i=0;i<2;i++)glowColors.push(color.r*.75,color.g*.75,color.b*.75);}
 for(const kind of Object.keys(shapes) as CityVolume['shape'][]){
  const group=volumes.filter(volume=>volume.shape===kind),mesh=new THREE.InstancedMesh(shapes[kind],wall,group.length);
  mesh.name=`meridian-${kind}-buildings`;buildings.push(mesh);scene.add(mesh);
  const edgeGeometry=new THREE.EdgesGeometry(shapes[kind],25),outline=edgeGeometry.attributes.position;
  group.forEach((b,i)=>{
   matrix.compose(new THREE.Vector3(b.x,b.y,b.z),rotation,new THREE.Vector3(b.w,b.h,b.d));mesh.setMatrixAt(i,matrix);mesh.setColorAt(i,new THREE.Color(facade).multiplyScalar(b.tone));
   const tint=new THREE.Color(architecturalLight),warm=new THREE.Color(i%3===0?'#a7aeb9':'#73849a');
   const point=(x:number,y:number,z:number)=>{windows.push(x,y,z);windowColors.push(warm.r,warm.g,warm.b);};
   if(kind==='box'||kind==='cylinder')for(let y=b.y-b.h/2+1.1;y<b.y+b.h/2-.5;y+=2.1){
    if(kind==='cylinder'){for(let k=0;k<20;k++){const theta=k/20*Math.PI*2;if(Math.sin(k*31+y*13)>.0)point(b.x+Math.cos(theta)*(b.w/2+.025),y,b.z+Math.sin(theta)*(b.d/2+.025));}}
    else{
     for(let x=b.x-b.w/2+.8;x<b.x+b.w/2-.6;x+=1.7)if(Math.sin(x*17+y*31+b.z*7)>-.2){point(x,y,b.z+b.d/2+.035);point(x,y,b.z-b.d/2-.035);}
     for(let z=b.z-b.d/2+.8;z<b.z+b.d/2-.6;z+=1.7)if(Math.cos(z*13+y*19+b.x*11)>-.2){point(b.x+b.w/2+.035,y,z);point(b.x-b.w/2-.035,y,z);}
    }
   }
   for(let j=0;j<outline.count;j++)edges.push(outline.getX(j)*b.w+b.x,outline.getY(j)*b.h+b.y,outline.getZ(j)*b.d+b.z);
   if(b.accent){
    if(kind==='cylinder'||kind==='dome'){
     const y=kind==='dome'?b.y-b.h/2+.05:b.y+b.h/2+.04;
     for(let k=0;k<32;k++){const a=k/32*Math.PI*2,c=(k+1)/32*Math.PI*2;lightLine([b.x+Math.cos(a)*b.w/2,y,b.z+Math.sin(a)*b.d/2],[b.x+Math.cos(c)*b.w/2,y,b.z+Math.sin(c)*b.d/2],tint);}
    }else if(kind==='pyramid'){
     for(const x of [-1,1])for(const z of [-1,1])lightLine([b.x+x*b.w/2,b.y-b.h/2,b.z+z*b.d/2],[b.x,b.y+b.h/2,b.z],tint);
    }else{
     const y=b.y+b.h/2+.04,corners=[[-1,-1],[1,-1],[1,1],[-1,1]];
     corners.forEach(([x,z],k)=>{const next=corners[(k+1)%4];lightLine([b.x+x*b.w/2,y,b.z+z*b.d/2],[b.x+next[0]*b.w/2,y,b.z+next[1]*b.d/2],tint);});
    }
   }
  });edgeGeometry.dispose();
 }
 signs.forEach(sign=>{
  const size=Math.min(1.5,sign.width/(sign.label.length*1.4)),start=sign.x-(sign.label.length*1.4-.4)*size/2,tint=new THREE.Color(architecturalLight);
  [...sign.label].forEach((letter,index)=>{for(const [x0,y0,x1,y1] of glyphs[letter]??[])lightLine([start+(index*1.4+x0)*size,sign.y+y0*size,sign.z],[start+(index*1.4+x1)*size,sign.y+y1*size,sign.z],tint);});
 });
 const neonGeometry=geometry(new THREE.BufferGeometry());neonGeometry.setAttribute('position',new THREE.Float32BufferAttribute(glow,3));neonGeometry.setAttribute('color',new THREE.Float32BufferAttribute(glowColors,3));
 const neonLines=new THREE.LineSegments(neonGeometry,material(new THREE.LineBasicMaterial({vertexColors:true,toneMapped:false,transparent:true,opacity:.32})));neonLines.name='meridian-neon-marquees';scene.add(neonLines);
 const rooms=geometry(new THREE.BufferGeometry());rooms.setAttribute('position',new THREE.Float32BufferAttribute(windows,3));rooms.setAttribute('color',new THREE.Float32BufferAttribute(windowColors,3));
 scene.add(new THREE.Points(rooms,material(new THREE.PointsMaterial({size:.48,vertexColors:true,transparent:true,opacity:.65,sizeAttenuation:true}))));
 const lines=geometry(new THREE.BufferGeometry());lines.setAttribute('position',new THREE.Float32BufferAttribute(edges,3));
 scene.add(new THREE.LineSegments(lines,material(new THREE.LineBasicMaterial({color:'#586177',transparent:true,opacity:.13}))));
 const sidewalk=material(new THREE.MeshStandardMaterial({color:'#171a22',roughness:.55,metalness:.35}));
 const curbs=new THREE.InstancedMesh(box,sidewalk,blocks.length);
 blocks.forEach((b,i)=>{matrix.compose(new THREE.Vector3(b.x,.28,b.z),rotation,new THREE.Vector3(b.w,.56,b.d));curbs.setMatrixAt(i,matrix);});scene.add(curbs);
 // Fill the wedges beside the bent avenue with sidewalk, keeping its asphalt
 // exactly two lanes wide instead of opening into an oversized diagonal plaza.
 blocks.forEach((b,index)=>{
  const column=index%6;if(column!==2&&column!==3)return;
  const z0=b.z-b.d/2,z1=b.z+b.d/2,edge=b.x+(column===2?b.w/2:-b.w/2);
  const levels=[z0,...[-12,24].filter(z=>z>z0&&z<z1),z1];
  if(levels.every(z=>Math.abs(avenueX(z)+(column===2?-1:1)*meridianRoadWidth/2-edge)<.001))return;
  const strip=new THREE.Shape();strip.moveTo(edge,-z0);
  for(const z of levels)strip.lineTo(avenueX(z)+(column===2?-1:1)*meridianRoadWidth/2,-z);
  strip.lineTo(edge,-z1);strip.closePath();
  scene.add(new THREE.Mesh(geometry(new THREE.ExtrudeGeometry(strip,{depth:.56,steps:1,bevelEnabled:false}).rotateX(-Math.PI/2)),sidewalk));
 });
 // Pocket gardens and a rhythm of street trees soften the hard city grid.
 const green=material(new THREE.MeshStandardMaterial({color:'#233830',roughness:.94,metalness:0}));
 for(const index of [2,26]){const block=blocks[index],garden=new THREE.Mesh(box,green);garden.position.set(block.x,.65,block.z);garden.scale.set(block.w-3,.16,block.d-3);scene.add(garden);}
 const trees=blocks.flatMap((b,index)=>{const positions=[[-1,-1],[-1,1],[1,-1],[1,1]].map(([x,z])=>[b.x+x*(b.w/2-1.4),b.z+z*(b.d/2-1.4)]);if(index===2||index===26)for(let x=-1;x<=1;x++)for(let z=-1;z<=1;z++)positions.push([b.x+x*b.w*.25,b.z+z*b.d*.25]);return positions;});
 const crowns=new THREE.InstancedMesh(geometry(new THREE.IcosahedronGeometry(1,1)),green,trees.length);
 trees.forEach(([x,z],i)=>{matrix.compose(new THREE.Vector3(x,2.3,z),rotation,new THREE.Vector3(1.25,1.8+(i%3)*.18,1.25));crowns.setMatrixAt(i,matrix);});scene.add(crowns);
 const markings:number[]=[];
 // A single dashed divider: one lane per direction. Leave intersections clear.
 for(const x of [null,...meridianSideStreets])for(let z=-101;z<96;z+=5){
  if(meridianCrossStreets.some(cross=>z+2>cross-meridianRoadWidth/2&&z<cross+meridianRoadWidth/2))continue;
  markings.push(x??avenueX(z),.04,z,x??avenueX(z+2),.04,z+2);
 }
 for(const z of meridianCrossStreets)for(let x=-107;x<108;x+=5){
  if([avenueX(z),...meridianSideStreets].some(cross=>x+2>cross-meridianRoadWidth/2&&x<cross+meridianRoadWidth/2))continue;
  markings.push(x,.045,z,x+2,.045,z);
 }
 const road=geometry(new THREE.BufferGeometry());road.setAttribute('position',new THREE.Float32BufferAttribute(markings,3));scene.add(new THREE.LineSegments(road,material(new THREE.LineBasicMaterial({color:'#7d8794',transparent:true,opacity:.23}))));
 return()=>{buildings.forEach(mesh=>mesh.dispose());curbs.dispose();crowns.dispose();};
}
