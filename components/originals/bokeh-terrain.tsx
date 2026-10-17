"use client";
import type { ReactNode } from "react";
import { useGenerativeScene } from "./generative-scene";
import { createBokehScene, type BokehOptions } from "./bokeh-scene";
export type BokehTerrainProps = Partial<BokehOptions> & {
  children?: ReactNode;
  showTitle?: boolean;
  compact?: boolean;
  className?: string;
};
export default function BokehTerrain({
  lineCount = 70,
  pointsPerLine = 220,
  waveSpeed = 1,
  waveHeight = 1.5,
  primaryColor = "#2563eb",
  secondaryColor = "#7c3aed",
  accentColor = "#fef9c3",
  showStars = true,
  interactive = true,
  paused = false,
  showTitle = false,
  children,
  compact = false,
  className = "",
}: BokehTerrainProps) {
  const { host, canvas, failed } = useGenerativeScene(
    createBokehScene,
    {
      lineCount,
      pointsPerLine,
      waveSpeed,
      waveHeight,
      primaryColor,
      secondaryColor,
      accentColor,
      showStars,
      interactive,
      paused,
    },
    compact,
  );
  return (
    <div ref={host} className={`mq-bokeh ${className}`}>
      <style>{styles}</style>
      <canvas ref={canvas} aria-hidden="true" />
      {failed && (
        <div
          className="mq-bokeh-fallback"
          role="img"
          aria-label="A luminous particle ocean"
        />
      )}
      {(children || showTitle) && (
        <div className="mq-bokeh-title">
          {children ?? (
            <>
              <h2>
                Craft your
                <br />
                stellar agents.
              </h2>
              <p>Ideas in orbit. Possibilities in motion.</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
const styles = `.mq-bokeh{position:relative;width:100%;height:100%;min-height:220px;background:#020205;overflow:hidden;container-type:size}.mq-bokeh>canvas{position:absolute;inset:0;width:100%;height:100%;display:block}.mq-bokeh-title{position:absolute;left:12%;right:12%;top:22%;text-align:center;color:#f8f6ff;pointer-events:none}.mq-bokeh-title h2{font-weight:350;font-size:clamp(22px,6cqmin,54px);line-height:1.1;letter-spacing:-.035em;margin:0}.mq-bokeh-title p{font-size:clamp(9px,1.9cqmin,13px);line-height:1.8;color:#b8b5c8;margin:20px 0 0}.mq-bokeh-fallback{position:absolute;inset:45% -15% 0;transform:perspective(350px) rotateX(58deg);background:radial-gradient(circle,#b5b2ff 1px,transparent 2px) 0 0/7px 13px;opacity:.5;mask-image:radial-gradient(ellipse,#000,transparent 70%)}`;
