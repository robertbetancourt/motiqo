/** The original Cartesian, seven-wavelength liquid caustic study. */
export const prismFragment = `
uniform vec2 uResolution,uSize,uCursor,uVelocity,uClick;
uniform float uTime,uHover,uRippleAge,uRefraction,uThickness,uBevelWidth,uFrost,uDispersion,uLightSheen,uLightAngle,uDarkness,uEdgeRim;
uniform float uBrightness,uWaveSpeed,uWaveScale,uAuraWidth,uCenterClarity,uBorderBeam,uHoverGlow,uCursorFlow,uClickRipple;
float sdRoundedBox(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return min(max(q.x,q.y),0.)+length(max(q,0.))-r;}
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1)),f.x),f.y);}
float fbm(vec2 p){return .58*noise(p)+.28*noise(p*2.07+3.2)+.14*noise(p*4.13+9.7);}
vec2 field(vec2 p,float t){vec2 q=vec2(fbm(p+t*.12),fbm(p+vec2(5.2,1.3)-t*.09));return vec2(fbm(p+1.5*q+vec2(1.7,9.2)+t*.13),fbm(p+3.*q+vec2(8.3,2.8)-t*.1));}
float liquid(vec2 p,float t){vec2 q=field(p,t);return .5+.5*sin(p.x*.7+p.y*1.2+q.x*3.5+q.y*2.);}
float shape(vec2 p){vec2 b=uSize*.5;return sdRoundedBox(p,b,min(b.x,b.y));}
float heightAt(vec2 p){float inside=max(-shape(p),0.);float x=clamp(inside/max(uBevelWidth,1.),0.,1.);return uThickness*sqrt(max(0.,1.-(1.-x)*(1.-x)));}
void main(){
 vec2 p=vUv*uResolution-uResolution*.5;
 float d=shape(p),aa=max(fwidth(d),.65);float mask=1.-smoothstep(-aa,aa,d);
 if(d>2.){fragColor=vec4(0.);return;}
 float depth=max(-d,0.);vec2 g=vec2(shape(p+vec2(.3,0))-shape(p-vec2(.3,0)),shape(p+vec2(0,.3))-shape(p-vec2(0,.3)))/.6;
 vec2 slope=vec2(heightAt(p+vec2(.5,0))-heightAt(p-vec2(.5,0)),heightAt(p+vec2(0,.5))-heightAt(p-vec2(0,.5)));
 vec3 n=normalize(vec3(-slope,1.));
 float angle=radians(uLightAngle);vec3 light=normalize(vec3(cos(angle)*.8,sin(angle)*.8,1.));
 float sheen=pow(max(dot(n,normalize(light+vec3(0,0,1))),0.),mix(100.,14.,uFrost*.01))*uLightSheen*.018;
 float fresnel=.04+.96*pow(1.-n.z,5.);
 float cursorDist=length(p-uCursor);float nearCursor=exp(-cursorDist*cursorDist/3500.)*uHover;
 vec2 uv=p/54.*max(uWaveScale*.01,.1);float t=uTime*uWaveSpeed*.01;
 uv-=uVelocity*.0017*uCursorFlow*.01*nearCursor;
 uv+=vec2(-p.y+uCursor.y,p.x-uCursor.x)*.0015*nearCursor*uCursorFlow*.01;
 float waveRadius=uRippleAge*190.;float shock=sin((length(p-uClick)-waveRadius)*.15)*exp(-pow((length(p-uClick)-waveRadius)/22.,2.))*exp(-uRippleAge*1.5)*uClickRipple*.01;
 uv+=normalize(p-uClick+vec2(.001))*shock*.65;
 vec2 warp=field(uv,t);vec3 spectral=vec3(0.);
 for(int i=0;i<7;i++){
  float wavelength=float(i)/6.;float ior=1.42+uDispersion*.0018*(1.-wavelength)*(1.-wavelength);
  vec3 ray=refract(vec3(0,0,-1),n,1./ior);
  vec2 sampleUv=uv+ray.xy*(uRefraction*.025+uThickness*.008)+g*(wavelength-.5)*uDispersion*.006;
  float radius=uFrost*.004;vec2 samplePoint=sampleUv+warp*.35;
  float f=(liquid(samplePoint,t+wavelength*.45)*2.+liquid(samplePoint+vec2(radius,0.),t+wavelength*.45)+liquid(samplePoint-vec2(radius,0.),t+wavelength*.45))*.25;
  float energy=pow(f,5.)+.27*pow(1.-f,14.);
  vec3 rgb=max(vec3(0.),1.-abs(vec3(0.,.5,1.)-wavelength)*2.2);
  rgb+=vec3(exp(-pow((wavelength-.05)*9.,2.)),0.,exp(-pow((wavelength-.94)*9.,2.)))*.45;
  spectral+=rgb*energy;
 }
 spectral=mix(vec3(dot(spectral,vec3(.2126,.7152,.0722))),spectral,clamp(uDispersion*.025,0.,1.))*.42;
 float penetration=exp(-depth/max(uAuraWidth,1.));
 float beam=exp(-depth/1.25)*uBorderBeam*.025;float rim=exp(-depth/.8)*uEdgeRim*.022;
 vec3 base=vec3(.023,.025,.032)*(1.-uDarkness*.0085);
 float frostNoise=(hash(gl_FragCoord.xy)-.5)*uFrost*.0006;
 vec3 color=base+spectral*(penetration*1.2+(1.-uCenterClarity*.01)*.6+beam*.28)*uBrightness*.022;
 color+=vec3(.7,.83,1.)*(sheen*.13+rim*(.12+.6*max(dot(g,light.xy),0.))+fresnel*.04);
 color+=spectral*nearCursor*penetration*uHoverGlow*.0012+frostNoise;
 color=mix(color,base+color*.78,uFrost*.003);
 fragColor=vec4(color,mask);
}`;
