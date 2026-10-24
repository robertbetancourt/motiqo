const { test } = require("node:test"),
  assert = require("node:assert/strict");
const { load, mount, React } = require("./support/component-harness.cjs");
test('Zenith renders a portal and a real particle ocean, updates motion/pulse and recovers its context',async()=>{
 const three=require('three');let scenes=[],draw,disposed=0,clockDisposed=0;class Renderer{setPixelRatio(){}setSize(){}clear(){}clearDepth(){}render(scene){if(!scenes.includes(scene))scenes.push(scene);}dispose(){disposed++;}}
 const create=load('components/heroes/zenith-beam-scene.ts',{three:{...three,WebGLRenderer:Renderer},'./hero-clock':{heroClock(host,fn,size){draw=fn;size(1280,900);fn({time:1,dt:0,still:true});return{invalidate:()=>fn({time:2,dt:0,still:true}),dispose:()=>clockDisposed++};}}}).createZenithScene,e=await mount(()=>React.createElement('section',null,React.createElement('canvas')));
 try{const host=document.querySelector('section'),canvas=host.querySelector('canvas'),options={beamColor:'#a855f7',interactive:true,paused:false},scene=create(host,canvas,()=>options);assert.equal(scenes.length,2);const mesh=scenes[0].children[0],points=scenes[1].children[0];assert.equal(mesh.geometry.parameters.width,2);assert.equal(points.isPoints,true);assert.equal(points.geometry.attributes.position.count,28560);let resources=0;for(const object of [mesh,points])for(const resource of [object.geometry,object.material])resource.addEventListener('dispose',()=>resources++);scene.pulse();assert.equal(points.material.uniforms.uBurst.value,2);options.beamColor='#ff0000';scene.invalidate();assert.equal(points.material.uniforms.uColor.value.getHexString(),'ff0000');draw({time:3,dt:.016,still:false});assert.equal(host.dataset.waveTime,'3.000');canvas.dispatchEvent(new window.Event('webglcontextlost',{cancelable:true}));assert.equal(host.dataset.gl,'off');canvas.dispatchEvent(new window.Event('webglcontextrestored'));assert.equal(host.dataset.gl,'on');scene.dispose();assert.equal(resources,4);assert.equal(disposed,1);assert.equal(clockDisposed,1);}finally{await e.close();}
});
test('Titanium settles its keyboard rotation and stops its animation clock',async()=>{
 const Card=load('components/originals/titanium-card.tsx').default,e=await mount(Card,{showControls:false});try{await e.advance(2);assert.equal(e.frames.size,0);await e.key(document.querySelector('.ti-card'),'Enter');await e.advance(100);assert.equal(document.querySelector('.ti-back').getAttribute('aria-hidden'),'false');assert.equal(e.frames.size,0);await e.update({showControls:false,paused:true});await e.advance(2);assert.equal(e.frames.size,0);}finally{await e.close();}assert.ok(e.observers.every(o=>o.disconnected));
});
test("Settings replacements preserve app navigation markers without replaying Next internal state", async () => {
  const controls = load("lib/element-controls.ts"),
    useSettings = load("components/use-component-settings.ts", {
      "@/lib/element-controls": controls,
    }).default;
  let api,
    seeded = false;
  const Harness = () => {
      if (!seeded) {
        window.history.replaceState(
          { __NA: true, motiqoElement: true },
          "",
          "/library?element=titanium-card",
        );
        seeded = true;
      }
      api = useSettings("titanium-card");
      return null;
    },
    e = await mount(Harness);
  try {
    assert.equal(window.history.state.__NA, undefined);
    assert.equal(window.history.state.motiqoElement, true);
    await React.act(() => api.update({ maxTilt: 7 }));
    assert.equal(window.history.state.__NA, undefined);
    const config = JSON.parse(
      new URL(window.location.href).searchParams.get("config"),
    );
    assert.equal(config.settings.maxTilt, 7);
  } finally {
    await e.close();
  }
});
test("Lumen compiles and releases each GPU session, updates uniforms and recreates resources after context restoration", async () => {
  let created = 0,
    deleted = 0;
  const uniforms = {};
  const gl = new Proxy(
    {
      VERTEX_SHADER: 1,
      FRAGMENT_SHADER: 2,
      COMPILE_STATUS: 3,
      LINK_STATUS: 4,
      TRIANGLES: 5,
      createShader: () => {
        created++;
        return {};
      },
      createProgram: () => {
        created++;
        return {};
      },
      createVertexArray: () => {
        created++;
        return {};
      },
      deleteShader: () => deleted++,
      deleteProgram: () => deleted++,
      deleteVertexArray: () => deleted++,
      getShaderParameter: () => true,
      getProgramParameter: () => true,
      getUniformLocation: (_, name) => name,
      uniform1f: (name, value) => (uniforms[name] = value),
    },
    { get: (target, key) => target[key] ?? (() => {}) },
  );
  const Button = load("components/originals/lumen-button.tsx").default,
    Wrapper = (props) => {
      window.HTMLCanvasElement.prototype.getContext = () => gl;
      return React.createElement(Button, props);
    },
    e = await mount(Wrapper, {}, true);
  try {
    await e.advance(2);
    const button = document.querySelector("button"),
      canvas = button.querySelector("canvas");
    assert.equal(button.dataset.gl, "on");
    await e.update({ status: "success" });
    await e.advance(2);
    assert.equal(uniforms.uSuccess, 1);
    canvas.dispatchEvent(
      new window.Event("webglcontextlost", { cancelable: true }),
    );
    assert.equal(button.dataset.gl, "off");
    canvas.dispatchEvent(new window.Event("webglcontextrestored"));
    await e.advance(2);
    assert.equal(button.dataset.gl, "on");
    assert.ok(created > 4);
  } finally {
    await e.close();
  }
  assert.equal(created, deleted);
  assert.ok(e.observers.every((o) => o.disconnected));
});
test("Titanium flips accessibly, reveals demo numbers, changes finishes and exposes imperative actions", async () => {
  const Card = load("components/originals/titanium-card.tsx").default,
    api = React.createRef(),
    Wrapper = (props) => React.createElement(Card, { ...props, ref: api }),
    e = await mount(Wrapper, {}, true);
  try {
    await e.advance(2);
    assert.equal(
      document.querySelector(".ti-front").getAttribute("aria-hidden"),
      "false",
    );
    await React.act(() => api.current.flip());
    await e.advance(2);
    assert.equal(
      document.querySelector(".ti-back").getAttribute("aria-hidden"),
      "false",
    );
    await React.act(() => api.current.reveal());
    await e.advance(2);
    assert.equal(
      document.querySelector(".ti-number span").textContent,
      "4716 0381 9254 4242",
    );
    await e.click(
      document.querySelector('[aria-label="Reveal security code"]'),
    );
    await e.advance(2);
    assert.equal(
      document.querySelector(".ti-signature button span").textContent,
      "731",
    );
    await React.act(() => api.current.triggerNfcPulse());
    await e.advance(2);
    assert.match(
      document.querySelector("[role=status]").textContent,
      /visual demo/,
    );
    await e.click(
      [...document.querySelectorAll(".ti-dock button")].find(
        (b) => b.textContent === "Obsidian",
      ),
    );
    await e.advance(2);
    assert.equal(document.querySelector("section").dataset.finish, "obsidian");
    assert.equal(document.querySelectorAll(".ti-edge").length, 4);
    assert.equal(e.frames.size, 0);
  } finally {
    await e.close();
  }
  assert.equal(api.current, null);
  assert.ok(e.observers.every((o) => o.disconnected));
});
test("Lumen remains a real accessible button without GPU, respects disabled and updates its state", async () => {
  let clicks = 0;
  const Button = load("components/originals/lumen-button.tsx").default,
    e = await mount(Button, { onClick: () => clicks++ });
  try {
    const button = document.querySelector("button");
    assert.equal(button.dataset.gl, "off");
    assert.equal(button.type, "button");
    await e.click(button);
    assert.equal(clicks, 1);
    await e.update({ disabled: true, onClick: () => clicks++ });
    assert.equal(button.disabled, true);
    assert.equal(button.querySelector("[data-state=loading]"),null);
    await e.click(button);
    assert.equal(clicks, 1);
    await e.update({ status: "success" });
    assert.equal(button.disabled, false);
    assert.equal(button.querySelector(".lb-sr").textContent, "Done");
    assert.equal(e.frames.size, 0);
  } finally {
    await e.close();
  }
});
test("Ink exposes real DOM text, scrubs the absorption filter and releases it when dry", async () => {
  const Ink = load("components/originals/ink-headline.tsx").default,
    e = await mount(Ink, {
      defaultText: "Real ink.",
      progress: 0.45,
      showControls: false,
    });
  try {
    await e.advance(2);
    assert.equal(
      document.querySelector("h2").getAttribute("aria-label"),
      "Real ink.",
    );
    assert.equal(document.querySelectorAll("[data-ink-unit]").length, 2);
    assert.match(document.querySelector("[data-ink-unit]").style.filter, /url/);
    await e.update({
      defaultText: "Real ink.",
      progress: 1,
      showControls: false,
    });
    await e.advance(2);
    assert.ok(
      [...document.querySelectorAll("[data-ink-unit]")].every(
        (node) => node.style.filter === "none",
      ),
    );
    assert.equal(document.querySelector(".ih-toolbar"),null);
    assert.equal(document.querySelector(".ih-kicker"),null);
    assert.equal(document.querySelectorAll(".ih-page button").length,1);
    await e.update({defaultTheme:"light",progress:1,showControls:false});
    assert.equal(
      document.querySelector(".ink-headline").dataset.theme,
      "light",
    );
    await e.update({
      defaultText: "Three",
      by: "char",
      progress: 1,
      paused: true,
      showControls: false,
    });
    await e.advance(2);
    assert.equal(document.querySelectorAll("[data-ink-unit]").length, 5);
    assert.equal(e.frames.size, 0);
  } finally {
    await e.close();
  }
  assert.ok(e.observers.every((o) => o.disconnected));
});
test("Ink reduced motion presents dry text and replay never leaves an idle loop", async () => {
  const Ink = load("components/originals/ink-headline.tsx").default,
    e = await mount(Ink, { showControls: false }, true);
  try {
    await e.advance(2);
    assert.equal(document.querySelector(".ink-headline").dataset.progress, "1");
    await e.click(document.querySelector('[aria-label="Replay ink"]'));
    await e.advance(2);
    assert.equal(e.frames.size, 0);
  } finally {
    await e.close();
  }
});

