const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load, mount, React } = require('./support/component-harness.cjs');

test('OrbitStageHero mounts cleanly, exposes typography and cleans up resources', async () => {
  const OrbitStageHero = load('components/originals/orbit-stage-hero.tsx').default;
  const e = await mount(OrbitStageHero, {
    titleMuted: 'Your Motion.',
    titleBright: 'Your System. One Engine',
    ctaText: 'Explore Library',
    orbitSpeed: 1.0,
    paused: true,
  });

  try {
    const root = document.querySelector('.orbit-stage-hero');
    assert.ok(root, 'OrbitStageHero root rendered');

    const muted = root.querySelector('.orbit-title-muted, .text-\\[\\#48484F\\]');
    assert.ok(muted, 'Muted title line found');
    assert.equal(muted.textContent, 'Your Motion.');

    const bright = root.querySelector('.orbit-title-bright, .text-white.text-center');
    assert.ok(bright, 'Bright title line found');
    assert.equal(bright.textContent, 'Your System. One Engine');

    assert.equal(root.querySelector('header'),null);
    assert.equal(root.querySelector('button'),null);
    assert.equal(root.getAttribute('aria-label'),'OrbitStage');

    const canvas = root.querySelector('canvas');
    assert.ok(canvas, 'Three.js canvas rendered');
  } finally {
    await e.close();
  }
  assert.ok(e.observers.every(o => o.disconnected), 'All observers disconnected');
});

test('OpticalArtifactCard mounts with provenance, cycles multiplier, opens history drawer and triggers buy flow', async () => {
  const Card = load('components/originals/optical-artifact-card.tsx').default;
  const e = await mount(Card, {
    ownerId: '5811EX',
    creatorId: '45TY87',
    priceEth: '5.65',
    priceUsd: '10,344',
    accentColor: '#00F0A8',
    theme: 'light',
    paused: true,
  });

  try {
    const card = document.querySelector('.optical-card');
    assert.ok(card, 'OpticalArtifactCard rendered');

    // Provenance check
    assert.ok(card.textContent.includes('5811EX'), 'Owner ID present');
    assert.ok(card.textContent.includes('45TY87'), 'Creator ID present');

    // Price & multiplier cycle check
    assert.ok(card.textContent.includes('ETH 5.65'), 'Price in ETH present');
    assert.ok(card.textContent.includes('- X1'), 'Multiplier X1 present');

    const multBtn = card.querySelector('button[title="Change multiplier"]');
    assert.ok(multBtn, 'Multiplier button found');
    await e.click(multBtn);
    assert.ok(card.textContent.includes('- X2'), 'Multiplier cycled to X2');

    // History drawer toggle check
    const historyBtn = card.querySelector('.optical-history-btn');
    assert.ok(historyBtn, 'History toggle button found');
    await e.click(historyBtn);
    assert.ok(card.textContent.includes('Price Trend'), 'History drawer opened with Price Trend');

    // Buy now button check
    const buyBtn = card.querySelector('.optical-buy-btn');
    assert.ok(buyBtn, 'Buy button found');
    assert.ok(buyBtn.textContent.includes('Buy Now'), 'Initial Buy Now label');
  } finally {
    await e.close();
  }
  assert.ok(e.observers.every(o => o.disconnected), 'All observers disconnected');
});

