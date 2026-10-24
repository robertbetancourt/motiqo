"use client";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEventHandler,
  type ReactNode,
} from "react";
import { effectRuntime } from "./effect-runtime";
export type LumenStatus = "idle" | "success";
export type LumenButtonProps = {
  children?: ReactNode;
  label?: string;
  status?: LumenStatus;
  disabled?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  paused?: boolean;
  className?: string;
  style?: CSSProperties;
};
export default function LumenButton({
  children,
  label = "Continue",
  status: requestedStatus = "idle",
  disabled = false,
  onClick,
  paused = false,
  className = "",
  style,
}: LumenButtonProps) {
  const [status, setStatus] = useState<LumenStatus>(requestedStatus);
  useEffect(() => setStatus(requestedStatus), [requestedStatus]);
  const root = useRef<HTMLButtonElement>(null),
    canvas = useRef<HTMLCanvasElement>(null),
    runtime = useRef<ReturnType<typeof effectRuntime> | null>(null),
    interaction = useRef({
      x: 0.5,
      y: 0.5,
      hover: 0,
      pressed: false,
      click: false,
    }),
    options = useRef({ status, disabled, paused });
  options.current = { status, disabled, paused };
  useEffect(() => {
    const host = root.current!,
      surface = canvas.current!;
    let gl: WebGL2RenderingContext | null = null;
    try {
      gl = surface.getContext("webgl2", {
        alpha: true,
        antialias: false,
        premultipliedAlpha: false,
      });
    } catch {}
    if (!gl) {
      host.dataset.gl = "off";
      host.dataset.ready = "true";
      return;
    }
    const ctx = gl;
    let program: WebGLProgram | null = null,
      vao: WebGLVertexArrayObject | null = null,
      vertex: WebGLShader | null = null,
      fragment: WebGLShader | null = null,
      lost = false,
      previous = options.current.status,
      clickTime = -100,
      clickX = 0.5,
      clickY = 0.5,
      tx = 0,
      ty = 0,
      scale = 1,
      velocity = 0,
      hover = 0;
    const locations = new Map<string, WebGLUniformLocation | null>();
    function clean() {
      if (program) ctx.deleteProgram(program);
      if (vao) ctx.deleteVertexArray(vao);
      if (vertex) ctx.deleteShader(vertex);
      if (fragment) ctx.deleteShader(fragment);
      program = null;
      vao = null;
      vertex = null;
      fragment = null;
      locations.clear();
    }
    function setup() {
      clean();
      try {
        const compile = (kind: number, source: string) => {
          const shader = ctx.createShader(kind);
          if (!shader) throw Error("Shader allocation failed");
          ctx.shaderSource(shader, source);
          ctx.compileShader(shader);
          if (!ctx.getShaderParameter(shader, ctx.COMPILE_STATUS)) {
            ctx.deleteShader(shader);
            throw Error("Lumen shader could not compile");
          }
          return shader;
        };
        vertex = compile(ctx.VERTEX_SHADER, VERTEX);
        fragment = compile(ctx.FRAGMENT_SHADER, FRAGMENT);
        program = ctx.createProgram();
        if (!program) throw Error("Program allocation failed");
        ctx.attachShader(program, vertex);
        ctx.attachShader(program, fragment);
        ctx.linkProgram(program);
        if (!ctx.getProgramParameter(program, ctx.LINK_STATUS))
          throw Error("Lumen program could not link");
        vao = ctx.createVertexArray();
        for (const name of [
          "uRes",
          "uMouse",
          "uTime",
          "uDpr",
          "uHover",
          "uSuccess",
          "uClick",
        ])
          locations.set(name, ctx.getUniformLocation(program, name));
        host.dataset.gl = "on";
      } catch {
        clean();
        host.dataset.gl = "off";
        host.dataset.ready = "true";
      }
    }
    setup();
    runtime.current = effectRuntime(
      host,
      surface,
      (time, dt) => {
        if (lost || !program) return;
        const opt = options.current,
          input = interaction.current,
          isStatic = dt === 0,
          targetScale = input.pressed ? 0.965 : 1,
          steps = Math.max(1, Math.ceil(dt / 0.008)),
          h = dt / steps;
        for (let i = 0; i < steps; i++) {
          velocity += ((targetScale - scale) * 420 - velocity * 16) * h;
          scale += velocity * h;
        }
        if (isStatic) {
          scale = 1;
          velocity = 0;
        }
        const smoothing = isStatic ? 1 : 1 - Math.exp(-dt * 12);
        tx += ((input.x - 0.5) * 10 * input.hover - tx) * smoothing;
        ty += ((input.y - 0.5) * 10 * input.hover - ty) * smoothing;
        hover += (input.hover - hover) * smoothing;
        host.style.setProperty("--lb-tx", `${tx}px`);
        host.style.setProperty("--lb-ty", `${ty}px`);
        host.style.setProperty("--lb-scale", String(scale));
        if (
          input.click ||
          (opt.status === "success" && previous !== "success")
        ) {
          clickTime = time;
          clickX = input.click ? input.x : 0.5;
          clickY = input.click ? 1 - input.y : 0.5;
          input.click = false;
        }
        previous = opt.status;
        ctx.useProgram(program);
        ctx.bindVertexArray(vao);
        ctx.viewport(0, 0, surface.width, surface.height);
        ctx.uniform2f(locations.get("uRes")!, surface.width, surface.height);
        ctx.uniform2f(
          locations.get("uMouse")!,
          input.x * surface.width,
          (1 - input.y) * surface.height,
        );
        ctx.uniform1f(locations.get("uTime")!, time);
        ctx.uniform1f(
          locations.get("uDpr")!,
          Math.min(devicePixelRatio || 1, 2),
        );
        ctx.uniform1f(locations.get("uHover")!, hover);
        ctx.uniform1f(
          locations.get("uSuccess")!,
          opt.status === "success" ? 1 : 0,
        );
        ctx.uniform3f(
          locations.get("uClick")!,
          clickX * surface.width,
          clickY * surface.height,
          time - clickTime,
        );
        ctx.drawArrays(ctx.TRIANGLES, 0, 3);
      },
      () => options.current.paused || options.current.disabled,
    );
    const onLost = (event: Event) => {
      event.preventDefault();
      lost = true;
      host.dataset.gl = "off";
      runtime.current?.invalidate();
    };
    const onRestored = () => {
      lost = false;
      setup();
      runtime.current?.invalidate();
    };
    surface.addEventListener("webglcontextlost", onLost);
    surface.addEventListener("webglcontextrestored", onRestored);
    return () => {
      runtime.current?.dispose();
      runtime.current = null;
      surface.removeEventListener("webglcontextlost", onLost);
      surface.removeEventListener("webglcontextrestored", onRestored);
      clean();
    };
  }, []);
  useEffect(() => runtime.current?.invalidate(), [status, disabled, paused]);
  return (
    <button
      ref={root}
      type="button"
      className={`lumen-button ${className}`}
      style={style}
      disabled={disabled}
      data-status={status}
      data-paused={paused || undefined}
      onPointerMove={(event) => {
        const r = event.currentTarget.getBoundingClientRect();
        interaction.current.x = (event.clientX - r.left) / r.width;
        interaction.current.y = (event.clientY - r.top) / r.height;
        interaction.current.hover = 1;
        runtime.current?.invalidate();
      }}
      onPointerLeave={() => {
        interaction.current.hover = 0;
        interaction.current.pressed = false;
        runtime.current?.invalidate();
      }}
      onPointerDown={() => {
        interaction.current.pressed = true;
        runtime.current?.invalidate();
      }}
      onPointerUp={() => {
        interaction.current.pressed = false;
        runtime.current?.invalidate();
      }}
      onPointerCancel={() => {
        interaction.current.pressed = false;
        interaction.current.hover = 0;
        runtime.current?.invalidate();
      }}
      onClick={(event) => {
        if (event.detail === 0) {
          interaction.current.x = 0.5;
          interaction.current.y = 0.5;
        }
        setStatus("success");
        interaction.current.click = true;
        runtime.current?.invalidate();
        onClick?.(event);
      }}
    >
      <style>{styles}</style>
      <canvas ref={canvas} aria-hidden="true" />
      <span className="lb-content" aria-hidden="true">
        <span data-state="idle">
          {children ?? label}
          <span className="lb-arrow">→</span>
        </span>
        <span data-state="success">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <path
              pathLength="1"
              d="m4 10 4 4 8-9"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Done
        </span>
      </span>
      <span className="lb-sr" aria-live="polite">
        {status === "success"
            ? "Done"
            : typeof children === "string"
              ? children
              : label}
      </span>
    </button>
  );
}
export function LumenButtonShowcase({
  status: initial = "idle",
  label = "Continue",
  paused = false,
  compact = false,
  disabled = false,
  onStatusChange,
}: {
  status?: LumenStatus;
  label?: string;
  paused?: boolean;
  compact?: boolean;
  disabled?: boolean;
  onStatusChange?: (status: LumenStatus) => void;
}) {
  const [status, setStatus] = useState<LumenStatus>(initial);
  useEffect(() => setStatus(initial), [initial]);
  return (
    <section
      className="lumen-showcase"
      data-compact={compact || undefined}
      aria-label="Lumen button showcase"
    >
      <style>{showcaseStyles}</style>
      <div className="lb-main">
        <LumenButton
          label={label}
          status={status}
          paused={paused}
          disabled={disabled}
          onClick={() => { setStatus("success"); onStatusChange?.("success"); }}
        />
      </div>
    </section>
  );
}
const VERTEX = `#version 300 es
void main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));gl_Position=vec4(p*2.0-1.0,0.0,1.0);}`;
export const FRAGMENT = `#version 300 es
precision highp float;out vec4 outColor;uniform vec2 uRes,uMouse;uniform vec3 uClick;uniform float uTime,uDpr,uHover,uSuccess;
float hash21(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float vnoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash21(i),hash21(i+vec2(1,0)),f.x),mix(hash21(i+vec2(0,1)),hash21(i+1.0),f.x),f.y);}
float fbm(vec2 p){float sum=0.0,weight=.5;for(int i=0;i<4;i++){sum+=weight*vnoise(p);p=mat2(1.6,1.2,-1.2,1.6)*p;weight*=.5;}return sum;}
float sdRoundBox(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return min(max(q.x,q.y),0.0)+length(max(q,0.0))-r;}
vec3 ramp(float t){t=fract(t)*5.0;vec3 a=vec3(.204,.827,.6),b=vec3(.376,.647,.98),c=vec3(.545,.36,.965),d=vec3(.925,.282,.6),e=vec3(.984,.749,.141);if(t<1.0)return mix(a,b,t);if(t<2.0)return mix(b,c,t-1.0);if(t<3.0)return mix(c,d,t-2.0);if(t<4.0)return mix(d,e,t-3.0);return mix(e,a,t-4.0);}
void main(){vec2 p=gl_FragCoord.xy-uRes*.5;float H=uRes.y-2.0*uDpr;float d=sdRoundBox(p,uRes*.5-uDpr,H*.5),edge=-d,cover=clamp(-d+.5,0.0,1.0);vec2 uv=p/H,mouse=(uMouse-uRes*.5)/H;
 vec2 offset=uv-mouse;float wake=exp(-dot(offset,offset)*16.0)*uHover;vec2 wuv=uv*3.1+vec2(-offset.y,offset.x)*wake*.8;
 float age=uClick.z,shock=exp(-pow((length(gl_FragCoord.xy-uClick.xy)-age*H*2.6)/(H*.08),2.0))*(1.0-smoothstep(.0,.8,age));wuv+=normalize(offset+vec2(.00001))*shock*.16;
 float q=fbm(wuv+.05*uTime),r=fbm(wuv+4.0*q),f=fbm(wuv+4.0*r+.08*uTime);
 vec2 grad=vec2(dFdx(f),dFdy(f));vec3 n=normalize(vec3(-grad*42.0,1.0)),light=normalize(vec3(mouse-uv,1.5)),halfV=normalize(light+vec3(0,0,1));float spec=pow(max(dot(n,halfV),0.0),48.0);
 float rim=pow(1.0-smoothstep(0.0,H*.24,edge),1.7),baseWeight=.55+.45*(1.0-smoothstep(-.3,.2,uv.y)),angle=atan(p.y,p.x);
 vec3 spectrum=ramp(f*1.8+angle*.08+uTime*.035);spectrum=mix(spectrum,vec3(.2,.95,.68),uSuccess*.85);
 vec3 bodySpectrum=ramp(fbm(uv*.85+vec2(uTime*.025,-uTime*.015))*1.1+uTime*.015);
 vec3 body=vec3(.10,.13,.14)+bodySpectrum*.055;
 vec3 col=body+spectrum*rim*(.28+f*.85)*baseWeight+spec*(.035+rim*.25);
 float bevel=1.0-smoothstep(.0,1.1*uDpr,abs(edge-.75*uDpr));col+=mix(ramp(angle/6.283+uTime*.04)*.55,vec3(.75),smoothstep(.0,.5,uv.y))*bevel*.6;
 col+=vec3(.6,1,.8)*shock*(rim*.5+.08);
 col=1.0-exp(-col*1.6);col+=(hash21(gl_FragCoord.xy)-.5)/255.0;outColor=vec4(col,cover);}`;