test('Titanium samples a fixed hit plane and keeps easing under repeated edge pointer events',async()=>{
 const Card=load('components/originals/titanium-card.tsx').default,e=await mount(Card,{showControls:false});
 try{await e.advance(2);const hit=document.querySelector('.ti-space'),card=document.querySelector('.ti-card');hit.getBoundingClientRect=()=>({left:0,top:0,width:400,height:250});card.getBoundingClientRect=()=>{throw Error('Rotating bounds must not drive pointer tilt');};
 for(let i=0;i<80;i++){await React.act(()=>hit.dispatchEvent(new window.MouseEvent('pointermove',{bubbles:true,clientX:399,clientY:125})));await e.advance(1);}
 const angle=Number(card.style.transform.match(/rotateY\(([-.\d]+)deg/)[1]);assert.ok(angle>14&&angle<=15,'Continuous pointer events must not freeze the clock');assert.equal(card.style.getPropertyValue('--mx'),'99.75%');
 await React.act(()=>hit.dispatchEvent(new window.MouseEvent('pointermove',{bubbles:true,clientX:500,clientY:-50})));await e.advance(80);assert.equal(card.style.getPropertyValue('--mx'),'100%');assert.equal(card.style.getPropertyValue('--my'),'0%');
 await React.act(()=>hit.dispatchEvent(new window.MouseEvent('pointerout',{bubbles:true,relatedTarget:document.body})));await e.advance(100);assert.equal(e.frames.size,0);
 }finally{await e.close();}
});
test('Lumen showcase contains one button, goes directly to animated success and accepts panel disabled',async()=>{
 let notified;const C=load('components/originals/lumen-button.tsx').LumenButtonShowcase,e=await mount(C,{onStatusChange:value=>notified=value});
 try{assert.equal(document.querySelectorAll('button').length,1);assert.equal(document.querySelector('.lb-studio'),null);await e.click(document.querySelector('button'));assert.equal(document.querySelector('button').dataset.status,'success');assert.equal(document.querySelector('.lb-sr').textContent,'Done');assert.equal(notified,'success');await e.update({status:'success'});await e.update({status:'idle'});assert.equal(document.querySelector('button').dataset.status,'idle');await e.update({disabled:true});assert.equal(document.querySelector('button').disabled,true);}finally{await e.close();}
});
