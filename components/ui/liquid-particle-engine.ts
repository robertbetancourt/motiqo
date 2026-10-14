/**
 * Particle simulation adapted from Sculpture Hero by Guglielmo Giannattasio
 * (guglielmogiannattasio.it), supplied by the user via 21st.dev.
 * Original flow, image/particle dissolve, curl noise and return dynamics retained.
 * Motiqo adds its own artwork, presentation, controls and lifecycle safeguards.
 */
import { QUAD_VS, FLOW_FS, SIM_FS, PART_VS, PART_FS, IMAGE_FS } from './liquid-particle-shaders';
export type Rect = { x: number; y: number; w: number; h: number }

export interface EngineOptions {
  paused?: boolean
  compact?: boolean
  interactive: boolean
  strength: number
  radius: number
  density: number
  dotSize: number
  spread: number
  turbulence: number
  returnSpeed: number
  streaks: boolean
  restStyle: "image" | "particles"
  ambient: boolean
  ambientIntensity: number
  speed: number
  intro: boolean
  reducedMotion: boolean
  bg: [number, number, number]
  /** null = detected from the image corners */
  imgBg: [number, number, number] | null
  /** 0 – 2: how much the whole sculpture flows while the cursor is over it */
  liquid: number
}

function clamp(v: number, a: number, b: number) {
  return Math.min(b, Math.max(a, v))
}

/* ── helpers ─────────────────────────────────────────────────────────── */

type Prog = { p: WebGLProgram; u: Record<string, WebGLUniformLocation | null> }

function compile(gl: WebGL2RenderingContext, vs: string, fs: string): Prog {
  const shaders: WebGLShader[] = []
  const make = (type: number, src: string) => {
    const sh = gl.createShader(type)!
    shaders.push(sh)
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(sh)
      throw new Error("Shader: " + log)
    }
    return sh
  }
  const p = gl.createProgram()!
  try {
  const v = make(gl.VERTEX_SHADER, vs)
  const f = make(gl.FRAGMENT_SHADER, fs)
  gl.attachShader(p, v)
  gl.attachShader(p, f)
  gl.bindAttribLocation(p, 0, "aPos")
  gl.linkProgram(p)
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error("Link: " + gl.getProgramInfoLog(p))
  const u: Record<string, WebGLUniformLocation | null> = {}
  const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS)
  for (let i = 0; i < n; i++) {
    const info = gl.getActiveUniform(p, i)
    if (info) u[info.name] = gl.getUniformLocation(p, info.name)
  }
  return { p, u }
  } catch (error) {
    gl.deleteProgram(p)
    throw error
  } finally {
    shaders.forEach(shader => gl.deleteShader(shader))
  }
}

/* ── engine ──────────────────────────────────────────────────────────── */

const TEX_W = 1024
const SETTLE_FRAMES = 270

export class LiquidEngine {
  get particleCount() { return this.n }
  lastImage: HTMLImageElement | null = null
  /** Called once, after the first frame has actually been drawn. */
  onFirstFrame: (() => void) | null = null

  private canvas: HTMLCanvasElement
  private gl: WebGL2RenderingContext
  private opts: EngineOptions
  private onFail: () => void
  private lowPower = false
  private stateFormat: { internal: number; type: number } = { internal: 0, type: 0 }

  private pFlow!: Prog
  private pSim!: Prog
  private pPart!: Prog
  private pImg!: Prog
  private vao!: WebGLVertexArrayObject
  private quad!: WebGLBuffer

  private imgTex: WebGLTexture | null = null
  private flowTex: WebGLTexture[] = []
  private flowFb: WebGLFramebuffer[] = []
  private flowW = 256
  private flowH = 104
  private flowIdx = 0
  private flowDirty = false

  private homeTex: WebGLTexture | null = null
  private colTex: WebGLTexture | null = null
  private stateTex: WebGLTexture[] = []
  private stateFb: WebGLFramebuffer[] = []
  private stateIdx = 0
  private texH = 1
  private n = 0
  private gridW = 1
  private stateDirty = false
  private alphaMode = false
  private imgBg: [number, number, number] = [0.918, 0.914, 0.906]
  private flowing = 0

