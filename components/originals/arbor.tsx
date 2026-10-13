'use client';

import LineStage, { coordinates, edge, limit, path, settle, spring, type Factory, type LineProps, type Point } from './line-scene';

const createArbor: Factory = group => {
  const seed = (n: number) => { const v = Math.sin(n * 76.13 + 4.2) * 4913.71; return v - Math.floor(v); };
  type Branch = { parent: number; depth: number; angle: number; length: number; theta: number; start: Point; end: Point; bend: ReturnType<typeof spring>; line: SVGPathElement; leaf?: SVGPathElement };
  const branches: Branch[] = [];
  const rootLines = path(group, { stroke: '#63796c', 'stroke-opacity': .7, 'stroke-width': .6 });
  rootLines.setAttribute('d', Array.from({ length: 7 }, (_, i) => {
    const end: Point = [273 + i * 15.5, 369 + Math.sin(i * .7) * 6];
    return `M316,352Q${coordinates([310 + i * 2.2, 371])} ${coordinates(end)}`;
  }).join(''));
  const trunk = path(group, { fill: '#0e1919', stroke: '#a1b1a1', 'stroke-width': .85, 'data-trunk': '' });
  function grow(parent: number, depth: number, angle: number, length: number) {
    const i = branches.length;
    const branch: Branch = { parent, depth, angle, length, theta: 0, start: [0,0], end: [0,0], bend: spring(), line: path(group, { 'stroke-width': depth === 0 ? 1 : Math.max(.4, 1 - depth * .11), 'data-branch': i }) };
    branches.push(branch);
    if (depth === 0) { grow(i,1,-.66,68); grow(i,1,.53,70); grow(i,1,.02,77); }
    else if (depth < 5) {
      grow(i, depth+1, -.38 - seed(i) * .17, length * (.66 + seed(i+5) * .08));
      grow(i, depth+1, .30 + seed(i+20) * .22, length * (.67 + seed(i+40) * .08));
    } else branch.leaf = path(group, { stroke: '#7e9b87', 'stroke-width': .55, 'data-leaf': i });
  }
  grow(-1,0,-Math.PI/2+.04,68);
  let lastX = 320, velocity = 0;
  function paint() {
    branches.forEach((b, i) => {
      const parent = branches[b.parent];
      b.start = parent ? parent.end : [316,355];
      b.theta = (parent ? parent.theta : 0) + b.angle + b.bend.x;
      b.end = [b.start[0] + Math.cos(b.theta)*b.length, b.start[1] + Math.sin(b.theta)*b.length];
      const previous = parent ? parent.theta : b.theta;
      const c1: Point = [b.start[0]+Math.cos(previous)*b.length*.38, b.start[1]+Math.sin(previous)*b.length*.38];
      const c2: Point = [b.end[0]-Math.cos(b.theta+.12)*b.length*.32, b.end[1]-Math.sin(b.theta+.12)*b.length*.32];
      b.line.setAttribute('d', `M${coordinates(b.start)}C${coordinates(c1)} ${coordinates(c2)} ${coordinates(b.end)}`);
      if (i === 0) trunk.setAttribute('d', `M310,356Q306,322 ${coordinates([b.end[0]-2,b.end[1]])}L${coordinates([b.end[0]+2,b.end[1]])}Q324,322 321,356`);
      if (b.leaf) {
        const length = 8 + seed(i+100)*5, width = 3.1;
        const tip: Point = [b.end[0]+Math.cos(b.theta)*length,b.end[1]+Math.sin(b.theta)*length];
        const side = (direction: number): Point => [(b.end[0]+tip[0])/2+Math.sin(b.theta)*width*direction,(b.end[1]+tip[1])/2-Math.cos(b.theta)*width*direction];
        b.leaf.setAttribute('d',`M${coordinates(b.end)}Q${coordinates(side(1))} ${coordinates(tip)}Q${coordinates(side(-1))} ${coordinates(b.end)}`);
      }
    });
  }
  paint();
  return {
    reset() { branches.forEach(b => { b.bend.x = b.bend.v = 0; }); velocity = 0; lastX = 320; },
    update(dt, input, small) {
      const alpha = 1 - Math.exp(-dt*8);
      if (dt) velocity += (limit((input.x-lastX)/dt,-450,450)-velocity)*alpha;
      lastX = input.x;
      let moving = false;
      const wind = limit((input.x-320)/170,-1,1) * input.strength;
      branches.forEach(b => {
        const distance = Math.hypot(b.end[0]-input.x,b.end[1]-input.y);
        const influence = Math.exp(-((distance/105)**2))*input.strength;
        const inherited = b.parent >= 0 ? branches[b.parent].bend.x*.32 : 0;
        const force = (wind*.045 + influence*(wind*.22 + velocity*.00032) + inherited) * (small ? .65 : 1);
        moving = settle(b.bend,force,dt,112-b.depth*7,17-b.depth*.7) || moving;
        b.line.setAttribute('stroke',edge(influence*.8));
        b.leaf?.setAttribute('stroke',edge(influence));
      });
      paint();
      return moving || Math.abs(velocity) > .1;
    },
  };
};
export default function Arbor(props: LineProps) {
  return <LineStage {...props} factory={createArbor} className={`arbor ${props.className || ''}`} label="Arbor, elastic line tree" help="Move or touch the branches to create a local gust. Arrow keys steer the wind; Home returns to the centre."/>;
}
