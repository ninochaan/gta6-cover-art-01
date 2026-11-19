// Fixed scenes for screenshots: ?shot=cover draws one exported cover full-frame;
// ?shot=editor shows the editor with a sample photo loaded. `layout`, `grade`,
// `aspect`, `title`, `subtitle` and `photo` come from the query. The loader waits
// for the Anton and Pacifico fonts before painting, so every shot is deterministic.
// window.__shotReady is set once painted.
export async function runShot(shot, query, setup) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  if (shot === 'editor') document.body.classList.add('shot-editor');
  try {
    await Promise.all([
      document.fonts.load('100px Anton'),
      document.fonts.load('60px Pacifico'),
      document.fonts.ready,
    ]);
  } catch {
    // Fonts fall back to system sans if loading fails; the shot still renders.
  }
  await setup(query);
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}
