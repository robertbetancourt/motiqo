/** A view-aligned volume, integrated front to back; not a 2D noise contour. */
export const vaporFragment = `
uniform vec2 uResolution;
uniform float uTime,uDensity,uTurbulence,uRadius;
uniform vec3 uWarm,uCold;
uniform sampler2D uFlow;

float hash3(vec3 p){
  p=fract(p*.1031);p+=dot(p,p.yzx+33.33);
  return fract((p.x+p.y)*p.z);
}
float noise3(vec3 p){
  vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(mix(hash3(i),hash3(i+vec3(1,0,0)),f.x),
    mix(hash3(i+vec3(0,1,0)),hash3(i+vec3(1,1,0)),f.x),f.y),
    mix(mix(hash3(i+vec3(0,0,1)),hash3(i+vec3(1,0,1)),f.x),
    mix(hash3(i+vec3(0,1,1)),hash3(i+vec3(1,1,1)),f.x),f.y),f.z);
}
float fbm(vec3 p){
  float v=0.,a=.55;
  for(int i=0;i<4;i++){v+=noise3(p)*a;p=p.yzx*2.03+vec3(7.1,13.7,3.8);a*=.48;}
  return v;
}
mat2 turn(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}

void main(){
  vec2 p=(vUv-.5)*uResolution/min(uResolution.x,uResolution.y);
  float r=length(p),t=uTime*.32;
  // A clear inner aperture preserves the live weather typography.
  if(r<uRadius-.025||r>.7){fragColor=vec4(0,0,0,1);return;}
  float angle=atan(p.y,p.x);
  float diagonal=pow(.5+.5*cos(2.*angle-4.45),2.);
  vec2 flow=texture(uFlow,vUv).rg;
  float transported=(flow.r+flow.g)*smoothstep(uRadius+.035,uRadius+.105,r);
  float transportedWarm=flow.r/max(flow.r+flow.g,.0001);
  vec3 sum=vec3(0);float transmission=1.;
  for(int i=0;i<18;i++){
    float z=.25-float(i)*(.5/17.);
    vec2 xy=turn(t*.15+z*.7)*p;
    vec3 q=vec3(xy*15.,z*15.);
    q.xy=turn((r-uRadius)*uTurbulence*3.)*q.xy;
    q+=vec3(t*.35,-t*.7,t*.4);
    float broad=noise3(q*.6+vec3(0,t*.13,4.));
    q+=vec3(broad-.5,noise3(q*.7+8.2)-.5,0.)*uTurbulence*1.5;
    float billow=fbm(q);
    float detail=noise3(q*4.1+vec3(t*.18,0,0));
    float displaced=uRadius+(broad-.5)*.055;
    float torus=length(vec2(r-displaced,z*.65));
    float core=exp(-pow(torus/(.033+(billow*.025)),2.));
    float reach=.11+diagonal*.18;
    float skirt=exp(-pow((r-uRadius-.055)/reach,2.)-z*z*26.);
    float cloud=smoothstep(.48,.67,billow+detail*.12)*skirt;
    float lace=smoothstep(.56,.72,billow+detail*.12)*skirt;
    float aperture=smoothstep(uRadius-.02,uRadius+.012,r);
    float dissolve=1.-smoothstep(uRadius+.065+broad*.09,uRadius+reach+.025+broad*.1,r);
    float attached=(core*smoothstep(.31,.65,billow+detail*.15)*.75+cloud*1.6+lace*.9)*dissolve;
    float drifting=transported*exp(-z*z*24.)*smoothstep(.44,.72,billow+detail*.14)*exp(-max(0.,r-uRadius)*3.5)*1.8;
    float density=(attached+drifting)*aperture*uDensity;
    // Beer-Lambert extinction gives overlapping folds depth and soft silhouettes.
    float alpha=1.-exp(-density*.2);
    float warmBand=exp(-pow((r-uRadius-.004)/.07,2.));
    float warmMix=smoothstep(.25,.85,warmBand*.85+(billow-.5)*1.4+.05);
    warmMix=mix(warmMix,transportedWarm,drifting/max(attached+drifting,.0001));
    vec3 pigment=mix(uCold,uWarm,warmMix);
    float light=.18+billow*billow*1.6+detail*.18+float(i)/17.*.1;
    vec3 scatter=pigment*light;
    scatter+=mix(vec3(.45,.7,.72),vec3(1.,.68,.53),warmMix)*pow(billow,5.)*.2;
    sum+=transmission*alpha*scatter;
    transmission*=1.-alpha;
  }
  // Restrained embers illuminate the smoke rather than outlining a neon circle.
  float ember=exp(-pow((r-uRadius)/.009,2.))*(.3+.7*noise3(vec3(p*28.,t)));
  sum+=uWarm*ember*.28*uDensity;
  sum=1.-exp(-sum*1.8);
  float edge=smoothstep(0.,.055,vUv.x)*smoothstep(0.,.055,1.-vUv.x)*smoothstep(0.,.055,vUv.y)*smoothstep(0.,.055,1.-vUv.y);
  fragColor=vec4(sum*edge,1.);
}`;