const styles = `.lumen-button{box-sizing:border-box;position:relative;isolation:isolate;display:inline-flex;align-items:center;justify-content:center;min-width:230px;height:56px;border:0;border-radius:999px;padding:0 30px;background:linear-gradient(120deg,#31494c,#484252 55%,#3c5150);box-shadow:0 6px 20px #0005,inset 0 1px #ffffff33;overflow:hidden;color:#f8f9ff;transform:translate(var(--lb-tx,0px),var(--lb-ty,0px)) scale(var(--lb-scale,1));cursor:pointer;font-family:'Urbanist Variable',Urbanist,Arial,sans-serif;font-size:15px;font-weight:550;letter-spacing:-.015em}.lumen-button canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:-1}.lumen-button[data-gl=off]{background:radial-gradient(ellipse at bottom left,#247c7455,transparent 55%),radial-gradient(ellipse at bottom right,#b65ad655,transparent 55%),#34434a;border:1px solid #a6accc55}.lb-content{display:grid;position:relative;min-width:150px;height:100%;pointer-events:none}.lb-content>span{grid-area:1/1;display:flex;gap:12px;align-items:center;justify-content:center;opacity:0;transform:translateY(14px);filter:blur(4px);transition:opacity .3s,transform .4s,filter .3s}.lumen-button[data-status=idle] [data-state=idle],.lumen-button[data-status=success] [data-state=success]{opacity:1;transform:translateY(0);filter:none}.lb-arrow{font-size:19px;transition:transform .3s}.lumen-button:hover .lb-arrow{transform:translateX(3.5px)}.lb-content svg path{stroke-dasharray:1;stroke-dashoffset:1;transition:stroke-dashoffset .5s .1s}.lumen-button[data-status=success] svg path{stroke-dashoffset:0}.lumen-button:disabled{cursor:default}.lumen-button:disabled{opacity:.4;filter:saturate(.3)}.lumen-button:focus-visible{outline:2px solid #d1c6ff;outline-offset:5px}.lb-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}.lumen-button[data-paused] *{animation:none!important;transition:none!important}@media(prefers-reduced-motion:reduce){.lumen-button{transform:none!important}.lumen-button *{transition:none!important;animation:none!important}}`;
const showcaseStyles = `.lumen-showcase{box-sizing:border-box;position:relative;display:grid;place-items:center;width:100%;height:100%;min-height:300px;padding:30px 20px;background-color:#0d0e11;background-image:radial-gradient(#ffffff16 .8px,transparent .8px);background-size:24px 24px;color:#ddd}.lb-main{display:grid;place-items:center;max-width:100%}.lumen-showcase[data-compact]{padding:0}.lumen-button{max-width:100%}@media(max-width:500px){.lumen-button{min-width:220px}}`;