test('Orbit initializes its paused 3D layout, retains its scene across live settings and releases late textures',async()=>{
  const three=require('three'),sessions=[],requests=[];
  class Renderer{constructor(){this.capabilities={getMaxAnisotropy:()=>4};}setPixelRatio(value){this.pixelRatio=value;}setSize(){}render(scene){this.scene=scene;}dispose(){this.disposed=true;}}
  const renderers=[];class TrackedRenderer extends Renderer{constructor(){super();renderers.push(this);}}
  class Loader{load(url,done){requests.push({url,done});return new three.Texture();}}
  const C=load('components/originals/orbit-stage-hero.tsx',{
    three:{...three,WebGLRenderer:TrackedRenderer,TextureLoader:Loader},
    './effect-runtime':{effectRuntime(host,canvas,draw,pause,resize){const s={draw,pause,dispose(){this.disposed=true;},invalidate(){draw(2.5,0);}};sessions.push(s);resize(1100,680,1);draw(2.5,0);return s;}},
  }).default;
  const images=[],Wrapper=props=>{
    const gradient={addColorStop(){}};
    window.HTMLCanvasElement.prototype.getContext=()=>new Proxy({createLinearGradient:()=>gradient,createRadialGradient:()=>gradient},{get:(target,key)=>target[key]??(()=>{})});
    return React.createElement(C,{...props,images});
  },e=await mount(Wrapper,{paused:true});
  try{
    const renderer=renderers.at(-1),session=sessions.at(-1),cards=[];assert.equal(renderer.pixelRatio,2);
    renderer.scene.traverse(node=>{if(node.material?.uniforms?.uTexture)cards.push(node);});
    assert.equal(cards.length,10);assert.ok(cards.some(card=>card.position.z>2));assert.ok(cards.some(card=>card.position.z< -2));
    assert.ok(cards.every(card=>card.position.length()>2));
    const phone=renderer.scene.getObjectByName('OrbitStage phone mockup');assert.equal(phone.rotation.y,.36);assert.equal(phone.rotation.x,-.14);assert.equal(phone.rotation.z,-.065);assert.equal(phone.scale.x,1.3);const layers={upper:[],lower:[]};renderer.scene.traverse(node=>{if(node.material?.userData.layer)layers[node.material.userData.layer].push(node.material);});assert.equal(layers.upper.length,8);assert.equal(layers.lower.length,8);assert.ok(Math.max(...layers.upper.map(m=>m.uniforms.uIntensity.value))<Math.max(...layers.lower.map(m=>m.uniforms.uIntensity.value)));assert.ok([...layers.upper,...layers.lower].every(m=>m.uniforms.uTime.value===2.5));assert.ok(requests.every(request=>request.url==='/media/lumi-orbit-screen.png'));
    assert.equal(phone.children[0].geometry.parameters.options.depth,.22);
    for(const material of [phone.children[0].material,phone.getObjectByName('Lumi display with lower fade').material]){
      const shader={vertexShader:'#include <begin_vertex>',fragmentShader:'#include <dithering_fragment>'};material.onBeforeCompile(shader);
      assert.ok(shader.vertexShader.includes('(position.y+2.375)/4.75'));
      assert.ok(shader.fragmentShader.includes('smoothstep(0.35,0.58,vPhoneY)'));
      assert.ok(shader.fragmentShader.includes('gl_FragColor.a*=verticalMask'));
    }
    assert.ok(layers.upper.every(m=>m.uniforms.uDirection.value===-1));assert.ok(layers.lower.every(m=>m.uniforms.uDirection.value===1));const count=renderers.length;await e.update({paused:false,orbitSpeed:2,lineColor:'#ff00aa'});assert.equal(layers.upper[0].uniforms.uLineColor.value.getHexString(),'ff00aa');assert.equal(renderers.length,count);assert.equal(session.pause(),false);
    const angle=document.querySelector('.orbit-stage-hero').dataset.orbitAngle;session.draw(3,.016);assert.notEqual(document.querySelector('.orbit-stage-hero').dataset.orbitAngle,angle);
    await e.update({paused:false,lineColor2:'#00aaff',lineColor3:'#ffaa00',lineSpeed:0});
    const trail=layers.upper[0],phase=trail.uniforms.uLinePhase.value;
    session.draw(4,.1);assert.equal(trail.uniforms.uLinePhase.value,phase);
    assert.equal(trail.uniforms.uLineColor2.value.getHexString(),'00aaff');assert.equal(trail.uniforms.uLineColor3.value.getHexString(),'ffaa00');
    await e.update({lineSpeed:2});session.draw(5,.1);assert.ok(Math.abs(trail.uniforms.uLinePhase.value-phase-.2)<1e-8);
    assert.equal(renderers.length,count,'Palette and trail speed retain the same scene');
    const resources=new Set();renderer.scene.traverse(node=>{if(node.geometry)resources.add(node.geometry);if(node.material)resources.add(node.material);});let disposed=0;for(const resource of resources)resource.addEventListener('dispose',()=>disposed++);
    await e.close();assert.equal(disposed,resources.size);
    const texture=new three.Texture();let lateDisposed=false;texture.addEventListener('dispose',()=>lateDisposed=true);requests.at(-1).done(texture);assert.equal(lateDisposed,true);
    assert.ok(renderers.every(renderer=>renderer.disposed));assert.ok(sessions.every(session=>session.disposed));
  }catch(error){await e.close();throw error;}
});

