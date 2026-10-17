export type BrushPoint={x:number;y:number;radius:number;age:number};
export const brushCapacity=32;
export function addBrushStroke(points:BrushPoint[],from:{x:number;y:number}|undefined,to:{x:number;y:number},radius:number){
 const start=from??to,distance=Math.hypot(to.x-start.x,to.y-start.y),steps=Math.max(1,Math.min(12,Math.ceil(distance/Math.max(4,radius*.22))));
 for(let i=1;i<=steps;i++){const t=i/steps;points.push({x:start.x+(to.x-start.x)*t,y:start.y+(to.y-start.y)*t,radius,age:0});}
 if(points.length>brushCapacity)points.splice(0,points.length-brushCapacity);
}
export function ageBrush(points:BrushPoint[],dt:number,speed:number){
 for(let i=points.length-1;i>=0;i--){points[i].age+=dt*speed;if(points[i].age>=.8)points.splice(i,1);}
}
export function brushRadius(point:BrushPoint){return point.radius*Math.max(0,1-point.age/.8)**.65;}
export function coverUV(width:number,height:number,imageWidth:number,imageHeight:number):[number,number]{const view=width/height,image=imageWidth/imageHeight;return view>image?[1,image/view]:[view/image,1];}
