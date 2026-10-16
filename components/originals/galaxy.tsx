'use client';

import {useEffect,useId,useMemo,useRef} from 'react';
import {createGalaxySeeds,galaxyClamp,galaxyHex,galaxyRGB,galaxyPoint} from './galaxy-math';
import {galaxyVertex,galaxyFragment} from './galaxy-shaders';

export type GalaxyProps={compact?:boolean;paused?:boolean;count?:number;speed?:number;arms?:number;tilt?:number;glow?:number;coreColor?:string;edgeColor?:string;className?:string};

export default function Galaxy({compact=false,paused=false,count=50000,speed=1,arms=7,tilt=55,glow=1,coreColor='#b878ff',edgeColor='#50d9ff',className=''}:GalaxyProps){
  const root=useRef<HTMLDivElement>(null),canvas=useRef<HTMLCanvasElement>(null),sync=useRef<()=>void>(()=>{});
  const options=useRef({paused,count,speed,arms,tilt,glow,coreColor,edgeColor});options.current={paused,count,speed,arms,tilt,glow,coreColor,edgeColor};
  const gradient=useId().replace(/:/g,''),core=galaxyHex(coreColor,'#b878ff'),edge=galaxyHex(edgeColor,'#50d9ff');
  const fallback=useMemo(()=>{const data=createGalaxySeeds(4000);return Array.from({length:1600},(_,i)=>galaxyPoint(data,i,1,arms,tilt));},[arms,tilt]);
  useEffect(()=>sync.current(),[paused,count,speed,arms,tilt,glow,coreColor,edgeColor]);
  useEffect(()=>{
    const host=root.current!,surface=canvas.current!,media=matchMedia('(prefers-reduced-motion: reduce)');
    const gl=surface.getContext('webgl2',{alpha:false,antialias:false,powerPreference:'high-performance',preserveDrawingBuffer:false});
    let gone=false,lost=false,visible=true,held=false,raf=0,last=0,time=1,width=0,height=0,dpr=1,particleCount=0,program:WebGLProgram|null=null,buffer:WebGLBuffer|null=null,vao:WebGLVertexArrayObject|null=null;
    let sampleStart=0,sampleFrames=0,x=0,y=0,tx=0,ty=0;
    const uniforms:Record<string,WebGLUniformLocation|null>={};
    function stop(){cancelAnimationFrame(raf);raf=0;}
    function release(){if(!gl)return;if(buffer)gl.deleteBuffer(buffer);if(vao)gl.deleteVertexArray(vao);if(program)gl.deleteProgram(program);buffer=vao=program=null;particleCount=0;}
    function init(){
      if(!gl||gone)return;const shaders:WebGLShader[]=[];
      try{
        for(const[type,code]of [[gl.VERTEX_SHADER,galaxyVertex],[gl.FRAGMENT_SHADER,galaxyFragment]] as const){
          const shader=gl.createShader(type);if(!shader)throw new Error('Shader unavailable');shaders.push(shader);gl.shaderSource(shader,code);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader)||'Shader compilation failed');
        }
        program=gl.createProgram();if(!program)throw new Error('Program unavailable');shaders.forEach(shader=>gl.attachShader(program!,shader));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program)||'Program link failed');
        buffer=gl.createBuffer();vao=gl.createVertexArray();if(!buffer||!vao)throw new Error('Particle buffer unavailable');
        gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,4,gl.FLOAT,false,32,0);gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,4,gl.FLOAT,false,32,16);
        for(const key of ['Resolution','Hand','Time','Arms','Tilt','Dpr','Core','Edge','Glow'])uniforms[key]=gl.getUniformLocation(program,`u${key}`);
        gl.disable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE);lost=false;delete host.dataset.failed;
      }catch{release();host.dataset.failed='true';}
      finally{shaders.forEach(shader=>gl.deleteShader(shader));}
    }
    function draw(){
      if(!gl||!program||lost||!width||!height)return;const o=options.current;
      const desired=Math.round(galaxyClamp(compact?Math.min(o.count,18000):o.count,4000,90000));
      gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
      if(desired!==particleCount){gl.bufferData(gl.ARRAY_BUFFER,createGalaxySeeds(desired),gl.STATIC_DRAW);particleCount=desired;}
      gl.viewport(0,0,surface.width,surface.height);gl.clearColor(0,0,0,1);gl.clear(gl.COLOR_BUFFER_BIT);gl.useProgram(program);
      gl.uniform2f(uniforms.Resolution,width,height);gl.uniform2f(uniforms.Hand,media.matches?0:x,media.matches?0:y);gl.uniform1f(uniforms.Time,media.matches?1:time);gl.uniform1f(uniforms.Arms,galaxyClamp(Math.round(o.arms),3,12));gl.uniform1f(uniforms.Tilt,galaxyClamp(o.tilt,25,80));gl.uniform1f(uniforms.Dpr,dpr);gl.uniform1f(uniforms.Glow,galaxyClamp(o.glow,.3,2));
      const a=galaxyRGB(galaxyHex(o.coreColor,'#b878ff')),b=galaxyRGB(galaxyHex(o.edgeColor,'#50d9ff'));gl.uniform3f(uniforms.Core,a[0],a[1],a[2]);gl.uniform3f(uniforms.Edge,b[0],b[1],b[2]);gl.drawArrays(gl.POINTS,0,particleCount);
      host.dataset.ready='true';host.dataset.particles=String(particleCount);host.dataset.sceneTime=(media.matches?1:time).toFixed(3);host.dataset.sceneTilt=`${x.toFixed(3)},${y.toFixed(3)}`;
    }
    function tick(now:number){
      raf=0;if(gone||lost||!host.isConnected||!visible||document.hidden)return;
      if(options.current.paused||held||media.matches){draw();return;}
      const elapsed=now-last;if(elapsed<1000/60-.5){raf=requestAnimationFrame(tick);return;}
      const dt=Math.min(.05,Math.max(.001,elapsed/1000)),a=1-Math.exp(-dt*6);last=now;time+=dt*galaxyClamp(options.current.speed,.2,2);x+=(tx-x)*a;y+=(ty-y)*a;draw();
      sampleFrames++;if(now-sampleStart>=750){host.dataset.fps=(sampleFrames*1000/(now-sampleStart)).toFixed(1);sampleStart=now;sampleFrames=0;}
      if(program)raf=requestAnimationFrame(tick);
    }
    function wake(){if(!gone&&!lost&&program&&!raf&&visible&&!document.hidden){last=performance.now();sampleStart=last;sampleFrames=0;raf=requestAnimationFrame(tick);}}
    function resize(){
      const box=host.getBoundingClientRect();width=Math.max(1,box.width);height=Math.max(1,box.height);dpr=Math.min(window.devicePixelRatio||1,compact?1:1.5);
      surface.width=Math.max(1,Math.round(width*dpr));surface.height=Math.max(1,Math.round(height*dpr));draw();wake();
    }
    function changed(){stop();if(media.matches)x=y=tx=ty=0;draw();wake();}sync.current=changed;
    function visibility(){stop();wake();}
    function move(event:PointerEvent){if(options.current.paused||held||media.matches)return;const box=host.getBoundingClientRect();tx=galaxyClamp((event.clientX-box.left)/width*2-1,-1,1);ty=galaxyClamp((event.clientY-box.top)/height*2-1,-1,1);wake();}
    function leave(){tx=ty=0;wake();}
    function up(event:PointerEvent){if(event.pointerType!=='mouse')leave();}
    function key(event:KeyboardEvent){
      if(event.target!==host||media.matches||options.current.paused||![' ','Home','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;
      event.preventDefault();if(event.key===' '){held=!held;host.dataset.held=String(held);changed();}
      else if(event.key==='Home')leave();
      else{tx=galaxyClamp(tx+(event.key==='ArrowLeft'?-.3:event.key==='ArrowRight'?.3:0),-1,1);ty=galaxyClamp(ty+(event.key==='ArrowUp'?-.3:event.key==='ArrowDown'?.3:0),-1,1);wake();}
    }
    const onLost=(event:Event)=>{event.preventDefault();lost=true;stop();delete host.dataset.ready;};
    const onRestored=()=>{release();init();draw();wake();};
    const size=new ResizeObserver(resize),intersection=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;visibility();});
    surface.addEventListener('webglcontextlost',onLost);surface.addEventListener('webglcontextrestored',onRestored);host.addEventListener('keydown',key);host.addEventListener('pointermove',move);host.addEventListener('pointerdown',move);host.addEventListener('pointerleave',leave);host.addEventListener('pointerup',up);host.addEventListener('pointercancel',leave);media.addEventListener('change',changed);document.addEventListener('visibilitychange',visibility);
    init();size.observe(host);intersection.observe(host);resize();
    return()=>{gone=true;stop();sync.current=()=>{};size.disconnect();intersection.disconnect();host.removeEventListener('keydown',key);host.removeEventListener('pointermove',move);host.removeEventListener('pointerdown',move);host.removeEventListener('pointerleave',leave);host.removeEventListener('pointerup',up);host.removeEventListener('pointercancel',leave);media.removeEventListener('change',changed);document.removeEventListener('visibilitychange',visibility);surface.removeEventListener('webglcontextlost',onLost);surface.removeEventListener('webglcontextrestored',onRestored);release();surface.width=surface.height=0;delete host.dataset.ready;};
  },[compact]);
  return <div ref={root} className={`galaxy ${className}`} tabIndex={compact?-1:0} role="group" aria-label="Galaxy, a luminous spiral galaxy. Move or touch to tilt, arrow keys steer, Home recentres and Space pauses or resumes."><style>{styles}</style>
    <svg className="galaxy-fallback" viewBox="-1.2 -.9 2.4 1.8" aria-hidden="true"><defs><radialGradient id={gradient}><stop stopColor="#fff"/><stop offset=".15" stopColor={core}/><stop offset="1" stopColor={edge} stopOpacity="0"/></radialGradient></defs><ellipse rx=".27" ry=".17" fill={`url(#${gradient})`}/>{fallback.map((p,i)=><circle key={i} cx={p.x.toFixed(4)} cy={p.y.toFixed(4)} r={p.kind>.982?.005:.0018} fill={p.radius<.15?core:p.kind>.982?edge:'#6669ff'} opacity={(p.twinkle*p.fade*(p.kind>.982?.8:.4)).toFixed(4)}/>)}</svg>
    <canvas ref={canvas} aria-hidden="true"/><span className="galaxy-flare" aria-hidden="true" style={{color:core,opacity:galaxyClamp(glow,.3,2)*.85}}/>
  </div>;
}
const styles=`.galaxy{position:relative;width:100%;height:100%;min-height:0;overflow:hidden;isolation:isolate;background:#000;outline:none;container-type:size}.galaxy>canvas,.galaxy-fallback{position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;transition:opacity 650ms cubic-bezier(.22,1,.36,1)}.galaxy>canvas{opacity:0}.galaxy[data-ready=true]>canvas{opacity:1}.galaxy[data-ready=true] .galaxy-fallback{opacity:0}.galaxy-flare{position:absolute;pointer-events:none;left:50%;top:52%;width:1px;height:88%;transform:translate(-50%,-50%);mix-blend-mode:screen;background:linear-gradient(180deg,transparent,color-mix(in srgb,currentColor 15%,transparent) 17%,#d4c3ff55 44%,#fff 50%,#d4c3ff44 57%,color-mix(in srgb,currentColor 10%,transparent) 82%,transparent);filter:blur(.55px)}.galaxy-flare:before{content:"";position:absolute;inset:-6% -3px;background:inherit;opacity:.35;filter:blur(4px)}.galaxy:focus-visible{outline:1px solid #fff;outline-offset:-5px}@media(prefers-reduced-motion:reduce){.galaxy>canvas,.galaxy-fallback{transition:none}}`;
