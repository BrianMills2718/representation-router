import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import puppeteer from 'puppeteer-core';

const configPath = process.argv[2];
if (!configPath) {
  console.error('Usage: node scripts/render-qa.mjs <config.json>');
  process.exit(2);
}
const absoluteConfig = path.resolve(configPath);
const config = JSON.parse(fs.readFileSync(absoluteConfig, 'utf8'));
const configDir = path.dirname(absoluteConfig);
const viewports = config.viewports ?? [{ width: 1440, height: 1000 }, { width: 390, height: 900 }];
const states = config.states?.length ? config.states : [{ id: 'initial', actions: [] }];
const screenshotDir = path.resolve(configDir, config.screenshotDir ?? 'artifacts/render-qa');
fs.mkdirSync(screenshotDir, { recursive: true });

function chromePath() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  if (process.platform === 'darwin') return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  if (process.platform === 'win32') return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  return '/usr/bin/google-chrome';
}
function serveDirectory(directory) {
  const root = path.resolve(directory);
  const mime = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.mjs':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8', '.svg':'image/svg+xml' };
  const server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const rel = pathname === '/' ? 'index.html' : pathname.replace(/^\//, '');
    const file = path.resolve(root, rel);
    if (!file.startsWith(root + path.sep) && file !== path.join(root, 'index.html')) return res.writeHead(403).end('forbidden');
    fs.readFile(file, (error, data) => {
      if (error) return res.writeHead(error.code === 'ENOENT' ? 404 : 500).end(error.message);
      res.writeHead(200, { 'content-type': mime[path.extname(file)] ?? 'application/octet-stream' });
      res.end(data);
    });
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

async function applyAction(page, action) {
  if (action.type === 'click') return page.click(action.selector);
  if (action.type === 'value') {
    return page.$eval(action.selector, (el, a) => {
      el.value = String(a.value);
      el.dispatchEvent(new Event(a.event ?? 'input', { bubbles: true }));
    }, action);
  }
  if (action.type === 'select') return page.select(action.selector, String(action.value));
  if (action.type === 'scroll') return page.$eval(action.selector, (el, a) => el.scrollIntoView({ block:a.block ?? 'center', inline:a.inline ?? 'nearest', behavior:'auto' }), action);
  if (action.type === 'wait') return new Promise(resolve => setTimeout(resolve, Number(action.ms ?? 50)));
  throw new Error(`Unsupported QA action: ${action.type}`);
}
async function genericAudit(page) {
  return page.evaluate(() => {
    const visible = el => {
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      if (!(s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0)) return false;
      // effective opacity includes ancestors (e.g. an animated <g> hiding a moving label at this moment)
      let o = 1; for (let n = el; n && n.nodeType === 1; n = n.parentElement) o *= Number(getComputedStyle(n).opacity || 1);
      return o > 0.05;
    };
    const rect = el => el.getBoundingClientRect();
    const overlapArea = (a,b) => Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
    const svgText = [...document.querySelectorAll('svg text')].filter(visible).map(el => ({ el, text:(el.textContent||'').trim(), box:rect(el) })).filter(x=>x.text);
    const textOverlaps=[];
    for(let i=0;i<svgText.length;i++) for(let j=i+1;j<svgText.length;j++) {
      const area=overlapArea(svgText[i].box,svgText[j].box);
      if(area>1) textOverlaps.push({a:svgText[i].text,b:svgText[j].text,area:Math.round(area)});
    }
    const clippedSvgText=[];
    for(const item of svgText){
      const owner=item.el.ownerSVGElement?.getBoundingClientRect(); if(!owner) continue;
      if(item.box.left<owner.left-1||item.box.right>owner.right+1||item.box.top<owner.top-1||item.box.bottom>owner.bottom+1) clippedSvgText.push(item.text);
    }
    const controls=[...document.querySelectorAll('button,input,select,a[href]')].filter(visible);
    const offscreenControls=controls.filter(el=>{const r=rect(el);return r.left<0||r.right>innerWidth+1;}).map(el=>el.getAttribute('aria-label')||el.textContent?.trim()||el.tagName);
    const heights=svgText.map(x=>x.box.height).filter(Number.isFinite);
    return {
      textOverlaps,
      clippedSvgText,
      pageHorizontalOverflow:Math.max(0,document.documentElement.scrollWidth-document.documentElement.clientWidth),
      offscreenControls,
      minimumRenderedSvgTextHeightPx:heights.length?Math.min(...heights):null
    };
  });
}

async function expectationFailures(page, state) {
  const failures=[];
  for (const exp of state.expect ?? []) {
    const result=await page.$eval(exp.selector, (el, expected) => {
      const style=getComputedStyle(el), rect=el.getBoundingClientRect();
      const visible=style.display!=='none'&&style.visibility!=='hidden'&&Number(style.opacity||1)>.05&&rect.width>0&&rect.height>0;
      return { visible, text:el.textContent ?? '', attr: expected.attribute ? el.getAttribute(expected.attribute.name) : null };
    }, exp).catch(()=>null);
    if(!result){failures.push(`missing expected element: ${exp.selector}`);continue;}
    if(exp.visible != null && result.visible!==exp.visible) failures.push(`${exp.selector} visibility expected ${exp.visible} got ${result.visible}`);
    if(exp.textIncludes && !result.text.includes(exp.textIncludes)) failures.push(`${exp.selector} missing text: ${exp.textIncludes}`);
    if(exp.attribute && result.attr!==String(exp.attribute.value)) failures.push(`${exp.selector} attribute ${exp.attribute.name} expected ${exp.attribute.value} got ${result.attr}`);
  }
  return failures;
}

// Optional accessibility audit with axe-core (Deque, MPL-2.0). Opt in per config:
// "accessibility": { "tags": ["wcag2a","wcag2aa"], "impacts": ["serious","critical"], "maxViolations": 0 }
const axeSource = () => fs.readFileSync(new URL('../node_modules/axe-core/axe.min.js', import.meta.url), 'utf8');
async function accessibilityAudit(page, a11y) {
  if (!a11y) return null;
  const hasAxe = await page.evaluate(() => typeof window.axe !== 'undefined');
  if (!hasAxe) await page.evaluate(axeSource());
  const tags = a11y.tags ?? ['wcag2a', 'wcag2aa'];
  const result = await page.evaluate(async t => {
    const r = await window.axe.run(document, { runOnly: { type: 'tag', values: t } });
    return r.violations.map(v => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length, targets: v.nodes.slice(0, 3).map(n => n.target.join(' ')) }));
  }, tags);
  const impacts = a11y.impacts ?? ['serious', 'critical'];
  return { counted: result.filter(v => impacts.includes(v.impact)), other: result.filter(v => !impacts.includes(v.impact)) };
}

