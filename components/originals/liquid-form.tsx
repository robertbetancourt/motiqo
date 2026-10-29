'use client';

import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { vertex, fragment } from './liquid-form-shaders';
export type LiquidFormProps={compact?:boolean;paused?:boolean;shape?:'knot'|'orbit'|'bloom';liquidity?:number;relief?:number;scale?:number;tint?:string;className?:string};
const bound=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,Number.isFinite(n)?n:a));

export default function LiquidForm({compact=false,paused=false,shape='knot',liquidity=.8,relief=.35,scale=1,tint='#bdcaba',className=''}:LiquidFormProps){
  const root=useRef<HTMLDivElement>(null),canvas=useRef<HTMLCanvasElement>(null),sync=useRef<(()=>void)|null>(null);
  const id=useId().replace(/:/g,'');
  const [revision,setRevision]=useState(0);
  const options=useRef({paused,shape,liquidity,relief,scale,tint});options.current={paused,shape,liquidity,relief,scale,tint};
  useEffect(()=>sync.current?.(),[paused,shape,liquidity,relief,scale,tint]);
  useEffect(()=>{
    const host=root.current!,surface=canvas.current!,gl=surface.getContext('webgl2',{alpha:true,antialias:false,premultipliedAlpha:true});
    if(!gl)return;
    const shaders:WebGLShader[]=[];let program:WebGLProgram|null=null,buffer:WebGLBuffer|null=null;
    try{
      program=gl.createProgram()!;
      for(const [type,source] of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]] as const){const shader=gl.createShader(type)!;shaders.push(shader);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(`Shader ${type}: ${gl.getShaderInfoLog(shader)||'no log'}; lost=${gl.isContextLost()}; error=${gl.getError()}`);gl.attachShader(program,shader);}
      gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Shader link failed');
      gl.useProgram(program);buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
      const location=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,2,gl.FLOAT,false,0,0);
    }catch(error){console.warn('Liquid Form: WebGL fallback',error);shaders.forEach(shader=>gl.deleteShader(shader));if(program)gl.deleteProgram(program);if(buffer)gl.deleteBuffer(buffer);return;}
    shaders.forEach(shader=>gl.deleteShader(shader));
    const uniforms=Object.fromEntries(['resolution','pointer','presence','time','shape','liquidity','relief','scale','tint'].map(name=>[name,gl.getUniformLocation(program!,name)]));
    const media=matchMedia('(prefers-reduced-motion: reduce)'),coarse=matchMedia('(pointer: coarse)').matches;
    const target={x:0,y:0,presence:0},current={...target};let frame=0,last=0,clock=0,visible=true,gone=false,lastInput=0,release=0;
    function draw(){
      if(gone||gl!.isContextLost())return;
      const o=options.current;gl!.useProgram(program);gl!.viewport(0,0,surface.width,surface.height);gl!.uniform2f(uniforms.resolution,surface.width,surface.height);
      gl!.uniform2f(uniforms.pointer,current.x,current.y);gl!.uniform1f(uniforms.presence,media.matches?0:current.presence);
      for(const [key,value] of Object.entries({time:clock,shape:['knot','orbit','bloom'].indexOf(o.shape),liquidity:bound(o.liquidity,0,1.5),relief:bound(o.relief,0,1),scale:bound(o.scale,.6,1.3)}))gl!.uniform1f(uniforms[key],value);
      const hex=/^#[\da-f]{6}$/i.test(o.tint)?o.tint:'#bdcaba',rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);gl!.uniform3f(uniforms.tint,rgb[0],rgb[1],rgb[2]);
      gl!.drawArrays(gl!.TRIANGLE_STRIP,0,4);host.dataset.ready='true';
    }
    function stop(){cancelAnimationFrame(frame);frame=0;}
    function tick(now:number){frame=0;if(gone||!visible||document.hidden||options.current.paused||media.matches)return;
      const dt=Math.min(.05,(now-last)/1000);last=now;clock+=dt;const alpha=1-Math.exp(-dt*9);
      current.x+=(target.x-current.x)*alpha;current.y+=(target.y-current.y)*alpha;current.presence+=(target.presence-current.presence)*alpha;draw();
      frame=requestAnimationFrame(tick);
    }
    function wake(){if(!frame&&!gone&&visible&&!document.hidden&&!options.current.paused&&!media.matches){last=performance.now();frame=requestAnimationFrame(tick);}}
    function resize(){const r=host.getBoundingClientRect();let dpr=Math.min(window.devicePixelRatio||1,compact||coarse?1:1.5);dpr=Math.min(dpr,Math.sqrt((compact?180000:550000)/Math.max(1,r.width*r.height)));surface.width=Math.max(1,Math.round(r.width*dpr));surface.height=Math.max(1,Math.round(r.height*dpr));draw();}
    function move(event:PointerEvent){if(options.current.paused||media.matches)return;const r=host.getBoundingClientRect();target.x=bound((event.clientX-r.left)/r.width*2-1,-1,1);target.y=bound(1-(event.clientY-r.top)/r.height*2,-1,1);target.presence=1;lastInput=performance.now();wake();}
    function leave(){target.presence=0;wake();}
    function up(event:PointerEvent){if(event.pointerType==='touch'){clearTimeout(release);release=window.setTimeout(leave,450);}}
    function key(event:KeyboardEvent){if(event.target!==host||options.current.paused||media.matches||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home',' '].includes(event.key))return;event.preventDefault();if(event.key==='Home'){target.x=target.y=target.presence=0;}else{target.x=bound(target.x+(event.key==='ArrowLeft'?-.18:event.key==='ArrowRight'?.18:0),-1,1);target.y=bound(target.y+(event.key==='ArrowUp'?.18:event.key==='ArrowDown'?-.18:0),-1,1);target.presence=1;lastInput=performance.now();}wake();}
    function visibility(){if(document.hidden)stop();else wake();}
    const resizeObserver=new ResizeObserver(resize),observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(visible)wake();else stop();});resizeObserver.observe(host);observer.observe(host);
    const changed=()=>{stop();if(media.matches){current.x=current.y=current.presence=0;}draw();wake();};sync.current=changed;media.addEventListener('change',changed);document.addEventListener('visibilitychange',visibility);
    host.addEventListener('pointermove',move);host.addEventListener('pointerdown',move);host.addEventListener('pointerup',up);host.addEventListener('pointerleave',leave);host.addEventListener('pointercancel',leave);host.addEventListener('keydown',key);host.addEventListener('blur',leave);
    const lost=(event:Event)=>{event.preventDefault();stop();delete host.dataset.ready;};const restored=()=>setRevision(value=>value+1);surface.addEventListener('webglcontextlost',lost);surface.addEventListener('webglcontextrestored',restored);resize();
    return()=>{gone=true;stop();clearTimeout(release);sync.current=null;resizeObserver.disconnect();observer.disconnect();media.removeEventListener('change',changed);document.removeEventListener('visibilitychange',visibility);host.removeEventListener('pointermove',move);host.removeEventListener('pointerdown',move);host.removeEventListener('pointerup',up);host.removeEventListener('pointerleave',leave);host.removeEventListener('pointercancel',leave);host.removeEventListener('keydown',key);host.removeEventListener('blur',leave);surface.removeEventListener('webglcontextlost',lost);surface.removeEventListener('webglcontextrestored',restored);gl.deleteBuffer(buffer);gl.deleteProgram(program);delete host.dataset.ready;};
  },[compact,revision]);
  const bloom=Array.from({length:80},(_,i)=>{const a=i/80*Math.PI*2,r=106+13*Math.cos(a*5);return `${i?'L':'M'}${200+Math.cos(a)*r},${200+Math.sin(a)*r}`;}).join('')+'Z';
  return <div ref={root} className={`liquid-form ${className}`} role="group" aria-label="Liquid Form, a procedural Motiqo sculpture" tabIndex={compact?-1:0} style={{'--lf-tint':tint} as CSSProperties}><style>{styles}</style><svg className="lf-fallback" viewBox="0 0 400 400" aria-hidden="true"><defs><linearGradient id={id}><stop stopColor="#e5ebdb"/><stop offset=".5" stopColor={tint}/><stop offset="1" stopColor="#cad0ba"/></linearGradient></defs><g transform={`translate(200 200) scale(${bound(scale,.6,1.3)}) translate(-200 -200)`}>{shape==='orbit'?<circle cx="200" cy="200" r="109" fill="none" stroke={`url(#${id})`} strokeWidth="28"/>:shape==='bloom'?<path d={bloom} fill="none" stroke={`url(#${id})`} strokeWidth="25"/>:[0,60,120].map(angle=><ellipse key={angle} cx="200" cy="200" rx="115" ry="53" fill="none" stroke={`url(#${id})`} strokeWidth="20" transform={`rotate(${angle} 200 200)`}/>)}</g></svg><canvas ref={canvas} aria-hidden="true"/></div>;
}
const styles=`.liquid-form{position:relative;isolation:isolate;display:grid;place-items:center;width:100%;height:100%;min-height:0;overflow:hidden;touch-action:pan-y;background:radial-gradient(ellipse at 50% 55%,#22302766,transparent 62%)}.liquid-form>canvas,.liquid-form>.lf-fallback{position:absolute;inset:0;width:100%;height:100%;display:block}.liquid-form>canvas{opacity:0;transition:opacity 650ms cubic-bezier(.22,1,.36,1)}.liquid-form>.lf-fallback{opacity:1;transition:opacity 650ms cubic-bezier(.22,1,.36,1)}.liquid-form[data-ready=true]>canvas{opacity:1}.liquid-form[data-ready=true]>.lf-fallback{opacity:0}.liquid-form:focus-visible{outline:1px solid #fff;outline-offset:-5px}@media(prefers-reduced-motion:reduce){.liquid-form>canvas,.liquid-form>.lf-fallback{transition:none}}html[data-theme=light] .liquid-form{background:radial-gradient(ellipse at 50% 47%,#fff,#f1eee8 74%)}html[data-theme=light] .liquid-form:focus-visible{outline-color:#302c28}`;
