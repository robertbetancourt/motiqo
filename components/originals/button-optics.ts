/** Geometry and numerical guards shared by the three independently exported studies. */
export const buttonOpticsGLSL=`
uniform vec2 uResolution,uSize,uCursor,uVelocity,uClick;
uniform float uTime,uHover,uRippleAge,uThickness,uBevelWidth,uClickRipple;
const float PI=3.141592653589793;
float capsule(vec2 p){vec2 b=uSize*.5;float r=min(b.x,b.y);vec2 q=abs(p)-b+r;return min(max(q.x,q.y),0.)+length(max(q,0.))-r;}
float elevation(vec2 p){float x=clamp(-capsule(p)/max(uBevelWidth,1.),0.,1.);return uThickness*sqrt(max(0.,1.-(1.-x)*(1.-x)));}
vec3 surfaceNormal(vec2 p){vec2 dh=vec2(elevation(p+vec2(.45,0))-elevation(p-vec2(.45,0)),elevation(p+vec2(0,.45))-elevation(p-vec2(0,.45)))/.9;return normalize(vec3(-dh,1.));}
float arcLength(vec2 p){float r=min(uSize.x,uSize.y)*.5,l=max(0.,uSize.x*.5-r),total=4.*l+2.*PI*r;
 if(p.x>l)return r*(atan(p.y,p.x-l)+PI*.5)/total;
 if(p.x< -l){float a=atan(p.y,p.x+l);if(a<0.)a+=2.*PI;return(2.*l+r*(a+PI*.5))/total;}
 return p.y>=0.?(PI*r+l-p.x)/total:(2.*PI*r+3.*l+p.x)/total;}
float shock(vec2 p){float radius=uRippleAge*160.;return sin((length(p-uClick)-radius)*.2)*exp(-pow((length(p-uClick)-radius)/13.,2.))*exp(-uRippleAge*2.)*uClickRipple*.01;}
float fresnel(vec3 n,vec3 view){return .04+.96*pow(1.-clamp(dot(n,view),0.,1.),5.);}
vec4 compositeGlass(vec3 color,vec3 glow,float d){float coverage=1.-smoothstep(-max(fwidth(d),.4),max(fwidth(d),.4),d);float od=max(d,0.);float halo=exp(-od*.65)*(1.-smoothstep(5.,18.,od))*.11;float alpha=coverage+(1.-coverage)*halo;vec3 radiance=color*coverage+glow*halo*(1.-coverage);return vec4(radiance/max(alpha,.00001),alpha);}
`;
export const buttonColor=(hex:string,fallback:string):[number,number,number]=>{const value=/^#[\da-f]{6}$/i.test(hex)?hex:fallback;return[parseInt(value.slice(1,3),16)/255,parseInt(value.slice(3,5),16)/255,parseInt(value.slice(5,7),16)/255];};
export const buttonValue=(value:number,min:number,max:number,fallback:number)=>Math.min(max,Math.max(min,Number.isFinite(value)?value:fallback));
