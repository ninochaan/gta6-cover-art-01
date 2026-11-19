// PNG export: one size, or every post size in a single click.
import { ASPECTS, renderCoverAt } from './render.js';

/** Downloads a canvas as a PNG file. */
export function downloadPng(canvas, filename) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) return resolve(false);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      resolve(true);
    }, 'image/png');
  });
}

/** Exports one cover size and returns its filename. */
export async function exportCoverSize(state, photos, aspectId) {
  const size = ASPECTS[aspectId];
  const canvas = renderCoverAt(state, photos, aspectId);
  const name = `vice-cover-${size.w}x${size.h}.png`;
  await downloadPng(canvas, name);
  return name;
}

/** Exports every post size, one after another, and returns the filenames. */
export async function exportAllCoverSizes(state, photos, aspectIds) {
  const names = [];
  for (const id of aspectIds) {
    names.push(await exportCoverSize(state, photos, id));
    await new Promise((r) => setTimeout(r, 120));
  }
  return names;
}
