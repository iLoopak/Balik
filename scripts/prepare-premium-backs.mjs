import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sharp = require(process.env.SHARP_MODULE || 'sharp');
const root = path.resolve(import.meta.dirname, '..');
const ids = ['biopunk', 'panelak-3000', 'chalupa', 'papirovy-cirkus', 'stormpunk'];
const output = path.join(root, 'packages/web/public/decks/art-backs');
await fs.mkdir(output, { recursive: true });
const entries = [];
for (const deck of ids) {
  const jobPath = path.join(root, `docs/visual/premium-backs/${deck}.json`);
  const job = JSON.parse(await fs.readFile(jobPath, 'utf8'));
  const source = await sharp(job.source).metadata();
  if (Math.abs(source.width / source.height - 5 / 7) > 0.03) {
    throw new Error(`${deck}: review the source aspect ratio before cropping`);
  }
  const asset = `/decks/art-backs/${deck}.webp`;
  const target = path.join(root, 'packages/web/public', asset);
  await sharp(job.source).resize(640, 896, { fit: 'cover', position: 'centre' })
    .webp({ quality: 92, effort: 6 }).toFile(target);
  const metadata = await sharp(target).metadata();
  const stats = await sharp(target).stats();
  if (!stats.isOpaque) throw new Error(`${deck}: a card back must be fully opaque`);
  const bytes = (await fs.stat(target)).size;
  job.export = { asset, width: metadata.width, height: metadata.height, bytes,
    isOpaque: stats.isOpaque, method: 'Sharp resize/encode only; no drawing or text compositing' };
  await fs.writeFile(jobPath, JSON.stringify(job, null, 2) + '\n');
  entries.push({ deck, name: job.name, direction: job.direction, asset, bytes });
}
const manifest = path.join(root, 'packages/web/src/decks/art-backs/manifest.json');
await fs.mkdir(path.dirname(manifest), { recursive: true });
await fs.writeFile(manifest, JSON.stringify(entries, null, 2) + '\n');
console.log(JSON.stringify(entries, null, 2));
