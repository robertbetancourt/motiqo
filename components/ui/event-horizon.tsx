'use client';
import LiquidRelic from './liquid-relic';
import type { ComponentProps } from 'react';
/** Original accretion-disk artwork, using the credited Liquid Relic particle engine. */
export default function EventHorizon(props: Omit<ComponentProps<typeof LiquidRelic>, 'src'>) { return <LiquidRelic label="Event Horizon, an interactive black hole" imageAlt="Black hole with a lensed photon ring and copper accretion disk" {...props} src="/media/event-horizon.svg"/>; }
