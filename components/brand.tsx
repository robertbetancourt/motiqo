import type { SVGProps } from 'react';
import { brandShapes } from '@/lib/brand-shapes';

type Variant = keyof typeof brandShapes;
export default function Brand({ variant = 'logo', ...props }: SVGProps<SVGSVGElement> & { variant?: Variant }) {
  const shape = brandShapes[variant];
  const fills = { text: 'var(--text)', neutral: 'var(--brand-neutral)', accent: 'var(--accent)', warm: 'var(--accent-soft)' };
  return <svg viewBox={shape.viewBox} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
    {shape.paths.map((path, index) => <path key={index} d={path.d} fill={fills[path.tone]} />)}
  </svg>;
}
