"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createNativeGL, nativeClamp, nativeColor } from "./native-gl";
import { effectRuntime } from "./effect-runtime";
import { kineticNoiseGLSL } from "./kinetic-noise";
export type TopoContourProps = {
  contourDensity?: number;
  lineWidth?: number;
  scale?: number;
  warpStrength?: number;
  speed?: number;
  interactionRadius?: number;
  backgroundColor?: string;
  minorColor?: string;
  majorColor?: string;
  accentColor?: string;
  title?: string;
  children?: ReactNode;
  paused?: boolean;
  compact?: boolean;
  className?: string;
};
export const topoShader = `uniform vec2 uResolution,uPointer,uOrigin;uniform float uTime,uSpeed,uDensity,uLine,uScale,uWarp,uRadius,uStrength,uWave,uAge;uniform vec3 uBackground,uMinor,uMajor,uAccent;
${kineticNoiseGLSL}
float fbm(vec3 p){return .57*kSimplex(p)+.28*kSimplex(p*2.03)+.15*kSimplex(p*4.11);}
float contour(float v,float width){float d=abs(fract(v-.5)-.5)/max(fwidth(v),.0001);return 1.-smoothstep(max(0.,width-.5),width+.65,d);}
void main(){vec2 uv=vUv-.5;uv.x*=uResolution.x/uResolution.y;vec2 p=uv*uScale;float t=uTime*uSpeed*.12;vec2 q=vec2(fbm(vec3(p,t)),fbm(vec3(p+vec2(5.2,1.3),t*1.1)));float e=fbm(vec3(p+q*uWarp,t*.8));float d=length(uv-uPointer);e+=uStrength*.28*exp(-d*d/(2.*uRadius*uRadius));float waveDist=length(uv-uOrigin);e+=sin(waveDist*28.-uAge*8.)*exp(-waveDist*3.)*uWave*.1;float minor=contour(e*uDensity,uLine*.65),major=contour(e*uDensity/5.,uLine*1.15);vec3 col=uBackground+vec3(.008)*smoothstep(-.3,.6,e);col=mix(col,uMinor,minor*.35);col=mix(col,mix(uMajor,uAccent,smoothstep(.1,.6,e)*.4+uStrength*exp(-d*5.)*.5),major*.48);float vignette=1.-smoothstep(.2,1.1,length(vUv-.5));fragColor=vec4(mix(uBackground,col,vignette),1.);}`;
export default function TopoContour(props: TopoContourProps) {
  const host = useRef<HTMLDivElement>(null),
    canvas = useRef<HTMLCanvasElement>(null),
    config = useRef(props),
    invalidate = useRef(() => {}),
    wave = useRef(() => {}),
    [failed, setFailed] = useState(false);
  config.current = props;
  useEffect(() => {
    const root = host.current!,
      el = canvas.current!;
    let gpu: ReturnType<typeof createNativeGL> | undefined,
      runtime: ReturnType<typeof effectRuntime> | undefined;
    let x = 0,
      y = 0,
      px = 0,
      py = 0,
      strength = 0,
      inside = false,
      amp = 0,
      age = 0,
      ox = 0,
      oy = 0;
    const cleanup = () => {
      runtime?.dispose();
      gpu?.dispose();
    };
    try {
      gpu = createNativeGL(el);
      const pass = gpu.pass(topoShader);
      runtime = effectRuntime(
        root,
        el,
        (time, dt) => {
          const p = config.current,
            a = 1 - Math.exp(-dt * 8);
          px += (x - px) * a;
          py += (y - py) * a;
          strength += ((inside ? 1 : 0) - strength) * a;
          amp *= Math.exp(-dt * 3);
          age += dt;
          gpu!.draw(pass, null, {
            uResolution: [el.width, el.height],
            uPointer: [px, py],
            uOrigin: [ox, oy],
            uTime: time,
            uSpeed: nativeClamp(p.speed ?? 1, 0, 3),
            uDensity: nativeClamp(p.contourDensity ?? 24, 4, 60),
            uLine: nativeClamp(p.lineWidth ?? 0.55, 0.4, 3),
            uScale: nativeClamp(p.scale ?? 1.65, 0.5, 4),
            uWarp: nativeClamp(p.warpStrength ?? 0.65, 0, 2),
            uRadius: nativeClamp(p.interactionRadius ?? 0.28, 0.08, 0.7),
            uStrength: strength,
            uWave: amp,
            uAge: age,
            uBackground: nativeColor(p.backgroundColor ?? "#05060a", "#05060a"),
            uMinor: nativeColor(p.minorColor ?? "#52525b", "#52525b"),
            uMajor: nativeColor(p.majorColor ?? "#e4e4e7", "#e4e4e7"),
            uAccent: nativeColor(p.accentColor ?? "#ededed", "#ededed"),
          });
        },
        () => !!config.current.paused,
        undefined,
        !!props.compact,
      );
      invalidate.current = runtime.invalidate;
      const move = (e: PointerEvent) => {
        const r = root.getBoundingClientRect();
        x = (((e.clientX - r.left) / r.width - 0.5) * r.width) / r.height;
        y = 0.5 - (e.clientY - r.top) / r.height;
        inside = true;
        runtime?.invalidate();
      };
      const leave = () => {
        inside = false;
      };
      const click = () => {
        amp = 1;
        age = 0;
        ox = x;
        oy = y;
        runtime?.invalidate();
      };
      wave.current = click;
      const lost = (e: Event) => {
        e.preventDefault();
        setFailed(true);
        runtime?.dispose();
      };
      el.addEventListener("webglcontextlost", lost);
      root.addEventListener("pointermove", move);
      root.addEventListener("pointerleave", leave);
      root.addEventListener("pointerdown", click);
      return () => {
        root.removeEventListener("pointermove", move);
        root.removeEventListener("pointerleave", leave);
        root.removeEventListener("pointerdown", click);
        el.removeEventListener("webglcontextlost", lost);
        wave.current = () => {};
        invalidate.current = () => {};
        cleanup();
      };
    } catch {
      setFailed(true);
      cleanup();
    }
  }, []);
  useEffect(() => {
    invalidate.current();
  }, [props]);
  return (
    <div
      ref={host}
      className={`topo-contour ${props.className ?? ""}`}
      data-failed={failed || undefined}
      style={{
        position: "relative",
        height: "100%",
        width: "100%",
        minHeight: 280,
        overflow: "hidden",
        background: props.backgroundColor ?? "#05060a",
        color: "#f5f5f7",
        fontFamily: "Urbanist,system-ui,sans-serif",
      }}
    >
      <canvas
        ref={canvas}
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          visibility: failed ? "hidden" : "visible",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "grid",
          placeContent: "center",
          textAlign: "center",
          padding: 26,
          pointerEvents: "none",
        }}
      >
        {props.children ?? (
          <>
            <h2
              style={{
                fontSize: props.compact ? 26 : "clamp(28px,4vw,48px)",
                lineHeight: 1.1,
                letterSpacing: "-.055em",
                fontWeight: 600,
                margin: "0 0 16px",
              }}
            >
              {props.title ?? "A sense of place."}
            </h2>
            <p style={{ color: "#9e9ea6", fontSize: 12, margin: 0 }}>
              Move to shape the terrain.
            </p>
          </>
        )}
      </div>
      <button
        type="button"
        aria-label="Send a terrain ripple"
        onClick={() => wave.current()}
        style={{
          position: "absolute",
          bottom: 18,
          right: 18,
          width: 44,
          height: 44,
          borderRadius: 99,
          border: "1px solid #ffffff25",
          background: "#ffffff08",
          color: "#ddd",
          cursor: "pointer",
        }}
      >
        ↗
      </button>
    </div>
  );
}
