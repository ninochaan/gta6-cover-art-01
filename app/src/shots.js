// Fixed scenes for the entry's screenshots, driven by the ?shot= query.
// Each scene arranges the studio through the same API a person's clicks use,
// then flags window.__shotReady once the scene is painted, so the maker's
// screenshot script knows the frame is final.
//
//   ?shot=cover     the default cover alone, full frame at 1920 x 1080
//   ?shot=editor    the editor mid-work on a different cover, a panel picked
//   ?shot=sheet     the export sheet: one cover in all three post sizes
//   ?shot=portrait  a second cover alone, full frame at 1080 x 1350

const PORTRAIT_PANELS = [
  'pier', 'boulevard', 'pool', 'speedboat', 'motel',
  'nightride', 'lifeguard', 'pier', 'boulevard',
];

export async function runShot(shot, api) {
  if (shot === 'cover') {
    api.present(1920, 1080);
  } else if (shot === 'portrait') {
    api.apply({
      layout: 'grid-nine',
      grade: 'dusk-purple',
      bandTheme: 'vice-white',
      title: 'PIER PRESSURE',
      tagline: 'the tide provides',
      ribbon: 'LEONIDA KEYS',
      photos: PORTRAIT_PANELS,
    });
    api.present(1080, 1350);
  } else if (shot === 'editor') {
    api.apply({
      layout: 'grid-four',
      grade: 'neon-vice',
      bandTheme: 'chrome-teal',
      title: 'BOULEVARD QUEEN',
      tagline: 'neon royalty',
      ribbon: 'VICE CITY',
      photos: ['boulevard', 'nightride', 'motel', 'pool'],
      // The boulevard portrait sits high in its wide panel so her face,
      // not her torso, fills the frame — the crop a person would choose.
      crops: [{ y: 0.8 }],
    });
    api.selectPanel(0);
    api.scrollToPanelControls();
  } else if (shot === 'sheet') {
    api.apply({ grade: 'sunset-strip' });
    api.showSheet(true);
    api.scrollToExport();
  }
  await api.whenPainted();
  window.__shotReady = true;
}
