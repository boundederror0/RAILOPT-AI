const http = require("http");
const { spawn } = require("child_process");

const BASE = "http://localhost:3100";
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9299;
const VIEWPORTS = [
  [360, 800, 3],
  [375, 812, 3],
  [390, 844, 3],
  [412, 915, 3],
  [768, 1024, 2],
  [1024, 768, 1],
  [1280, 800, 1],
  [1440, 900, 1],
];

function httpReq(method, url, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = { method, hostname: u.hostname, port: u.port || 80, path: u.pathname + u.search, headers };
    const req = http.request(opts, (res) => {
      const chunks = [];
      res.on("data", d => chunks.push(d));
      res.on("end", () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString(), headers: res.headers, setCookies: res.headers["set-cookie"] || [] }));
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

async function cdpSend(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 1e9);
    const timeout = setTimeout(() => reject(new Error(`CDP timeout: ${method}`)), 20000);
    function handler(event) {
      const msg = JSON.parse(event.data);
      if (msg.id === id) {
        clearTimeout(timeout);
        ws.removeEventListener("message", handler);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      }
    }
    ws.addEventListener("message", handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function evalJs(ws, expression) {
  const r = await cdpSend(ws, "Runtime.evaluate", { expression, returnByValue: true });
  return r.result?.value;
}

async function main() {
  spawn("taskkill", ["/F", "/IM", "msedge.exe"], { stdio: "ignore" });
  await new Promise(r => setTimeout(r, 1000));
  const loginRes = await httpReq("POST", `${BASE}/api/auth/login`, { "Content-Type": "application/json" },
    JSON.stringify({ postingId: "GM", password: "railopt@123", zoneId: "SR", divisionId: "ZONE" }));
  const cookieHeader = loginRes.setCookies[0];
  const cookieName = cookieHeader.split("=")[0].trim();
  const cookieValue = cookieHeader.split("=").slice(1).join("=").split(";")[0].trim();

  const chrome = spawn(EDGE, [
    "--headless=new", `--remote-debugging-port=${PORT}`, "--no-first-run",
    "--no-default-browser-check", "--disable-gpu", "--disable-extensions",
    "--window-size=390,844", "about:blank",
  ], { stdio: "pipe" });
  await new Promise(r => setTimeout(r, 3000));
  const res = await httpReq("GET", `http://127.0.0.1:${PORT}/json/list`);
  const targets = JSON.parse(res.body);
  const pageTarget = targets.find(t => t.type === "page");
  const WebSocket = globalThis.WebSocket;
  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });

  await cdpSend(ws, "Page.enable");
  await cdpSend(ws, "Network.enable");
  await cdpSend(ws, "Runtime.enable");
  await cdpSend(ws, "Network.setCookie", {
    name: cookieName, value: cookieValue, domain: "localhost", path: "/",
    secure: false, httpOnly: true, sameSite: "Lax",
  });

  let pass = 0, fail = 0;
  const out = [];

  for (const [w, h, dpr] of VIEWPORTS) {
    await cdpSend(ws, "Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: dpr, mobile: w < 1024 });
    await cdpSend(ws, "Page.navigate", { url: `${BASE}/` });
    await new Promise(r => setTimeout(r, 5000));

    const s = JSON.parse(await evalJs(ws, `JSON.stringify((() => {
      const ham = document.querySelector('button[aria-label="Open navigation"]');
      const aside = document.querySelector('aside');
      const sr = aside?.getBoundingClientRect();
      const hamDisp = ham ? window.getComputedStyle(ham).display : null;
      const hamRect = ham?.getBoundingClientRect();
      const drawer = document.querySelector('.fixed.inset-0.z-50');
      const mobile = innerWidth < 1024;
      // open the drawer on mobile and verify X
      let xVis = null, xW = null, asideWOpen = null;
      if (mobile && ham && hamDisp !== 'none') {
        ham.click();
        // wait synchronously for state via small sleep loop
        // (React needs a tick; do a quick 300ms wait before measuring)
      }
      return {
        vp: innerWidth + 'x' + innerHeight,
        hamDisp, hamW: hamRect?.width, hamH: hamRect?.height,
        asideW: sr?.width, asideLeft: sr?.left,
        drawerPresent: !!drawer,
      };
    })())`));
    out.push(`${w}x${h} mobile=${w<1024} ham=${s.hamDisp} w=${s.hamW} h=${s.hamH} ├ asideW=${s.asideW}├ left=${s.asideLeft} drawer=${s.drawerPresent}`);
  }

  // Second loop: open drawer on mobile viewports and verify X
  for (const [w, h, dpr] of VIEWPORTS.filter(v => v[0] < 1024)) {
    await cdpSend(ws, "Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: dpr, mobile: true });
    await cdpSend(ws, "Page.navigate", { url: `${BASE}/` });
    await new Promise(r => setTimeout(r, 5000));
    await evalJs(ws, `(() => { const ham = document.querySelector('button[aria-label="Open navigation"]'); if (ham) ham.click(); })()`);
    await new Promise(r => setTimeout(r, 500));
    const s = JSON.parse(await evalJs(ws, `JSON.stringify((() => {
      const d = document.querySelector('.fixed.inset-0.z-50');
      const x = d?.querySelector('button[aria-label="Close navigation"]');
      const xr = x?.getBoundingClientRect();
      const aside = d?.querySelector('aside');
      const ar = aside?.getBoundingClientRect();
      return {
        drawer: !!d,
        xVis: !!x && getComputedStyle(x).display !== 'none' && xr.width > 0 && xr.height > 0,
        xW: xr?.width, xH: xr?.height,
        asideW: ar?.width,
        overflow: document.documentElement.scrollWidth <= innerWidth,
      };
    })())`));
    out.push(`${w}x${h} [open] drawer=${s.drawer} xVis=${s.xVis} x=${s.xW}x${s.xH} asideW=${s.asideW} noHOverflow=${s.overflow}`);
    if (s.drawer && s.xVis && (s.xW >= 44) && (s.xH >= 44) && s.asideW > 0 && s.asideW <= Math.min(w*0.85, 320)+1 && s.overflow && s.asideW < w) { pass++; } else { fail++; out.push(`   ^ FAILED`); }
    // close drawer
    await evalJs(ws, `(() => { const d = document.querySelector('.fixed.inset-0.z-50'); d?.querySelector('button[aria-label="Close navigation"]')?.click(); })()`);
    await new Promise(r => setTimeout(r, 300));
  }

  // Desktop checks (no hamburger, static 240px sidebar)
  for (const [w, h, dpr] of VIEWPORTS.filter(v => v[0] >= 1024)) {
    await cdpSend(ws, "Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: dpr, mobile: false });
    await cdpSend(ws, "Page.navigate", { url: `${BASE}/` });
    await new Promise(r => setTimeout(r, 5000));
    const s = JSON.parse(await evalJs(ws, `JSON.stringify((() => {
      const ham = document.querySelector('button[aria-label="Open navigation"]');
      const aside = document.querySelector('aside');
      const sr = aside?.getBoundingClientRect();
      return {
        hamDisp: ham ? getComputedStyle(ham).display : null,
        asideW: sr?.width,
        drawer: !!document.querySelector('.fixed.inset-0.z-50'),
      };
    })())`));
    out.push(`${w}x${h} [desktop] ham=${s.hamDisp} asideW=${s.asideW} drawer=${s.drawer}`);
    if ((s.hamDisp === 'none' || s.hamDisp === null) && s.asideW === 240 && !s.drawer) { pass++; } else { fail++; out.push(`   ^ FAILED`); }
  }

  for (const line of out) console.log(line);
  console.log(`\n===== VIEWPORT MATRIX: ${pass} passed, ${fail} failed =====`);
  ws.close();
  chrome.kill();
}

main().catch(e => { console.error("[FATAL]", e); process.exit(1); });