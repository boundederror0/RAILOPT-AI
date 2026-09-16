const http = require("http");
const { spawn } = require("child_process");

const BASE = "http://localhost:3100";
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9299;

function httpReq(method, url, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = { method, hostname: u.hostname, port: u.port || 80, path: u.pathname + u.search, headers };
    const req = http.request(opts, (res) => {
      const chunks = [];
      res.on("data", d => chunks.push(d));
      res.on("end", () => {
        const raw = Buffer.concat(chunks).toString();
        resolve({ status: res.statusCode, body: raw, headers: res.headers, setCookies: res.headers["set-cookie"] || [] });
      });
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

async function cdpSend(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 1e9);
    const timeout = setTimeout(() => reject(new Error(`CDP timeout: ${method}`)), 15000);
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

const results = [];
function record(name, pass, detail) {
  results.push({ name, pass });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}  ${detail ?? ""}`);
}

const DRAWER_X = `(() => { const d = document.querySelector('.fixed.inset-0.z-50'); return d?.querySelector('button[aria-label="Close navigation"]') ?? null; })()`;
const DRAWER_ASIDE = `(() => { const d = document.querySelector('.fixed.inset-0.z-50'); return d?.querySelector('aside') ?? null; })()`;

async function main() {
  spawn("taskkill", ["/F", "/IM", "msedge.exe"], { stdio: "ignore" });
  await new Promise(r => setTimeout(r, 1000));

  const loginRes = await httpReq("POST", `${BASE}/api/auth/login`, {
    "Content-Type": "application/json",
  }, JSON.stringify({ postingId: "GM", password: "railopt@123", zoneId: "SR", divisionId: "ZONE" }));
  const cookieHeader = loginRes.setCookies[0];
  const cookieName = cookieHeader.split("=")[0].trim();
  const cookieValue = cookieHeader.split("=").slice(1).join("=").split(";")[0].trim();

  const chrome = spawn(EDGE, [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-gpu",
    "--disable-extensions",
    "--window-size=390,844",
    "about:blank",
  ], { stdio: "pipe" });
  await new Promise(r => setTimeout(r, 3000));

  let targets;
  try {
    const res = await httpReq("GET", `http://127.0.0.1:${PORT}/json/list`);
    targets = JSON.parse(res.body);
  } catch (e) { chrome.kill(); console.error("no chrome"); process.exit(1); }
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

  await cdpSend(ws, "Emulation.setDeviceMetricsOverride", {
    width: 390, height: 844, deviceScaleFactor: 3, mobile: true,
  });

  await cdpSend(ws, "Page.navigate", { url: `${BASE}/` });
  await new Promise(r => setTimeout(r, 6000));

  // -- INITIAL STATE (mobile, drawer closed) --
  const initial = JSON.parse(await evalJs(ws, `JSON.stringify((() => {
    const ham = document.querySelector('button[aria-label="Open navigation"]');
    const r = ham?.getBoundingClientRect();
    const s = ham ? window.getComputedStyle(ham) : null;
    const drawer = document.querySelector('.fixed.inset-0.z-50');
    const scrollW = document.documentElement.scrollWidth;
    return {
      hamExists: !!ham,
      hamVisible: !!ham && s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity) > 0,
      hamW: r?.width, hamH: r?.height,
      hamDisplay: s?.display,
      hamTop: r?.top, hamLeft: r?.left,
      drawerPresentClosed: !!drawer,
      scrollW, winW: window.innerWidth,
      pageStatus: document.querySelector('h1')?.textContent,
    };
  })())`));
  record("Hamburger exists (mobile)", initial.hamExists, "");
  record("Hamburger visible", initial.hamVisible, `display=${initial.hamDisplay} w=${initial.hamW} h=${initial.hamH}`);
  record("Hamburger 44px touch target", initial.hamW >= 44 && initial.hamH >= 44, `w=${initial.hamW} h=${initial.hamH}`);
  record("Hamburger in topbar corner", initial.hamTop >= 0 && initial.hamLeft >= 0 && initial.hamLeft < 60, `top=${initial.hamTop} left=${initial.hamLeft}`);
  record("No drawer when closed", !initial.drawerPresentClosed, "");
  record("No horizontal overflow (closed)", initial.scrollW <= initial.winW, `scrollW=${initial.scrollW} winW=${initial.winW}`);
  record("Dashboard rendered (auth ok)", /Dashboard|Operations/i.test(initial.pageStatus ?? ""), initial.pageStatus);

  // -- OPEN via hamburger --
  await evalJs(ws, `(() => { document.querySelector('button[aria-label="Open navigation"]').click(); })()`);
  await new Promise(r => setTimeout(r, 500));

  const open = JSON.parse(await evalJs(ws, `JSON.stringify((() => {
    const drawer = document.querySelector('.fixed.inset-0.z-50');
    const x = drawer?.querySelector('button[aria-label="Close navigation"]');
    const xr = x?.getBoundingClientRect();
    const aside = drawer?.querySelector('aside');
    const asideRect = aside?.getBoundingClientRect();
    const backdrop = drawer?.querySelector(':scope > div:first-child');
    return {
      drawerPresent: !!drawer,
      xExists: !!x,
      xVisible: !!x && window.getComputedStyle(x).display !== 'none' && xr.width > 0 && xr.height > 0,
      xW: xr?.width, xH: xr?.height,
      asideW: asideRect?.width, asideLeft: asideRect?.left,
      backdropExists: !!backdrop,
      backdropWidth: backdrop?.getBoundingClientRect().width,
      bodyOverflow: document.body.style.overflow,
      scrollW: document.documentElement.scrollWidth, winW: window.innerWidth,
    };
  })())`));
  record("Drawer opens", open.drawerPresent, "");
  record("X exists in drawer", open.xExists, "");
  record("X visible in drawer", open.xVisible, `w=${open.xW} h=${open.xH}`);
  record("X 44px touch target", open.xW >= 44 && open.xH >= 44, `w=${open.xW} h=${open.xH}`);
  record("Drawer width <= min(85vw,320px)", open.asideW > 0 && open.asideW <= Math.min(390 * 0.85, 320) + 1, `asideW=${open.asideW} left=${open.asideLeft}`);
  record("Backdrop covers rest", open.backdropExists && open.backdropWidth + open.asideW >= 390, `backdropW=${open.backdropWidth} asideW=${open.asideW}`);
  record("Scroll locked", open.bodyOverflow === "hidden", open.bodyOverflow);
  record("No horizontal overflow (open)", open.scrollW <= open.winW, `scrollW=${open.scrollW} winW=${open.winW}`);

  // -- CLOSE via X --
  await evalJs(ws, `(() => { const d = document.querySelector('.fixed.inset-0.z-50'); d?.querySelector('button[aria-label="Close navigation"]')?.click(); })()`);
  await new Promise(r => setTimeout(r, 500));
  const closedX = JSON.parse(await evalJs(ws, `JSON.stringify({ drawerGone: !document.querySelector('.fixed.inset-0.z-50'), overflow: document.body.style.overflow })`));
  record("X closes drawer", closedX.drawerGone, "");
  record("Scroll unlocked after X", closedX.overflow !== "hidden", closedX.overflow);

  // -- OPEN, close via backdrop --
  await evalJs(ws, `(() => { document.querySelector('button[aria-label="Open navigation"]').click(); })()`);
  await new Promise(r => setTimeout(r, 500));
  const backdropClicked = JSON.parse(await evalJs(ws, `JSON.stringify((() => {
    const drawer = document.querySelector('.fixed.inset-0.z-50');
    const b = drawer?.firstElementChild;
    if (b) b.click();
    return { clicked: !!b };
  })())`));
  await new Promise(r => setTimeout(r, 500));
  const closedBackdrop = JSON.parse(await evalJs(ws, `JSON.stringify({ drawerGone: !document.querySelector('.fixed.inset-0.z-50') })`));
  record("Backdrop closes drawer", closedBackdrop.drawerGone, `clicked=${backdropClicked.clicked}`);

  // -- OPEN, Escape --
  await evalJs(ws, `(() => { document.querySelector('button[aria-label="Open navigation"]').click(); })()`);
  await new Promise(r => setTimeout(r, 500));
  await evalJs(ws, `(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); })()`);
  await new Promise(r => setTimeout(r, 500));
  const closedEsc = JSON.parse(await evalJs(ws, `JSON.stringify({ drawerGone: !document.querySelector('.fixed.inset-0.z-50') })`));
  record("Escape closes drawer", closedEsc.drawerGone, "");

  // -- OPEN, nav click closes + navigates --
  await evalJs(ws, `(() => { document.querySelector('button[aria-label="Open navigation"]').click(); })()`);
  await new Promise(r => setTimeout(r, 500));
  const navClick = await evalJs(ws, `(() => {
    const d = document.querySelector('.fixed.inset-0.z-50');
    const a = Array.from(d.querySelectorAll('a')).find(x => x.getAttribute('title') === 'Maintenance Requests');
    if (a) a.click();
    return JSON.stringify({ clicked: !!a, href: a?.getAttribute('href') });
  })()`);
  await new Promise(r => setTimeout(r, 1500));
  const afterNav = JSON.parse(await evalJs(ws, `JSON.stringify({
    drawerGone: !document.querySelector('.fixed.inset-0.z-50'),
    url: window.location.pathname,
  })`));
  record("Nav click closes + navigates", afterNav.drawerGone && afterNav.url === "/maintenance-requests", `${navClick} url=${afterNav.url}`);

  // -- DESKTOP REGRESSION --
  await cdpSend(ws, "Emulation.setDeviceMetricsOverride", { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  await cdpSend(ws, "Page.navigate", { url: `${BASE}/maintenance-requests` });
  await new Promise(r => setTimeout(r, 4000));
  const desktop = JSON.parse(await evalJs(ws, `JSON.stringify((() => {
    const ham = document.querySelector('button[aria-label="Open navigation"]');
    const aside = document.querySelector('aside');
    const drawer = document.querySelector('.fixed.inset-0.z-50');
    const s = ham ? window.getComputedStyle(ham) : null;
    return {
      hamDisplay: s?.display,
      asideW: aside?.getBoundingClientRect().width,
      drawerPresent: !!drawer,
    };
  })())`));
  record("Desktop: hamburger hidden", desktop.hamDisplay === "none", desktop.hamDisplay);
  record("Desktop: sidebar 240px static", desktop.asideW === 240, `w=${desktop.asideW}`);
  record("Desktop: no drawer/backdrop", !desktop.drawerPresent, "");

  console.log(`\n===== SUMMARY: ${results.filter(r => r.pass).length}/${results.length} passed =====`);
  ws.close();
  chrome.kill();
}

main().catch(e => { console.error("[FATAL]", e); process.exit(1); });