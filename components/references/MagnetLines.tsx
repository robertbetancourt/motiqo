'use client';

import React, { useRef, useEffect, type CSSProperties } from 'react';
import './MagnetLines.css';

interface MagnetLinesProps {
  rows?: number;
  columns?: number;
  containerSize?: string;
  lineColor?: string;
  lineWidth?: string;
  lineHeight?: string;
  baseAngle?: number;
  className?: string;
  style?: CSSProperties;
  paused?: boolean;
}

const MagnetLines: React.FC<MagnetLinesProps> = ({
  rows = 9,
  columns = 9,
  containerSize = '80vmin',
  lineColor = '#efefef',
  lineWidth = '1vmin',
  lineHeight = '6vmin',
  baseAngle = -10,
  className = '',
  style = {},
  paused = false
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const items = container.querySelectorAll<HTMLSpanElement>('span');

    if (paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      items.forEach(item => item.style.setProperty('--rotate', `${baseAngle}deg`));
      return;
    }

    const onPointerMove = (pointer: { x: number; y: number }) => {
      items.forEach(item => {
        const rect = item.getBoundingClientRect();
        const centerX = rect.x + rect.width / 2;
        const centerY = rect.y + rect.height / 2;

        const b = pointer.x - centerX;
        const a = pointer.y - centerY;
        const c = Math.sqrt(a * a + b * b) || 1;
        const r = ((Math.acos(b / c) * 180) / Math.PI) * (pointer.y > centerY ? 1 : -1);

        item.style.setProperty('--rotate', `${r}deg`);
      });
    };

    // Scope the interaction to its own preview. Never listen on window.
    const scope = container.closest<HTMLElement>('.card-stage, .detail-preview') ?? container;
    let frame = 0;
    let latest = { x: 0, y: 0 };
    const handlePointerMove = (e: PointerEvent) => {
      latest = { x: e.x, y: e.y };
      if (!frame) frame = requestAnimationFrame(() => { frame = 0; onPointerMove(latest); });
    };
    const reset = () => {
      cancelAnimationFrame(frame); frame = 0;
      items.forEach(item => item.style.setProperty('--rotate', `${baseAngle}deg`));
    };
    reset();
    scope.addEventListener('pointermove', handlePointerMove);
    scope.addEventListener('pointerleave', reset);

    return () => {
      scope.removeEventListener('pointermove', handlePointerMove);
      scope.removeEventListener('pointerleave', reset);
      cancelAnimationFrame(frame);
    };
  }, [rows, columns, paused, baseAngle]);

  const total = rows * columns;
  const spans = Array.from({ length: total }, (_, i) => (
    <span
      key={i}
      style={
        {
          '--rotate': `${baseAngle}deg`,
          backgroundColor: lineColor,
          width: lineWidth,
          height: lineHeight
        } as CSSProperties
      }
    />
  ));

  return (
    <div
      ref={containerRef}
      className={`magnetLines-container ${className}`}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
        width: containerSize,
        height: containerSize,
        ...style
      }}
    >
      {spans}
    </div>
  );
};

export default MagnetLines;
