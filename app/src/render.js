// The cover renderer: composes panels, grades, lettering and poster effects into
// one cover on any canvas, at any size. This is the heart of the app.
import { drawGradedPhoto } from './grades.js';
import { layoutPanelRects, titleBandFraction } from './layouts.js';
import { drawTitleBand, drawBadgeRibbon } from './lettering.js';
import { drawGrainAndVignette, drawPanelFrame, drawInkBand } from './effects.js';

export const ASPECTS = {
  square: { label: 'Square 1080 × 1080', w: 1080, h: 1080 },
  portrait: { label: 'Portrait 1080 × 1350', w: 1080, h: 1350 },
  wide: { label: 'Wide 1920 × 1080', w: 1920, h: 1080 },
  story: { label: 'Story 1080 × 1920', w: 1080, h: 1920 },
};

export const EXPORT_SIZES = ['square', 'portrait', 'wide', 'story'];

/** Default per-panel crop state (photo index, zoom, pan offsets). */
export function defaultPanels() {
  const base = [
    { photo: 0, zoom: 1.08, ox: 0, oy: 0, focusY: 0.22 },
    { photo: 1, zoom: 1.08, ox: 0, oy: 0, focusY: 0.22 },
    { photo: 0, zoom: 1.18, ox: 0.05, oy: -0.02, focusY: 0.22 },
    { photo: 1, zoom: 1.18, ox: -0.05, oy: 0.02, focusY: 0.22 },
    { photo: 1, zoom: 1.15, ox: 0, oy: 0, focusY: 0.25 },
    { photo: 0, zoom: 1.15, ox: 0, oy: 0, focusY: 0.25 },
    { photo: 1, zoom: 1.15, ox: 0, oy: 0, focusY: 0.25 },
    { photo: 0, zoom: 1.15, ox: 0, oy: 0, focusY: 0.25 },
    { photo: 1, zoom: 1.15, ox: 0, oy: 0, focusY: 0.25 },
  ];
  return base.map((p) => ({ ...p }));
}

/**
 * Draws the full cover: art panels above, title band below, badge, grain and
 * vignette on top. `state` holds layout/grade/title/subtitle/badge/panels;
 * `photos` is the array of loaded images indexed by panel.photo.
 */
export function drawCoverArt(canvas, state, photos) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const aspect = state.aspect || 'square';
  const titleH = Math.round(h * titleBandFraction(aspect));
  const gutter = Math.max(4, Math.round(Math.min(w, h) * 0.008));
  const borderW = Math.max(3, Math.round(Math.min(w, h) * 0.006));

  ctx.fillStyle = '#160426';
  ctx.fillRect(0, 0, w, h);

  const rects = layoutPanelRects(state.layout, w, h, titleH, gutter);
  const tilted = state.layout === 'tilt';
  if (tilted) {
    // Deep sunset backdrop behind the tilted snapshots.
    const sky = ctx.createLinearGradient(0, 0, 0, h - titleH);
    sky.addColorStop(0, '#ff9a3d');
    sky.addColorStop(0.5, '#ff4d7e');
    sky.addColorStop(1, '#7b2ff7');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h - titleH);
    drawInkBand(ctx, w, h - titleH, 'rgba(22,4,38,0.85)');
  }

  rects.forEach((rect, i) => {
    const panel = state.panels[i] || { photo: 0, zoom: 1.1, ox: 0, oy: 0 };
    const photo = photos[panel.photo] || photos[0];
    if (!photo) return;
    ctx.save();
    if (rect.rot) {
      ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
      ctx.rotate(rect.rot);
      ctx.translate(-rect.w / 2, -rect.h / 2);
      drawGradedPhoto(ctx, photo, { x: 0, y: 0, w: rect.w, h: rect.h }, state.grade, panel.zoom, panel.ox, panel.oy, panel.focusY ?? 0.25, panel.focusX ?? 0.5);
      drawPanelFrame(ctx, { x: 0, y: 0, w: rect.w, h: rect.h }, borderW);
    } else {
      ctx.beginPath();
      ctx.rect(rect.x, rect.y, rect.w, rect.h);
      ctx.clip();
      drawGradedPhoto(ctx, photo, rect, state.grade, panel.zoom, panel.ox, panel.oy, panel.focusY ?? 0.25, panel.focusX ?? 0.5);
      ctx.restore();
      drawPanelFrame(ctx, rect, borderW);
      return;
    }
    ctx.restore();
  });

  drawTitleBand(ctx, { x: 0, y: h - titleH, w, h: titleH }, state.title, state.subtitle, state.heat ?? 5);
  drawBadgeRibbon(ctx, state.badge, w, h, h - titleH);
  drawGrainAndVignette(ctx, w, h);
}

/** Renders a cover at an exact export size and returns the canvas. */
export function renderCoverAt(state, photos, aspectId) {
  const size = ASPECTS[aspectId];
  const canvas = document.createElement('canvas');
  canvas.width = size.w;
  canvas.height = size.h;
  drawCoverArt(canvas, { ...state, aspect: aspectId }, photos);
  return canvas;
}