test('Optical card uses CSS pixel optics, stable edge input and live theme/pause without reallocating its GPU',async()=>{
  const sessions=[],draws=[],passes=[];
  const C=load('components/originals/optical-artifact-card.tsx',{
    './native-gl':{createNativeGL(){const session={pass(source){passes.push(source);return{};},draw(pass,target,uniforms){draws.push(uniforms);},dispose(){this.disposed=true;}};sessions.push(session);return session;}},
    './effect-runtime':{effectRuntime(host,canvas,draw,pause){return{draw,pause,invalidate(){draw(3,.016);},dispose(){}};}},
  }).default,e=await mount(C,{theme:'dark'});
  try{
    const card=document.querySelector('.optical-card'),hit=document.querySelector('.opt-card-hit'),canvas=document.querySelector('.opt-canvas');
    Object.defineProperty(card,'clientWidth',{value:350});Object.defineProperty(card,'clientHeight',{value:454});canvas.width=700;canvas.height=908;
    hit.getBoundingClientRect=()=>({left:0,top:0,width:350,height:454});card.getBoundingClientRect=()=>{throw Error('Transformed card bounds must not drive hover');};
    await React.act(()=>hit.dispatchEvent(new window.MouseEvent('pointermove',{bubbles:true,clientX:349,clientY:227})));
    assert.deepEqual(draws.at(-1).uResolution,[390,494]);assert.deepEqual(draws.at(-1).uSize,[338,442]);
    assert.equal(passes.at(-1).includes('#version'),false,'Native renderer supplies one version/header');
    assert.ok(passes.at(-1).includes('min(26.,min(uSize.x,uSize.y)*.5)-depth'),'Rounded card chart fades before its corner medial axes');
    const count=sessions.length;await e.update({theme:'light',paused:true});assert.equal(sessions.length,count);assert.equal(draws.at(-1).uIsDark,0);assert.equal(document.querySelector('.optical-artifact-wrapper').dataset.theme,'light');
    assert.equal(document.querySelector('.opt-theme-bar'),null);assert.equal(document.querySelector('.opt-artwork').getAttribute('src'),'/media/optical-artifact-bust-purple.png');
    await e.update({artworkSrc:'https://example.com/my-art.png'});
    assert.equal(document.querySelector('.opt-artwork').getAttribute('src'),'https://example.com/my-art.png');
    await React.act(()=>document.querySelector('.opt-artwork').dispatchEvent(new window.Event('error')));
    assert.equal(document.querySelector('.opt-artwork').getAttribute('src'),'/media/optical-artifact-bust-purple.png');
    await e.update({artworkSrc:'javascript:alert(1)'});
    assert.equal(document.querySelector('.opt-artwork').getAttribute('src'),'/media/optical-artifact-bust-purple.png');
    await e.update({artworkSrc:'/media/gallery/image-03.webp'});
    assert.equal(document.querySelector('.opt-artwork').getAttribute('src'),'/media/gallery/image-03.webp');
  }finally{await e.close();}
  assert.ok(sessions.every(session=>session.disposed));
});
