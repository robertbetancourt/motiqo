'use client';

import { useEffect, useState } from 'react';
import BrandLoader from './brand-loader';

export default function InitialPageLoader() {
  const [pending, setPending] = useState(false);
  useEffect(() => {
    const documentPending = document.readyState !== 'complete';
    const fontsPending = document.fonts.status === 'loading';
    if (!documentPending && !fontsPending) return;

    let mounted = true;
    let onLoad: (() => void) | undefined;
    setPending(true);
    const pageReady = documentPending ? new Promise<void>(resolve => {
      onLoad = resolve;
      window.addEventListener('load', onLoad, { once: true });
    }) : Promise.resolve();
    Promise.all([pageReady, document.fonts.ready]).then(() => {
      if (mounted) setPending(false);
    });
    return () => {
      mounted = false;
      if (onLoad) window.removeEventListener('load', onLoad);
    };
  }, []);
  return pending ? <BrandLoader /> : null;
}
