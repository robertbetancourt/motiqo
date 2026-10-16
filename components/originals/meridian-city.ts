import * as THREE from 'three';
import {cityPlan} from './meridian-math';

export function buildMeridianCity(scene:THREE.Scene,geometry:<T extends THREE.BufferGeometry>(g:T)=>T,material:<T extends THREE.Material>(m:T)=>T){
 const {blocks,volumes}=cityPlan(),shape=new THREE.Shape();
 shape.moveTo(-.5,-.5);shape.lineTo(.5,-.5);shape.lineTo(.5,.5);shape.lineTo(-.5,.5);shape.closePath();
 const bevel=geometry(new THREE.ExtrudeGeometry(shape,{depth:1,steps:1,bevelEnabled:true,bevelSize:.012,bevelThickness:.012,bevelSegments:1}).rotateX(-Math.PI/2).translate(0,-.5,0));
 const box=geometry(new THREE.BoxGeometry(1,1,1)),matrix=new THREE.Matrix4(),rotation=new THREE.Quaternion();
 const wall=material(new THREE.MeshStandardMaterial({color:'#0d0f14',roughness:.35,metalness:.65}));
 const buildings=new THREE.InstancedMesh(bevel,wall,volumes.length);
 const edgeBox=new THREE.BoxGeometry(1,1,1),edgeGeometry=new THREE.EdgesGeometry(edgeBox),edges:number[]=[],outline=edgeGeometry.attributes.position;
 volumes.forEach((b,i)=>{
  matrix.compose(new THREE.Vector3(b.x,b.y,b.z),rotation,new THREE.Vector3(b.w,b.h,b.d));buildings.setMatrixAt(i,matrix);buildings.setColorAt(i,new THREE.Color().setRGB(b.tone,b.tone,b.tone));
  for(let j=0;j<outline.count;j++)edges.push(outline.getX(j)*b.w+b.x,outline.getY(j)*b.h+b.y,outline.getZ(j)*b.d+b.z);
 });
 edgeGeometry.dispose();edgeBox.dispose();scene.add(buildings);
 const lines=geometry(new THREE.BufferGeometry());lines.setAttribute('position',new THREE.Float32BufferAttribute(edges,3));
 scene.add(new THREE.LineSegments(lines,material(new THREE.LineBasicMaterial({color:'#586177',transparent:true,opacity:.13}))));
 const sidewalk=material(new THREE.MeshStandardMaterial({color:'#171a22',roughness:.55,metalness:.35}));
 const curbs=new THREE.InstancedMesh(box,sidewalk,blocks.length);
 blocks.forEach((b,i)=>{matrix.compose(new THREE.Vector3(b.x,.28,b.z),rotation,new THREE.Vector3(b.w,.56,b.d));curbs.setMatrixAt(i,matrix);});scene.add(curbs);
 return()=>{buildings.dispose();curbs.dispose();};
}