  private aspect = 2.5
  private rect: Rect = { x: 0, y: 0, w: 1, h: 1 }
  private cssW = 1
  private cssH = 1

  private target = { x: -9999, y: -9999 }
  private mouse = { x: -9999, y: -9999 }
  private prevMouse = { x: -9999, y: -9999 }
  private mvel = { x: 0, y: 0 }
  private presence = 0
  private presenceTarget = 0
  private burst = 0
  private lastInput = -1e9
  private settle = 1e9
  private touchRelease = 0

  private time = 0
  private introT = 1
  private presentedRaf = 0
  private raf = 0
  private running = false
  private last = 0
  private skip = 0
  private visible = true
  private ready = false
  private destroyed = false
  private lost = false

  constructor(canvas: HTMLCanvasElement, opts: EngineOptions, onFail: () => void) {
    this.canvas = canvas
    this.opts = opts
    this.onFail = onFail
    // alpha: an unpresented canvas stays transparent, so the static image under it shows
    const gl = canvas.getContext("webgl2", {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: true,
      preserveDrawingBuffer: false,
      powerPreference: "high-performance",
    }) as WebGL2RenderingContext | null
    if (!gl) throw new Error("WebGL2 unavailable")
    this.gl = gl
    const nav = navigator as Navigator & { deviceMemory?: number }
    this.lowPower =
      (nav.hardwareConcurrency || 8) <= 4 ||
      (nav.deviceMemory || 8) <= 4 ||
      window.matchMedia("(pointer: coarse)").matches
    try { this.initGL() } catch (error) { this.destroy(); throw error }
    canvas.addEventListener("webglcontextlost", this.onLost, false)
  }

  private onLost = (e: Event) => {
    e.preventDefault()
    this.lost = true
    this.stop()
    this.onFail()
  }

