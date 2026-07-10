/**
 * Headless render integrity check — zero horizontal overflow, images load, required sections present.
 * Run after `npm run build`: npm run test:render-integrity
 * Emits screenshot contact-sheet to data/reports/render-integrity/
 */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, type Browser, type Page } from 'playwright';

import {
  RENDER_INTEGRITY_EDUCATION_PANEL_SELECTOR,
  RENDER_INTEGRITY_PAGES,
  RENDER_INTEGRITY_SCREENSHOT_DIR,
  RENDER_INTEGRITY_VIEWPORTS,
} from '../lib/data/__fixtures__/renderIntegrityGuard.fixture';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 4112;
const BASE = `http://127.0.0.1:${PORT}`;

const REQUIRED_SECTIONS: Record<string, string[]> = {
  '/states/FL': ['#economy', '#courts'],
};

function fail(message: string): never {
  console.error(JSON.stringify({ ok: false, renderIntegrity: message }));
  process.exit(1);
}

async function waitForServer(ms = 90000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < ms) {
    try {
      const res = await fetch(`${BASE}/states/FL`, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const html = await res.text();
        if (html.includes('id="economy"')) return;
      }
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  fail(`server did not become ready on ${BASE}/states/FL with id="economy" within ${ms}ms`);
}

function startServer(): { proc: ReturnType<typeof spawn>; kill: () => void } {
  const proc = spawn('npx', ['next', 'start', '-p', String(PORT)], {
    cwd: projectRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const kill = () => {
    proc.kill('SIGTERM');
  };
  return { proc, kill };
}

async function assertNoHorizontalOverflow(page: Page, label: string): Promise<void> {
  const overflow = await page.evaluate(() => {
    const docW = document.documentElement.scrollWidth;
    const innerW = window.innerWidth;
    const offenders: string[] = [];
    for (const el of document.querySelectorAll('body *')) {
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) continue;
      if (rect.right > innerW + 1) {
        const tag = `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}`;
        offenders.push(`${tag} right=${rect.right.toFixed(0)} viewport=${innerW}`);
        if (offenders.length >= 5) break;
      }
    }
    return { docW, innerW, offenders };
  });
  if (overflow.docW > overflow.innerW + 1 || overflow.offenders.length > 0) {
    fail(
      `${label}: horizontal overflow doc=${overflow.docW} inner=${overflow.innerW} — ${overflow.offenders.join('; ')}`,
    );
  }
}

async function assertImagesLoad(page: Page, label: string): Promise<void> {
  const broken = await page.evaluate(() => {
    const imgs = [...document.querySelectorAll('img')];
    return imgs
      .filter((img) => {
        if (img.closest('#politicians')) return false;
        const w = img.naturalWidth;
        const src = img.getAttribute('src') ?? '';
        if (!src || src.startsWith('data:')) return false;
        const rect = img.getBoundingClientRect();
        if (rect.width < 2 || rect.height < 2) return false;
        return w === 0;
      })
      .map((img) => img.getAttribute('src') ?? '(no src)')
      .slice(0, 8);
  });
  if (broken.length > 0) {
    fail(`${label}: broken images (naturalWidth=0): ${broken.join(', ')}`);
  }
}

async function assertRequiredSections(page: Page, pagePath: string, label: string): Promise<void> {
  const required = REQUIRED_SECTIONS[pagePath] ?? [];
  for (const sel of required) {
    const empty = await page.evaluate((selector) => {
      const el = document.querySelector(selector);
      if (!el) return 'missing';
      const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
      return text.length < 20 ? 'empty' : null;
    }, sel);
    if (empty) {
      fail(`${label}: required section ${sel} is ${empty}`);
    }
  }
}

async function assertEducationPanelNoOverflow(page: Page, label: string): Promise<void> {
  const panel = page.locator(RENDER_INTEGRITY_EDUCATION_PANEL_SELECTOR);
  if ((await panel.count()) === 0) return;
  const box = await panel.first().boundingBox();
  if (!box) return;
  const innerW = page.viewportSize()?.width ?? 1280;
  if (box.x + box.width > innerW + 1) {
    fail(
      `${label}: education panel overflows viewport (right=${(box.x + box.width).toFixed(0)} viewport=${innerW})`,
    );
  }
}

async function runChecks(browser: Browser): Promise<string[]> {
  const screenshotDir = path.join(projectRoot, RENDER_INTEGRITY_SCREENSHOT_DIR);
  mkdirSync(screenshotDir, { recursive: true });
  const shots: string[] = [];

  for (const pageDef of RENDER_INTEGRITY_PAGES) {
    for (const vp of RENDER_INTEGRITY_VIEWPORTS) {
      const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const page = await context.newPage();
      const url = `${BASE}${pageDef.path}`;
      const label = `${pageDef.label} @ ${vp.label}`;
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(3000);
      await assertNoHorizontalOverflow(page, label);
      await assertImagesLoad(page, label);
      await assertRequiredSections(page, pageDef.path, label);
      if (pageDef.path === '/states/FL') {
        await assertEducationPanelNoOverflow(page, label);
      }
      const shotName = `${pageDef.path.replace(/\//g, '_')}_${vp.label}.png`;
      const shotPath = path.join(screenshotDir, shotName);
      await page.screenshot({ path: shotPath, fullPage: true });
      shots.push(shotPath);
      await context.close();
    }
  }

  const indexPath = path.join(screenshotDir, 'contact-sheet.json');
  writeFileSync(
    indexPath,
    JSON.stringify({ generatedAt: new Date().toISOString(), screenshots: shots }, null, 2),
  );
  return shots;
}

async function main(): Promise<void> {
  const nextDir = path.join(projectRoot, '.next');
  try {
    const { accessSync } = await import('node:fs');
    accessSync(nextDir);
  } catch {
    fail('missing .next — run npm run build before test:render-integrity');
  }

  const { kill } = startServer();
  try {
    await waitForServer();
    const browser = await chromium.launch({ headless: true });
    try {
      const shots = await runChecks(browser);
      console.log(
        JSON.stringify({
          ok: true,
          renderIntegrity: 'overflow, images, sections pass',
          screenshots: shots.length,
          dir: RENDER_INTEGRITY_SCREENSHOT_DIR,
        }),
      );
    } finally {
      await browser.close();
    }
  } finally {
    kill();
  }
}

main().catch((err) => {
  fail(err instanceof Error ? err.message : String(err));
});
