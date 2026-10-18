/**
 * Motiqo material engine: an advected elastic lattice deforms the intact image
 * and releases colored filaments along the stroke. CPU springs reconstruct
 * the artwork; instanced WebGL2 ribbons follow each particle's velocity.
 */
import {SURFACE_VERTEX,SURFACE_FRAGMENT,GRAIN_VERTEX,GRAIN_FRAGMENT} from './liquid-particle-shaders';
import {MaterialWake} from './liquid-material-wake';
export type Rect={x:number;y:number;w:number;h:number};
export interface EngineOptions {
 paused?:boolean;compact?:boolean;interactive:boolean;strength:number;radius:number;density:number;
 dotSize:number;spread:number;turbulence:number;returnSpeed:number;streaks:boolean;
 restStyle:'image'|'particles';ambient:boolean;ambientIntensity:number;speed:number;intro:boolean;
 reducedMotion:boolean;bg:[number,number,number];imgBg:[number,number,number]|null;liquid:number;
}
type Program={program:WebGLProgram;uniforms:Record<string,WebGLUniformLocation|null>};
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
export class LiquidEngine {
 onFirstFrame:(()=>void)|null=null;
 lastImage:HTMLImageElement|null=null;
 get particleCount(){return this.anchors.length/2;}
 private gl:WebGL2RenderingContext;
 private options:EngineOptions;
 private surface:Program|null=null;
 private grains:Program|null=null;
 private texture:WebGLTexture|null=null;
 private wakeTexture:WebGLTexture|null=null;
 private wakeField=new MaterialWake();
 private material=new Float32Array(3);
 private vao:WebGLVertexArrayObject|null=null;
 private buffers:WebGLBuffer[]=[];
 private anchors=new Float32Array(0);
 private positions=new Float32Array(0);
 private velocities=new Float32Array(0);
 private colors=new Float32Array(0);
 private variations=new Float32Array(0);
 private rect:Rect={x:0,y:0,w:1,h:1};
 private sampleCount=1;
 private width=1;private height=1;private dpr=1;
 private presented=false;private frame=0;private last=0;private time=0;private visible=true;private dead=false;private lost=false;
 private target={x:0,y:0,active:0,down:false};
 private hand={x:0,y:0,active:0};
 constructor(private canvas:HTMLCanvasElement,options:EngineOptions,private failure:()=>void){
  this.options={...options};
  const gl=canvas.getContext('webgl2',{alpha:true,antialias:false,premultipliedAlpha:true});
  if(!gl)throw new Error('WebGL2 unavailable');
  this.gl=gl;
  try{this.allocate();}catch(error){this.release();throw error;}
  canvas.addEventListener('webglcontextlost',this.contextLost);
  canvas.addEventListener('webglcontextrestored',this.contextRestored);
 }
 private program(vertex:string,fragment:string):Program{
  const gl=this.gl,program=gl.createProgram();if(!program)throw new Error('Program allocation failed');
  const shaders:WebGLShader[]=[];
  try{
   for(const [type,source] of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]] as const){
    const shader=gl.createShader(type);if(!shader)throw new Error('Shader allocation failed');shaders.push(shader);
    gl.shaderSource(shader,source);gl.compileShader(shader);
    if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error('Particle shader compilation failed');
    gl.attachShader(program,shader);
   }
   gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error('Particle program link failed');
   const uniforms:Program['uniforms']={};
   for(let i=0;i<gl.getProgramParameter(program,gl.ACTIVE_UNIFORMS);i++){
    const info=gl.getActiveUniform(program,i);if(info)uniforms[info.name]=gl.getUniformLocation(program,info.name);
   }
   return {program,uniforms};
  }catch(error){gl.deleteProgram(program);throw error;}finally{shaders.forEach(shader=>gl.deleteShader(shader));}
 }
 private allocate(){
  const gl=this.gl;
  this.surface=this.program(SURFACE_VERTEX,SURFACE_FRAGMENT);
  this.grains=this.program(GRAIN_VERTEX,GRAIN_FRAGMENT);
  this.texture=gl.createTexture();this.wakeTexture=gl.createTexture();this.vao=gl.createVertexArray();
  if(!this.texture||!this.wakeTexture||!this.vao)throw new Error('Particle resource allocation failed');
  gl.bindTexture(gl.TEXTURE_2D,this.wakeTexture);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.bindVertexArray(this.vao);
  for(let i=0;i<3;i++){
   const buffer=gl.createBuffer();if(!buffer)throw new Error('Particle buffer allocation failed');this.buffers.push(buffer);
   gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,i===2?2:4,gl.FLOAT,false,0,0);gl.vertexAttribDivisor(i,1);
  }
  gl.bindVertexArray(null);
 }
 private release(){
  const gl=this.gl;
  this.buffers.forEach(buffer=>gl.deleteBuffer(buffer));this.buffers=[];
  if(this.vao)gl.deleteVertexArray(this.vao);if(this.texture)gl.deleteTexture(this.texture);
  if(this.wakeTexture)gl.deleteTexture(this.wakeTexture);
  if(this.surface)gl.deleteProgram(this.surface.program);if(this.grains)gl.deleteProgram(this.grains.program);
  this.vao=null;this.texture=null;this.wakeTexture=null;this.surface=null;this.grains=null;
 }
 private upload(){
  if(!this.lastImage)return;
  const gl=this.gl;gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,this.lastImage);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.bindBuffer(gl.ARRAY_BUFFER,this.buffers[1]);gl.bufferData(gl.ARRAY_BUFFER,this.colors,gl.STATIC_DRAW);
 }
 private sample(){
  if(!this.lastImage)return;
  const image=this.lastImage,budget=Math.round((this.options.compact?32000:100000)*clamp(this.options.density,.15,1.2));
  const aspect=clamp(image.naturalWidth/image.naturalHeight,.1,10);
  const w=Math.max(2,Math.round(Math.sqrt(budget*aspect))),h=Math.max(2,Math.round(budget/w));
  this.sampleCount=w*h;
  const sample=document.createElement('canvas');sample.width=w;sample.height=h;
  const context=sample.getContext('2d',{willReadFrequently:true});if(!context)throw new Error('Image sampling unavailable');
  context.drawImage(image,0,0,w,h);const data=context.getImageData(0,0,w,h).data;
  const anchors:number[]=[],colors:number[]=[],variations:number[]=[];
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const offset=(y*w+x)*4;if(data[offset+3]<20)continue;
   if(this.options.imgBg&&Math.hypot(...this.options.imgBg.map((c,i)=>data[offset+i]/255-c))<.08)continue;
   let hash=Math.imul(x+1,374761393)^Math.imul(y+1,668265263);
   hash=Math.imul(hash^(hash>>>16),0x7feb352d);hash=Math.imul(hash^(hash>>>15),0x846ca68b);hash=(hash^(hash>>>16))>>>0;
   const jx=(hash&65535)/65535-.5,jy=(hash>>>16)/65535-.5;
   anchors.push((x+.5+jx*.7)/w,(y+.5+jy*.7)/h);variations.push(jx,jy);
   colors.push(data[offset]/255,data[offset+1]/255,data[offset+2]/255,data[offset+3]/255);
  }
  this.anchors=new Float32Array(anchors);this.colors=new Float32Array(colors);
  this.variations=new Float32Array(variations);
  this.positions=new Float32Array(this.particleCount*4);this.velocities=new Float32Array(this.particleCount*2);
  this.reset();this.upload();
 }
 private reset(){
  for(let i=0;i<this.particleCount;i++){
   this.positions[i*4]=this.rect.x+this.anchors[i*2]*this.rect.w;
   this.positions[i*4+1]=this.rect.y+this.anchors[i*2+1]*this.rect.h;
   this.positions[i*4+2]=this.options.restStyle==='particles'?1:0;this.positions[i*4+3]=0;
  }
  this.velocities.fill(0);this.hand.active=0;this.target.active=0;this.wakeField.clear();
 }
 setImage(image:HTMLImageElement){if(this.dead)return;this.lastImage=image;this.sample();this.wake();}
 resize(width:number,height:number,rect:Rect){
  if(this.dead)return;
  if(this.width===width&&this.height===height&&this.rect.x===rect.x&&this.rect.y===rect.y&&this.rect.w===rect.w&&this.rect.h===rect.h)return;
  this.width=Math.max(1,width);this.height=Math.max(1,height);this.rect={...rect};
  this.dpr=Math.min(window.devicePixelRatio||1,2,Math.sqrt(2400000/(this.width*this.height)));
  this.canvas.width=Math.max(1,Math.round(this.width*this.dpr));this.canvas.height=Math.max(1,Math.round(this.height*this.dpr));
  this.reset();this.wake();
 }
 setOptions(options:Partial<EngineOptions>){
  if(this.dead)return;const previous=this.options;this.options={...previous,...options};
  if(this.lastImage&&(previous.density!==this.options.density||previous.compact!==this.options.compact||previous.imgBg!==this.options.imgBg))this.sample();
  else if(previous.restStyle!==this.options.restStyle)this.reset();
  if(this.options.reducedMotion){this.stop();this.reset();if(this.visible&&!this.lost&&this.lastImage)this.draw();}
  else if(this.options.paused)this.stop();else this.wake();
 }
 setVisible(visible:boolean){this.visible=visible;if(visible)this.wake();else this.stop();}
 pointer(type:'move'|'down'|'up'|'leave',x:number,y:number,touch:boolean){
  if(this.dead||this.options.paused||this.options.reducedMotion||!this.options.interactive)return;
  if(!this.target.active&&!this.hand.active&&type!=='leave'){this.hand.x=x;this.hand.y=y;}
  this.target={x:type==='leave'?this.hand.x:clamp(x,0,this.width),y:type==='leave'?this.hand.y:clamp(y,0,this.height),active:type==='leave'||(touch&&type==='up')?0:1,down:type==='down'||(type==='move'&&this.target.down)};
  this.wake();
 }
 private stop(){if(this.frame)cancelAnimationFrame(this.frame);this.frame=0;this.last=0;}
 private wake(){
  if(this.dead||this.lost||!this.visible||!this.lastImage||this.frame)return;
  if(this.options.reducedMotion||this.options.paused){this.draw();return;}
  this.frame=requestAnimationFrame(this.tick);
 }
 private tick=(timestamp:number)=>{
  this.frame=0;if(this.dead||this.lost||!this.visible||this.options.paused)return;
  const dt=Math.min(this.last?(timestamp-this.last)/1000:1/60,1/30)*clamp(this.options.speed,.25,3);this.last=timestamp;this.time+=dt;
  const moving=this.integrate(dt);this.draw();
  if(moving||this.target.active||this.options.ambient)this.frame=requestAnimationFrame(this.tick);else this.last=0;
 };
 private integrate(dt:number){
  const o=this.options,follow=1-Math.exp(-14*dt);
  const fromX=this.hand.x,fromY=this.hand.y;
  this.hand.x+=(this.target.x-this.hand.x)*follow;this.hand.y+=(this.target.y-this.hand.y)*follow;
  this.hand.active+=(this.target.active-this.hand.active)*follow;
  if(this.hand.active<.001&&!this.target.active)this.hand.active=0;
  this.wakeField.step(dt,this.width,this.height,fromX,fromY,this.hand.x,this.hand.y,this.hand.active,this.target.down,o,this.time);
  const spring=48*o.returnSpeed,damping=Math.exp(-10*dt);let energy=this.wakeField.activity;
  for(let i=0;i<this.particleCount;i++){
   const p=i*4,v=i*2,hx=this.rect.x+this.anchors[v]*this.rect.w,hy=this.rect.y+this.anchors[v+1]*this.rect.h;
   this.wakeField.sample(hx,hy,this.width,this.height,this.material);
   const breakup=this.material[2];
   const scatter=breakup*o.spread*o.turbulence*28;
   const fx=this.material[0]+this.variations[v]*scatter;
   const fy=this.material[1]+this.variations[v+1]*scatter;
   const phase=i*2.39996323;
   const ambient=o.ambient?o.ambientIntensity*Math.sin(this.time+phase)*5:0;
   this.velocities[v]=(this.velocities[v]+(hx+fx+ambient-this.positions[p])*spring*dt)*damping;
   this.velocities[v+1]=(this.velocities[v+1]+(hy+fy-this.positions[p+1])*spring*dt)*damping;
   this.positions[p]+=this.velocities[v]*dt;this.positions[p+1]+=this.velocities[v+1]*dt;
   const displacement=Math.hypot(this.positions[p]-hx,this.positions[p+1]-hy);
   this.positions[p+2]=o.restStyle==='particles'?1:breakup;
   this.positions[p+3]=o.streaks?Math.hypot(this.velocities[v],this.velocities[v+1])*.028:0;
   energy=Math.max(energy,displacement,Math.abs(this.velocities[v]),Math.abs(this.velocities[v+1]));
  }
  if(energy<.02&&!this.target.active&&!o.ambient){this.reset();return false;}return true;
 }
 private draw(){
  if(this.dead||this.lost||!this.lastImage||!this.surface||!this.grains)return;
  const gl=this.gl,s=this.surface,g=this.grains,o=this.options;
  gl.viewport(0,0,this.canvas.width,this.canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
  gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
  gl.bindVertexArray(null);gl.useProgram(s.program);
  gl.uniform2f(s.uniforms.uViewport,this.width,this.height);gl.uniform4f(s.uniforms.uRect,this.rect.x,this.rect.y,this.rect.w,this.rect.h);
  gl.uniform1f(s.uniforms.uRest,o.restStyle==='particles'?1:0);
  gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,this.wakeTexture);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,this.wakeField.size,this.wakeField.size,0,gl.RGBA,gl.UNSIGNED_BYTE,this.wakeField.pixels);
  gl.uniform1i(s.uniforms.uWake,1);
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.texture);gl.uniform1i(s.uniforms.uImage,0);gl.drawArrays(gl.TRIANGLES,0,6);
  gl.useProgram(g.program);gl.bindVertexArray(this.vao);gl.bindBuffer(gl.ARRAY_BUFFER,this.buffers[0]);gl.bufferData(gl.ARRAY_BUFFER,this.positions,gl.DYNAMIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER,this.buffers[2]);gl.bufferData(gl.ARRAY_BUFFER,this.velocities,gl.DYNAMIC_DRAW);
  gl.uniform2f(g.uniforms.uViewport,this.width,this.height);gl.uniform1f(g.uniforms.uDpr,this.dpr);
  gl.uniform1f(g.uniforms.uDot,o.dotSize*Math.max(.8,Math.sqrt(this.rect.w*this.rect.h/Math.max(1,this.sampleCount)))*1.15);
  gl.drawArraysInstanced(gl.TRIANGLES,0,6,this.particleCount);gl.bindVertexArray(null);
  if(!this.presented){this.presented=true;this.onFirstFrame?.();}
 }
 private contextLost=(event:Event)=>{event.preventDefault();this.lost=true;this.presented=false;this.stop();this.failure();};
 private contextRestored=()=>{
  if(this.dead)return;
  try{this.release();this.allocate();this.lost=false;this.upload();this.reset();this.wake();}
  catch{this.release();this.lost=true;this.failure();}
 };
 destroy(){
  if(this.dead)return;this.dead=true;this.stop();this.onFirstFrame=null;
  this.canvas.removeEventListener('webglcontextlost',this.contextLost);this.canvas.removeEventListener('webglcontextrestored',this.contextRestored);
  this.release();this.gl.getExtension('WEBGL_lose_context')?.loseContext();this.lastImage=null;
  this.anchors=new Float32Array(0);this.positions=new Float32Array(0);this.velocities=new Float32Array(0);this.colors=new Float32Array(0);this.variations=new Float32Array(0);
 }
}
