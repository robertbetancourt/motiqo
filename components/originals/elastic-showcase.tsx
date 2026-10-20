'use client';

import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from 'react';
import { bounded, createElasticEngine, safeImage } from './elastic-showcase-engine';

export type ElasticShowcaseItem = {
  image: string;
  title: string;
  roles: string[];
  alt?: string;
};

export const elasticShowcaseItems: ElasticShowcaseItem[] = [
  {
    image: '/media/elastic/image-18.webp',
    title: 'A world\nbeyond.',
    roles: ['Interactive experience', 'Visual identity'],
    alt: 'Figure in deep blue and gold with decorative fan',
  },
  {
    image: '/media/elastic/image-17.webp',
    title: 'After\nthe light.',
    roles: ['Creative direction', 'Digital experience', 'Visual production'],
    alt: 'Vibrant cosmic nebula with glowing planetary terrain',
  },
  {
    image: '/media/elastic/image-16.webp',
    title: 'The quiet\ngarden.',
    roles: ['Art direction', 'Visual storytelling', 'Digital craft'],
    alt: 'Sailboat gliding through golden celestial waves under constellations',
  },
  {
    image: '/media/elastic/image-15.webp',
    title: 'Another\nkind of glow.',
    roles: ['Editorial direction', 'Photography', 'Art direction'],
    alt: 'Editorial portrait with iridescent glowing butterfly accents',
  },
  {
    image: '/media/elastic/image-14.webp',
    title: 'Forms\nof silence.',
    roles: ['Spatial design', 'Art direction', 'Visual identity'],
    alt: 'Robin perched gracefully among frosted foliage',
  },
];

export type ElasticShowcaseProps = {
  items?: ElasticShowcaseItem[];
  autoPlay?: boolean;
  interval?: number;
  transitionDuration?: number;
  backgroundColor?: string;
  textColor?: string;
  className?: string;
  paused?: boolean;
  compact?: boolean;
};