  private initGL() {
    const gl = this.gl
    // float render targets: RGBA16F is enough (offsets in px, sub-pixel precision)
    const full = gl.getExtension("EXT_color_buffer_float")
    const half = full ? null : gl.getExtension("EXT_color_buffer_half_float")
    if (!full && !half) throw new Error("No float render targets")
    this.stateFormat = { internal: gl.RGBA16F, type: gl.HALF_FLOAT }

    this.pFlow = compile(gl, QUAD_VS, FLOW_FS)
    this.pSim = compile(gl, QUAD_VS, SIM_FS)
    this.pPart = compile(gl, PART_VS, PART_FS)
    this.pImg = compile(gl, QUAD_VS, IMAGE_FS)

    this.vao = gl.createVertexArray()!
    gl.bindVertexArray(this.vao)
    this.quad = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

    for (let i = 0; i < 2; i++) {
      const t = this.makeTex(gl.RGBA8, this.flowW, this.flowH, gl.RGBA, gl.UNSIGNED_BYTE, null, gl.LINEAR)
      const fb = gl.createFramebuffer()!
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb)
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0)
      this.flowTex.push(t)
      this.flowFb.push(fb)
    }
    this.clearFlow()
  }

  private makeTex(
    internal: number,
    w: number,
    h: number,
    format: number,
    type: number,
    data: ArrayBufferView | null,
    filter: number
  ) {
    const gl = this.gl
    const t = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, t)
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
    gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, format, type, data)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    return t
  }

  private clearFlow() {
    const gl = this.gl
    for (const fb of this.flowFb) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb)
      gl.viewport(0, 0, this.flowW, this.flowH)
      gl.clearColor(128 / 255, 128 / 255, 0, 1)
      gl.clear(gl.COLOR_BUFFER_BIT)
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    this.flowDirty = false
  }

  private clearState() {
    const gl = this.gl
    for (const fb of this.stateFb) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb)
      gl.viewport(0, 0, TEX_W, this.texH)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    this.stateDirty = false
  }

  setImage(img: HTMLImageElement) {
    if (this.destroyed || this.lost) return
    const gl = this.gl
    this.lastImage = img
    this.aspect = img.naturalWidth / img.naturalHeight || 2.5
    this.flowH = Math.max(32, Math.round(this.flowW / this.aspect))
    for (const t of this.flowTex) {
      gl.bindTexture(gl.TEXTURE_2D, t)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, this.flowW, this.flowH, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
    }
    this.clearFlow()
    if (this.imgTex) gl.deleteTexture(this.imgTex)
    this.imgTex = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, this.imgTex)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
    gl.generateMipmap(gl.TEXTURE_2D)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    this.buildParticles(img)
    this.ready = true
    if (this.opts.intro && !this.opts.reducedMotion) this.startIntro()
    this.wake()
  }

  /** One particle per material pixel of a grid laid over the image. */
  private buildParticles(img: HTMLImageElement) {
    const gl = this.gl
    const baseGrid = this.lowPower || this.opts.compact ? 640 : 1000
    const gw = Math.round(baseGrid * Math.sqrt(clamp(this.opts.density, 0.15, 2)))
    const gh = Math.max(1, Math.round(gw / this.aspect))
    this.gridW = gw
    let data: Uint8ClampedArray
    try {
      const c = document.createElement("canvas")
      c.width = gw
      c.height = gh
      const ctx = c.getContext("2d", { willReadFrequently: true })!
      ctx.imageSmoothingQuality = "high"
      ctx.drawImage(img, 0, 0, gw, gh)
      data = ctx.getImageData(0, 0, gw, gh).data
    } catch {
      throw new Error("Image is not CORS-readable")
    }
    // a cut-out (transparent) image is sampled by alpha, a flat one by colour distance
    let transparent = 0
    for (let i = 3; i < data.length; i += 4 * 7) if (data[i] < 250) transparent++
    this.alphaMode = transparent > data.length / (4 * 7) / 20
    if (this.opts.imgBg) this.imgBg = this.opts.imgBg
    else if (!this.alphaMode) {
      // flat background: average the four corners
      let r = 0, g = 0, b = 0, n = 0
      const pw = Math.max(2, Math.round(gw * 0.012))
      for (const [cx, cy] of [[0, 0], [gw - pw, 0], [0, gh - pw], [gw - pw, gh - pw]]) {
        for (let y = cy; y < cy + pw; y++)
          for (let x = cx; x < cx + pw; x++) {
            const i = (y * gw + x) * 4
            r += data[i]; g += data[i + 1]; b += data[i + 2]; n++
          }
      }
      this.imgBg = [r / n / 255, g / n / 255, b / n / 255]
    }
    const home: number[] = []
    const col: number[] = []
    for (let y = 0; y < gh; y++) {
      for (let x = 0; x < gw; x++) {
        const i = (y * gw + x) * 4
        const r = data[i] / 255
        const g = data[i + 1] / 255
        const b = data[i + 2] / 255
        if (this.alphaMode) {
          const a = data[i + 3] / 255
          if (a < 0.12) continue
          if (a < 0.5 && Math.random() > a * 2) continue
        } else {
          const dev = Math.hypot(r - this.imgBg[0], g - this.imgBg[1], b - this.imgBg[2])
          if (dev < 0.03) continue
          if (dev < 0.07 && Math.random() > (dev - 0.03) / 0.04) continue
        }
        const jx = (Math.random() - 0.5) * 0.6
        const jy = (Math.random() - 0.5) * 0.6
        home.push((x + 0.5 + jx) / gw, (y + 0.5 + jy) / gh, Math.random(), 0.85 + Math.random() * 0.3)
        col.push(data[i], data[i + 1], data[i + 2], 255)
      }
    }
    const n = home.length / 4
    this.n = n
    this.texH = Math.max(1, Math.ceil(n / TEX_W))
    const total = TEX_W * this.texH
    const homeArr = new Float32Array(total * 4)
    homeArr.set(home)
    const colArr = new Uint8Array(total * 4)
    colArr.set(col)

    for (const t of [this.homeTex, this.colTex, ...this.stateTex]) if (t) gl.deleteTexture(t)
    for (const f of this.stateFb) gl.deleteFramebuffer(f)
    this.stateTex = []
    this.stateFb = []
    this.homeTex = this.makeTex(gl.RGBA32F, TEX_W, this.texH, gl.RGBA, gl.FLOAT, homeArr, gl.NEAREST)
    this.colTex = this.makeTex(gl.RGBA8, TEX_W, this.texH, gl.RGBA, gl.UNSIGNED_BYTE, colArr, gl.NEAREST)
    for (let i = 0; i < 2; i++) {
      const t = this.makeTex(this.stateFormat.internal, TEX_W, this.texH, gl.RGBA, this.stateFormat.type, null, gl.NEAREST)
      const fb = gl.createFramebuffer()!
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb)
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0)
      this.stateTex.push(t)
      this.stateFb.push(fb)
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error("Float FBO incomplete")
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    this.homeData = homeArr
    this.clearState()
  }

  private homeData: Float32Array | null = null

  private startIntro() {
    const gl = this.gl
    const home = this.homeData
    if (!home) return
    const w = this.rect.w > 10 ? this.rect.w : 1300
    const total = TEX_W * this.texH
    const st = new Float32Array(total * 4)
    for (let i = 0; i < this.n; i++) {
      const hx = home[i * 4] - 0.5
      const hy = home[i * 4 + 1] - 0.5
      const sd = home[i * 4 + 2]
      const ang = (Math.random() - 0.5) * 0.9 + (hx > 0 ? 0 : Math.PI)
      const dist = w * (0.04 + Math.random() * 0.14) * (0.5 + Math.abs(hx) * 1.4)
      st[i * 4] = Math.cos(ang) * dist + hx * w * 0.25 * sd
      st[i * 4 + 1] = Math.sin(ang) * dist * 0.55 + hy * 120 * (Math.random() - 0.5)
    }
    gl.bindTexture(gl.TEXTURE_2D, this.stateTex[this.stateIdx])
    gl.texImage2D(gl.TEXTURE_2D, 0, this.stateFormat.internal, TEX_W, this.texH, 0, gl.RGBA, gl.FLOAT, st)
    this.introT = 0
    this.stateDirty = true
  }

  setOptions(o: Partial<EngineOptions>) {
    const rebuild =
      (o.density !== undefined && o.density !== this.opts.density) ||
      (o.imgBg !== undefined && String(o.imgBg) !== String(this.opts.imgBg))
    this.opts = { ...this.opts, ...o }
    if (rebuild && this.ready && this.lastImage) {
      try {
        this.buildParticles(this.lastImage)
      } catch {
        this.onFail()
      }
    }
    if (this.opts.paused || this.opts.reducedMotion) {
      this.stop()
      this.presenceTarget = 0
      this.touchRelease = 0
      if (this.opts.reducedMotion) {
        this.presence = this.presenceTarget = this.flowing = this.burst = 0
        if (this.flowDirty) this.clearFlow()
        if (this.stateDirty) this.clearState()
      }
      this.draw()
    } else this.wake()
  }

  resize(cssW: number, cssH: number, rect: Rect) {
    this.cssW = Math.max(1, cssW)
    this.cssH = Math.max(1, cssH)
    this.rect = rect
    let dpr = Math.min(window.devicePixelRatio || 1, this.lowPower || cssW < 500 || this.opts.compact ? 1 : 1.5)
    const px = this.cssW * this.cssH * dpr * dpr
    if (px > 1.5e6) dpr = Math.max(1, Math.sqrt(4.5e6 / (this.cssW * this.cssH)))
    const w = Math.round(this.cssW * dpr)
    const h = Math.round(this.cssH * dpr)
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w
      this.canvas.height = h
    }
    this.draw()
  }

  setVisible(v: boolean) {
    this.visible = v
    if (v) this.wake()
    else this.stop()
  }

  pointer(type: "move" | "down" | "up" | "leave", x: number, y: number, touch: boolean) {
    if (!this.opts.interactive || this.opts.paused || this.opts.reducedMotion || this.lost || this.destroyed) return
    const now = performance.now()
    if (type === "leave" || type === "up") {
      if (touch) this.touchRelease = now + 260
      else this.presenceTarget = 0
      this.wake()
      return
    }
    if (this.mouse.x < -9000 || type === "down") {
      this.mouse.x = this.prevMouse.x = x
      this.mouse.y = this.prevMouse.y = y
    }
    this.target.x = x
    this.target.y = y
    this.presenceTarget = 1
    this.lastInput = now
    this.settle = 0
    if (type === "down") {
      this.burst = 1
      this.touchRelease = 0
    }
    this.wake()
  }

  private wake() {
    if (this.opts.paused || this.opts.reducedMotion) { this.draw(); this.firstFrame(); return }
    if (!this.ready || this.running || !this.visible || this.destroyed || this.lost) {
      if (this.ready && !this.running) this.draw()
      return
    }
    this.running = true
    this.last = performance.now()
    this.raf = requestAnimationFrame(this.frame)
  }

  private stop() {
    this.running = false
    cancelAnimationFrame(this.raf)
  }

  private radiusPx() {
    return this.opts.radius * clamp(this.rect.w / 1400, 0.6, 1.25)
  }

  private strength() {
    return this.opts.strength * (this.opts.reducedMotion ? 0.5 : 1)
  }

  private frame = (now: number) => {
    if (!this.running || this.opts.paused || this.opts.reducedMotion || this.destroyed) return
    if ((this.lowPower || this.opts.compact) && now - this.last < 1000 / 30) { this.raf = requestAnimationFrame(this.frame); return }
    const rawMs = now - this.last
    const dt = clamp(rawMs / 16.6667, 0.25, 3)
    this.last = now
    const o = this.opts
    const ambientOn = o.ambient && !o.reducedMotion

    if (this.touchRelease && now > this.touchRelease) {
      this.presenceTarget = 0
      this.touchRelease = 0
    }
    const ease = 1 - Math.pow(1 - 0.22, dt)
    this.mouse.x += (this.target.x - this.mouse.x) * ease
    this.mouse.y += (this.target.y - this.mouse.y) * ease
    const vx = (this.mouse.x - this.prevMouse.x) / dt
    const vy = (this.mouse.y - this.prevMouse.y) / dt
    this.prevMouse.x = this.mouse.x
    this.prevMouse.y = this.mouse.y
    const velocityEase = 1 - Math.pow(0.5, dt)
    this.mvel.x += (clamp(vx, -60, 60) - this.mvel.x) * velocityEase
    this.mvel.y += (clamp(vy, -60, 60) - this.mvel.y) * velocityEase
    const pk = this.presenceTarget > this.presence ? 0.1 : 0.035
    this.presence += (this.presenceTarget - this.presence) * (1 - Math.pow(1 - pk, dt))
    if (this.presence < 0.001 && this.presenceTarget === 0) this.presence = 0
    const fk = this.presenceTarget > this.flowing ? 0.05 : 0.018
    this.flowing += (this.presenceTarget - this.flowing) * (1 - Math.pow(1 - fk, dt))
    if (this.flowing < 0.002 && this.presenceTarget === 0) this.flowing = 0
    if (this.introT < 1) this.introT = Math.min(1, this.introT + Math.min(rawMs, 100) / 3200)

    const interacting = this.presence > 0.001 || this.burst > 0
    // settle is counted in simulated frames, so slow devices never snap mid-return
    this.settle = interacting ? 0 : this.settle + dt
    const active = interacting || this.settle < SETTLE_FRAMES || this.introT < 1

    if (!active) {
      if (this.flowDirty) this.clearFlow()
      if (this.stateDirty) this.clearState()
      if (!ambientOn) {
        this.draw()
        this.firstFrame()
        this.stop()
        return
      }
      this.raf = requestAnimationFrame(this.frame)
      if (this.skip++ % 2) return
      this.time += (dt * 2 * o.speed) / 60
      this.draw()
      this.firstFrame()
      return
    }
    this.raf = requestAnimationFrame(this.frame)
    // the field speeds up while the material is being stirred
    this.time += (dt * o.speed * (1 + this.flowing * 1.6)) / 60
    this.stepFlow(dt)
    this.stepSim(dt)
    this.burst = Math.max(0, this.burst - 0.1 * dt)
    this.draw()
    this.firstFrame()
  }

  private firstFrame() {
    if (this.onFirstFrame) {
      const cb = this.onFirstFrame
      this.onFirstFrame = null
      // one more frame so the compositor has presented the canvas
      this.presentedRaf = requestAnimationFrame(() => { this.presentedRaf = 0; if (!this.destroyed && !this.lost) cb() })
    }
  }

  private stepFlow(dt: number) {
    const gl = this.gl
    const P = this.pFlow
    const dst = 1 - this.flowIdx
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.flowFb[dst])
    gl.viewport(0, 0, this.flowW, this.flowH)
    gl.disable(gl.BLEND)
    gl.useProgram(P.p)
    gl.bindVertexArray(this.vao)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.flowTex[this.flowIdx])
    gl.uniform1i(P.u.uPrev, 0)
    gl.uniform2f(P.u.uTexel, 1 / this.flowW, 1 / this.flowH)
    const r = this.rect
    gl.uniform2f(P.u.uMouse, (this.mouse.x - r.x) / r.w, (this.mouse.y - r.y) / r.h)
    gl.uniform2f(P.u.uVel, clamp(this.mvel.x / 40, -1, 1), clamp(this.mvel.y / 40, -1, 1))
    gl.uniform2f(P.u.uSize, r.w, r.h)
    gl.uniform1f(P.u.uRadius, this.radiusPx())
    gl.uniform1f(P.u.uPresence, Math.max(this.presence, this.burst))
    gl.uniform1f(P.u.uDecay, Math.pow(0.968, dt))
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    this.flowIdx = dst
    this.flowDirty = true
  }

  private stepSim(dt: number) {
    if (!this.n) return
    const gl = this.gl
    const P = this.pSim
    const o = this.opts
    const r = this.rect
    const dst = 1 - this.stateIdx
    const intro = o.reducedMotion || !o.intro ? 0 : Math.pow(1 - this.introT, 2)
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.stateFb[dst])
    gl.viewport(0, 0, TEX_W, this.texH)
    gl.disable(gl.BLEND)
    gl.useProgram(P.p)
    gl.bindVertexArray(this.vao)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.stateTex[this.stateIdx])
    gl.uniform1i(P.u.uState, 0)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, this.homeTex)
    gl.uniform1i(P.u.uHome, 1)
    gl.activeTexture(gl.TEXTURE2)
    gl.bindTexture(gl.TEXTURE_2D, this.flowTex[this.flowIdx])
    gl.uniform1i(P.u.uFlow, 2)
    gl.uniform2f(P.u.uSize, r.w, r.h)
    gl.uniform2f(P.u.uMouse, this.mouse.x - r.x, this.mouse.y - r.y)
    gl.uniform1f(P.u.uRadius, this.radiusPx())
    gl.uniform1f(P.u.uPresence, Math.max(this.presence, this.burst))
    gl.uniform1f(P.u.uStrength, this.strength() * (1 + this.burst * 1.5))
    gl.uniform1f(P.u.uSpread, clamp(o.spread, 0, 2))
    gl.uniform1f(P.u.uTurb, clamp(o.turbulence, 0, 2) * (o.reducedMotion ? 0.3 : 1))
    gl.uniform1f(P.u.uReturn, clamp(o.returnSpeed, 0, 2))
    gl.uniform1f(P.u.uTime, this.time)
    gl.uniform1f(P.u.uDt, dt)
    gl.uniform1f(P.u.uIntro, intro)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    this.stateIdx = dst
    this.stateDirty = true
  }

  private draw() {
    if (!this.ready || this.lost || this.destroyed) return
    const gl = this.gl
    const o = this.opts
    const r = this.rect
    const rm = o.reducedMotion
    const introVis = rm || !o.intro ? 1 : Math.pow(this.introT, 2.2)
    const base = o.ambient && !rm ? clamp(o.ambientIntensity, 0, 2) : 0
    const amb = base + this.flowing * 0.85 * clamp(o.liquid, 0, 2) * (rm ? 0.3 : 1)
    const rest = o.restStyle === "particles" ? 1 : 0
    const [br, bg, bb] = o.bg
    const [ir, ig, ib] = this.imgBg
    const dpr = this.canvas.width / this.cssW
    const pres = Math.max(this.presence, this.burst)
    const mx = this.mouse.x - r.x
    const my = this.mouse.y - r.y

    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, this.canvas.width, this.canvas.height)
    gl.bindVertexArray(this.vao)
    gl.disable(gl.BLEND)

    const I = this.pImg
    gl.useProgram(I.p)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.imgTex)
    gl.uniform1i(I.u.uImg, 0)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, this.flowTex[this.flowIdx])
    gl.uniform1i(I.u.uFlow, 1)
    gl.uniform2f(I.u.uRes, this.cssW, this.cssH)
    gl.uniform1f(I.u.uDpr, dpr)
    gl.uniform4f(I.u.uRect, r.x, r.y, r.w, r.h)
    gl.uniform3f(I.u.uBg, br, bg, bb)
    gl.uniform3f(I.u.uImgBg, ir, ig, ib)
    gl.uniform2f(I.u.uMouse, mx, my)
    gl.uniform1f(I.u.uPresence, pres)
    gl.uniform1f(I.u.uRadius, this.radiusPx())
    gl.uniform1f(I.u.uStrength, this.strength())
    gl.uniform1f(I.u.uTime, this.time)
    gl.uniform1f(I.u.uAmbient, amb)
    gl.uniform1f(I.u.uIntroVis, introVis)
    gl.uniform1f(I.u.uRest, rest)
    gl.uniform1f(I.u.uAlphaMode, this.alphaMode ? 1 : 0)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

    // particles are invisible at rest in "image" mode: skip them entirely
    if (!this.n || (!this.stateDirty && rest === 0 && introVis >= 1)) return

    const P = this.pPart
    gl.useProgram(P.p)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.stateTex[this.stateIdx])
    gl.uniform1i(P.u.uState, 0)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, this.homeTex)
    gl.uniform1i(P.u.uHome, 1)
    gl.activeTexture(gl.TEXTURE2)
    gl.bindTexture(gl.TEXTURE_2D, this.colTex)
    gl.uniform1i(P.u.uCol, 2)
    gl.activeTexture(gl.TEXTURE3)
    gl.bindTexture(gl.TEXTURE_2D, this.flowTex[this.flowIdx])
    gl.uniform1i(P.u.uFlow, 3)
    gl.uniform1i(P.u.uTexW, TEX_W)
    gl.uniform4f(P.u.uRect, r.x, r.y, r.w, r.h)
    gl.uniform2f(P.u.uRes, this.cssW, this.cssH)
    gl.uniform2f(P.u.uMouse, mx, my)
    gl.uniform1f(P.u.uRadius, this.radiusPx())
    gl.uniform1f(P.u.uPresence, pres)
    const spacing = r.w / this.gridW
    gl.uniform1f(P.u.uDot, spacing * 1.45 * clamp(o.dotSize, 0.2, 3))
    gl.uniform1f(P.u.uTime, this.time)
    gl.uniform1f(P.u.uAmbient, amb)
    gl.uniform1f(P.u.uStreak, (o.streaks ? 1 : 0) * (0.45 + 0.55 * introVis))
    gl.uniform1f(P.u.uIntroVis, introVis)
    gl.uniform1f(P.u.uRest, rest)
    gl.uniform1f(P.u.uDpr, dpr)
    if (this.alphaMode) gl.uniform3f(P.u.uTint, 1, 1, 1)
    else gl.uniform3f(P.u.uTint, br / Math.max(ir, 0.001), bg / Math.max(ig, 0.001), bb / Math.max(ib, 0.001))
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.n)
    gl.disable(gl.BLEND)
  }

  destroy() {
    this.destroyed = true
    this.stop()
    cancelAnimationFrame(this.presentedRaf)
    this.onFirstFrame = null
    this.canvas.removeEventListener("webglcontextlost", this.onLost)
    const gl = this.gl
    if (!this.lost) {
      gl.deleteBuffer(this.quad)
      gl.deleteVertexArray(this.vao)
      for (const t of [...this.flowTex, ...this.stateTex, this.imgTex, this.homeTex, this.colTex]) if (t) gl.deleteTexture(t)
      for (const f of [...this.flowFb, ...this.stateFb]) gl.deleteFramebuffer(f)
      for (const p of [this.pFlow, this.pSim, this.pPart, this.pImg]) if (p) gl.deleteProgram(p.p)
    }
    gl.getExtension("WEBGL_lose_context")?.loseContext()
  }
}

