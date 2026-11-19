// VICE DESK — hand-in program for the gta6-cover-art-01 bounty (Node 22,
// standard library only, no network).
//
// The entry itself is the static web app in app/ beside this file: plain
// files a desktop browser opens offline, no build step. This program's one
// job is to hand that app in exactly the way the bounty asks: copy app/ and
// screenshots/ into the output directory, then write dossier.json there with
// the kit's vendored buildDossier, so the sealed scorer can rebuild the same
// dossier from the same files and compare the two byte for byte.
//
// Where it writes: /output inside the grader's container; anywhere else,
// MAKEFUN_OUTPUT_DIR names the folder instead:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// Try the app first with `node serve.ts`, which serves app/ locally.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoDir = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Copy the app exactly as it stands — the dossier is built from the copies,
// so what the judge reads is what was handed in, nothing rebuilt or patched.
mkdirSync(outDir, { recursive: true });
cpSync(join(repoDir, 'app'), join(outDir, 'app'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoDir, 'screenshots'))) {
  cpSync(join(repoDir, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
}

// The caps below are the scorer's own (the kit's reference/gate.json). Only
// text_max_bytes shapes the dossier's bytes; the rest make this program
// refuse an entry the scorer would refuse anyway — too many or too-large
// screenshots, an app/ over its file, byte or path limits — instead of
// handing in something invalid.
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
