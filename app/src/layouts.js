// Panel layouts for VICE DESK.
//
// Every layout is a function of the canvas size: it returns the panels of the
// cover as fractions of the canvas (x, y, w, h in 0..1), so the same design
// reflows honestly across the square, portrait and wide export sizes. A panel
// may also carry a rotation (degrees, for the tilted snapshots) and a polaroid
// flag (a white frame with a deeper foot, drawn by the renderer).
//
// The lettering lives in a band the renderer reserves: `band` is the fraction
// of the canvas height the title block occupies, measured from the edge named
// by `bandEdge`, so panels stop short of the words instead of hiding them.

export const LAYOUTS = [
  { id: 'hero-three', name: 'Hero + Three', band: 0.21, bandEdge: 'bottom' },
  { id: 'grid-four', name: 'Four-Panel Grid', band: 0.2, bandEdge: 'bottom' },
  { id: 'grid-nine', name: 'Nine-Panel Grid', band: 0.19, bandEdge: 'bottom' },
  { id: 'full-bleed', name: 'Full Bleed', band: 0.23, bandEdge: 'bottom' },
  { id: 'tilted', name: 'Tilted Snapshots', band: 0.2, bandEdge: 'bottom' },
  { id: 'duo', name: 'Duo Split', band: 0.21, bandEdge: 'bottom' },
];

export function layoutById(id) {
  return LAYOUTS.find((l) => l.id === id) ?? LAYOUTS[0];
}

// The area panels may use: the whole canvas minus the lettering band.
function stage(layout, aspect) {
  const bandH = layout.band;
  return layout.bandEdge === 'bottom'
    ? { x: 0, y: 0, w: 1, h: 1 - bandH }
    : { x: 0, y: bandH, w: 1, h: 1 - bandH };
}

function grid(stageRect, cols, rows, gap) {
  const panels = [];
  const cw = (stageRect.w - gap * (cols + 1)) / cols;
  const ch = (stageRect.h - gap * (rows + 1)) / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      panels.push({
        x: stageRect.x + gap + c * (cw + gap),
        y: stageRect.y + gap + r * (ch + gap),
        w: cw, h: ch,
      });
    }
  }
  return panels;
}

// Returns the panels for a layout at a canvas aspect (width / height).
// Portrait canvases stack the hero layouts vertically instead of squeezing.
export function panelsFor(layoutId, aspect) {
  const layout = layoutById(layoutId);
  const s = stage(layout, aspect);
  const gap = aspect >= 1 ? 0.012 : 0.014;
  switch (layoutId) {
    case 'hero-three': {
      if (aspect < 0.9) {
        // Portrait: hero on top, three across the bottom of the stage.
        const heroH = s.h * 0.58;
        const rest = grid({ x: s.x, y: s.y + heroH + gap, w: s.w, h: s.h - heroH - gap * 2 }, 3, 1, gap);
        return [{ x: s.x + gap, y: s.y + gap, w: s.w - gap * 2, h: heroH - gap }, ...rest];
      }
      const heroW = s.w * 0.6;
      const rest = grid({ x: s.x + heroW + gap, y: s.y, w: s.w - heroW - gap, h: s.h }, 1, 3, gap);
      return [{ x: s.x + gap, y: s.y + gap, w: heroW - gap, h: s.h - gap * 2 }, ...rest];
    }
    case 'grid-four':
      return grid(s, 2, 2, gap);
    case 'grid-nine':
      return grid(s, 3, 3, gap);
    case 'full-bleed':
      return [{ x: 0, y: 0, w: 1, h: 1 }];
    case 'duo': {
      if (aspect < 0.9) return grid({ ...s, h: s.h }, 1, 2, gap);
      return grid(s, 2, 1, gap);
    }
    case 'tilted': {
      // Four snapshot frames scattered over a gradient backdrop. Frame size
      // is worked out in pixels first — a landscape instant-photo shape,
      // about 1.28 : 1 — then converted back to canvas fractions, since a
      // fraction of the width and a fraction of the height are different
      // lengths on a non-square canvas.
      const wide = aspect >= 1;
      const fw = wide ? 0.36 : 0.55;
      const fh = Math.min((fw * aspect) / 1.28, s.h * (wide ? 0.58 : 0.42));
      const spots = wide
        ? [
          { x: 0.03, y: 0.03, rot: -6 },
          { x: 0.35, y: 0.0, rot: 3 },
          { x: 0.62, y: 0.07, rot: 6 },
          { x: 0.22, y: 0.44, rot: -3 },
        ]
        : [
          { x: 0.04, y: 0.02, rot: -6 },
          { x: 0.4, y: 0.12, rot: 4 },
          { x: 0.05, y: 0.4, rot: -3 },
          { x: 0.42, y: 0.55, rot: 5 },
        ];
      return spots.map((p) => ({
        x: s.x + p.x * s.w, y: s.y + p.y * s.h,
        w: fw * s.w, h: fh,
        rot: p.rot, polaroid: true,
      }));
    }
    default:
      return grid(s, 2, 2, gap);
  }
}

export function panelCount(layoutId, aspect) {
  return panelsFor(layoutId, aspect).length;
}
