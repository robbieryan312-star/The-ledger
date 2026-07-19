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
  RENDER_INTEGRITY_PROFILE_DRAWER_KNOWN_BAD,
  RENDER_INTEGRITY_PROFILE_PAGES,
  RENDER_INTEGRITY_SCREENSHOT_DIR,
  RENDER_INTEGRITY_VIEWPORTS,
} from '../lib/data/__fixtures__/renderIntegrityGuard.fixture';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 4112;
const BASE = `http://127.0.0.1:${PORT}`;

const REQUIRED_SECTIONS: Record<string, string[]> = {
  '/states/FL': ['#section-01', '#section-02', '#section-03'],
};

/** Present when live legislation/court samples exist — asserted only if in DOM. */
const CONDITIONAL_SECTIONS: Record<string, string[]> = {
  '/states/FL': ['#section-04', '#section-05'],
};

function fail(message: string): never {
  console.error(JSON.stringify({ ok: false, renderIntegrity: message }));
  process.exit(1);
}

const READY_POLL_MS = 240_000;
const READY_FETCH_TIMEOUT_MS = 120_000;

async function waitForServer(ms = READY_POLL_MS): Promise<void> {
  const start = Date.now();
  let attempts = 0;
  while (Date.now() - start < ms) {
    attempts += 1;
    try {
      const fetchTimeout = attempts <= 3 ? READY_FETCH_TIMEOUT_MS : 10_000;
      const res = await fetch(`${BASE}/states/FL`, { signal: AbortSignal.timeout(fetchTimeout) });
      if (res.ok) {
        const html = await res.text();
        if (html.includes('id="section-01"')) return;
      }
    } catch {
      // retry — first requests may block while Next compiles /states/FL on demand
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  fail(`server did not become ready on ${BASE}/states/FL with id="section-01" within ${ms}ms`);
}

async function assertPortFree(): Promise<void> {
  try {
    const res = await fetch(`${BASE}/states/FL`, { signal: AbortSignal.timeout(1500) });
    if (res.ok) {
      fail(
        `port ${PORT} already serving /states/FL — refuse to validate against a stale server. Kill the process on ${PORT} and retry.`,
      );
    }
  } catch {
    // expected when nothing is listening
  }
}

function startServer(): { proc: ReturnType<typeof spawn> | null; kill: () => void; external: boolean } {
  if (process.env.RENDER_INTEGRITY_EXTERNAL_SERVER === '1') {
    return { proc: null, kill: () => {}, external: true };
  }
  const proc = spawn('npx', ['next', 'start', '-H', '127.0.0.1', '-p', String(PORT)], {
    cwd: projectRoot,
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const kill = () => {
    if (proc.pid == null) return;
    try {
      process.kill(-proc.pid, 'SIGTERM');
    } catch {
      try {
        proc.kill('SIGTERM');
      } catch {
        /* already gone */
      }
    }
    setTimeout(() => {
      try {
        if (proc.pid != null) process.kill(-proc.pid, 'SIGKILL');
      } catch {
        /* already gone */
      }
    }, 2000).unref?.();
  };
  return { proc, kill, external: false };
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
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll('img')]
        .filter((img) => {
          const src = img.getAttribute('src') ?? '';
          if (!src || src.startsWith('data:')) return false;
          const rect = img.getBoundingClientRect();
          return rect.width >= 2 && rect.height >= 2;
        })
        .every((img) => img.complete),
    undefined,
    { timeout: 45_000 },
  );
  const broken = await page.evaluate(() => {
    const imgs = [...document.querySelectorAll('img')];
    return imgs
      .filter((img) => {
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
  // Allow slow official hosts a settle window before treating fallbacks as defects.
  try {
    await page.waitForFunction(
      () => document.querySelectorAll('#politicians [data-ledger-avatar="fallback"]').length === 0,
      undefined,
      { timeout: 30_000 },
    );
  } catch {
    /* fall through to explicit failure below */
  }
  const politicianFallbacks = await page.evaluate(() =>
    [...document.querySelectorAll('#politicians [data-ledger-avatar="fallback"]')]
      .map((el) => el.getAttribute('data-ledger-avatar-name') ?? el.textContent?.trim() ?? '(unknown)')
      .slice(0, 8),
  );
  if (politicianFallbacks.length > 0) {
    fail(`${label}: politician portraits fell back to initials: ${politicianFallbacks.join(', ')}`);
  }
}

async function openAllDetails(page: Page): Promise<void> {
  await page.evaluate(() => {
    document.querySelectorAll('details').forEach((d) => {
      d.open = true;
    });
  });
  await page.waitForTimeout(200);
}

/**
 * Open React-state content drawers (buttons, not <details>) — issue tiles, accordions,
 * "show legislation" toggles — while leaving the tab bar untouched so the current tab's
 * content stays mounted. Each toggle is clicked at most once; repeated passes reveal
 * nested drawers.
 */
async function openReactDrawers(page: Page): Promise<void> {
  for (let pass = 0; pass < 5; pass++) {
    const clicked = await page.evaluate(() => {
      const btns = [...document.querySelectorAll('button')] as HTMLButtonElement[];
      let n = 0;
      for (const b of btns) {
        if (b.dataset.riClicked) continue;
        // Never click the horizontal tab-nav buttons (would switch tabs) or the site
        // header/nav controls (would open the mobile menu overlay).
        if (b.closest('.overflow-x-auto') || b.closest('header') || b.closest('nav')) {
          b.dataset.riClicked = '1';
          continue;
        }
        b.dataset.riClicked = '1';
        b.click();
        n++;
      }
      return n;
    });
    await page.waitForTimeout(150);
    if (!clicked) break;
  }
}

/** Number of topic tiles in the "Key Issues" grid, or 0 when the panel is absent. */
async function keyIssuesTopicCount(page: Page): Promise<number> {
  return page.evaluate(() => {
    const heads = [...document.querySelectorAll('h2')];
    const h = heads.find((e) => /Key Issues/.test(e.textContent || ''));
    const panel = h ? h.closest('div') : null;
    if (!panel) return 0;
    const grid = panel.querySelector('[class*="grid"]');
    if (!grid) return 0;
    return [...grid.children].filter((c) => c.querySelector('button')).length;
  });
}

/** Open exactly one Key-Issues topic tile by index (closing any other). */
async function openKeyIssuesTopic(page: Page, index: number): Promise<void> {
  await page.evaluate((i: number) => {
    const heads = [...document.querySelectorAll('h2')];
    const h = heads.find((e) => /Key Issues/.test(e.textContent || ''));
    const panel = h ? h.closest('div') : null;
    const grid = panel?.querySelector('[class*="grid"]');
    if (!grid) return;
    const cells = [...grid.children].filter((c) => c.querySelector('button'));
    const btn = cells[i]?.querySelector('button') as HTMLButtonElement | undefined;
    btn?.click();
  }, index);
  await page.waitForTimeout(160);
}

/**
 * Fail if any open drawer is squeezed: at mobile width, no cell of a ≥2-column grid may
 * be both tall (≥300px) and narrower than 90% of the viewport (a half-width drawer), and
 * no tall sibling cell may be empty. Freezes the owner-reported drawer defect.
 */
async function assertNoSqueezedDrawer(page: Page, label: string): Promise<void> {
  const minRatio = RENDER_INTEGRITY_PROFILE_DRAWER_KNOWN_BAD.minDrawerWidthRatio;
  const emptyH = RENDER_INTEGRITY_PROFILE_DRAWER_KNOWN_BAD.siblingEmptyHeightPx;
  const offenders = await page.evaluate(
    ({ minRatio, emptyH }: { minRatio: number; emptyH: number }) => {
      const out: string[] = [];
      for (const grid of document.querySelectorAll('[class*="grid"]')) {
        const gs = getComputedStyle(grid);
        if (!gs.display.includes('grid')) continue;
        const cols = gs.gridTemplateColumns.split(' ').filter(Boolean).length;
        if (cols < 2) continue;
        const gridW = grid.getBoundingClientRect().width;
        if (gridW < 200) continue;
        for (const cell of grid.children) {
          const r = cell.getBoundingClientRect();
          if (r.width <= 0 || r.height <= 0) continue;
          const txt = (cell.textContent || '').replace(/\s+/g, ' ').trim();
          // A tall, text-heavy drawer must span (nearly) the full grid width — i.e. it
          // must be col-span-full when open, not squeezed into one column.
          if (r.height >= emptyH && txt.length > 40 && r.width < gridW * minRatio) {
            out.push(
              `squeezed drawer w=${Math.round(r.width)} gridW=${Math.round(gridW)} h=${Math.round(r.height)} "${txt.slice(0, 40)}"`,
            );
          }
          if (r.height >= emptyH && txt.length < 5) {
            out.push(`empty sibling cell h=${Math.round(r.height)} w=${Math.round(r.width)}`);
          }
          if (out.length >= 6) break;
        }
        if (out.length >= 6) break;
      }
      return out;
    },
    { minRatio, emptyH },
  );
  if (offenders.length > 0) {
    fail(`${label}: ${offenders.join('; ')}`);
  }
}

async function assertRequiredSections(page: Page, pagePath: string, label: string): Promise<void> {
  const required = REQUIRED_SECTIONS[pagePath] ?? [];
  for (const sel of required) {
    const empty = await page.evaluate((selector: string) => {
      const el = document.querySelector(selector);
      if (!el) return 'missing';
      const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
      return text.length < 20 ? 'empty' : null;
    }, sel);
    if (empty) {
      fail(`${label}: required section ${sel} is ${empty}`);
    }
  }
  for (const sel of CONDITIONAL_SECTIONS[pagePath] ?? []) {
    const status = await page.evaluate((selector: string) => {
      const el = document.querySelector(selector);
      if (!el) return 'absent';
      const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
      return text.length < 20 ? 'empty' : 'ok';
    }, sel);
    if (status === 'empty') {
      fail(`${label}: conditional section ${sel} is present but empty`);
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

/**
 * Fail if #section-01 lays out a soft line break between two non-space characters
 * in the same text node (hyphen-less mid-word split, e.g. "Bachelor' s").
 */
async function assertNoMidWordSplitsInByTheNumbers(page: Page, label: string): Promise<void> {
  const offenders = await page.evaluate(() => {
    const root = document.querySelector('#section-01');
    if (!root) return ['#section-01 missing'];
    const bad: string[] = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const text = node.textContent ?? '';
      if (text.length < 2 || !/\S/.test(text)) continue;
      const parent = node.parentElement;
      if (!parent) continue;
      const style = getComputedStyle(parent);
      if (style.display === 'none' || style.visibility === 'hidden') continue;
      const range = document.createRange();
      for (let i = 0; i < text.length - 1; i++) {
        const a = text[i];
        const b = text[i + 1];
        if (/\s/.test(a) || /\s/.test(b)) continue;
        // Skip explicit hyphens / soft hyphen already in content
        if (a === '-' || a === '\u00ad' || b === '-' || b === '\u00ad') continue;
        try {
          range.setStart(node, i);
          range.setEnd(node, i + 1);
          const r1 = range.getBoundingClientRect();
          range.setStart(node, i + 1);
          range.setEnd(node, i + 2);
          const r2 = range.getBoundingClientRect();
          if (r1.width === 0 && r1.height === 0) continue;
          if (r2.width === 0 && r2.height === 0) continue;
          if (Math.abs(r1.top - r2.top) > 2) {
            const snippet = text.slice(Math.max(0, i - 8), Math.min(text.length, i + 10)).replace(/\s+/g, ' ');
            bad.push(`"${snippet}"`);
            break;
          }
        } catch {
          // ignore invalid ranges
        }
      }
      if (bad.length >= 8) break;
    }
    return bad;
  });
  if (offenders.length > 0) {
    fail(`${label}: mid-word split(s) in #section-01: ${offenders.join('; ')}`);
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
      const required = REQUIRED_SECTIONS[pageDef.path] ?? [];
      for (const sel of required) {
        await page.waitForSelector(sel, { state: 'attached', timeout: 30000 });
      }
      await page.waitForTimeout(1000);
      await openAllDetails(page);
      await assertNoHorizontalOverflow(page, label);
      await assertImagesLoad(page, label);
      await assertRequiredSections(page, pageDef.path, label);
      if (pageDef.path === '/states/FL') {
        await assertEducationPanelNoOverflow(page, label);
        await assertNoMidWordSplitsInByTheNumbers(page, label);
      }
      const shotName = `${pageDef.path.replace(/\//g, '_')}_${vp.label}.png`;
      const shotPath = path.join(screenshotDir, shotName);
      await page.screenshot({ path: shotPath, fullPage: false });
      shots.push(shotPath);
      await context.close();
    }
  }

  // Profile issue-drawer checks — mobile only, where the squeeze defect occurred.
  const mobile =
    RENDER_INTEGRITY_VIEWPORTS.find((v) => v.label === 'mobile') ?? RENDER_INTEGRITY_VIEWPORTS[0];
  for (const prof of RENDER_INTEGRITY_PROFILE_PAGES) {
    const context = await browser.newContext({ viewport: { width: mobile.width, height: mobile.height } });
    const page = await context.newPage();
    const url = `${BASE}${prof.path}`;
    const label = `${prof.label} @ ${mobile.label}`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(1000);
    await openAllDetails(page);
    await openReactDrawers(page);
    // Note: the profile tab bar is an intentional overflow-x-auto scroll region, so the
    // page-wide horizontal-overflow check does not apply here; the drawer-squeeze check is
    // the S2 regression guard for these pages.
    await assertNoSqueezedDrawer(page, label);
    // Open each Key-Issues topic in turn — a content-rich open drawer must never squeeze.
    const topics = await keyIssuesTopicCount(page);
    for (let i = 0; i < topics; i++) {
      await openKeyIssuesTopic(page, i);
      await assertNoSqueezedDrawer(page, `${label} (topic ${i})`);
    }
    if (topics > 0) await openKeyIssuesTopic(page, 0);
    const shotName = `${prof.path.replace(/\//g, '_')}_${mobile.label}.png`;
    const shotPath = path.join(screenshotDir, shotName);
    await page.screenshot({ path: shotPath, fullPage: false });
    shots.push(shotPath);
    await context.close();
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

  if (process.env.RENDER_INTEGRITY_EXTERNAL_SERVER !== '1') {
    await assertPortFree();
  }
  const { kill, external } = startServer();
  // fail() calls process.exit and skips the finally below — ensure the detached server is
  // still torn down on any exit so a failed run never leaks a listener on the port.
  if (!external) process.once('exit', () => kill());
  try {
    if (!external) {
      await waitForServer();
    } else {
      await waitForServer(60_000);
    }
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
