/** Motiqo: continuous material reconstruction and velocity-aligned filaments. */
export const SURFACE_VERTEX = `#version 300 es
precision highp float;
out vec2 uv;
void main(){
 vec2 corners[6]=vec2[6](vec2(0,0),vec2(1,0),vec2(0,1),vec2(0,1),vec2(1,0),vec2(1,1));
 uv=corners[gl_VertexID];
 gl_Position=vec4(uv*vec2(2,-2)+vec2(-1,1),0,1);
}`;
export const SURFACE_FRAGMENT = `#version 300 es
precision highp float;
uniform sampler2D uImage;
uniform sampler2D uWake;
uniform vec2 uViewport;
uniform vec4 uRect;
uniform float uRest;
in vec2 uv;
out vec4 color;
void main(){
 vec4 material=texture(uWake,uv);
 vec2 offset=(material.rg*255.-128.)/127.*128.;
 vec2 home=(uv*uViewport-offset-uRect.xy)/uRect.zw;
 if(any(lessThan(home,vec2(0)))||any(greaterThan(home,vec2(1)))){color=vec4(0);return;}
 vec4 pixel=texture(uImage,home);
 float released=texture(uWake,(uRect.xy+home*uRect.zw)/uViewport).b;
 float alpha=pixel.a*(1.-max(uRest,released));
 color=vec4(pixel.rgb*alpha,alpha);
}`;
export const GRAIN_VERTEX = `#version 300 es
precision highp float;
layout(location=0) in vec4 aGrain;
layout(location=1) in vec4 aColor;
layout(location=2) in vec2 aVelocity;
uniform vec2 uViewport;
uniform float uDot;
uniform float uDpr;
out vec2 local;
out float halfLength;
out float radius;
out vec4 tint;
void main(){
 vec2 corners[6]=vec2[6](vec2(-1,-1),vec2(1,-1),vec2(-1,1),vec2(-1,1),vec2(1,-1),vec2(1,1));
 float speed=length(aVelocity);
 vec2 axis=speed>.01?aVelocity/speed:vec2(1,0);
 radius=max(.45,uDot*.5);
 halfLength=min(aGrain.w,12.);
 local=corners[gl_VertexID]*vec2(radius+halfLength+1./uDpr,radius+1./uDpr);
 vec2 p=aGrain.xy+axis*(local.x-halfLength*.45)+vec2(-axis.y,axis.x)*local.y;
 gl_Position=vec4(p/uViewport*vec2(2,-2)+vec2(-1,1),0,1);
 float sheen=min(.18,speed*.0006);
 tint=vec4(min(vec3(1),aColor.rgb*(1.+sheen)),aColor.a*aGrain.z);
}`;
export const GRAIN_FRAGMENT = `#version 300 es
precision highp float;
in vec2 local;
in float halfLength;
in float radius;
in vec4 tint;
uniform float uDpr;
out vec4 color;
void main(){
 vec2 nearest=vec2(max(0.,abs(local.x)-halfLength),local.y);
 float coverage=clamp((radius-length(nearest))*uDpr+.5,0.,1.);
 float taper=1.-.28*smoothstep(-halfLength,halfLength+radius,-local.x);
 float alpha=tint.a*coverage*taper;
 color=vec4(tint.rgb*alpha,alpha);
}`;
