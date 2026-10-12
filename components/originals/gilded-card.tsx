'use client';

import { useEffect, useRef, useState } from 'react';
import type { GildedScene } from './gilded-scene';

export type GildedCardProps = {
  compact?: boolean;
  paused?: boolean;
  backgroundSrc?: string;
  emblemSrc?: string;
  className?: string;
};

export default function GildedCard({ compact = false, paused = false, backgroundSrc = '/media/atmosphere.webp', emblemSrc = '/branding/Isotype.svg', className = '' }: GildedCardProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const engine = useRef<GildedScene | null>(null);
  const pausedRef = useRef(paused);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [localPause, setLocalPause] = useState(false);
  const still = paused || localPause;
  pausedRef.current = still;

  useEffect(() => {
    let cancelled = false;
    setReady(false); setFailed(false);
    import('./gilded-scene').then(({ createGildedScene }) => {
      if (cancelled || !canvas.current) return;
      try {
        engine.current = createGildedScene(canvas.current, { compact, backgroundSrc, emblemSrc,
          onReady: () => { if (!cancelled) setReady(true); }, onLost: () => { if (!cancelled) setFailed(true); },
        });
        engine.current.setPaused(pausedRef.current);
      } catch { if (!cancelled) setFailed(true); }
    }).catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; engine.current?.dispose(); engine.current = null; };
  }, [compact, backgroundSrc, emblemSrc]);

  useEffect(() => { engine.current?.setPaused(still); }, [still]);

  return <section className={`gilded-card ${compact ? 'gc-compact' : ''} ${failed ? 'gc-failed' : ''} ${className}`} aria-label="Gilded Signal, an interactive Motiqo artifact">
    <style>{styles}</style>
    <canvas ref={canvas} className={`gc-canvas ${ready ? 'gc-ready' : ''}`} aria-hidden="true" />
    <div className="gc-fallback" aria-hidden="true"><div><span>MOTIQO</span><img src={emblemSrc} alt=""/><span>MADE TO MOVE</span></div></div>
    {!compact && <>
      <header className="gc-header"><span className="gc-brand"><img src="/branding/Isotype.svg" alt=""/>Motiqo</span><span className="gc-edition">MOTION STUDY / 006</span></header>
      <div className="gc-bottom">
        <span className="gc-kicker">A LITTLE MOTION. A LOT OF CHARACTER.</span>
        <h3>Small details. Strong impressions.</h3>
        <p>{failed ? 'A still edition. WebGL is unavailable in this browser.' : 'Light, texture and a little curiosity.'}</p>
        <div className="gc-controls">
          <button type="button" className="gc-turn" onClick={() => engine.current?.flip()} disabled={!ready || failed || still}>Turn the card <span aria-hidden="true">↻</span></button>
          <button type="button" className="gc-pause" aria-pressed={still} disabled={paused || failed || !ready} onClick={() => setLocalPause(value => !value)}>{still ? 'Resume motion' : 'Pause motion'}</button>
        </div>
      </div>
      <footer className="gc-footer"><span>GILDED SIGNAL</span><span className="gc-gesture">DRAG TO ROTATE · DOUBLE-CLICK TO TURN</span><span>INDEPENDENT BY DESIGN</span></footer>
    </>}
    <span className="gc-accessible">A dark engraved card with gold and iridescent details. The Motiqo emblem floats inside an arched window, with smoke, fine threads and dust behind it. Use Turn the card to see the reverse.</span>
  </section>;
}

