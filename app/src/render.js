// The cover renderer: draws a whole VICE DESK cover onto any 2D context, at
// any size, from the editor state. The editor preview and the three PNG
// exports all call this one function, so what you see is what you download.
//
//   drawCover(ctx, width, height, state, gradedPhoto, options)
//     state        the editor state (layout, panels, grade, lettering, fx)
//     gradedPhoto  (photo, grade) -> a canvas of that photo with the grade
//                  baked in, at whatever resolution the caller chose
//     options      { selected: panel index to outline (preview only),
//                    maxDim: resolution cap hint, passed through }
//
// Drawing order: backdrop, panels (each photo cropped by its own zoom/pan),
// panel keylines, the lettering band (scrim, ribbon, stars, script tagline,
// condensed title), then the finish: halftone dots, vignette, film grain.

import { panelsFor, layoutById } from './layouts.js';
import { gradeById } from './grades.js';

export const BAND_THEMES = [
  { id: 'sunset', name: 'Sunset', stops: ['#ffe259', '#ff7518', '#ff3d7e'], accent: '#ffd23e', ribbon: '#ff3d7e' },
  { id: 'vice-white', name: 'Vice White', stops: ['#ffffff', '#ffe9f6', '#ffb3d9'], accent: '#7fe7ff', ribbon: '#12b5a5' },
  { id: 'chrome-teal', name: 'Chrome Teal', stops: ['#c8fff2', '#2fd4c4', '#2470c2'], accent: '#ff5e8a', ribbon: '#f2a007' },
];

export function bandThemeById(id) {
  return BAND_THEMES.find((t) => t.id === id) ?? BAND_THEMES[0];
}

// A tileable grain tile, generated once and stamped over the cover.
let grainTile = null;
function getGrainTile() {
  if (grainTile) return grainTile;
  const size = 180;
  grainTile = document.createElement('canvas');
  grainTile.width = size;
  grainTile.height = size;
  const ctx = grainTile.getContext('2d');
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 96 + Math.random() * 96;
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return grainTile;
}

function drawStar(ctx, cx, cy, r, fill) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const x = cx + Math.cos(a) * rad;
    const y = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

// Fits a font size down until the text fits maxWidth. Returns the size used.
function fitFont(ctx, text, family, weight, maxWidth, startSize) {
  const setFont = (size) => { ctx.font = weight ? `${weight} ${size}px ${family}` : `${size}px ${family}`; };
  let size = startSize;
  setFont(size);
  while (size > 8 && ctx.measureText(text).width > maxWidth) {
    size *= 0.94;
    setFont(size);
  }
  return size;
}

// Draws one photo into a panel rect, honouring the panel's crop: zoom is a
// multiplier over the base fit/fill scale, pan is -1..1 of the spare room.
function drawPanelPhoto(ctx, graded, rect, crop) {
  const gw = graded.width;
  const gh = graded.height;
  const base = crop.mode === 'fit'
    ? Math.min(rect.w / gw, rect.h / gh)
    : Math.max(rect.w / gw, rect.h / gh);
  const scale = base * (crop.zoom || 1);
  const dw = gw * scale;
  const dh = gh * scale;
  const slackX = Math.max(0, dw - rect.w);
  const slackY = Math.max(0, dh - rect.h);
  const dx = rect.x + (rect.w - dw) / 2 + (crop.x || 0) * slackX * 0.5;
  const dy = rect.y + (rect.h - dh) / 2 + (crop.y || 0) * slackY * 0.5;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  if (crop.mode === 'fit') {
    ctx.fillStyle = '#17102a';
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  }
  ctx.drawImage(graded, dx, dy, dw, dh);
  ctx.restore();
}

