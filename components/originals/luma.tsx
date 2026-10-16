'use client';

import {useEffect,useId,useMemo,useRef} from 'react';
import {createLumaSeeds,lumaClamp,lumaHex,lumaRGB,lumaPoint} from './luma-math';
import {lumaVertex,lumaFragment} from './luma-shaders';

export type LumaProps={name?:string;message?:string;compact?:boolean;paused?:boolean;count?:number;speed?:number;amplitude?:number;glow?:number;warmColor?:string;coolColor?:string;className?:string};

export default function Luma({name='Robert',message='How can I help you?',compact=false,paused=false,count=16000,speed=1,amplitude=1,glow=1,warmColor='#f47c6b',coolColor='#9e8cff',className=''}:LumaProps){
  const root=useRef<HTMLDivElement>(null),panel=useRef<HTMLDivElement>(null),canvas=useRef<HTMLCanvasElement>(null),sync=useRef<()=>void>(()=>{});
  const options=useRef({paused,count,speed,amplitude,glow,warmColor,coolColor});options.current={paused,count,speed,amplitude,glow,warmColor,coolColor};
  const gradient=useId().replace(/:/g,''),warm=lumaHex(warmColor,'#f47c6b'),cool=lumaHex(coolColor,'#9e8cff');
  const fallback=useMemo(()=>{const data=createLumaSeeds(2000);return Array.from({length:720},(_,i)=>lumaPoint(data,i,1,amplitude));},[amplitude]);
  useEffect(()=>sync.current(),[paused,count,speed,amplitude,glow,warmColor,coolColor]);
  useEffect(()=>{
    const host=root.current!,frame=panel.current!,surface=canvas.current!,media=matchMedia('(prefers-reduced-motion: reduce)');
    const gl=surface.getContext('webgl2',{alpha:false,antialias:false,powerPreference:'high-performance',preserveDrawingBuffer:false});
    let gone=false,lost=false,visible=true,held=false,raf=0,last=0,time=1,width=0,height=0,dpr=1,particleCount=0,program:WebGLProgram|null=null,buffer:WebGLBuffer|null=null,vao:WebGLVertexArrayObject|null=null;
    let sampleStart=0,sampleFrames=0;
    const uniforms:Record<string,WebGLUniformLocation|null>={};
    function stop(){cancelAnimationFrame(raf);raf=0;}
    function release(){if(!gl)return;if(buffer)gl.deleteBuffer(buffer);if(vao)gl.deleteVertexArray(vao);if(program)gl.deleteProgram(program);buffer=vao=program=null;particleCount=0;}
    function init(){
      if(!gl||gone)return;const shaders:WebGLShader[]=[];
      try{
        for(const[type,code]of [[gl.VERTEX_SHADER,lumaVertex],[gl.FRAGMENT_SHADER,lumaFragment]] as const){
          const shader=gl.createShader(type);if(!shader)throw new Error('Shader unavailable');shaders.push(shader);gl.shaderSource(shader,code);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader)||'Shader compilation failed');
        }
        program=gl.createProgram();if(!program)throw new Error('Program unavailable');shaders.forEach(shader=>gl.attachShader(program!,shader));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program)||'Program link failed');
        buffer=gl.createBuffer();vao=gl.createVertexArray();if(!buffer||!vao)throw new Error('Particle buffer unavailable');
        gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,4,gl.FLOAT,false,24,0);gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,2,gl.FLOAT,false,24,16);
        for(const key of ['Resolution','Time','Amplitude','Dpr','Warm','Cool','Glow'])uniforms[key]=gl.getUniformLocation(program,`u${key}`);
        gl.disable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE);lost=false;delete host.dataset.failed;
      }catch{release();host.dataset.failed='true';}
      finally{shaders.forEach(shader=>gl.deleteShader(shader));}
    }
    function draw(){
      if(!gl||!program||lost||!width||!height)return;const o=options.current;
      const desired=Math.round(lumaClamp(compact?Math.min(o.count,10000):o.count,2000,32000));
      gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
      if(desired!==particleCount){gl.bufferData(gl.ARRAY_BUFFER,createLumaSeeds(desired),gl.STATIC_DRAW);particleCount=desired;}
      gl.viewport(0,0,surface.width,surface.height);gl.clearColor(0,0,0,1);gl.clear(gl.COLOR_BUFFER_BIT);gl.useProgram(program);
      gl.uniform2f(uniforms.Resolution,width,height);gl.uniform1f(uniforms.Time,media.matches?1:time);gl.uniform1f(uniforms.Amplitude,lumaClamp(o.amplitude,0,1.8));gl.uniform1f(uniforms.Dpr,dpr);gl.uniform1f(uniforms.Glow,lumaClamp(o.glow,.3,2));
      const a=lumaRGB(lumaHex(o.warmColor,'#f47c6b')),b=lumaRGB(lumaHex(o.coolColor,'#9e8cff'));gl.uniform3f(uniforms.Warm,a[0],a[1],a[2]);gl.uniform3f(uniforms.Cool,b[0],b[1],b[2]);gl.drawArrays(gl.POINTS,0,particleCount);
      host.dataset.ready='true';host.dataset.particles=String(particleCount);host.dataset.waveTime=(media.matches?1:time).toFixed(3);
    }
    function tick(now:number){
      raf=0;if(gone||lost||!host.isConnected||!visible||document.hidden)return;
      if(options.current.paused||held||media.matches){draw();return;}
      // 60Hz target, also on 120Hz displays. Mobile keeps this cadence.
      const elapsed=now-last;if(elapsed<1000/60-.5){raf=requestAnimationFrame(tick);return;}
      const dt=Math.min(.05,Math.max(.001,elapsed/1000));last=now;time+=dt*lumaClamp(options.current.speed,.25,2);draw();
      sampleFrames++;if(now-sampleStart>=750){host.dataset.fps=(sampleFrames*1000/(now-sampleStart)).toFixed(1);sampleStart=now;sampleFrames=0;}
      if(program)raf=requestAnimationFrame(tick);
    }
    function wake(){if(!gone&&!lost&&program&&!raf&&visible&&!document.hidden){last=performance.now();sampleStart=last;sampleFrames=0;raf=requestAnimationFrame(tick);}}
    function resize(){
      const box=host.getBoundingClientRect();width=Math.max(1,Math.min(box.width*.86,box.height*.64,380));height=Math.max(width*2,box.height*1.08);
      frame.style.width=`${width}px`;frame.style.height=`${height}px`;dpr=Math.min(window.devicePixelRatio||1,compact?1:1.5);
      surface.width=Math.max(1,Math.round(width*dpr));surface.height=Math.max(1,Math.round(height*dpr));draw();wake();
    }
    function changed(){stop();draw();wake();}sync.current=changed;
    function visibility(){stop();wake();}
    function key(event:KeyboardEvent){if(event.target!==frame||event.key!==' '||media.matches||options.current.paused)return;event.preventDefault();held=!held;host.dataset.held=String(held);changed();}
    const onLost=(event:Event)=>{event.preventDefault();lost=true;stop();delete host.dataset.ready;};
    const onRestored=()=>{release();init();draw();wake();};
    const size=new ResizeObserver(resize),intersection=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;visibility();});
    surface.addEventListener('webglcontextlost',onLost);surface.addEventListener('webglcontextrestored',onRestored);frame.addEventListener('keydown',key);media.addEventListener('change',changed);document.addEventListener('visibilitychange',visibility);
    init();size.observe(host);intersection.observe(host);resize();
    return()=>{gone=true;stop();sync.current=()=>{};size.disconnect();intersection.disconnect();frame.removeEventListener('keydown',key);media.removeEventListener('change',changed);document.removeEventListener('visibilitychange',visibility);surface.removeEventListener('webglcontextlost',onLost);surface.removeEventListener('webglcontextrestored',onRestored);release();surface.width=surface.height=0;delete host.dataset.ready;};
  },[compact]);
  return <div ref={root} className={`luma ${className}`}><style>{styles}</style><div ref={panel} className="luma-panel" tabIndex={compact?-1:0} role="group" aria-label="Luma, a luminous coral-to-violet particle wave. Space pauses or resumes the animation.">
    <svg className="luma-fallback" viewBox="0 0 1000 2000" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id={gradient}><stop stopColor={warm}/><stop offset="1" stopColor={cool}/></linearGradient></defs><g fill={`url(#${gradient})`}>{fallback.map((p,i)=><circle key={i} cx={(p.u*1000).toFixed(3)} cy={(1060+p.y*1000).toFixed(3)} r={p.kind<.56?1.4:p.kind<.91?1.8:7} opacity={(p.fade*(p.kind<.91?.7:.06)).toFixed(4)}/>)}</g></svg>
    <canvas ref={canvas} aria-hidden="true"/><p className="luma-greeting"><span>Hey {name},</span><span>{message}</span></p>
  </div></div>;
}
const styles=`.luma{position:relative;width:100%;height:100%;min-height:0;overflow:hidden;background:#050505;container-type:size}.luma-panel{position:absolute;top:6%;left:50%;transform:translateX(-50%);isolation:isolate;width:min(86cqw,64cqh,380px);height:max(min(172cqw,128cqh,760px),108cqh);aspect-ratio:.5;background:#000;border:1px solid #ffffff24;border-radius:clamp(18px,8cqw,34px);overflow:hidden;outline:none;container-type:inline-size}.luma-panel>canvas,.luma-fallback{position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;transition:opacity 650ms cubic-bezier(.22,1,.36,1)}.luma-panel>canvas{opacity:0}.luma[data-ready=true] canvas{opacity:1}.luma[data-ready=true] .luma-fallback{opacity:0}.luma-greeting{position:absolute;z-index:2;top:34%;left:0;right:0;transform:translateY(-50%);margin:0;padding:0 3%;text-align:center;font-family:inherit;font-size:clamp(12px,7.2cqw,29px);font-weight:300;line-height:1.25;letter-spacing:-.035em;pointer-events:none}.luma-greeting span{display:block;color:#f4f4f6;white-space:nowrap}.luma-greeting span:first-child{color:#99999e;margin-bottom:.12em}.luma-panel:focus-visible{outline:1px solid #fff;outline-offset:4px}html[data-theme=light] .luma{background:#f6f5f3}@media(prefers-reduced-motion:reduce){.luma-panel>canvas,.luma-fallback{transition:none}}`;
