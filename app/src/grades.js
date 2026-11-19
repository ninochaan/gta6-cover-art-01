// Sunset / neon colour grades for cover photos. Each grade is a shadow->mid->highlight
// ramp used as a gradient map, plus a warm overlay tint. Grades are data only: the
// pixel work lives in applyGradeToCanvas below.
export const GRADES = {
  sunset: {
    label: 'Sunset',
    ramp: [[24, 8, 48], [150, 40, 110], [255, 140, 70], [255, 225, 160]],
    tint: 'rgba(255, 110, 60, 0.16)',
    strength: 0.55,
  },
  neon: {
    label: 'Neon Vice',
    ramp: [[8, 6, 40], [90, 20, 130], [255, 45, 150], [120, 240, 255]],
    tint: 'rgba(255, 40, 160, 0.14)',
    strength: 0.62,
  },
  dusk: {
    label: 'Dusk Purple',
    ramp: [[16, 10, 44], [80, 40, 120], [200, 90, 160], [255, 200, 120]],
    tint: 'rgba(120, 60, 220, 0.14)',
    strength: 0.55,
  },
  teal: {
    label: 'Teal Night',
    ramp: [[4, 18, 34], [10, 70, 110], [30, 180, 190], [220, 255, 230]],
    tint: 'rgba(0, 200, 220, 0.12)',
    strength: 0.58,
  },
  golden: {
    label: 'Golden Hour',
    ramp: [[30, 16, 8], [140, 70, 30], [250, 160, 60], [255, 240, 190]],
    tint: 'rgba(255, 170, 40, 0.15)',
    strength: 0.5,
  },
  noir: {
    label: 'Noir Pink',
    ramp: [[6, 6, 10], [60, 30, 50], [190, 90, 120], [255, 220, 220]],
    tint: 'rgba(255, 80, 120, 0.10)',
    strength: 0.66,
  },
};

export const GRADE_IDS = Object.keys(GRADES);

/** Builds a 256-entry RGB lookup table from a grade ramp (piecewise-linear). */
export function buildGradeLut(grade) {
  const lut = new Uint8Array(256 * 3);
  const stops = grade.ramp;
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    const seg = Math.min(stops.length - 2, Math.floor(t * (stops.length - 1)));
    const local = t * (stops.length - 1) - seg;
    for (let c = 0; c < 3; c++) {
      lut[i * 3 + c] = Math.round(
        stops[seg][c] + (stops[seg + 1][c] - stops[seg][c]) * local,
      );
    }
  }
  return lut;
}

/**
 * Applies a grade's gradient map in place on a canvas's pixels, blending the
 * mapped colour toward the original by the grade strength, then adds the tint.
 */
export function applyGradeToCanvas(canvas, gradeId) {
  const grade = GRADES[gradeId] ?? GRADES.sunset;
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const lut = buildGradeLut(grade);
  const s = grade.strength;
  for (let i = 0; i < d.length; i += 4) {
    const lum = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) | 0;
    const base = lum * 3;
    d[i] = d[i] + (lut[base] - d[i]) * s;
    d[i + 1] = d[i + 1] + (lut[base + 1] - d[i + 1]) * s;
    d[i + 2] = d[i + 2] + (lut[base + 2] - d[i + 2]) * s;
  }
  ctx.putImageData(img, 0, 0);
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = grade.tint;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';
}

/**
 * Draws a photo cover-fitting a rect, with per-panel zoom and pan offsets, then
 * grades it. Offsets are fractions of the rect size (-0.5..0.5). The fit is
 * anchored toward the top of the photo (focusY 0 = top edge, 0.5 = centred),
 * so a face near the top survives a wide panel's crop; focusX anchors likewise.
 */
export function drawGradedPhoto(ctx, photo, rect, gradeId, zoom, ox, oy, focusY = 0.25, focusX = 0.5) {
  const pw = Math.max(2, Math.round(rect.w));
  const ph = Math.max(2, Math.round(rect.h));
  const tmp = drawGradedPhoto._tmp ?? (drawGradedPhoto._tmp = document.createElement('canvas'));
  tmp.width = pw;
  tmp.height = ph;
  const tctx = tmp.getContext('2d', { willReadFrequently: true });
  const scale = Math.max(pw / photo.naturalWidth, ph / photo.naturalHeight) * (zoom || 1);
  const dw = photo.naturalWidth * scale;
  const dh = photo.naturalHeight * scale;
  const x0 = -(dw - pw) * focusX + (ox || 0) * pw;
  const y0 = -(dh - ph) * focusY + (oy || 0) * ph;
  tctx.drawImage(photo, x0, y0, dw, dh);
  applyGradeToCanvas(tmp, gradeId);
  ctx.drawImage(tmp, rect.x, rect.y, rect.w, rect.h);
}
