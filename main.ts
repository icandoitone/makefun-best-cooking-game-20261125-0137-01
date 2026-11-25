// Warung Rush — Sizzle & Serve: the entry program for
// best-cooking-game-20261125-0137 (Node 22, standard library only).
//
// It hands the game in: copies this repository's game/ and screenshots/
// beside it into the output directory and writes /output/dossier.json
// with the kit's vendored library, exactly as the gate re-derives it.
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The run is deterministic: it copies files in a fixed order and the
// dossier is a pure function of the copied tree, so two runs write the
// same bytes.

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function copyTree(name) {
  const src = join(here, name);
  if (!existsSync(src)) return 0;
  const dest = join(outDir, name);
  cpSync(src, dest, { recursive: true });
  let count = 0;
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const p = join(dir, entry);
      if (statSync(p).isDirectory()) walk(p);
      else count += 1;
    }
  };
  walk(dest);
  return count;
}

mkdirSync(outDir, { recursive: true });
// A previous run's files must not linger: wipe the known outputs first so
// a stale screenshot can never survive into a new run.
for (const name of ['game', 'screenshots', 'dossier.json']) {
  const p = join(outDir, name);
  if (existsSync(p)) rmSync(p, { recursive: true, force: true });
}

const gameFiles = copyTree('game');
const shotFiles = copyTree('screenshots');
if (gameFiles === 0) throw new Error('game/ is missing or empty — nothing to hand in');
if (shotFiles === 0) throw new Error('screenshots/ is missing — the game needs 3 or 4 shots');
if (!existsSync(join(outDir, 'game', 'index.html'))) {
  throw new Error('game/index.html is missing — the game cannot open in a browser');
}
if (shotFiles > 4) throw new Error('screenshots/ holds more than 4 images — the gate allows at most 4');

writeFileSync(
  join(outDir, 'dossier.json'),
  buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

// A one-line summary on stdout; the bytes in /output are what the gate reads.
console.log(`warung-rush: ${gameFiles} game files, ${shotFiles} screenshots, dossier written to ${outDir}`);