type Scene = { current: number; next: number; moving: boolean };
const color = (value: string, fallback: string) => (/^#[\da-f]{6}$/i.test(value) ? value : fallback);

export default function ElasticShowcase({
  items = elasticShowcaseItems,
  autoPlay = true,
  interval = 4000,
  transitionDuration = 1250,
  backgroundColor = '#05060a',
  textColor = '#fdfce6',
  className = '',
  paused = false,
  compact = false,
}: ElasticShowcaseProps) {
  const slides = useMemo(
    () =>
      (Array.isArray(items) ? items : [])
        .filter((item) => item && typeof item.title === 'string')
        .slice(0, 30)
        .map((item) => ({
          image: safeImage(item.image),
          title: item.title.slice(0, 160),
          alt: typeof item.alt === 'string' ? item.alt.slice(0, 300) : item.title,
          roles: Array.isArray(item.roles)
            ? item.roles.filter((role) => typeof role === 'string').slice(0, 3).map((role) => role.slice(0, 100))
            : [],
        })),
    [items],
  );

  const root = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLDivElement>(null);

  // SVG filter element references
  const titleDisp = useRef<SVGFEDisplacementMapElement>(null);
  const titleBlur = useRef<SVGFEGaussianBlurElement>(null);
  const rolesBlur = useRef<SVGFEGaussianBlurElement>(null);

  // Typography layer references
  const outgoingTitle = useRef<HTMLDivElement>(null);
  const incomingTitle = useRef<HTMLDivElement>(null);
  const outgoingRoles = useRef<HTMLDivElement>(null);
  const incomingRoles = useRef<HTMLDivElement>(null);

  const engine = useRef<ReturnType<typeof createElasticEngine> | null>(null);
  const [scene, setScene] = useState<Scene>({ current: 0, next: 0, moving: false });
  const sceneRef = useRef(scene);
  sceneRef.current = scene;

  const [gpu, setGpu] = useState(false);
  const [reduced, setReduced] = useState(true);
  const [visible, setVisible] = useState(true);
  const [hidden, setHidden] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [loadedImage, setLoadedImage] = useState('');

  const uid = 'elastic-' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const titleFilterId = uid + '-title';
  const rolesFilterId = uid + '-roles';

  const options = useRef({ duration: transitionDuration, suspended: paused || !visible || hidden, reduced });
  options.current = {
    duration: bounded(transitionDuration, 1250, 200, 5000),
    suspended: paused || !visible || hidden,
    reduced,
  };
  const wheelAt = useRef(-Infinity);

  const current = slides[scene.current] ?? slides[0];
  const next = slides[scene.next] ?? current;

  function progress(p: number) {
    const impulse = Math.sin(p * Math.PI);
    const blurIntensity = impulse;

    // 1. Dynamic SVG filter morphing
    if (titleDisp.current) {
      titleDisp.current.setAttribute('scale', (blurIntensity * 28).toFixed(2));
    }
    if (titleBlur.current) {
      titleBlur.current.setAttribute(
        'stdDeviation',
        `${(blurIntensity * 26).toFixed(2)} ${(blurIntensity * 1.8).toFixed(2)}`,
      );
    }
    if (rolesBlur.current) {
      rolesBlur.current.setAttribute(
        'stdDeviation',
        `${(blurIntensity * 12).toFixed(2)} ${(blurIntensity * 1.0).toFixed(2)}`,
      );
    }

    // 2. Left editorial title transition: strict disjoint windows prevent double exposure
    if (outgoingTitle.current) {
      const outAlpha = p < 0.48 ? Math.max(0, 1 - p * 2.1) : 0;
      outgoingTitle.current.style.opacity = outAlpha.toFixed(3);
      outgoingTitle.current.style.transform = `translateX(${(-22 * p).toFixed(2)}px)`;
      outgoingTitle.current.style.visibility = outAlpha > 0 ? 'visible' : 'hidden';
    }
    if (incomingTitle.current) {
      const inAlpha = p > 0.52 ? Math.min(1, (p - 0.52) * 2.1) : 0;
      incomingTitle.current.style.opacity = inAlpha.toFixed(3);
      incomingTitle.current.style.transform = `translateX(${(22 * (1 - p)).toFixed(2)}px)`;
      incomingTitle.current.style.visibility = inAlpha > 0 ? 'visible' : 'hidden';
    }

    // 3. Right roles metadata transition
    if (outgoingRoles.current) {
      const outAlpha = p < 0.48 ? Math.max(0, 1 - p * 2.1) : 0;
      outgoingRoles.current.style.opacity = outAlpha.toFixed(3);
      outgoingRoles.current.style.transform = `translateX(${(-14 * p).toFixed(2)}px)`;
      outgoingRoles.current.style.visibility = outAlpha > 0 ? 'visible' : 'hidden';
    }
    if (incomingRoles.current) {
      const inAlpha = p > 0.52 ? Math.min(1, (p - 0.52) * 2.1) : 0;
      incomingRoles.current.style.opacity = inAlpha.toFixed(3);
      incomingRoles.current.style.transform = `translateX(${(14 * (1 - p)).toFixed(2)}px)`;
      incomingRoles.current.style.visibility = inAlpha > 0 ? 'visible' : 'hidden';
    }
  }

  // Ensure stable state on mount and when transition settles
  useEffect(() => {
    if (!scene.moving) {
      if (outgoingTitle.current) {
        outgoingTitle.current.style.opacity = '1';
        outgoingTitle.current.style.visibility = 'visible';
        outgoingTitle.current.style.transform = 'translateX(0px)';
      }
      if (incomingTitle.current) {
        incomingTitle.current.style.opacity = '0';
        incomingTitle.current.style.visibility = 'hidden';
        incomingTitle.current.style.transform = 'translateX(22px)';
      }
      if (outgoingRoles.current) {
        outgoingRoles.current.style.opacity = '1';
        outgoingRoles.current.style.visibility = 'visible';
        outgoingRoles.current.style.transform = 'translateX(0px)';
      }
      if (incomingRoles.current) {
        incomingRoles.current.style.opacity = '0';
        incomingRoles.current.style.visibility = 'hidden';
        incomingRoles.current.style.transform = 'translateX(14px)';
      }
      titleDisp.current?.setAttribute('scale', '0');
      titleBlur.current?.setAttribute('stdDeviation', '0 0');
      rolesBlur.current?.setAttribute('stdDeviation', '0 0');
    }
  }, [scene.moving, scene.current]);

  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const motion = () => setReduced(media.matches);
    const visibility = () => setHidden(document.hidden);
    motion();
    visibility();
    media.addEventListener('change', motion);
    document.addEventListener('visibilitychange', visibility);
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    if (root.current) observer.observe(root.current);
    return () => {
      observer.disconnect();
      media.removeEventListener('change', motion);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, []);

  useEffect(() => {
    let alive = true;
    setScene({ current: 0, next: 0, moving: false });
    setGpu(false);
    setImageFailed(false);
    progress(0);
    if (!canvas.current || !slides.length) return;
    try {
      engine.current = createElasticEngine(canvas.current, slides.map((slide) => slide.image), () => options.current, {
        start: (from, to) => {
          if (alive) {
            setScene({ current: from, next: to, moving: true });
            if (outgoingTitle.current) {
              outgoingTitle.current.style.opacity = '1';
              outgoingTitle.current.style.visibility = 'visible';
              outgoingTitle.current.style.transform = 'translateX(0px)';
            }
            if (incomingTitle.current) {
              incomingTitle.current.style.opacity = '0';
              incomingTitle.current.style.visibility = 'hidden';
              incomingTitle.current.style.transform = 'translateX(22px)';
            }
            if (outgoingRoles.current) {
              outgoingRoles.current.style.opacity = '1';
              outgoingRoles.current.style.visibility = 'visible';
              outgoingRoles.current.style.transform = 'translateX(0px)';
            }
            if (incomingRoles.current) {
              incomingRoles.current.style.opacity = '0';
              incomingRoles.current.style.visibility = 'hidden';
              incomingRoles.current.style.transform = 'translateX(14px)';
            }
          }
        },
        progress: (p) => {
          if (alive) progress(p);
        },
        end: (to) => {
          if (alive) {
            setScene({ current: to, next: to, moving: false });
            setImageFailed(false);
          }
        },
        gpu: (value) => {
          if (alive) {
            setGpu(value);
            if (root.current) root.current.dataset.ready = 'true';
          }
        },
      });
    } catch {
      if (root.current) root.current.dataset.ready = 'true';
    }
    return () => {
      alive = false;
      engine.current?.dispose();
      engine.current = null;
    };
  }, [slides]);

  useEffect(() => {
    engine.current?.sync();
  }, [paused, reduced, visible, hidden, transitionDuration]);

  function go(index: number) {
    if (slides.length < 2 || sceneRef.current.moving) return;
    if (engine.current) engine.current.go(index);
    else {
      const target = ((index % slides.length) + slides.length) % slides.length;
      setScene({ current: target, next: target, moving: false });
      setImageFailed(false);
    }
  }

  useEffect(() => {
    if (!autoPlay || paused || reduced || !visible || hidden || focused || hovered || scene.moving || slides.length < 2)
      return;
    const timer = window.setTimeout(() => go(scene.current + 1), bounded(interval, 4000, 1000, 30000));
    return () => window.clearTimeout(timer);
  }, [autoPlay, paused, reduced, visible, hidden, focused, hovered, scene, interval, slides]);

  const active = scene.moving ? scene.next : scene.current;
  const style = {
    background: color(backgroundColor, '#05060a'),
    color: color(textColor, '#fdfce6'),
  } as CSSProperties;

  return (
    <section
      ref={root}
      className={`elastic-showcase ${className}`}
      style={style}
      data-compact={compact || undefined}
      data-gpu={gpu || undefined}
      aria-roledescription="carousel"
      aria-label="Selected projects"
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        engine.current?.pointer(0, 0);
      }}
      onKeyDown={(event) => {
        if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const target =
          event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? slides.length - 1
              : active + (['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1);
        go(target);
      }}
      onWheel={(event) => {
        if (Math.abs(event.deltaY) < 12 || performance.now() - wheelAt.current < 800 || scene.moving) return;
        wheelAt.current = performance.now();
        go(active + Math.sign(event.deltaY));
      }}
    >
      <style>{styles}</style>

      {/* SVG Kinetic Filters with generous filter bounds */}
      <svg width="0" height="0" aria-hidden="true" className="es-filters sr-only">
        <defs>
          <filter id={titleFilterId} x="-100%" y="-100%" width="300%" height="300%">
            <feTurbulence type="fractalNoise" baseFrequency="0.015 0.08" numOctaves="2" result="noise" />
            <feDisplacementMap
              ref={titleDisp}
              in="SourceGraphic"
              in2="noise"
              scale="0"
              xChannelSelector="R"
              yChannelSelector="G"
              result="displaced"
            />
            <feGaussianBlur ref={titleBlur} in="displaced" stdDeviation="0 0" />
          </filter>
          <filter id={rolesFilterId} x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur ref={rolesBlur} in="SourceGraphic" stdDeviation="0 0" />
          </filter>
        </defs>
      </svg>

      {!current ? (
        <p className="es-empty" role="status">
          No projects to display.
        </p>
      ) : (
        <>
          {/* Central WebGL Stage (Unclipped Canvas) */}
          <div
            className="es-stage"
            onPointerMove={(event) => {
              const box = event.currentTarget.getBoundingClientRect();
              engine.current?.pointer(
                ((event.clientX - box.left) / box.width) * 2 - 1,
                ((event.clientY - box.top) / box.height) * 2 - 1,
              );
            }}
            onPointerLeave={() => engine.current?.pointer(0, 0)}
          >
            <div className="es-fallback">
              {current.image && !imageFailed ? (
                <img
                  src={current.image}
                  alt=""
                  onLoad={() => {
                    setLoadedImage(current.image);
                    if (root.current) root.current.dataset.ready = 'true';
                  }}
                  onError={() => {
                    setImageFailed(true);
                    if (root.current) root.current.dataset.ready = 'true';
                  }}
                />
              ) : (
                <span>Image unavailable</span>
              )}
            </div>
            <div ref={canvas} className="es-canvas" />
          </div>

          {/* Left Overlapping Editorial Title with mix-blend-difference */}
          <div className="es-title-wrap" style={{ filter: `url(#${titleFilterId})` }} aria-hidden="true">
            <div ref={outgoingTitle} className="es-title-layer">
              <h2>{current.title}</h2>
            </div>
            <div
              ref={incomingTitle}
              className="es-title-layer es-incoming"
              style={{ visibility: scene.moving ? 'visible' : 'hidden' }}
            >
              <h2>{next.title}</h2>
            </div>
          </div>

          {/* Right Metadata Roles */}
          <div className="es-roles-wrap es-roles" style={{ filter: `url(#${rolesFilterId})` }} aria-hidden="true">
            <div ref={outgoingRoles} className="es-roles-layer">
              {current.roles.map((role, i) => (
                <span key={i}>{role}</span>
              ))}
            </div>
            <div
              ref={incomingRoles}
              className="es-roles-layer es-incoming"
              style={{ visibility: scene.moving ? 'visible' : 'hidden' }}
            >
              {next.roles.map((role, i) => (
                <span key={i}>{role}</span>
              ))}
            </div>
          </div>

          <div className="es-sr" aria-live={focused ? 'polite' : 'off'} aria-atomic="true">
            {current.title.replace(/\n/g, ' ')}. {current.roles.join(', ')}. Project {scene.current + 1} of{' '}
            {slides.length}. {current.alt}.{' '}
            {imageFailed || !current.image
              ? 'Image unavailable.'
              : loadedImage !== current.image
                ? 'Loading project image.'
                : ''}
          </div>

          {/* Right Vertical Thumbnails Rail */}
          <div className="es-rail" role="group" aria-label="Choose a project">
            {slides.map((slide, index) => (
              <button
                key={index}
                type="button"
                aria-label={`Show ${slide.title.replace(/\n/g, ' ')}`}
                aria-pressed={active === index}
                onClick={() => go(index)}
              >
                <span className="es-marker" />
                {slide.image ? (
                  <img src={slide.image} alt="" draggable={false} />
                ) : (
                  <span className="es-thumb-empty">{index + 1}</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

const styles = `
.elastic-showcase {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  isolation: isolate;
  container-type: size;
  font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  user-select: none;
  display: flex;
  align-items: center;
  justify-content: center;
}
.elastic-showcase * {
  box-sizing: border-box;
}
.elastic-showcase .es-filters {
  position: absolute;
  pointer-events: none;
}
.elastic-showcase .sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

/* Central WebGL Stage (Unclipped Canvas) */
.elastic-showcase .es-stage {
  position: relative;
  z-index: 10;
  width: 56%;
  max-width: 680px;
  aspect-ratio: 1.08 / 1;
  max-height: 88%;
  pointer-events: auto;
}
.elastic-showcase .es-canvas,
.elastic-showcase .es-canvas canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}
.elastic-showcase .es-fallback {
  position: absolute;
  inset: 6%;
  display: grid;
  place-items: center;
  background: #15171b;
  color: #fff;
  font-size: 12px;
}
.elastic-showcase .es-fallback img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.elastic-showcase[data-gpu] .es-fallback {
  visibility: hidden;
}

/* Left Overlapping Editorial Title */
.elastic-showcase .es-title-wrap {
  position: absolute;
  right: calc(50% + min(27cqw, 340px) - clamp(70px, 8cqw, 130px));
  top: 50%;
  transform: translateY(-50%);
  z-index: 20;
  pointer-events: none;
  max-width: min(44cqw, 540px);
  width: max-content;
  mix-blend-mode: difference;
  color: #F4F4EE;
  display: grid;
  grid-template-areas: 'stack';
  text-align: left;
}
.elastic-showcase .es-title-layer {
  grid-area: stack;
  width: max-content;
  max-width: 100%;
  will-change: transform, opacity;
}
.elastic-showcase h2 {
  margin: 0;
  font-family: inherit;
  font-size: clamp(28px, 4.6cqw, 60px);
  font-weight: 500;
  letter-spacing: -0.03em;
  line-height: 1.02;
  white-space: pre-line;
  text-wrap: balance;
}

/* Right Metadata Roles */
.elastic-showcase .es-roles-wrap {
  position: absolute;
  right: calc(clamp(16px, 4vw, 44px) + clamp(30px, 4.2cqw, 42px) + clamp(16px, 2.5vw, 36px));
  top: 50%;
  transform: translateY(-50%);
  z-index: 20;
  pointer-events: none;
  display: grid;
  grid-template-areas: 'stack';
}
.elastic-showcase .es-roles-layer {
  grid-area: stack;
  display: flex;
  flex-direction: column;
  font-size: clamp(8px, 1.05cqw, 13px);
  line-height: 1.5;
  letter-spacing: -0.02em;
  white-space: nowrap;
  opacity: 0.85;
  will-change: transform, opacity;
}
.elastic-showcase .es-incoming {
  opacity: 0;
}

/* Right Vertical Rail */
.elastic-showcase .es-rail {
  position: absolute;
  right: clamp(16px, 4vw, 44px);
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: clamp(4px, 0.8cqw, 8px);
  max-height: 88%;
  overflow-y: auto;
  scrollbar-width: none;
  z-index: 20;
  padding: 4px 4px 4px clamp(16px, 2.5cqw, 28px);
}
.elastic-showcase .es-rail button {
  position: relative;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: clamp(28px, 4.5cqw, 40px);
  height: clamp(28px, 4.5cqw, 40px);
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  border-radius: 0;
}
.elastic-showcase .es-rail button img,
.elastic-showcase .es-thumb-empty {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  opacity: 0.45;
  transition: opacity 0.3s ease;
}
.elastic-showcase .es-rail button[aria-pressed=true] img,
.elastic-showcase .es-rail button:hover img {
  opacity: 1;
}
.elastic-showcase .es-marker {
  position: absolute;
  right: calc(100% + 6px);
  top: 50%;
  margin-top: -0.75px;
  width: clamp(12px, 2cqw, 20px);
  height: 1.5px;
  background: #ffffff;
  transform: scaleX(0);
  transform-origin: right;
  transition: transform 0.45s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.elastic-showcase [aria-pressed=true] .es-marker {
  transform: scaleX(1);
}
.elastic-showcase button:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 1px;
}
.elastic-showcase .es-sr {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
.elastic-showcase .es-empty {
  font-size: 14px;
}

@container (max-width: 480px) {
  .elastic-showcase .es-roles-wrap {
    display: none;
  }
  .elastic-showcase .es-stage {
    width: 48%;
    max-width: 172px;
  }
  .elastic-showcase .es-title-wrap {
    right: calc(50% + 24cqw - 24px);
    max-width: 42%;
  }
  .elastic-showcase h2 {
    font-size: clamp(16px, 5.2cqw, 22px);
    line-height: 1.05;
  }
  .elastic-showcase .es-rail {
    right: 12px;
    gap: 4px;
    padding: 0;
  }
  .elastic-showcase .es-rail button {
    width: 18px;
    height: 18px;
  }
  .elastic-showcase .es-marker {
    width: 8px;
    right: calc(100% + 4px);
  }
}

.elastic-showcase[data-compact] .es-roles-wrap {
  display: none;
}
.elastic-showcase[data-compact] .es-stage {
  width: 48%;
  max-width: 172px;
}
.elastic-showcase[data-compact] .es-title-wrap {
  right: calc(50% + 24cqw - 24px);
  max-width: 42%;
}
.elastic-showcase[data-compact] h2 {
  font-size: clamp(16px, 5.2cqw, 22px);
  line-height: 1.05;
}
.elastic-showcase[data-compact] .es-rail {
  right: 12px;
  gap: 4px;
  padding: 0;
}
.elastic-showcase[data-compact] .es-rail button {
  width: 18px;
  height: 18px;
}
.elastic-showcase[data-compact] .es-marker {
  width: 8px;
  right: calc(100% + 4px);
}

@media (prefers-reduced-motion: reduce) {
  .elastic-showcase * {
    transition: none !important;
  }
}
`;
