"use client";
import { useGenerativeScene } from "./generative-scene";
import {
  createOpalineScene,
  opalineColors,
  type OpalinePalette,
} from "./opaline-scene";
export type OpalineOrbProps = {
  layerCount?: number;
  ringDensity?: number;
  morphSpeed?: number;
  morphIntensity?: number;
  colorPalette?: Partial<OpalinePalette>;
  interactive?: boolean;
  listening?: boolean;
  paused?: boolean;
  compact?: boolean;
  className?: string;
};
export default function OpalineOrb({
  layerCount = 4,
  ringDensity = 38,
  morphSpeed = 1,
  morphIntensity = 1,
  colorPalette,
  interactive = true,
  listening = false,
  paused = false,
  compact = false,
  className = "",
}: OpalineOrbProps) {
  const { host, canvas, failed } = useGenerativeScene(
    createOpalineScene,
    {
      layerCount,
      ringDensity,
      morphSpeed,
      morphIntensity,
      colorPalette: { ...opalineColors, ...colorPalette },
      interactive,
      listening,
      paused,
    },
    compact,
  );
  return (
    <div
      ref={host}
      className={`mq-opaline ${className}`}
      role="img"
      aria-label={`Iridescent topographic orb${listening ? ", listening" : ""}`}
    >
      <style>{styles}</style>
      <canvas ref={canvas} aria-hidden="true" />
      {failed && <div className="mq-opaline-fallback" />}
    </div>
  );
}
const styles = `.mq-opaline{position:relative;width:100%;height:100%;min-height:220px;background:radial-gradient(ellipse at 48% 43%,#101322 0%,#060710 65%,#020308 100%);overflow:hidden}.mq-opaline>canvas{position:absolute;inset:0;width:100%;height:100%;display:block}.mq-opaline-fallback{position:absolute;inset:22%;border-radius:46% 54% 43% 57%;background:radial-gradient(circle at 30% 60%,#8ab8f8,transparent 65%),radial-gradient(circle at 70% 25%,#ffbe98,transparent 65%);box-shadow:0 0 0 12px #ffffff65,0 0 0 24px #ffffff35,0 0 25px #c4b5fd;filter:blur(1px)}`;
