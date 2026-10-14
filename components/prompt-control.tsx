'use client';

import { ArrowRight } from 'lucide-react';
import { makePrompt, type AITool, type LibraryElement } from '@/lib/catalog';
import ChoiceSelect, { workflowOptions } from './choice-select';
import LiquidAction, { LiquidCopyButton } from './liquid-action';
import type { Settings } from '@/lib/element-controls';

export default function PromptControl({ element, tool, onToolChange, copy, onReview, paused = false, liquid = false, settings }: {
  element: LibraryElement; tool: AITool; onToolChange: (tool: AITool) => void;
  copy: (text: string) => Promise<boolean>; onReview: () => void; paused?: boolean; liquid?: boolean; settings?:Settings;
}) {
  return <LiquidAction paused={paused} liquid={liquid}>
    <LiquidCopyButton text={makePrompt(element, tool, settings)} label={tool === 'Universal' ? 'Copy prompt' : `Copy ${tool}`}
      ariaLabel={`Copy ${element.title} prompt for ${tool}`} copy={copy}/>
    <ChoiceSelect iconOnly options={workflowOptions} value={tool} onChange={value => onToolChange(value as AITool)}
      label={`Choose AI for ${element.title}`} paused={paused}
      footer={<button role="menuitem" className="review-prompt" onClick={onReview}>Review prompt first <ArrowRight size={14}/></button>}/>
  </LiquidAction>;
}
