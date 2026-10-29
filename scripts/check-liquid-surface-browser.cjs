const { chromium } = require(process.env.MOTIQO_PLAYWRIGHT || "playwright");
const fs = require("node:fs"),
  ts = require("typescript-compiler-api"),
  assert = require("node:assert/strict");
const mod = { exports: {} };
new Function(
  "module",
  "exports",
  ts.transpileModule(
    fs.readFileSync("components/originals/liquid-form-shaders.ts", "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  ).outputText,
)(mod, mod.exports);
(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ["--enable-unsafe-swiftshader"],
  });
  try {
    const page = await browser.newPage();
    const result = await page.evaluate(({ vertex, fragment }) => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 512;
      const gl = canvas.getContext("webgl2", { alpha: true, antialias: false });
      if (!gl) throw Error("WebGL2 required");
      function program(source) {
        const p = gl.createProgram();
        for (const [type, code] of [
          [gl.VERTEX_SHADER, vertex],
          [gl.FRAGMENT_SHADER, source],
        ]) {
          const shader = gl.createShader(type);
          gl.shaderSource(shader, code);
          gl.compileShader(shader);
          if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
            throw Error(gl.getShaderInfoLog(shader));
          gl.attachShader(p, shader);
          gl.deleteShader(shader);
        }
        gl.linkProgram(p);
        if (!gl.getProgramParameter(p, gl.LINK_STATUS))
          throw Error(gl.getProgramInfoLog(p));
        return p;
      }
      // Red marks rays that exhausted the loop inside the bounding volume.
      const debug = fragment.replace(
        "if(!hit){colour=vec4(0.);return;}",
        "if(!hit){colour=travel<=end?vec4(1.,0.,0.,1.):vec4(0.);return;}",
      );
      const old = debug
          .replace("i<112", "i<82")
          .replace("if(d<pixelRadius)", "if(d<.0018)"),
        programs = [program(old), program(debug)];
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
        gl.STATIC_DRAW,
      );
      const samples = [];
      for (const shape of [0, 1, 2])
        for (const time of [0, 0.6, 4, 9]) {
          const counts = programs.map((p) => {
            gl.useProgram(p);
            const attr = gl.getAttribLocation(p, "position");
            gl.enableVertexAttribArray(attr);
            gl.vertexAttribPointer(attr, 2, gl.FLOAT, false, 0, 0);
            gl.viewport(0, 0, 512, 512);
            gl.uniform2f(gl.getUniformLocation(p, "resolution"), 512, 512);
            gl.uniform2f(gl.getUniformLocation(p, "pointer"), 0.25, 0.1);
            gl.uniform3f(gl.getUniformLocation(p, "tint"), 0.74, 0.79, 0.73);
            for (const [key, value] of Object.entries({
              shape,
              time,
              presence: 0.5,
              liquidity: 0.8,
              relief: 0.35,
              scale: 1,
            }))
              gl.uniform1f(gl.getUniformLocation(p, key), value);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            const pixels = new Uint8Array(512 * 512 * 4);
            gl.readPixels(0, 0, 512, 512, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
            let count = 0;
            for (let i = 0; i < pixels.length; i += 4)
              if (pixels[i] > 250 && pixels[i + 1] < 3 && pixels[i + 2] < 3)
                count++;
            return count;
          });
          samples.push({ shape, time, before: counts[0], after: counts[1] });
        }
      programs.forEach((p) => gl.deleteProgram(p));
      gl.deleteBuffer(buffer);
      return samples;
    }, mod.exports);
    const before = result.reduce((n, r) => n + r.before, 0),
      after = result.reduce((n, r) => n + r.after, 0);
    assert.ok(
      result.every((r) => r.after <= r.before),
      JSON.stringify(result),
    );
    assert.ok(after < before * 0.45);
    console.log(
      JSON.stringify({
        resolution: "512x512",
        phases: result.length,
        exhaustedRaysBefore: before,
        exhaustedRaysAfter: after,
        samples: result,
      }),
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
