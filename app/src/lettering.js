// Cover lettering: the Anton display title with a sunset gradient fill, the
// Pacifico neon script subtitle, the badge ribbon and the heat-meter stars.
import { drawHalftoneBand } from './effects.js';

const TITLE_FONT = 'Anton, "Arial Black", sans-serif';
const SCRIPT_FONT = 'Pacifico, cursive';

/** Shrinks a font until the text fits maxWidth; returns the fitted size. */
export function fitFontSize(ctx, text, fontTemplate, startSize, maxWidth) {
  let size = startSize;
  ctx.font = fontTemplate(size);
  while (size > 12 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = fontTemplate(size);
  }
  return size;
}

/** The big title: gradient-filled Anton capitals with a dark outline and drop shadow. */
export function drawCoverTitle(ctx, title, x, y, maxWidth, height) {
  const text = (title || 'NEON SHORE').trim().toUpperCase();
  const size = fitFontSize(ctx, text, (s) => `${s}px ${TITLE_FONT}`, height * 0.92, maxWidth);
  ctx.save();
  ctx.font = `${size}px ${TITLE_FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const grad = ctx.createLinearGradient(0, y - size * 0.85, 0, y + size * 0.15);
  grad.addColorStop(0, '#fff7d6');
  grad.addColorStop(0.45, '#ffb347');
  grad.addColorStop(0.75, '#ff5e8a');
  grad.addColorStop(1, '#c44dff');
  ctx.shadowColor = 'rgba(20,0,40,0.85)';
  ctx.shadowBlur = size * 0.14;
  ctx.shadowOffsetY = size * 0.05;
  ctx.lineWidth = Math.max(2, size * 0.09);
  ctx.strokeStyle = '#1a051f';
  ctx.lineJoin = 'round';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = grad;
  ctx.fillText(text, x, y);
  ctx.restore();
  return size;
}

/** The script subtitle in glowing neon pink, tucked under the title. */
export function drawCoverSubtitle(ctx, subtitle, x, y, maxWidth, height) {
  const text = (subtitle || '').trim();
  if (!text) return 0;
  const size = fitFontSize(ctx, text, (s) => `${s}px ${SCRIPT_FONT}`, height, maxWidth);
  ctx.save();
  ctx.font = `${size}px ${SCRIPT_FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = '#ff2e9a';
  ctx.shadowBlur = size * 0.55;
  ctx.fillStyle = '#ffe3f2';
  ctx.fillText(text, x, y);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ff7ac0';
  ctx.fillText(text, x, y);
  ctx.restore();
  return size;
}

/** Badge ribbon straddling the bottom-right of the art area, e.g. "VICE CITY". */
export function drawBadgeRibbon(ctx, badge, w, h, artBottomY) {
  const text = (badge || '').trim().toUpperCase();
  if (!text) return;
  ctx.save();
  const bw = Math.min(w * 0.34, 420);
  const bh = Math.max(26, h * 0.045);
  ctx.translate(w - bw * 0.42, artBottomY - bh * 0.55);
  ctx.rotate(0.06);
  ctx.fillStyle = '#ff2e63';
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 4;
  ctx.fillRect(-bw / 2, -bh / 2, bw, bh);
  ctx.fillStyle = '#ffd319';
  ctx.fillRect(-bw / 2, -bh / 2, bw, Math.max(3, bh * 0.14));
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffffff';
  ctx.font = `${Math.round(bh * 0.52)}px ${TITLE_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, 1);
  ctx.restore();
}

/** Five-star heat meter: filled stars show the cover's heat (default 5). */
export function drawHeatMeter(ctx, x, y, starSize, filled) {
  ctx.save();
  ctx.font = `${starSize}px sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < filled ? '#ffd319' : 'rgba(255,255,255,0.35)';
    ctx.shadowColor = i < filled ? '#ff9d00' : 'transparent';
    ctx.shadowBlur = i < filled ? starSize * 0.4 : 0;
    ctx.fillText('★', x + i * starSize * 1.15, y);
  }
  ctx.restore();
}

/** The title band: deep plum background, halftone dots, title + subtitle + stars. */
export function drawTitleBand(ctx, band, title, subtitle, heat) {
  const { x, y, w, h } = band;
  const bg = ctx.createLinearGradient(x, y, x, y + h);
  bg.addColorStop(0, '#2a0a3e');
  bg.addColorStop(0.55, '#4a1042');
  bg.addColorStop(1, '#160426');
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#ffd319';
  ctx.fillRect(x, y, w, Math.max(3, h * 0.045));
  drawHalftoneBand(ctx, x + w * 0.62, y + h * 0.14, w * 0.36, h * 0.72, 'rgba(255,211,25,0.28)');
  const pad = w * 0.035;
  const titleSize = drawCoverTitle(ctx, title, x + pad, y + h * 0.52, w * 0.92, h * 0.5);
  drawCoverSubtitle(ctx, subtitle, x + pad, y + h * 0.88, w * 0.6, h * 0.26);
  const starSize = Math.max(14, h * 0.17);
  const starsWidth = 5 * starSize * 1.15;
  drawHeatMeter(ctx, x + w - pad - starsWidth, y + h * 0.86, starSize, heat ?? 5);
  return titleSize;
}
