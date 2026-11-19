// Cover layouts. Each layout returns panel rects in unit space (0..1 of the art
// area above the title band), plus how many photos it uses and its gutter size.
// Panels may carry a rotation for the tilted-snapshot look.
export const LAYOUTS = {
  grid4: {
    label: 'Four-Panel Grid',
    panels: 4,
    rects() {
      return [
        { x: 0, y: 0, w: 0.5, h: 0.5, rot: 0 },
        { x: 0.5, y: 0, w: 0.5, h: 0.5, rot: 0 },
        { x: 0, y: 0.5, w: 0.5, h: 0.5, rot: 0 },
        { x: 0.5, y: 0.5, w: 0.5, h: 0.5, rot: 0 },
      ];
    },
  },
  hero3: {
    label: 'Hero + Three',
    panels: 4,
    rects() {
      return [
        { x: 0, y: 0, w: 0.62, h: 1, rot: 0 },
        { x: 0.62, y: 0, w: 0.38, h: 0.333, rot: 0 },
        { x: 0.62, y: 0.333, w: 0.38, h: 0.334, rot: 0 },
        { x: 0.62, y: 0.667, w: 0.38, h: 0.333, rot: 0 },
      ];
    },
  },
  fullbleed: {
    label: 'Full Bleed',
    panels: 1,
    rects() {
      return [{ x: 0, y: 0, w: 1, h: 1, rot: 0 }];
    },
  },
  tilt: {
    label: 'Tilted Snapshots',
    panels: 3,
    rects() {
      return [
        { x: 0.04, y: 0.06, w: 0.42, h: 0.78, rot: -0.07 },
        { x: 0.33, y: 0.14, w: 0.42, h: 0.78, rot: 0.05 },
        { x: 0.60, y: 0.05, w: 0.36, h: 0.72, rot: -0.03 },
      ];
    },
  },
  nine: {
    label: 'Nine-Panel Cover',
    panels: 9,
    rects() {
      const out = [];
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          out.push({ x: c / 3, y: r / 3, w: 1 / 3, h: 1 / 3, rot: 0 });
        }
      }
      return out;
    },
  },
  duo: {
    label: 'Duo Split',
    panels: 2,
    rects() {
      return [
        { x: 0, y: 0, w: 0.5, h: 1, rot: 0 },
        { x: 0.5, y: 0, w: 0.5, h: 1, rot: 0 },
      ];
    },
  },
};

export const LAYOUT_IDS = Object.keys(LAYOUTS);

/** Pixel rects for a layout: art area is the cover minus the title band. */
export function layoutPanelRects(layoutId, coverW, coverH, titleBandH, gutter) {
  const layout = LAYOUTS[layoutId] ?? LAYOUTS.hero3;
  const artH = coverH - titleBandH;
  return layout.rects().map((r) => ({
    x: r.x * coverW + gutter,
    y: r.y * artH + gutter,
    w: r.w * coverW - gutter * 2,
    h: r.h * artH - gutter * 2,
    rot: r.rot || 0,
  }));
}

/** How tall the title band is, as a fraction of cover height, per aspect. */
export function titleBandFraction(aspect) {
  return aspect === 'wide' ? 0.24 : aspect === 'story' ? 0.2 : 0.22;
}