const styles = `
.gilded-card{position:relative;isolation:isolate;width:100%;height:760px;min-height:600px;overflow:hidden;color:#eee9df;background:#07090b;font-family:'Urbanist Variable',Arial,sans-serif;container-type:inline-size}
.gilded-card *{box-sizing:border-box}.gc-canvas{position:absolute;inset:0;width:100%;height:100%;display:block;opacity:0;touch-action:pan-y;transition:opacity 1.3s cubic-bezier(.16,.82,.19,1)}.gc-canvas.gc-ready{opacity:1}.gc-failed .gc-canvas{display:none}
.gc-header,.gc-footer{position:absolute;z-index:2;left:28px;right:28px;display:flex;justify-content:space-between;gap:16px;align-items:center;pointer-events:none}.gc-header{top:23px}.gc-brand{display:flex;align-items:center;gap:9px;font-size:16px;font-weight:600}.gc-brand img{width:22px;height:22px}.gc-edition,.gc-footer,.gc-kicker{font:9px/1.6 'IBM Plex Mono',monospace;letter-spacing:2px;color:#bcb09b}.gc-edition{opacity:.7}.gc-footer{bottom:19px;color:#a89c89;letter-spacing:1.5px;font-size:8px}.gc-gesture{color:#c4b698}
.gc-bottom{position:absolute;z-index:2;bottom:65px;left:20px;right:20px;text-align:center;pointer-events:none}.gc-kicker{font-size:8px;letter-spacing:2.2px;color:#ceae7d}.gc-bottom h3{font-size:24px;font-weight:500;letter-spacing:-.65px;line-height:1.3;margin:12px 0 8px;text-wrap:balance;text-shadow:0 2px 16px #000}.gc-bottom p{font-size:13px;color:#b0aba1;margin:0 0 18px}.gc-controls{pointer-events:auto;display:flex;align-items:center;justify-content:center;gap:12px}.gc-controls button{font:12px 'Urbanist Variable',Arial,sans-serif;min-height:44px;padding:12px 23px;border-radius:40px;cursor:pointer;transition:color .4s cubic-bezier(.2,.8,.17,1),border-color .5s cubic-bezier(.2,.8,.17,1),box-shadow .5s cubic-bezier(.2,.8,.17,1)}.gc-turn{display:flex;align-items:center;gap:25px;color:#eee2c6;border:1px solid #b69b6477;background:radial-gradient(ellipse at var(--gc-px,40%) 0%,#c1a36b24,transparent 72%),#0b0e10bd;box-shadow:inset 0 1px 1px #e3c89a33,0 5px 14px #0009}.gc-turn:hover:not(:disabled){border-color:#e1c292;box-shadow:inset 0 1px 1px #e3c89a88,0 0 22px #df9e5127}.gc-turn>span{font-size:18px}.gc-pause{color:#b8afa1;border:1px solid #93806935;background:#0c101173}.gc-pause:hover:not(:disabled){color:#eee2c6;border-color:#c2a77588}.gc-controls button:disabled{opacity:.45;cursor:default}.gc-controls button:focus-visible{outline:2px solid #ecc991;outline-offset:5px}
.gc-fallback{position:absolute;inset:0;display:grid;place-items:center;pointer-events:none;background:radial-gradient(ellipse at center,#62473222,transparent 65%);z-index:-1}.gc-fallback>div{width:230px;height:322px;display:flex;flex-direction:column;justify-content:space-between;align-items:center;border:1px solid #c7a76b88;outline:1px solid #c7a76b44;outline-offset:-8px;background:#101418;padding:28px;color:#d7b97c;font:13px Georgia,serif;letter-spacing:3px}.gc-fallback img{width:110px;height:110px}.gc-ready~.gc-fallback{visibility:hidden}.gc-failed .gc-fallback{visibility:visible;z-index:0}.gc-accessible{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}
.gc-compact{height:100%;min-height:0}.gc-compact .gc-fallback>div{width:130px;height:182px;padding:15px;font-size:9px}.gc-compact .gc-fallback img{width:70px;height:70px}
@container(max-width:600px){.gc-header{top:20px;left:20px;right:20px}.gc-edition{font-size:7px;letter-spacing:1px}.gc-bottom{bottom:51px}.gc-bottom h3{font-size:20px}.gc-bottom p{font-size:12px}.gc-kicker{font-size:7px;letter-spacing:1.5px}.gc-footer{left:20px;right:20px;font-size:7px}.gc-gesture{display:none}.gc-controls button{padding:11px 18px}.gilded-card:not(.gc-compact){height:690px;min-height:600px}}
@media(prefers-reduced-motion:reduce){.gilded-card *{transition:none!important}}
`;
