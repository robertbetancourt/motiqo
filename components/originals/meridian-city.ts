import * as THREE from 'three';
import {avenueX,cityPlan} from './meridian-math';

export function buildMeridianCity(scene:THREE.Scene,geometry:<T extends THREE.BufferGeometry>(g:T)=>T,material:<T extends THREE.Material>(m:T)=>T){
 const {blocks,volumes}=cityPlan(),shape=new THREE.Shape();
 shape.moveTo(-.5,-.5);shape.lineTo(.5,-.5);shape.lineTo(.5,.5);shape.lineTo(-.5,.5);shape.closePath();
 const bevel=geometry(new THREE.ExtrudeGeometry(shape,{depth:1,steps:1,bevelEnabled:true,bevelSize:.012,bevelThickness:.012,bevelSegments:1}).rotateX(-Math.PI/2).translate(0,-.5,0));
 const box=geometry(new THREE.BoxGeometry(1,1,1)),matrix=new THREE.Matrix4(),rotation=new THREE.Quaternion();
 const wall=material(new THREE.MeshStandardMaterial({color:'#1c2230',roughness:.48,metalness:.42}));
 const buildings=new THREE.InstancedMesh(bevel,wall,volumes.length);
 const windows:number[]=[],windowColors:number[]=[];
 const edgeBox=new THREE.BoxGeometry(1,1,1),edgeGeometry=new THREE.EdgesGeometry(edgeBox),edges:number[]=[],outline=edgeGeometry.attributes.position;
 volumes.forEach((b,i)=>{
  matrix.compose(new THREE.Vector3(b.x,b.y,b.z),rotation,new THREE.Vector3(b.w,b.h,b.d));buildings.setMatrixAt(i,matrix);buildings.setColorAt(i,new THREE.Color().setRGB(b.tone,b.tone,b.tone));
  // Sparse illuminated rooms bring scale to each setback, without extra meshes per floor.
  for(let y=b.y-b.h/2+1.4;y<b.y+b.h/2-.6;y+=2.4){
   for(let x=b.x-b.w/2+1.2;x<b.x+b.w/2-1;x+=2.1){if(Math.sin(x*17+y*31+b.z*7)>.0){windows.push(x,y,b.z+b.d/2+.035);const c=new THREE.Color((i+Math.floor(y))%4===0?'#94b9d6':'#b5a68b');windowColors.push(c.r,c.g,c.b);}}
   for(let z=b.z-b.d/2+1.2;z<b.z+b.d/2-1;z+=2.1){if(Math.cos(z*13+y*19+b.x*11)>.1){windows.push(b.x+b.w/2+.035,y,z);const c=new THREE.Color((i+Math.floor(y))%3===0?'#84a9bb':'#a89a82');windowColors.push(c.r,c.g,c.b);}}
  }
  for(let j=0;j<outline.count;j++)edges.push(outline.getX(j)*b.w+b.x,outline.getY(j)*b.h+b.y,outline.getZ(j)*b.d+b.z);
 });
 edgeGeometry.dispose();edgeBox.dispose();scene.add(buildings);
 const rooms=geometry(new THREE.BufferGeometry());rooms.setAttribute('position',new THREE.Float32BufferAttribute(windows,3));rooms.setAttribute('color',new THREE.Float32BufferAttribute(windowColors,3));
 scene.add(new THREE.Points(rooms,material(new THREE.PointsMaterial({size:.52,vertexColors:true,transparent:true,opacity:.65,sizeAttenuation:true}))));
 const lines=geometry(new THREE.BufferGeometry());lines.setAttribute('position',new THREE.Float32BufferAttribute(edges,3));
 scene.add(new THREE.LineSegments(lines,material(new THREE.LineBasicMaterial({color:'#586177',transparent:true,opacity:.13}))));
 const sidewalk=material(new THREE.MeshStandardMaterial({color:'#171a22',roughness:.55,metalness:.35}));
 const curbs=new THREE.InstancedMesh(box,sidewalk,blocks.length);
 blocks.forEach((b,i)=>{matrix.compose(new THREE.Vector3(b.x,.28,b.z),rotation,new THREE.Vector3(b.w,.56,b.d));curbs.setMatrixAt(i,matrix);});scene.add(curbs);
 // Pocket gardens and a rhythm of street trees soften the hard city grid.
 const green=material(new THREE.MeshStandardMaterial({color:'#233830',roughness:.94,metalness:0}));
 for(const index of [2,26]){const block=blocks[index],garden=new THREE.Mesh(box,green);garden.position.set(block.x,.65,block.z);garden.scale.set(block.w-3,.16,block.d-3);scene.add(garden);}
 const trees=blocks.flatMap((b,index)=>{const positions=[[-1,-1],[-1,1],[1,-1],[1,1]].map(([x,z])=>[b.x+x*(b.w/2-1.4),b.z+z*(b.d/2-1.4)]);if(index===2||index===26)for(let x=-1;x<=1;x++)for(let z=-1;z<=1;z++)positions.push([b.x+x*b.w*.25,b.z+z*b.d*.25]);return positions;});
 const crowns=new THREE.InstancedMesh(geometry(new THREE.IcosahedronGeometry(1,1)),green,trees.length);
 trees.forEach(([x,z],i)=>{matrix.compose(new THREE.Vector3(x,2.3,z),rotation,new THREE.Vector3(1.25,1.8+(i%3)*.18,1.25));crowns.setMatrixAt(i,matrix);});scene.add(crowns);
 const markings:number[]=[];
 for(let z=-99;z<97;z+=7){const x=avenueX(z);for(const side of [-1,1])markings.push(x+side*4,.04,z,x+side*4,.04,z+2.8);}
 for(const z of [-55,24,62])for(let x=-107;x<109;x+=5)markings.push(x,.045,z-1,x+2,.045,z-1);
 const road=geometry(new THREE.BufferGeometry());road.setAttribute('position',new THREE.Float32BufferAttribute(markings,3));scene.add(new THREE.LineSegments(road,material(new THREE.LineBasicMaterial({color:'#7d8794',transparent:true,opacity:.23}))));
 return()=>{buildings.dispose();curbs.dispose();crowns.dispose();};
}
