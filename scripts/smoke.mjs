// DOM-level smoke test of the built site (no screenshots, per AGENTS.md): chrome
// mounts, the three nav panels render content from #yy-content, landing islands
// hydrate, case routes render extracted copy. Usage:
//   npm run build && npm run preview &   # serves dist on 127.0.0.1:4800
//   npm run smoke                        # or BASE=https://xxx.trycloudflare.com npm run smoke
// Expected noise in a sandbox: video requests fail (headless Chromium has no
// H.264 decoder) and api.microlink.io link previews are blocked; both are ignored.
import fs from 'node:fs';
import { chromium } from 'playwright-core';

const BASE = process.env.BASE || 'http://127.0.0.1:4800';
const executablePath = process.env.CHROMIUM_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
page.on('requestfailed', (r) => errors.push('requestfailed: ' + r.url()));
page.on('response', (r) => { if (r.status() >= 400) errors.push(`http ${r.status()}: ${r.url()}`); });

const results = [];
const check = (name, ok, extra = '') => { results.push(`${ok ? 'PASS' : 'FAIL'} ${name} ${extra}`); };

await page.goto(BASE + '/', { waitUntil: 'networkidle' });
check('landing: hero statement', (await page.textContent('h1')).includes('Build AI-native experiences'));
check('landing: 4 featured cases', (await page.$$('.case')).length === 4);
check('landing: yy-nav mounted', !!(await page.$('yy-nav')));
check('landing: yy-footer mounted', !!(await page.$('yy-footer')));
const island = await page.$$eval('astro-island', (els) => els.map((e) => e.getAttribute('component-export') || e.getAttribute('component-url')));
check('landing: islands present', island.length >= 2, JSON.stringify(island));

async function openPanel(name) {
  await page.evaluate((n) => {
    const nav = document.querySelector('yy-nav').shadowRoot;
    nav.querySelector(`[data-panel-trigger="${n}"]`).click();
  }, name);
  const tag = { work: 'yy-work-content', about: 'yy-about-content', resume: 'yy-resume-content' }[name];
  await page.waitForFunction((t) => {
    const nav = document.querySelector('yy-nav').shadowRoot;
    const el = nav.querySelector(t);
    return el && el.shadowRoot && el.shadowRoot.textContent.trim().length > 50 && !el.hasAttribute('data-yy-pending');
  }, tag, { timeout: 8000 });
  return page.evaluate((t) => {
    const el = document.querySelector('yy-nav').shadowRoot.querySelector(t);
    return { text: el.shadowRoot.textContent.replace(/\s+/g, ' ').trim(), links: [...el.shadowRoot.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')), imgs: [...el.shadowRoot.querySelectorAll('img')].map((i) => i.getAttribute('src')) };
  }, tag);
}

const work = await openPanel('work');
check('panel work: 8 cards', work.text.includes('Opus Clip') && work.text.includes('Lark Education Field Study'), `${work.links.length} links`);
check('panel work: links are new routes', work.links.length === 7 && work.links.every((h) => h.startsWith('/work/')), work.links.join(','));
const about = await openPanel('about');
check('panel about: copy', about.text.includes("I'm Yanice Yang") && about.text.includes('I am a dog lover!'));
check('panel about: images', about.imgs.length === 10 && about.imgs.every((s) => s.startsWith('/assets/')), `${about.imgs.length} imgs`);
check('panel about: fashion link', about.links.includes('/work/fashion'));
const resume = await openPanel('resume');
check('panel resume: profile', resume.text.includes('Yanice Yang') && resume.text.includes('Senior Product Designer') && resume.text.includes('2019 — Present'));
check('panel resume: jobs + awards', resume.text.includes('AtlasNova AI') && resume.text.includes('MUSE Design Award') && resume.text.includes('Kano model'));

await page.goto(BASE + '/work/ai-driven-product-design/', { waitUntil: 'networkidle' });
check('case: chrome mounted', !!(await page.$('yy-nav')));
check('case: dark footer', await page.$eval('yy-footer', (e) => e.classList.contains('is-dark')));
check('case: videos are mp4', (await page.$$eval('main video', (v) => v.map((x) => x.getAttribute('src')))).every((s) => s.endsWith('.mp4')));
check('case: copy rendered', (await page.textContent('main')).includes('Generate resources within AI prompts'));
await page.goto(BASE + '/work/larkdesign/', { waitUntil: 'networkidle' });
check('case lark: flow canvas palette', !!(await page.$('#yy-flow[data-yy-base="#2a73e2"]')));
await page.goto(BASE + '/about/', { waitUntil: 'networkidle' });
check('about page: structured copy', (await page.textContent('main')).includes('Fun Fact'));

await browser.close();
console.log(results.join('\n'));
const ignorable = /favicon|nav-orb|trycloudflare|\.mp4|api\.microlink\.io|ERR_TUNNEL_CONNECTION_FAILED/;
const realErrors = errors.filter((e) => !ignorable.test(e));
console.log(realErrors.length ? 'ERRORS:\n' + realErrors.join('\n') : 'no page errors');
process.exit(results.some((r) => r.startsWith('FAIL')) || realErrors.length ? 1 : 0);
