export type GLTarget={texture:WebGLTexture;framebuffer:WebGLFramebuffer;width:number;height:number};
type Uniform=number|readonly number[]|{texture:WebGLTexture}|{vec4Array:Float32Array};
export type GLPass={program:WebGLProgram;locations:Map<string,WebGLUniformLocation|null>};
const vertex=`#version 300 es
precision highp float;out vec2 vUv;
void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);vUv=p;gl_Position=vec4(p*2.-1.,0.,1.);}`;
const header=`#version 300 es
precision highp float;precision highp sampler2D;in vec2 vUv;out vec4 fragColor;
`;

/** Small WebGL2 owner shared by the native fluid and brush renderers. */
export function createNativeGL(canvas:HTMLCanvasElement,alpha=false){
 const context=canvas.getContext('webgl2',{alpha,premultipliedAlpha:false,antialias:false,depth:false,stencil:false,powerPreference:'high-performance'});
 if(!context)throw Error('WebGL2 is unavailable');
 const gl=context;
 const programs=new Set<WebGLProgram>(),textures=new Set<WebGLTexture>(),targets=new Set<GLTarget>();let disposed=false;
 const vao=gl.createVertexArray();if(!vao)throw Error('Vertex array unavailable');gl.bindVertexArray(vao);gl.disable(gl.DEPTH_TEST);gl.disable(gl.BLEND);
 function pass(body:string):GLPass{
  const shaders:WebGLShader[]=[];let program:WebGLProgram|null=null;
  try{
   for(const[type,code]of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,header+body]] as const){const shader=gl.createShader(type);if(!shader)throw Error('Shader unavailable');shaders.push(shader);gl.shaderSource(shader,code);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader)||'Shader compilation failed');}
   program=gl.createProgram();if(!program)throw Error('Program unavailable');shaders.forEach(s=>gl.attachShader(program!,s));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program)||'Program linking failed');
   programs.add(program);return{program,locations:new Map()};
  }catch(error){if(program)gl.deleteProgram(program);throw error;}finally{shaders.forEach(s=>gl.deleteShader(s));}
 }
 function texture(){const t=gl.createTexture();if(!t)throw Error('Texture unavailable');textures.add(t);gl.bindTexture(gl.TEXTURE_2D,t);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([255,255,255,255]));return t;}
 function upload(t:WebGLTexture,source:TexImageSource){gl.bindTexture(gl.TEXTURE_2D,t);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);try{gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);}finally{gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);}}
 function target(width:number,height:number,floating=false):GLTarget{
  const t=texture(),framebuffer=gl.createFramebuffer();if(!framebuffer){gl.deleteTexture(t);textures.delete(t);throw Error('Framebuffer unavailable');}
  gl.bindTexture(gl.TEXTURE_2D,t);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,floating?gl.NEAREST:gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,floating?gl.NEAREST:gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D,0,floating?gl.RGBA16F:gl.RGBA8,width,height,0,gl.RGBA,floating?gl.HALF_FLOAT:gl.UNSIGNED_BYTE,null);gl.bindFramebuffer(gl.FRAMEBUFFER,framebuffer);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,t,0);
  if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE){gl.deleteFramebuffer(framebuffer);gl.deleteTexture(t);textures.delete(t);throw Error('Framebuffer is not renderable');}
  const result={texture:t,framebuffer,width,height};targets.add(result);gl.viewport(0,0,width,height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);return result;
 }
 function release(t:GLTarget){if(!targets.delete(t))return;gl.deleteFramebuffer(t.framebuffer);gl.deleteTexture(t.texture);textures.delete(t.texture);}
 function draw(p:GLPass,destination:GLTarget|null,uniforms:Record<string,Uniform>={}){
  gl.bindVertexArray(vao);gl.useProgram(p.program);gl.bindFramebuffer(gl.FRAMEBUFFER,destination?.framebuffer??null);gl.viewport(0,0,destination?.width??canvas.width,destination?.height??canvas.height);let unit=0;
  for(const[name,value]of Object.entries(uniforms)){
   if(!p.locations.has(name))p.locations.set(name,gl.getUniformLocation(p.program,name));const location=p.locations.get(name)!;if(location===null)continue;
   if(typeof value==='number')gl.uniform1f(location,value);
   else if('texture'in value){gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,value.texture);gl.uniform1i(location,unit++);}
   else if('vec4Array'in value)gl.uniform4fv(location,value.vec4Array);
   else if(value.length===2)gl.uniform2f(location,value[0],value[1]);else if(value.length===3)gl.uniform3f(location,value[0],value[1],value[2]);else if(value.length===4)gl.uniform4f(location,value[0],value[1],value[2],value[3]);
  }
  gl.drawArrays(gl.TRIANGLES,0,3);
 }
 return{gl,pass,texture,upload,target,release,draw,dispose(){if(disposed)return;disposed=true;targets.forEach(release);programs.forEach(p=>gl.deleteProgram(p));programs.clear();textures.forEach(t=>gl.deleteTexture(t));textures.clear();gl.deleteVertexArray(vao);}};
}
export const nativeClamp=(n:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,Number.isFinite(n)?n:lo));
export function nativeColor(hex:string,fallback:string):[number,number,number]{const h=/^#[\da-f]{6}$/i.test(hex)?hex:fallback;return[parseInt(h.slice(1,3),16)/255,parseInt(h.slice(3,5),16)/255,parseInt(h.slice(5,7),16)/255];}
