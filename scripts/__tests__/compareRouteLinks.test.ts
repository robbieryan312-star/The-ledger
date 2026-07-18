/**
 * Build-gated guard: candidate compare entry points must request candidate mode.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function readProjectFile(relativePath: string): string {
  return readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

test('Compare Candidates links route to candidate compare mode', () => {
  const home = readProjectFile('app/page.tsx');
  assert.match(
    home,
    /label:\s*'Compare Candidates',\s*href:\s*'\/compare\?mode=candidates'/,
    'home quick link must open candidate compare mode',
  );

  const footer = readProjectFile('components/layout/Footer.tsx');
  assert.match(
    footer,
    /\['Compare Candidates',\s*'\/compare\?mode=candidates'\]/,
    'footer Compare Candidates link must open candidate compare mode',
  );

  const usaMap = readProjectFile('components/map/USAMap.tsx');
  assert.match(
    usaMap,
    /<Link href="\/compare\?mode=candidates"[\s\S]*?>\s*<Vote[^>]*\/>\s*Compare candidates\s*<\/Link>/,
    'state election card Compare candidates link must open candidate compare mode',
  );
});
