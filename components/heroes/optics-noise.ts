/** Original simplex-gradient implementation. Returns xyz derivatives and w value. */
export const SIMPLEX_GLSL = /* glsl */ `
vec3 opticalGradient(vec3 cell) {
  vec3 h=vec3(dot(cell,vec3(127.1,311.7,74.7)),dot(cell,vec3(269.5,183.3,246.1)),dot(cell,vec3(113.5,271.9,124.6)));
  return normalize(fract(sin(h)*43758.5453)*2.0-1.0+vec3(0.0001));
}
vec4 simplexContribution(vec3 offset,vec3 cell) {
  float m=max(0.6-dot(offset,offset),0.0);
  vec3 g=opticalGradient(cell);float projection=dot(g,offset);
  float m2=m*m,m3=m2*m,m4=m2*m2;
  return vec4(m4*g-8.0*m3*projection*offset,m4*projection);
}
vec4 simplexDG(vec3 p) {
  vec3 cell=floor(p+dot(p,vec3(1.0/3.0)));
  vec3 a=p-cell+dot(cell,vec3(1.0/6.0));
  vec3 rank=step(a.yzx,a.xyz),lower=1.0-rank;
  vec3 first=min(rank,lower.zxy),second=max(rank,lower.zxy);
  return 32.0*(simplexContribution(a,cell)+simplexContribution(a-first+1.0/6.0,cell+first)+simplexContribution(a-second+1.0/3.0,cell+second)+simplexContribution(a-0.5,cell+1.0));
}
float opticalNoise(vec3 p){return simplexDG(p).w;}
float opticalFbm(vec3 p){float total=0.0,weight=0.5;for(int i=0;i<4;i++){total+=opticalNoise(p)*weight;p=p*2.03+vec3(1.7,4.2,2.1);weight*=0.5;}return total;}
vec3 opticalCurl(vec3 p){vec3 a=simplexDG(p).xyz,b=simplexDG(p+vec3(17.1,3.7,9.2)).xyz,c=simplexDG(p+vec3(5.3,29.7,2.8)).xyz;return vec3(c.y-b.z,a.z-c.x,b.x-a.y);}
`;
