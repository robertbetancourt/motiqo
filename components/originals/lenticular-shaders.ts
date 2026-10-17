import {buttonOpticsGLSL} from './button-optics';
export const lenticularFragment=buttonOpticsGLSL+`
uniform vec3 uLensTint;
uniform float uMagnification,uLensRadius,uDistortion,uGridSpacing,uIdleMotion;
vec3 sceneAt(vec2 q){
 // A smooth dark light field, without grid lines or marker geometry.
 float light=exp(-dot(q,q)/12000.)*.025;
 return vec3(.031,.039,.051)+uLensTint*light;
}
void main(){
 vec2 p=vUv*uResolution-uResolution*.5;float d=capsule(p);if(d>5.){fragColor=vec4(0.);return;}float depth=max(-d,0.);
 vec2 rest=vec2(sin(uTime*.31)*uSize.x*.24,cos(uTime*.39)*uSize.y*.13)*uIdleMotion;
 vec2 center=mix(rest,uCursor,uHover);center=clamp(center,-uSize*.5+vec2(12.),uSize*.5-vec2(12.));
 vec2 delta=p-center;float radius=max(8.,uLensRadius),distanceToLens=length(delta),profile=exp(-pow(distanceToLens/radius,4.)*1.6);
 float magnification=mix(1.,uMagnification,profile);vec2 refracted=center+delta/magnification;
 refracted+=delta*(distanceToLens/radius)*profile*uDistortion*.13;
 refracted+=(delta/max(length(delta),.0001))*shock(p)*1.6;
 float chromatic=profile*uDistortion*.5;vec2 direction=normalize(delta+vec2(.001));
 vec3 glass=vec3(sceneAt(refracted+direction*chromatic).r,sceneAt(refracted).g,sceneAt(refracted-direction*chromatic).b);
 vec3 n=surfaceNormal(p);vec3 view=vec3(0,0,1);float f=fresnel(n,view);
 float lensEdge=exp(-pow((distanceToLens-radius*.82)/1.35,2.));
 float lensHighlight=pow(max(dot(normalize(vec3(delta/radius,1.6)),normalize(vec3(-.5,.7,1.))),0.),30.);
 vec3 color=glass*(.75+.32*profile)+uLensTint*(.024+.035*profile);
 color+=mix(uLensTint,vec3(.95),.6)*lensEdge*.14;
 color+=mix(uLensTint,vec3(1.),.6)*lensHighlight*.1;
 color+=mix(uLensTint,vec3(1.),.7)*exp(-depth/.9)*(.075+.12*f);
 color+=uLensTint*exp(-depth/3.)*f*.12;
 fragColor=compositeGlass(color,uLensTint*.08,d);
}`;
