/** Tetrahedral 3D simplex gradient noise, shared by the wave and membrane shaders. */
export const kineticNoiseGLSL = `
vec3 kGradient(vec3 p){p=vec3(dot(p,vec3(127.1,311.7,74.7)),dot(p,vec3(269.5,183.3,246.1)),dot(p,vec3(113.5,271.9,124.6)));return normalize(-1.+2.*fract(sin(p)*43758.5453));}
float kSimplex(vec3 p){
 vec3 cell=floor(p+dot(p,vec3(1./3.)));vec3 x=p-cell+dot(cell,vec3(1./6.));
 vec3 rank=step(x.yzx,x.xyz),low=1.-rank;vec3 a=min(rank,low.zxy),b=max(rank,low.zxy);
 vec3 x1=x-a+1./6.,x2=x-b+1./3.,x3=x-.5;
 vec4 w=max(.6-vec4(dot(x,x),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);w*=w;w*=w;
 return 32.*dot(w,vec4(dot(kGradient(cell),x),dot(kGradient(cell+a),x1),dot(kGradient(cell+b),x2),dot(kGradient(cell+1.),x3)));
}
`;
