'use client';

/** Shared sliding indicator for both two- and three-option controls. */
export default function LiquidSelection({selected,width}:{selected:number;width:number}){
  return <span className="segment-selection" aria-hidden="true" style={{width,transform:`translate3d(${selected*width}px,0,0)`}}/>;
}
