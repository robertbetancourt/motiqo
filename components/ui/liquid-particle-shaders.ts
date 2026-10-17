/** Motiqo image reconstruction and spring-grain renderer. */
export const SURFACE_VERTEX = `#version 300 es
precision highp float;
uniform vec2 uViewport;
uniform vec4 uRect;
out vec2 uv;
void main(){
 vec2 corners[6]=vec2[6](vec2(0,0),vec2(1,0),vec2(0,1),vec2(0,1),vec2(1,0),vec2(1,1));
 uv=corners[gl_VertexID];
 vec2 p=uRect.xy+uv*uRect.zw;
 gl_Position=vec4(p/uViewport*vec2(2,-2)+vec2(-1,1),0,1);
}`;
export const SURFACE_FRAGMENT = `#version 300 es
precision highp float;
uniform sampler2D uImage;
uniform vec2 uMouse;
uniform vec4 uRect;
uniform float uRadius;
uniform float uPresence;
uniform float uRest;
in vec2 uv;
out vec4 color;
void main(){
 vec4 pixel=texture(uImage,uv);
 float d=length(uRect.xy+uv*uRect.zw-uMouse);
 float lift=(1.-smoothstep(uRadius*.2,uRadius,d))*uPresence;
 color=vec4(pixel.rgb,pixel.a*(1.-max(uRest,lift)));
}`;
export const GRAIN_VERTEX = `#version 300 es
precision highp float;
layout(location=0) in vec4 aGrain;
layout(location=1) in vec4 aColor;
uniform vec2 uViewport;
uniform float uDot;
uniform float uDpr;
out vec4 tint;
void main(){
 gl_Position=vec4(aGrain.xy/uViewport*vec2(2,-2)+vec2(-1,1),0,1);
 gl_PointSize=clamp(uDot*uDpr*(1.+min(aGrain.w,2.)),1.,32.);
 tint=vec4(aColor.rgb,aColor.a*aGrain.z);
}`;
export const GRAIN_FRAGMENT = `#version 300 es
precision highp float;
in vec4 tint;
out vec4 color;
void main(){float r=length(gl_PointCoord-.5)*2.;color=vec4(tint.rgb,tint.a*(1.-smoothstep(.55,1.,r)));}`;
