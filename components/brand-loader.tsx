'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Brand from './brand';

// Mounted only while loading; fast loads unmount before the reveal delay.
export default function BrandLoader({route=false}:{route?:boolean}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const reveal = setTimeout(() => setVisible(true), 120);
    return () => clearTimeout(reveal);
  }, []);
  if (!visible) return null;
  return createPortal(<div className={`brand-loader ${route?'route-loader':''}`} role="status" aria-live="polite" aria-label="Loading page">
    <div className="loader-cross loader-cross-a" aria-hidden="true">+</div><div className="loader-cross loader-cross-b" aria-hidden="true">+</div>
    <div className="loader-sequence" aria-hidden="true"><Brand variant="isotype" className="loader-isotype" /><div className="loader-wordmark"><Brand variant="logo" /></div><span className="loader-label">A LITTLE MOTION. A LOT OF CHARACTER.</span></div>
    <span className="loader-footer" aria-hidden="true">MOTIQO / EST. 2026</span>
    <span className="sr-only">Loading page</span>
  </div>, document.body);
}