/** Semi-Lagrangian advection: continuous sheets stretch, roll and lose density. */
export const vaporFlowFragment = `
uniform sampler2D uState;
uniform vec2 uTexel;
uniform float uTime,uDt,uRadius,uTurbulence;
float flowHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float flowNoise(vec2 p){
  vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);
  return mix(mix(flowHash(i),flowHash(i+vec2(1,0)),u.x),mix(flowHash(i+vec2(0,1)),flowHash(i+1.),u.x),u.y);
}
vec2 flowCurl(vec2 p){
  vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f),du=6.*f*(1.-f);
  float a=flowHash(i),b=flowHash(i+vec2(1,0)),c=flowHash(i+vec2(0,1)),d=flowHash(i+1.);
  vec2 gradient=du*vec2(b-a+(a-b-c+d)*u.y,c-a+(a-b-c+d)*u.x);
  return vec2(gradient.y,-gradient.x);
}
void main(){
  vec2 p=vUv-.5;float r=length(p),angle=atan(p.y,p.x);
  vec2 radial=p/max(r,.0001),tangent=vec2(-radial.y,radial.x);
  vec2 diagonal=normalize(vec2(-.8,.65));
  float side=tanh(dot(p,diagonal)*24.);
  float sectors=pow(.5+.5*cos(2.*angle-4.45),2.);
  vec2 curl=flowCurl(p*7.+vec2(uTime*.23,-uTime*.17));
  curl+=flowCurl(p*16.-vec2(uTime*.15,uTime*.11))*.3;
  // Broad opposing currents peel sheets from the ring; curl rolls their edges.
  vec2 velocity=radial*(.018+sectors*.075)+diagonal*side*.065;
  velocity+=tangent*.025*exp(-pow((r-uRadius)/.12,2.));
  velocity+=curl*.038*uTurbulence;
  vec2 source=vUv-velocity*uDt;
  vec2 dye=texture(uState,source).rg;
  vec2 neighbors=(texture(uState,source+vec2(uTexel.x,0)).rg+texture(uState,source-vec2(uTexel.x,0)).rg
    +texture(uState,source+vec2(0,uTexel.y)).rg+texture(uState,source-vec2(0,uTexel.y)).rg)*.25;
  dye=mix(dye,neighbors,min(.08,uDt*1.2));
  float distance=max(0.,r-uRadius);
  dye*=exp(-uDt*(.4+distance*3.));
  float sourceRing=exp(-pow((r-uRadius-.015)/.027,2.))*(.12+sectors);
  float agitation=flowNoise(p*21.+vec2(uTime*.4,-uTime*.7));
  sourceRing*=.4+agitation*.9;
  float warm=smoothstep(.18,.85,flowNoise(p*8.+vec2(-uTime*.13,uTime*.2)));
  dye+=vec2(warm,1.-warm)*sourceRing*uDt*3.8;
  float inner=smoothstep(uRadius-.01,uRadius+.018,r);
  float edge=smoothstep(0.,.13,vUv.x)*smoothstep(0.,.13,1.-vUv.x)*smoothstep(0.,.13,vUv.y)*smoothstep(0.,.13,1.-vUv.y);
  fragColor=vec4(clamp(dye*inner*edge,0.,1.),0.,1.);
}`;
