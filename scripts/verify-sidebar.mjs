import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const artifactDir = 'C:\\Users\\Robert\\.gemini\\antigravity\\brain\\b5a79880-e539-4f91-9e91-dcc9a152bd6e';

class CDPClient {
  constructor(ws) {
    this.ws = ws;
    this.id = 1;
    this.callbacks = new Map();
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.id && this.callbacks.has(data.id)) {
        const { resolve, reject } = this.callbacks.get(data.id);
        this.callbacks.delete(data.id);
        if (data.error) reject(new Error(data.error.message));
        else resolve(data.result);
      }
    };
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
}

async function run() {
  const tempProfile = path.join('C:\\Users\\Robert\\AppData\\Local\\Temp', 'chrome_cdp_' + Math.random().toString(36).slice(2));
  fs.mkdirSync(tempProfile, { recursive: true });

  const proc = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--disable-gpu=false',
    '--use-gl=angle',
    '--no-first-run',
    '--no-default-browser-check',
    `--user-data-dir=${tempProfile}`,
  ]);

  try {
    let target = null;
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 200));
      try {
        const res = await fetch('http://127.0.0.1:9222/json');
        const list = await res.json();
        target = list.find(t => t.type === 'page');
        if (target) break;
      } catch {}
    }

    if (!target) throw new Error('Could not connect to Chrome CDP target');

    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((res, rej) => {
      ws.onopen = res;
      ws.onerror = rej;
    });

    const client = new CDPClient(ws);
    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('DOM.enable');
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1.5,
      mobile: false,
    });

    // 1. Capture /library
    await client.send('Page.navigate', { url: 'http://127.0.0.1:3014/library' });
    await new Promise(r => setTimeout(r, 3500));

    const libShot = await client.send('Page.captureScreenshot', { format: 'png' });
    const libBuf = Buffer.from(libShot.data, 'base64');
    const libOutPath = path.join(artifactDir, 'verify-library-previews.png');
    fs.writeFileSync(libOutPath, libBuf);
    console.log(`Saved screenshot to ${libOutPath}`);

    // Check poster images in DOM
    const posterCheck = await client.send('Runtime.evaluate', {
      expression: `(() => {
        const previews = Array.from(document.querySelectorAll('.card-preview'));
        const info = previews.slice(0, 12).map(p => {
          const id = p.getAttribute('data-preview-id');
          const darkImg = p.querySelector('img.card-poster-dark');
          const lightImg = p.querySelector('img.card-poster-light');
          const isLive = p.hasAttribute('data-live');
          return {
            id,
            hasDarkPoster: !!darkImg,
            darkSrc: darkImg ? darkImg.getAttribute('src') : null,
            isLive
          };
        });
        return info;
      })()`,
      returnByValue: true
    });
    console.log('Library Posters check (first 12):', JSON.stringify(posterCheck.result.value, null, 2));

    // 2. Capture Home
    await client.send('Page.navigate', { url: 'http://127.0.0.1:3014/' });
    await new Promise(r => setTimeout(r, 3000));
    const homeShot = await client.send('Page.captureScreenshot', { format: 'png' });
    const homeBuf = Buffer.from(homeShot.data, 'base64');
    const homeOutPath = path.join(artifactDir, 'verify-home-previews.png');
    fs.writeFileSync(homeOutPath, homeBuf);
    console.log(`Saved screenshot to ${homeOutPath}`);

    ws.close();
  } finally {
    proc.kill();
    try { fs.rmSync(tempProfile, { recursive: true, force: true }); } catch {}
  }
}

run().catch(console.error);
