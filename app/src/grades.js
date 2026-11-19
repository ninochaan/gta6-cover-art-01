// Colour grades for VICE DESK.
//
// A grade is real pixel work, never a flat wash. Each photo is pushed through
// three stages built into 256-entry lookup tables:
//   1. a contrast S-curve with a small black/white point lift,
//   2. a saturation move around each pixel's own luminance,
//   3. a split-tone gradient map: shadows, midtones and highlights are tinted
//      toward three different colours, blended by luminance, so dark detail
//      stays dark and readable while the highlights pick up the warm colour.
// The blend keeps most of the pixel's own value, so faces, water and chrome
// keep their texture; only the colour balance travels toward the grade.

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export const GRADES = [
  {
    id: 'golden-hour', name: 'Golden Hour',
    shadow: '#232044', mid: '#c85a2e', high: '#ffd98c',
    contrast: 1.14, saturation: 1.18, toneAmount: 0.42, warmth: 1.04,
  },
  {
    id: 'neon-vice', name: 'Neon Vice',
    shadow: '#0d1b3e', mid: '#d63384', high: '#ffe3f4',
    contrast: 1.17, saturation: 1.3, toneAmount: 0.46, warmth: 1.0,
  },
  {
    id: 'dusk-purple', name: 'Dusk Purple',
    shadow: '#180d2e', mid: '#7a4ba6', high: '#ffc9a3',
    contrast: 1.1, saturation: 1.12, toneAmount: 0.44, warmth: 1.02,
  },
  {
    id: 'teal-night', name: 'Teal Night',
    shadow: '#04222b', mid: '#177e84', high: '#c8f2ee',
    contrast: 1.13, saturation: 1.08, toneAmount: 0.4, warmth: 0.97,
  },
  {
    id: 'sunset-strip', name: 'Sunset Strip',
    shadow: '#2e1030', mid: '#f2603c', high: '#ffe49b',
    contrast: 1.12, saturation: 1.24, toneAmount: 0.45, warmth: 1.06,
  },
  {
    id: 'noir-pink', name: 'Noir Pink',
    shadow: '#0f0c18', mid: '#a05f83', high: '#f7e9f0',
    contrast: 1.24, saturation: 0.82, toneAmount: 0.36, warmth: 1.0,
  },
];

export function gradeById(id) {
  return GRADES.find((g) => g.id === id) ?? GRADES[0];
}

// Builds the per-grade tables once: a value curve (contrast) and, for each of
// the 256 luminance steps, the split-tone colour that step leans toward.
function buildTables(grade) {
  const curve = new Uint8ClampedArray(256);
  const c = grade.contrast;
  for (let i = 0; i < 256; i++) {
    const x = i / 255;
    // Smooth S-curve: pulls shadows down and highlights up around mid-grey.
    const s = x + (c - 1) * Math.sin((x - 0.5) * Math.PI) * 0.28;
    const lifted = 0.02 + s * 0.97; // gentle black/white points, no clipping crush
    curve[i] = Math.max(0, Math.min(255, lifted * 255));
  }
  const sh = hexToRgb(grade.shadow);
  const md = hexToRgb(grade.mid);
  const hi = hexToRgb(grade.high);
  const tone = [new Float32Array(256), new Float32Array(256), new Float32Array(256)];
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    for (let ch = 0; ch < 3; ch++) {
      // Piecewise ramp: shadow colour at 0, mid colour at 0.5, highlight at 1.
      tone[ch][i] = t < 0.5
        ? sh[ch] + (md[ch] - sh[ch]) * (t * 2)
        : md[ch] + (hi[ch] - md[ch]) * ((t - 0.5) * 2);
    }
  }
  return { curve, tone };
}

const tableCache = new Map();
function tablesFor(grade) {
  if (!tableCache.has(grade.id)) tableCache.set(grade.id, buildTables(grade));
  return tableCache.get(grade.id);
}

// Applies a grade to an ImageData in place. Saturation and the split tone are
// computed from the curved pixel so the three stages agree with each other.
export function applyGradeToPixels(imageData, grade) {
  const { curve, tone } = tablesFor(grade);
  const d = imageData.data;
  const sat = grade.saturation;
  const amt = grade.toneAmount;
  const keep = 1 - amt;
  const warm = grade.warmth;
  for (let i = 0; i < d.length; i += 4) {
    let r = curve[d[i]];
    let g = curve[d[i + 1]];
    let b = curve[d[i + 2]];
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    r = lum + (r - lum) * sat;
    g = lum + (g - lum) * sat;
    b = lum + (b - lum) * sat;
    const li = Math.max(0, Math.min(255, lum)) | 0;
    // The pixel keeps most of itself; the tone colour steers its balance.
    d[i] = r * keep + tone[0][li] * amt;
    d[i + 1] = g * keep + tone[1][li] * amt;
    d[i + 2] = b * keep + tone[2][li] * amt;
    if (warm !== 1) {
      d[i] = Math.min(255, d[i] * warm);
      d[i + 2] = Math.min(255, d[i + 2] / warm);
    }
  }
  return imageData;
}

// Draws a photo onto a fresh canvas at (w, h) with the grade baked in. The
// caller decides the resolution: the preview grades a capped copy, exports
// grade the full-size frame, and both share the cache in app.js.
export function renderGradedPhoto(img, grade, w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(w));
  canvas.height = Math.max(1, Math.round(h));
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  applyGradeToPixels(pixels, grade);
  ctx.putImageData(pixels, 0, 0);
  return canvas;
}
