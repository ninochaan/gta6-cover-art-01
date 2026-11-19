// Poster effects: film grain, halftone dots, vignette, ink bands and white
// panel borders. All drawn with the 2D canvas, no images needed.
let noiseCanvas = null;

/** A small tiled noise canvas used as a repeating grain pattern. */
export function grainPattern(ctx) {
  if (!noiseCanvas) {
    noiseCanvas = document.createElement('canvas');
    noiseCanvas.width = 140;
    noiseCanvas.height = 140;
    const nctx = noiseCanvas.getContext('2d');
    const img = nctx.createImageData(140, 140);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = (Math.random() * 255) | 0;
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 26;
    }
    nctx.putImageData(img, 0, 0);
  }
  return ctx.createPattern(noiseCanvas, 'repeat');
}

/** Film grain over the whole cover, plus a soft dark vignette at the edges. */
export function drawGrainAndVignette(ctx, w, h) {
  ctx.save();
  ctx.fillStyle = grainPattern(ctx);
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
  const vg = ctx.createRadialGradient(
    w / 2, h / 2, Math.min(w, h) * 0.42,
    w / 2, h / 2, Math.max(w, h) * 0.75,
  );
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(10,0,20,0.38)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
}

/** Halftone dot rows across a band (used behind the title): dots grow left to right. */
export function drawHalftoneBand(ctx, x, y, w, h, colour) {
  ctx.save();
  ctx.fillStyle = colour;
  const step = Math.max(10, h / 2.2);
  for (let row = 0; row * step < h; row++) {
    for (let col = 0; col * step < w; col++) {
      const cx = x + col * step + (row % 2 ? step / 2 : 0);
      const cy = y + row * step + step / 2;
      const grow = 0.35 + 0.65 * (col * step / w);
      const r = step * 0.22 * grow;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** Thick white frame + thin inner rule around a panel rect. */
export function drawPanelFrame(ctx, rect, borderW) {
  ctx.save();
  ctx.lineWidth = borderW;
  ctx.strokeStyle = '#ffffff';
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  ctx.lineWidth = Math.max(1, borderW * 0.18);
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.strokeRect(rect.x + borderW * 1.6, rect.y + borderW * 1.6, rect.w - borderW * 3.2, rect.h - borderW * 3.2);
  ctx.restore();
}

/** Diagonal ink band across a corner, for the tilted-snapshot layout. */
export function drawInkBand(ctx, w, h, colour) {
  ctx.save();
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.moveTo(0, h * 0.06);
  ctx.lineTo(w * 0.32, 0);
  ctx.lineTo(w * 0.44, 0);
  ctx.lineTo(0, h * 0.14);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
