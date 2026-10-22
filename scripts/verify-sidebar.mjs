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

    // 1. Navigate to /library first and set localStorage with saved items
    await client.send('Page.navigate', { url: 'http://127.0.0.1:3014/library' });
    await new Promise(r => setTimeout(r, 2000));
    await client.send('Runtime.evaluate', {
      expression: `localStorage.setItem('motiqo-saved', JSON.stringify(['vapor-ring', 'elastic-showcase', 'atelier'])); window.dispatchEvent(new Event('motiqo-saved-change'));`,
    });

    // 2. Navigate to /hero
    await client.send('Page.navigate', { url: 'http://127.0.0.1:3014/hero' });
    await new Promise(r => setTimeout(r, 3000));

    // Capture screenshot of /hero
    const heroShot = await client.send('Page.captureScreenshot', { format: 'png' });
    const heroBuf = Buffer.from(heroShot.data, 'base64');
    const heroOutPath = path.join(artifactDir, 'verify-sidebar-saved-hero.png');
    fs.writeFileSync(heroOutPath, heroBuf);
    console.log(`Saved screenshot to ${heroOutPath}`);

    // Check saved count element in DOM
    const savedCountCheck = await client.send('Runtime.evaluate', {
      expression: `(() => {
        const links = Array.from(document.querySelectorAll('.sidebar-link'));
        const savedLink = links.find(el => el.textContent.includes('Saved'));
        const countBadge = savedLink ? savedLink.querySelector('.sidebar-count') : null;
        const textElements = Array.from(document.querySelectorAll('.sidebar-art text'));
        const orbFrontRings = document.querySelectorAll('.sidebar-art [data-orbit-front]');
        return {
          savedText: savedLink ? savedLink.textContent : null,
          savedCount: countBadge ? countBadge.textContent : null,
          hasInGoodMotionText: textElements.some(t => t.textContent.includes('IN GOOD MOTION')),
          frontRingCount: orbFrontRings.length
        };
      })()`,
      returnByValue: true
    });
    console.log('DOM Check Result:', JSON.stringify(savedCountCheck.result.value, null, 2));

    // Also capture focused crop of the sidebar
    const sidebarShot = await client.send('Page.captureScreenshot', {
      format: 'png',
      clip: { x: 0, y: 0, width: 300, height: 900, scale: 1.5 }
    });
    const sidebarBuf = Buffer.from(sidebarShot.data, 'base64');
    const sidebarOutPath = path.join(artifactDir, 'verify-sidebar-art.png');
    fs.writeFileSync(sidebarOutPath, sidebarBuf);
    console.log(`Saved screenshot to ${sidebarOutPath}`);

    ws.close();
  } finally {
    proc.kill();
    try { fs.rmSync(tempProfile, { recursive: true, force: true }); } catch {}
  }
}

run().catch(console.error);