function failuresFor(audit, config) {
  const p=[];
  if ((audit.textOverlaps?.length ?? 0) > (config.maxTextOverlaps ?? 0)) p.push(`text overlaps: ${JSON.stringify(audit.textOverlaps)}`);
  if (audit.clippedSvgText?.length) p.push(`clipped SVG text: ${audit.clippedSvgText.join(', ')}`);
  if ((audit.pageHorizontalOverflow ?? 0) > (config.maxPageHorizontalOverflowPx ?? 0)) p.push(`page horizontal overflow: ${audit.pageHorizontalOverflow}px`);
  if (audit.offscreenControls?.length) p.push(`offscreen controls: ${audit.offscreenControls.join(', ')}`);
  const min = config.minimumRenderedTextHeightPx ?? 7.5;
  if (audit.minimumRenderedSvgTextHeightPx != null && audit.minimumRenderedSvgTextHeightPx < min) p.push(`rendered SVG text too small: ${audit.minimumRenderedSvgTextHeightPx.toFixed(1)}px`);
  if (audit.accessibility && audit.accessibility.counted.length > (config.accessibility?.maxViolations ?? 0)) p.push(`accessibility violations: ${audit.accessibility.counted.map(v=>`${v.id} (${v.impact}, ${v.nodes} elements: ${v.help}) e.g. ${v.targets.join(' | ')}`).join('; ')}`);
  return p;
}
let server = null;
let baseUrl = config.url;
if (!baseUrl && config.serveDir) {
  server = await serveDirectory(path.resolve(configDir, config.serveDir));
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}${config.path ?? '/'}`;
}
if (!baseUrl) throw new Error('render QA config requires either url or serveDir');

// --disable-dev-shm-usage: Chrome's default /dev/shm is small under WSL and containers, and large
// full-page captures crash the whole browser there. A browser that dies anyway is relaunched per viewport.
const launch = () => puppeteer.launch({ headless: true, executablePath: chromePath(), protocolTimeout: config.protocolTimeoutMs ?? 120000, args: ['--disable-dev-shm-usage'] });
let browser = await launch();
const failures=[];
let checked=0, minorA11y=0, screenshotErrors=0, crashes=0;
// A failed screenshot (e.g. a capture timeout on an animated page) is recorded, not fatal:
// one bad capture must not discard every other check's result.
async function shot(page,file,viewport,stateId){
  try { await page.screenshot({path:file,fullPage:true}); }
  catch(error){ screenshotErrors++; failures.push({viewport,state:`screenshot:${stateId}`,problems:[`screenshot failed: ${error.message.split('\n')[0]}`]}); }
}
try {
  for(const viewport of viewports){
    if(!browser.connected) { browser = await launch(); }
    const page=await browser.newPage();
    try {
    const runtimeErrors=[];
    page.on('pageerror', error=>runtimeErrors.push(error.message));
    await page.setViewport({ width:viewport.width, height:viewport.height ?? 1000, deviceScaleFactor:viewport.deviceScaleFactor ?? 1 });
    await page.goto(`${baseUrl}${baseUrl.includes('?')?'&':'?'}renderQa=${Date.now()}`, { waitUntil:'networkidle0' });
    if(config.waitForSelector) await page.waitForSelector(config.waitForSelector);
    if(config.waitForFunction) await page.waitForFunction(config.waitForFunction);
    for(const state of states){
      for(const action of state.actions ?? []) await applyAction(page,action);
      await new Promise(resolve=>setTimeout(resolve,state.settleMs ?? config.settleMs ?? 60));
      const generic=await genericAudit(page);
      generic.accessibility=await accessibilityAudit(page, config.accessibility);
      let audit=generic;
      checked++; if(generic.accessibility) minorA11y+=generic.accessibility.other.length;
      if(config.qaHook){
        const custom=await page.evaluate(name=>typeof window[name]==='function'?window[name]():null,config.qaHook);
        if(custom) audit={...generic,...custom};
      }
      const problems=[...failuresFor(audit,config), ...await expectationFailures(page,state)];
      if(problems.length) failures.push({viewport,state:state.id,problems,audit});
      if(config.screenshotEachState){
        const safe=state.id.replace(/[^a-z0-9_-]+/gi,'-');
        await shot(page,path.join(screenshotDir,`${viewport.width}-${safe}.png`),viewport,state.id);
      }
    }
    if(!config.screenshotEachState) await shot(page,path.join(screenshotDir,`${viewport.width}.png`),viewport,'final');
    if(runtimeErrors.length) failures.push({viewport,state:'runtime',problems:runtimeErrors});
    } catch(error) {
      // A crashed page or browser target is recorded for this viewport; the remaining viewports still run.
      crashes++; failures.push({viewport,state:'crash',problems:[`page crashed: ${error.message.split('\n')[0]}`]});
    } finally { await page.close().catch(()=>{}); }
  }
} finally {
  await browser.close().catch(()=>{});
  if(server) await new Promise(resolve=>server.close(resolve));
}

const failedStates=failures.filter(f=>f.state!=='runtime'&&f.state!=='crash'&&!String(f.state).startsWith('screenshot:')).length, runtimeFailures=failures.filter(f=>f.state==='runtime').length;
console.log(`render-qa: ${checked} state x viewport checks, ${checked-failedStates} passed, ${failedStates} failed, ${runtimeFailures} viewports with runtime errors, ${screenshotErrors} screenshot errors, ${crashes} crashed viewports; accessibility ${config.accessibility?'on':'off'}${config.accessibility?`, ${minorA11y} lower-impact findings not counted`:''}`);
if(failures.length){
  console.error(JSON.stringify({ok:false,failures},null,2));
  process.exitCode=1;
}else{
  console.log(JSON.stringify({ok:true,viewports,states:states.map(s=>s.id),screenshots:screenshotDir},null,2));
}
