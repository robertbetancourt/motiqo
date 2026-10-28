export const opticalFragment = `
uniform vec2 uResolution,uSize,uCursor,uVelocity,uClick;
uniform float uTime,uHover,uRippleAge,uRefraction,uThickness,uBevelWidth,uFrost,uDispersion,uLightSheen,uLightAngle,uDarkness,uEdgeRim;
uniform float uBrightness,uWaveSpeed,uWaveScale,uAuraWidth,uCenterClarity,uBorderBeam,uHoverGlow,uCursorFlow,uClickRipple;
uniform float uHueOffset;
const float PI=3.14159265359;
float sdRoundedBox(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return min(max(q.x,q.y),0.)+length(max(q,0.))-r;}
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1)),f.x),f.y);}
float fbm(vec2 p){return .62*noise(p)+.26*noise(p*2.03+3.2)+.12*noise(p*4.07+9.7);}
vec2 field(vec2 p,float t){vec2 q=vec2(fbm(p+vec2(t*.14,-t*.11)),fbm(p+vec2(4.2+t*.09,1.3)));return vec2(fbm(p+1.3*q+vec2(1.7,9.2)),fbm(p+1.3*q+vec2(8.3,2.8)));}
vec3 rainbow(float hue){return clamp(abs(fract(hue+vec3(0.,2./3.,1./3.))*6.-3.)-1.,0.,1.);}
float shape(vec2 p){vec2 b=uSize*.5;return sdRoundedBox(p,b,min(b.x,b.y));}
float heightAt(vec2 p){float x=clamp(-shape(p)/max(uBevelWidth,1.),0.,1.);return uThickness*sqrt(max(0.,1.-(1.-x)*(1.-x)));}
// Continuous arc length around the capsule, rather than a flat gradient across its face.
float perimeter(vec2 p){float r=min(uSize.x,uSize.y)*.5,l=max(0.,uSize.x*.5-r),total=4.*l+2.*PI*r;
 if(p.x>l)return r*(atan(p.y,p.x-l)+PI*.5)/total;
 if(p.x< -l){float a=atan(p.y,p.x+l);if(a<0.)a+=2.*PI;return (2.*l+r*(a+PI*.5))/total;}
 return p.y>=0.?(PI*r+l-p.x)/total:(2.*PI*r+3.*l+p.x)/total;
}
void main(){
 vec2 p=vUv*uResolution-uResolution*.5;float d=shape(p),aa=max(fwidth(d),.5),inside=1.-smoothstep(-aa,aa,d);
 if(d>=18.){fragColor=vec4(0.);return;}
 float depth=max(-d,0.),t=uTime*uWaveSpeed*.01;
 vec2 gradient=vec2(shape(p+vec2(.4,0))-shape(p-vec2(.4,0)),shape(p+vec2(0,.4))-shape(p-vec2(0,.4)))/.8;
 vec2 slope=vec2(heightAt(p+vec2(.5,0))-heightAt(p-vec2(.5,0)),heightAt(p+vec2(0,.5))-heightAt(p-vec2(0,.5)));
 vec3 normal=normalize(vec3(-slope,1.));
 float nearCursor=exp(-dot(p-uCursor,p-uCursor)/3000.)*uHover;
 vec2 fluidUV=p/95.*max(.1,uWaveScale*.01);
 fluidUV-=uVelocity*.0011*uCursorFlow*.01*nearCursor;
 fluidUV+=vec2(-(p.y-uCursor.y),p.x-uCursor.x)*.0012*nearCursor*uCursorFlow*.01;
 float shock=sin((length(p-uClick)-uRippleAge*190.)*.15)*exp(-pow((length(p-uClick)-uRippleAge*190.)/24.,2.))*exp(-uRippleAge*1.8)*uClickRipple*.01;
 vec2 warp=field(fluidUV,t);float s=perimeter(p);
 float phase=s*2.*PI-t*.93+sin(t*.36)*.45+(warp.x-.5)*.24;
 float lobe=pow(max(0.,cos(phase)),3.5);float counter=pow(max(0.,cos(phase+2.8)),8.)*.22;
 float illumination=.035+lobe+counter+nearCursor*uHoverGlow*.0023;
 // Integer winding closes the spectrum at s=0/1 (the lower-right join).
 float hue=-s*2.+t*.185+.18+uHueOffset+(warp.y-.5)*.12+shock*.055;
 float spread=uDispersion*.01;
 // Cauchy-like wavelength offsets refract the three spectral channels independently.
 vec3 rayR=refract(vec3(0,0,-1),normal,1./(1.44+spread*.008));
 vec3 rayG=refract(vec3(0,0,-1),normal,1./(1.45+spread*.026));
 vec3 rayB=refract(vec3(0,0,-1),normal,1./(1.47+spread*.065));
 float bend=(uRefraction*.00065+uThickness*.0004)*dot(gradient,vec2(.7,.5));
 vec3 spectrum=vec3(rainbow(hue+rayR.x*bend).r,rainbow(hue+rayG.x*bend).g,rainbow(hue+rayB.x*bend).b);
 spectrum=mix(vec3(.72,.82,.95),spectrum,clamp(spread*1.35,0.,1.));
 float aperture=max(1.,uAuraWidth),clarity=uCenterClarity*.01;
 float foldDepth=1.1+aperture*(.12+.62*pow(.5+.5*sin(s*6.*PI+warp.x*6.-t*1.15),3.))+shock*3.;
 float fold=exp(-pow((depth-foldDepth)/(.55+uFrost*.012),2.));
 float secondFold=exp(-pow((depth-foldDepth*.47-1.4)/(.45+uFrost*.008),2.))*.24;
 float penetration=exp(-depth/(aperture*.64));
 float bevelBand=exp(-depth/(1.4+aperture*.19));
 float edge=exp(-depth/.7)*uBorderBeam*.01;
 float caustic=(fold+secondFold)*penetration*.7;
 float flood=penetration*(1.-clarity)*1.2;
 // A perimeter chart has a medial-axis singularity. Fade it before that axis;
 // the volume uses a continuous Cartesian field instead of extending the chart.
 float chartWeight=smoothstep(1.5,10.,min(uSize.x,uSize.y)*.5-depth);
 vec2 body=p/max(uSize*.5,vec2(1.));
 float bodyHue=-body.x*.48+body.y*.13+t*.185+.18+uHueOffset+(warp.y-.5)*.25+shock*.055;
 vec3 volumeSpectrum=mix(vec3(.72,.82,.95),rainbow(bodyHue),clamp(spread*1.35,0.,1.));
 float volumeLight=.1+pow(.5+.5*sin(body.x*2.4+body.y*.9-t*.93+warp.x*.6),3.)+nearCursor*uHoverGlow*.0023;
 vec3 color=vec3(.033,.036,.047)*(1.-uDarkness*.007);
 color+=spectrum*(bevelBand*.42+edge*.8+caustic)*illumination*uBrightness*.047*chartWeight;
 color+=volumeSpectrum*flood*volumeLight*uBrightness*.047;
 // Soft secondary wisps remain visible within the dark glass, below the lettering.
 color+=rainbow(hue+.16)*fold*penetration*.028*(.2+illumination)*chartWeight;
 float angle=radians(uLightAngle);vec3 light=normalize(vec3(cos(angle)*.8,sin(angle)*.8,1.));
 float spec=pow(max(dot(normal,normalize(light+vec3(0,0,1))),0.),mix(110.,30.,uFrost*.01));
 float neutralRim=exp(-depth/.65)*(.025+max(dot(gradient,light.xy),0.)*.06)*uEdgeRim*.05;
 color+=vec3(.7,.8,1.)*(neutralRim+spec*uLightSheen*.0006);
 color=mix(color,vec3(dot(color,vec3(.2126,.7152,.0722))),uFrost*.0012);
 float od=max(d,0.);
 float outer=exp(-od*.65)*(1.-smoothstep(5.,18.,od))*.12;
 vec3 glow=spectrum*illumination*uBrightness*.012;
 float alpha=inside+(1.-inside)*outer;
 // Straight-alpha output: browser compositing applies coverage exactly once.
 vec3 radiance=color*inside+glow*outer*(1.-inside);
 fragColor=vec4(radiance/max(alpha,.00001),alpha);
}`;
