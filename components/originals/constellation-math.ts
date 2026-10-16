export const constellationClamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,Number.isFinite(n)?n:a));
export type StarNode = {
  pos: [number, number, number]; // unit sphere [x, y, z]
  glyph: string;
  isMajor: boolean;
};

export type ConstellationEdge = [number, number];

export type ConstellationGeometry = {
  nodes: StarNode[];
  edges: ConstellationEdge[];
};

const GLYPHS = ['α', 'β', 'γ', 'δ', 'ε', 'ζ', 'η', 'θ', 'ι', 'κ', 'λ', 'μ'];

export function createConstellation(nodeCount = 42): ConstellationGeometry {
  nodeCount=Math.round(constellationClamp(nodeCount,20,120));
  const nodes: StarNode[] = [];
  const goldenRatio = (1 + Math.sqrt(5)) / 2;

  for (let i = 0; i < nodeCount; i++) {
    const theta = (2 * Math.PI * i) / goldenRatio;
    const phi = Math.acos(1 - (2 * (i + 0.5)) / nodeCount);
    const x = Math.cos(theta) * Math.sin(phi);
    const y = Math.cos(phi);
    const z = Math.sin(theta) * Math.sin(phi);
    const isMajor = i < GLYPHS.length;
    nodes.push({
      pos: [x, y, z],
      glyph: isMajor ? GLYPHS[i] : '',
      isMajor,
    });
  }

  // Find 2 nearest neighbors for each node to build a stable aesthetic graph
  const edges: ConstellationEdge[] = [];
  const edgeSet = new Set<string>();

  for (let i = 0; i < nodeCount; i++) {
    const dists: { idx: number; dist: number }[] = [];
    for (let j = 0; j < nodeCount; j++) {
      if (i === j) continue;
      const dx = nodes[i].pos[0] - nodes[j].pos[0];
      const dy = nodes[i].pos[1] - nodes[j].pos[1];
      const dz = nodes[i].pos[2] - nodes[j].pos[2];
      dists.push({ idx: j, dist: Math.hypot(dx, dy, dz) });
    }
    dists.sort((a, b) => a.dist - b.dist);

    // Connect to 2 closest neighbors
    for (let k = 0; k < 2; k++) {
      const neighbor = dists[k].idx;
      const key = i < neighbor ? `${i}-${neighbor}` : `${neighbor}-${i}`;
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        edges.push([i, neighbor]);
      }
    }
  }

  return { nodes, edges };
}


/** Seeded spherical dust, core stars and curved geodesic threads. Buffers remain static. */
export function createConstellationParticles(nodes=42,count=24000){
 const graph=createConstellation(nodes);count=Math.round(constellationClamp(count,5000,40000));const n=count+graph.nodes.length,positions=new Float32Array(n*3),seeds=new Float32Array(n*4);let state=0x53744152;
 const random=()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return(state>>>0)/4294967296;};
 for(let i=0;i<n;i++){const major=i>=count,theta=random()*Math.PI*2,y=random()*2-1,r=major?1:i%4===0?Math.cbrt(random())*.93:.96+random()*.075,ring=Math.sqrt(1-y*y),p=major?graph.nodes[i-count].pos:[Math.cos(theta)*ring*r,y*r,Math.sin(theta)*ring*r];positions.set(p,i*3);seeds.set([random()*Math.PI*2,random(),major?1:0,random()],i*4);}
 const lines:number[]=[],traces:number[]=[];
 graph.edges.forEach(([a,b],edge)=>{const p=graph.nodes[a].pos,q=graph.nodes[b].pos,dot=constellationClamp(p[0]*q[0]+p[1]*q[1]+p[2]*q[2],-.9999,.9999),angle=Math.acos(dot),sin=Math.sin(angle);for(let j=0;j<20;j++)for(const u of [j/20,(j+1)/20]){const x=Math.sin((1-u)*angle)/sin,y=Math.sin(u*angle)/sin;lines.push(p[0]*x+q[0]*y,p[1]*x+q[1]*y,p[2]*x+q[2]*y);traces.push(u,edge*.6180339%1);}});
 return{positions,seeds,lines:new Float32Array(lines),traces:new Float32Array(traces),edges:graph.edges.length};
}