function drawPanel(ctx, graded, panel, crop, W, H) {
  const rect = { x: panel.x * W, y: panel.y * H, w: panel.w * W, h: panel.h * H };
  if (panel.polaroid) {
    // A snapshot frame: white border, deeper at the foot, slight rotation.
    const cx = rect.x + rect.w / 2;
    const cy = rect.y + rect.h / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(((panel.rot || 0) * Math.PI) / 180);
    ctx.translate(-cx, -cy);
    ctx.shadowColor = 'rgba(5,2,12,0.55)';
    ctx.shadowBlur = W * 0.02;
    ctx.shadowOffsetY = H * 0.012;
    ctx.fillStyle = '#f7f2e9';
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.shadowColor = 'transparent';
    const inset = rect.w * 0.055;
    const foot = rect.h * 0.16;
    drawPanelPhoto(ctx, graded, {
      x: rect.x + inset, y: rect.y + inset,
      w: rect.w - inset * 2, h: rect.h - inset - foot,
    }, crop);
    ctx.restore();
    return;
  }
  drawPanelPhoto(ctx, graded, rect, crop);
  ctx.save();
  ctx.strokeStyle = 'rgba(255,250,240,0.92)';
  ctx.lineWidth = Math.max(2, W * 0.0035);
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

function drawBackdrop(ctx, W, H, grade, tilted) {
  const grad = ctx.createLinearGradient(0, 0, W * 0.3, H);
  if (tilted) {
    grad.addColorStop(0, grade.high);
    grad.addColorStop(0.45, grade.mid);
    grad.addColorStop(1, grade.shadow);
  } else {
    grad.addColorStop(0, '#241536');
    grad.addColorStop(1, '#0d0716');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
}

function drawRibbon(ctx, W, H, text, theme) {
  if (!text) return;
  ctx.save();
  const fontSize = H * 0.032;
  ctx.font = `${fontSize}px Anton, sans-serif`;
  const tw = ctx.measureText(text.toUpperCase()).width;
  const padX = fontSize * 0.9;
  const bw = tw + padX * 2;
  const bh = fontSize * 1.7;
  ctx.translate(W * 0.012, H * 0.045);
  ctx.rotate((-5 * Math.PI) / 180);
  ctx.fillStyle = theme.ribbon;
  ctx.fillRect(0, 0, bw, bh);
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.fillText(text.toUpperCase(), padX, bh * 0.54);
  ctx.restore();
}

function drawLettering(ctx, W, H, state, theme) {
  const layout = layoutById(state.layout);
  const bandH = layout.band * H;
  const bandTop = H - bandH;
  // Scrim so the words sit on the art but stay readable.
  const scrim = ctx.createLinearGradient(0, bandTop - bandH * 0.55, 0, H);
  scrim.addColorStop(0, 'rgba(8,4,18,0)');
  scrim.addColorStop(0.45, 'rgba(8,4,18,0.55)');
  scrim.addColorStop(1, 'rgba(8,4,18,0.92)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, bandTop - bandH * 0.55, W, bandH * 1.55);

  const title = (state.title || '').toUpperCase();
  const margin = W * 0.045;
  if (state.stars) {
    const r = bandH * 0.11;
    const cy = bandTop + bandH * 0.2;
    for (let i = 0; i < 5; i++) {
      // i counts from the right edge, so i = 0 is the fifth star: dim it and
      // the row reads as four lit stars plus one unlit, left to right.
      drawStar(ctx, W - margin - r - i * (r * 2.5), cy, r, i === 0 ? 'rgba(255,210,62,0.35)' : '#ffd23e');
    }
  }
  // Script tagline, slanted over the title's shoulder.
  if (state.tagline) {
    ctx.save();
    const size = fitFont(ctx, state.tagline, 'Pacifico, cursive', '', W * 0.5, bandH * 0.34);
    ctx.translate(margin + W * 0.012, bandTop + bandH * 0.3);
    ctx.rotate((-3 * Math.PI) / 180);
    ctx.font = `${size}px Pacifico, cursive`;
    ctx.fillStyle = theme.accent;
    ctx.shadowColor = 'rgba(0,0,0,0.65)';
    ctx.shadowBlur = size * 0.18;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(state.tagline, 0, 0);
    ctx.restore();
  }
  // The big condensed title, gradient-filled with a hard dark keyline.
  if (title) {
    const size = fitFont(ctx, title, 'Anton, sans-serif', '', W - margin * 2, bandH * 0.62);
    ctx.font = `${size}px Anton, sans-serif`;
    const grad = ctx.createLinearGradient(0, bandTop + bandH * 0.34, 0, H);
    theme.stops.forEach((stop, i) => grad.addColorStop(i / (theme.stops.length - 1), stop));
    ctx.textBaseline = 'alphabetic';
    ctx.lineWidth = size * 0.09;
    ctx.strokeStyle = '#160a24';
    ctx.lineJoin = 'round';
    const ty = H - bandH * 0.14;
    ctx.strokeText(title, margin, ty);
    ctx.fillStyle = grad;
    ctx.fillText(title, margin, ty);
  }
}

function drawFinish(ctx, W, H, state) {
  if (state.fx.halftone) {
    ctx.save();
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = '#0a0614';
    const step = Math.max(6, W / 130);
    const r = step * 0.22;
    for (let y = step / 2; y < H; y += step) {
      for (let x = step / 2; x < W; x += step) {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
  if (state.fx.vignette) {
    const rad = Math.hypot(W, H) * 0.62;
    const vg = ctx.createRadialGradient(W / 2, H * 0.42, rad * 0.42, W / 2, H * 0.5, rad);
    vg.addColorStop(0, 'rgba(5,2,10,0)');
    vg.addColorStop(1, 'rgba(5,2,10,0.45)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }
  if (state.fx.grain) {
    ctx.save();
    ctx.globalAlpha = 0.09;
    ctx.globalCompositeOperation = 'overlay';
    const tile = getGrainTile();
    const pattern = ctx.createPattern(tile, 'repeat');
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
}

export function drawCover(ctx, W, H, state, gradedPhoto, options = {}) {
  const grade = gradeById(state.grade);
  const theme = bandThemeById(state.bandTheme);
  const aspect = W / H;
  const panels = panelsFor(state.layout, aspect);
  drawBackdrop(ctx, W, H, grade, state.layout === 'tilted');
  panels.forEach((panel, i) => {
    const slot = state.panels[i];
    if (!slot || !slot.photo) return;
    const graded = gradedPhoto(slot.photo, grade);
    if (graded) drawPanel(ctx, graded, panel, slot, W, H);
  });
  drawLettering(ctx, W, H, state, theme);
  drawRibbon(ctx, W, H, state.ribbon, theme);
  drawFinish(ctx, W, H, state);
  if (options.selected != null && panels[options.selected]) {
    const p = panels[options.selected];
    ctx.save();
    ctx.strokeStyle = '#ffd23e';
    ctx.lineWidth = Math.max(3, W * 0.005);
    ctx.setLineDash([W * 0.02, W * 0.012]);
    ctx.strokeRect(p.x * W, p.y * H, p.w * W, p.h * H);
    ctx.restore();
  }
  return panels;
}
