'use client';

// FoldText, adapted from the React Bits source supplied for the Motiqo hero.
// Copyright (c) 2026 David Haz. See ReactBits-LICENSE.md in this directory.
import { useLayoutEffect, useMemo, useRef, type CSSProperties } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './fold-text.css';

gsap.registerPlugin(ScrollTrigger);
const hinges = {
  top: { origin: '50% 0%', rotateX: -92, rotateY: 0 },
  bottom: { origin: '50% 100%', rotateX: 92, rotateY: 0 },
  left: { origin: '0% 50%', rotateX: 0, rotateY: 92 },
  right: { origin: '100% 50%', rotateX: 0, rotateY: -92 },
};
type Props = {
  text: string; splitBy?: 'char' | 'word' | 'line'; hinge?: keyof typeof hinges;
  duration?: number; stagger?: number; ease?: string; perspective?: number; creaseShading?: number;
  trigger?: 'mount' | 'hover' | 'scroll' | 'loop'; fontSize?: string | number;
  fontWeight?: string | number; color?: string; className?: string; style?: CSSProperties; paused?: boolean;
};

export default function FoldText({ text, splitBy = 'char', hinge = 'top', duration = .65, stagger = .045,
  ease = 'expo.out', perspective = 700, creaseShading = .55, trigger = 'mount',
  fontSize = 'inherit', fontWeight = 'inherit', color = 'inherit', className = '', style, paused = false }: Props) {
  const root = useRef<HTMLSpanElement>(null);
  const config = hinges[hinge];
  const segments = useMemo(() => {
    const segment = (content: string, key: string) => <span className="fold-text-segment" key={key}>
      <span className="fold-text-piece" data-fold-hinge={hinge} style={{ transformOrigin: config.origin }}>{content}</span>
    </span>;
    return text.split('\n').map((line, lineIndex) => <span className="fold-text-line" key={lineIndex}>
      {splitBy === 'line' ? segment(line || '\u00a0', String(lineIndex)) : line.split(/(\s+)/).map((word, wordIndex) => /^\s+$/.test(word)
        ? <span key={wordIndex} className="fold-text-whitespace">{word}</span>
        : <span className="fold-text-word" key={wordIndex}>{splitBy === 'word' ? segment(word, `${lineIndex}-${wordIndex}`)
          : Array.from(word).map((char, charIndex) => segment(char, `${lineIndex}-${wordIndex}-${charIndex}`))}</span>)}
    </span>);
  }, [text, splitBy, hinge, config.origin]);

  useLayoutEffect(() => {
    const element = root.current;
    if (!element) return;
    const media = gsap.matchMedia();
    media.add({ reduced: '(prefers-reduced-motion: reduce)', animate: '(prefers-reduced-motion: no-preference)' }, context => {
      const pieces = element.querySelectorAll<HTMLElement>('.fold-text-piece');
      if (paused || context.conditions?.reduced) {
        gsap.set(pieces, { opacity: 1, rotateX: 0, rotateY: 0, '--fold-crease': 0 });
        return;
      }
      const folded = { opacity: 0, rotateX: config.rotateX, rotateY: config.rotateY,
        '--fold-crease': Math.max(0, Math.min(1, creaseShading)), transformOrigin: config.origin };
      let timeline: gsap.core.Timeline | undefined;
      let scroll: ScrollTrigger | undefined;
      let frame = 0, disposed = false;
      const play = () => {
        timeline?.kill();
        timeline = gsap.timeline({ repeat: trigger === 'loop' ? -1 : 0, repeatDelay: .75 }).fromTo(pieces, folded, {
          opacity: 1, rotateX: 0, rotateY: 0, '--fold-crease': 0, duration, stagger, ease,
        });
      };
      const onHover = () => play();
      if (trigger === 'hover') element.addEventListener('mouseenter', onHover);
      else if (trigger === 'scroll') {
        gsap.set(pieces, folded);
        scroll = ScrollTrigger.create({ trigger: element, start: 'top 82%', once: true, onEnter: play });
      } else {
        gsap.set(pieces, folded);
        // Fonts settle before the reveal; never prolong the real page loader.
        document.fonts.ready.then(() => { if (!disposed) frame = requestAnimationFrame(play); });
      }
      return () => {
        disposed = true; cancelAnimationFrame(frame);
        element.removeEventListener('mouseenter', onHover); scroll?.kill(); timeline?.kill(); gsap.killTweensOf(pieces);
      };
    }, element);
    return () => media.revert();
  }, [text, splitBy, hinge, duration, stagger, ease, perspective, creaseShading, trigger, config, paused]);

  return <span ref={root} className={`fold-text ${className}`} style={{
    '--fold-perspective': `${Math.max(120, perspective)}px`, fontSize, fontWeight, color, ...style,
  } as CSSProperties}>
    <span className="sr-only">{text}</span><span aria-hidden="true" className="fold-text-visual">{segments}</span>
  </span>;
}
