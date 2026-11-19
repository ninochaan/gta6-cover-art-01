// VICE DESK — the studio's wiring.
//
// Owns the editor state (with undo/redo history), the photo registry (the
// seven built-in samples plus whatever a person adds — files are read on
// their own machine and never leave it), the graded-photo cache, and every
// control in the rail. All drawing is delegated to render.js's drawCover, so
// the preview, the export sheet and the PNG exports can never drift apart.

import { GRADES, gradeById, renderGradedPhoto } from './grades.js';
import { LAYOUTS, panelsFor } from './layouts.js';
import { drawCover, BAND_THEMES } from './render.js';
import { runShot } from './shots.js';

const SAMPLES = [
  { id: 'speedboat', name: 'Speedboat', src: 'samples/speedboat.jpg' },
  { id: 'motel', name: 'Motel', src: 'samples/motel.jpg' },
  { id: 'pool', name: 'Pool', src: 'samples/pool.jpg' },
  { id: 'nightride', name: 'Night ride', src: 'samples/nightride.jpg' },
  { id: 'boulevard', name: 'Boulevard', src: 'samples/boulevard.jpg' },
  { id: 'pier', name: 'Pier', src: 'samples/pier.jpg' },
  { id: 'lifeguard', name: 'Lifeguard', src: 'samples/lifeguard.jpg' },
];

const EXPORT_SIZES = [
  { id: '1080x1080', w: 1080, h: 1080 },
  { id: '1080x1350', w: 1080, h: 1350 },
  { id: '1920x1080', w: 1920, h: 1080 },
];
const PREVIEW_PIXELS = {
  '1080x1080': [720, 720],
  '1080x1350': [576, 720],
  '1920x1080': [1024, 576],
};
const MAX_PANELS = 9;

const $ = (id) => document.getElementById(id);
const previewCanvas = $('preview');
const previewCtx = previewCanvas.getContext('2d');

/* ---------------- photos ---------------- */

const photos = new Map(); // id -> { id, name, img, thumb }
let uploadCount = 0;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function registerPhoto(id, name, src) {
  const img = await loadImage(src);
  photos.set(id, { id, name, img, thumb: src });
  return photos.get(id);
}

/* ---------------- state ---------------- */

function blankSlot(photo = null) {
  return { photo, zoom: 1, x: 0, y: 0, mode: 'fill' };
}

function defaultState() {
  const order = ['speedboat', 'motel', 'pool', 'nightride', 'boulevard', 'pier', 'lifeguard', 'speedboat', 'boulevard'];
  return {
    layout: 'hero-three',
    grade: 'golden-hour',
    bandTheme: 'sunset',
    title: 'VICE DESK',
    tagline: 'one last ride',
    ribbon: 'VICE CITY',
    stars: true,
    fx: { grain: true, vignette: true, halftone: false },
    panels: order.map((id) => blankSlot(id)),
  };
}

let state = defaultState();
let selected = 0;
let swapArmed = false;
let previewSize = '1920x1080';
let sheetOpen = false;

const past = [];
const future = [];
function snapshot() { return JSON.stringify(state); }
function commit() {
  past.push(snapshot());
  if (past.length > 80) past.shift();
  future.length = 0;
  syncHistoryButtons();
}
function restore(json) {
  state = JSON.parse(json);
  if (selected >= MAX_PANELS) selected = 0;
  syncControls();
  redrawAll();
}
function undo() {
  if (!past.length) return;
  future.push(snapshot());
  restore(past.pop());
  syncHistoryButtons();
}
function redo() {
  if (!future.length) return;
  past.push(snapshot());
  restore(future.pop());
  syncHistoryButtons();
}
function syncHistoryButtons() {
  $('undo-btn').disabled = past.length === 0;
  $('redo-btn').disabled = future.length === 0;
}

/* ---------------- graded photo cache ---------------- */

// Grades are baked per photo at two resolutions: a capped copy for the
// screen and the full frame for exports. Keyed by photo, grade and tier.
const gradedCache = new Map();
let activeTier = 'prev';
const TIER_MAX = { prev: 900, sheet: 1200, full: Infinity };

function gradedPhoto(photo, grade) {
  const key = `${photo.id}|${grade.id}|${activeTier}`;
  if (!gradedCache.has(key)) {
    const maxDim = TIER_MAX[activeTier];
    const scale = Math.min(1, maxDim / Math.max(photo.img.naturalWidth, photo.img.naturalHeight));
    const w = Math.max(1, Math.round(photo.img.naturalWidth * scale));
    const h = Math.max(1, Math.round(photo.img.naturalHeight * scale));
    gradedCache.set(key, renderGradedPhoto(photo.img, grade, w, h));
  }
  return gradedCache.get(key);
}

function photoById(id) { return photos.get(id) ?? null; }

// The callback render.js expects: a panel stores a photo id, so resolve it
// to the registered photo and hand back its graded canvas (or null).
function gradedForRender(photoId, grade) {
  const photo = photoById(photoId);
  return photo ? gradedPhoto(photo, grade) : null;
}

/* ---------------- drawing ---------------- */

let lastPanels = [];

function drawInto(canvas, tier, withSelection) {
  activeTier = tier;
  const ctx = canvas.getContext('2d');
  const panels = drawCover(ctx, canvas.width, canvas.height, state,
    gradedForRender,
    withSelection ? { selected } : {});
  return panels;
}

function redrawPreview() {
  lastPanels = drawInto(previewCanvas, 'prev', true);
  markUsedThumbs();
}

function redrawSheet() {
  if (!sheetOpen) return;
  drawInto($('sheet-square'), 'sheet', false);
  drawInto($('sheet-portrait'), 'sheet', false);
  drawInto($('sheet-wide'), 'sheet', false);
}

function redrawAll() {
  redrawPreview();
  redrawSheet();
}

function setPreviewSize(id) {
  previewSize = id;
  const [w, h] = PREVIEW_PIXELS[id];
  previewCanvas.width = w;
  previewCanvas.height = h;
  document.querySelectorAll('#preview-size-btns button').forEach((b) => {
    b.classList.toggle('active', b.dataset.preview === id);
  });
  redrawPreview();
}

/* ---------------- controls ---------------- */

function buildChips(container, items, current, onPick, decorate) {
  container.innerHTML = '';
  items.forEach((item) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = item.name;
    if (decorate) decorate(btn, item);
    btn.classList.toggle('active', item.id === current);
    btn.addEventListener('click', () => onPick(item.id));
    container.appendChild(btn);
  });
}

function markUsedThumbs() {
  const aspect = previewCanvas.width / previewCanvas.height;
  const count = panelsFor(state.layout, aspect).length;
  const used = new Set(state.panels.slice(0, count).map((s) => s.photo));
  document.querySelectorAll('.photo-thumb').forEach((el) => {
    el.classList.toggle('used', used.has(el.dataset.photoId));
  });
}

function buildPhotoStrip() {
  const strip = $('photo-strip');
  strip.innerHTML = '';
  photos.forEach((photo) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'photo-thumb';
    btn.dataset.photoId = photo.id;
    btn.title = photo.name;
    const img = document.createElement('img');
    img.src = photo.thumb;
    img.alt = photo.name;
    btn.appendChild(img);
    btn.addEventListener('click', () => assignPhoto(photo.id));
    strip.appendChild(btn);
  });
  markUsedThumbs();
}

function assignPhoto(photoId) {
  if (state.panels[selected].photo === photoId) return;
  commit();
  state.panels[selected].photo = photoId;
  redrawAll();
}

function syncPanelControls() {
  const slot = state.panels[selected];
  $('panel-name').textContent = `#${selected + 1}`;
  $('crop-zoom').value = slot.zoom;
  $('crop-mode-btn').textContent = slot.mode === 'fit' ? 'Mode: Fit' : 'Mode: Fill';
  $('swap-btn').textContent = swapArmed ? 'Swap: pick a panel' : 'Swap: off';
  $('swap-btn').classList.toggle('active', swapArmed);
}

function syncControls() {
  buildChips($('layout-grid'), LAYOUTS, state.layout, (id) => {
    if (state.layout === id) return;
    commit();
    state.layout = id;
    if (selected >= panelsFor(id, previewCanvas.width / previewCanvas.height).length) selected = 0;
    syncControls();
    redrawAll();
  });
  buildChips($('grade-grid'), GRADES, state.grade, (id) => {
    if (state.grade === id) return;
    commit();
    state.grade = id;
    syncControls();
    redrawAll();
  }, (btn, grade) => {
    btn.classList.add('grade-chip');
    const sw = document.createElement('span');
    sw.className = 'grade-swatch';
    sw.style.background = `linear-gradient(135deg, ${grade.high}, ${grade.mid} 55%, ${grade.shadow})`;
    btn.prepend(sw);
  });
  buildChips($('theme-grid'), BAND_THEMES, state.bandTheme, (id) => {
    if (state.bandTheme === id) return;
    commit();
    state.bandTheme = id;
    syncControls();
    redrawAll();
  });
  $('cap-title').value = state.title;
  $('cap-tagline').value = state.tagline;
  $('cap-ribbon').value = state.ribbon;
  $('cap-stars').checked = state.stars;
  $('fx-grain').checked = state.fx.grain;
  $('fx-vignette').checked = state.fx.vignette;
  $('fx-halftone').checked = state.fx.halftone;
  syncPanelControls();
  syncHistoryButtons();
}

/* ---------------- panel picking and dragging ---------------- */

function pointerFraction(event) {
  const rect = previewCanvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) / rect.width,
    y: (event.clientY - rect.top) / rect.height,
  };
}

function panelAt(fx, fy) {
  const W = previewCanvas.width;
  const H = previewCanvas.height;
  for (let i = lastPanels.length - 1; i >= 0; i--) {
    const p = lastPanels[i];
    let px = fx * W;
    let py = fy * H;
    if (p.rot) {
      // Work in pixels, undo the panel's rotation about its centre, then
      // test against the unrotated rect.
      const cx = (p.x + p.w / 2) * W;
      const cy = (p.y + p.h / 2) * H;
      const a = (-p.rot * Math.PI) / 180;
      const dx = px - cx;
      const dy = py - cy;
      px = cx + dx * Math.cos(a) - dy * Math.sin(a);
      py = cy + dx * Math.sin(a) + dy * Math.cos(a);
    }
    if (px >= p.x * W && px <= (p.x + p.w) * W && py >= p.y * H && py <= (p.y + p.h) * H) return i;
  }
  return -1;
}

let drag = null;
previewCanvas.addEventListener('pointerdown', (event) => {
  const f = pointerFraction(event);
  const hit = panelAt(f.x, f.y);
  if (hit === -1) return;
  if (swapArmed && hit !== selected) {
    commit();
    const a = state.panels[selected];
    const b = state.panels[hit];
    state.panels[selected] = b;
    state.panels[hit] = a;
    selected = hit;
    swapArmed = false;
    syncPanelControls();
    redrawAll();
    return;
  }
  selected = hit;
  syncPanelControls();
  const slot = state.panels[selected];
  drag = {
    startX: f.x, startY: f.y, slotX: slot.x, slotY: slot.y,
    moved: false, before: snapshot(),
  };
  previewCanvas.setPointerCapture(event.pointerId);
  redrawPreview();
});

previewCanvas.addEventListener('pointermove', (event) => {
  if (!drag) return;
  const f = pointerFraction(event);
  const slot = state.panels[selected];
  const panel = lastPanels[selected];
  if (!panel || !slot.photo) return;
  const photo = photoById(slot.photo);
  if (!photo) return;
  const graded = gradedPhoto(photo, gradeById(state.grade));
  const rect = {
    w: panel.w * previewCanvas.width,
    h: panel.h * previewCanvas.height,
  };
  const base = slot.mode === 'fit'
    ? Math.min(rect.w / graded.width, rect.h / graded.height)
    : Math.max(rect.w / graded.width, rect.h / graded.height);
  const dw = graded.width * base * slot.zoom;
  const dh = graded.height * base * slot.zoom;
  const slackX = Math.max(1, dw - rect.w);
  const slackY = Math.max(1, dh - rect.h);
  const dxPx = (f.x - drag.startX) * previewCanvas.width;
  const dyPx = (f.y - drag.startY) * previewCanvas.height;
  slot.x = Math.max(-1, Math.min(1, drag.slotX + (dxPx / (slackX * 0.5))));
  slot.y = Math.max(-1, Math.min(1, drag.slotY + (dyPx / (slackY * 0.5))));
  if (Math.abs(dxPx) + Math.abs(dyPx) > 2) drag.moved = true;
  redrawPreview();
});

previewCanvas.addEventListener('pointerup', () => {
  if (drag && drag.moved) {
    // The drag already changed the slot live; record the step by pushing the
    // snapshot taken when the drag began, so one drag is one undo step.
    past.push(drag.before);
    if (past.length > 80) past.shift();
    future.length = 0;
    syncHistoryButtons();
  }
  drag = null;
});

/* ---------------- uploads ---------------- */

async function addFiles(files) {
  const images = [...files].filter((f) => f.type.startsWith('image/'));
  if (!images.length) return;
  commit();
  for (const file of images) {
    uploadCount += 1;
    const url = URL.createObjectURL(file);
    await registerPhoto(`upload-${uploadCount}`, file.name.replace(/\.[^.]+$/, ''), url);
  }
  buildPhotoStrip();
  // Fill the selected panel with the first new photo, the obvious intent.
  const first = `upload-${uploadCount - images.length + 1}`;
  state.panels[selected].photo = first;
  redrawAll();
  setStatus(`${images.length} photo${images.length > 1 ? 's' : ''} added — photos never leave this machine.`);
}

$('file-input').addEventListener('change', (e) => {
  addFiles(e.target.files);
  e.target.value = '';
});
const dropzone = $('dropzone');
['dragenter', 'dragover'].forEach((name) => dropzone.addEventListener(name, (e) => {
  e.preventDefault();
  dropzone.classList.add('drag-over');
}));
['dragleave', 'drop'].forEach((name) => dropzone.addEventListener(name, (e) => {
  e.preventDefault();
  dropzone.classList.remove('drag-over');
}));
dropzone.addEventListener('drop', (e) => addFiles(e.dataTransfer.files));
['dragover', 'drop'].forEach((name) => document.addEventListener(name, (e) => e.preventDefault()));

/* ---------------- rail wiring ---------------- */

$('undo-btn').addEventListener('click', undo);
$('redo-btn').addEventListener('click', redo);
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
});

// Continuous controls (sliders, text fields) mutate state on every input
// event; this records one history step per edit session by keeping the
// snapshot from when the control gained focus and pushing it on change.
function trackEdits(el) {
  let before = null;
  const grab = () => { if (before == null) before = snapshot(); };
  el.addEventListener('focus', grab);
  el.addEventListener('pointerdown', grab);
  el.addEventListener('change', () => {
    if (before != null && before !== snapshot()) {
      past.push(before);
      if (past.length > 80) past.shift();
      future.length = 0;
      syncHistoryButtons();
    }
    before = null;
  });
}

trackEdits($('crop-zoom'));
$('crop-zoom').addEventListener('input', (e) => {
  state.panels[selected].zoom = Number(e.target.value);
  redrawPreview();
});
$('crop-mode-btn').addEventListener('click', () => {
  commit();
  const slot = state.panels[selected];
  slot.mode = slot.mode === 'fit' ? 'fill' : 'fit';
  syncPanelControls();
  redrawAll();
});
$('crop-centre-btn').addEventListener('click', () => {
  commit();
  const slot = state.panels[selected];
  slot.x = 0;
  slot.y = 0;
  redrawAll();
});
$('swap-btn').addEventListener('click', () => {
  swapArmed = !swapArmed;
  syncPanelControls();
});

function bindText(id, key) {
  trackEdits($(id));
  $(id).addEventListener('input', (e) => {
    state[key] = e.target.value;
    redrawAll();
  });
}
bindText('cap-title', 'title');
bindText('cap-tagline', 'tagline');
bindText('cap-ribbon', 'ribbon');
$('cap-stars').addEventListener('change', (e) => { commit(); state.stars = e.target.checked; redrawAll(); });
[['fx-grain', 'grain'], ['fx-vignette', 'vignette'], ['fx-halftone', 'halftone']].forEach(([id, key]) => {
  $(id).addEventListener('change', (e) => { commit(); state.fx[key] = e.target.checked; redrawAll(); });
});

document.querySelectorAll('#preview-size-btns button').forEach((btn) => {
  btn.addEventListener('click', () => setPreviewSize(btn.dataset.preview));
});

/* ---------------- export ---------------- */

function setStatus(text) { $('status').textContent = text; }

function downloadCanvas(canvas, filename) {
  canvas.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }, 'image/png');
}

function exportPNG(size) {
  const canvas = document.createElement('canvas');
  canvas.width = size.w;
  canvas.height = size.h;
  activeTier = 'full';
  drawCover(canvas.getContext('2d'), size.w, size.h, state,
    gradedForRender, {});
  downloadCanvas(canvas, `vice-desk-${size.w}x${size.h}.png`);
  setStatus(`Saved vice-desk-${size.w}x${size.h}.png`);
}

document.querySelectorAll('[data-export]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const size = EXPORT_SIZES.find((s) => s.id === btn.dataset.export);
    if (size) exportPNG(size);
  });
});
$('export-all-btn').addEventListener('click', () => {
  EXPORT_SIZES.forEach((size, i) => setTimeout(() => exportPNG(size), i * 450));
  setStatus('Exporting all three sizes…');
});
$('sheet-btn').addEventListener('click', () => showSheet(!sheetOpen));

function showSheet(on) {
  sheetOpen = on;
  $('sheet').hidden = !on;
  $('canvas-wrap').style.display = on ? 'none' : '';
  $('sheet-btn').textContent = on ? 'Back to editor' : 'Export sheet';
  $('sheet-btn').classList.toggle('active', on);
  redrawSheet();
}

/* ---------------- screenshot scenes ---------------- */

const api = {
  apply(patch) {
    if (patch.layout) state.layout = patch.layout;
    if (patch.grade) state.grade = patch.grade;
    if (patch.bandTheme) state.bandTheme = patch.bandTheme;
    if (patch.title != null) state.title = patch.title;
    if (patch.tagline != null) state.tagline = patch.tagline;
    if (patch.ribbon != null) state.ribbon = patch.ribbon;
    if (patch.photos) patch.photos.forEach((id, i) => { if (state.panels[i]) state.panels[i].photo = id; });
    if (patch.crops) patch.crops.forEach((crop, i) => { if (crop && state.panels[i]) Object.assign(state.panels[i], crop); });
    selected = 0;
    syncControls();
    redrawAll();
  },
  selectPanel(i) {
    selected = i;
    syncPanelControls();
    redrawPreview();
  },
  scrollToPanelControls() {
    $('panel-block').scrollIntoView({ block: 'center' });
  },
  scrollToExport() {
    $('export-block').scrollIntoView({ block: 'end' });
  },
  showSheet,
  present(w, h) {
    $('app').style.display = 'none';
    const wrap = $('present');
    wrap.hidden = false;
    const canvas = $('present-canvas');
    canvas.width = w;
    canvas.height = h;
    activeTier = 'full';
    drawCover(canvas.getContext('2d'), w, h, state,
      gradedForRender, {});
  },
  whenPainted() {
    return new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 60)));
    });
  },
};

// The scene API is also handy from the console for trying layouts quickly.
window.__viceDesk = api;

/* ---------------- boot ---------------- */

async function boot() {
  buildChips($('layout-grid'), LAYOUTS, state.layout, () => {});
  await Promise.all(SAMPLES.map((s) => registerPhoto(s.id, s.name, s.src)));
  buildPhotoStrip();
  syncControls();
  setPreviewSize(previewSize);
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load('100px Anton'),
        document.fonts.load('40px Pacifico'),
      ]),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
  } catch { /* fonts fall back to sans/cursive, still fine */ }
  redrawAll();
  document.fonts?.ready.then(() => redrawAll());
  const shot = new URLSearchParams(location.search).get('shot');
  if (shot) {
    await runShot(shot, api);
  } else {
    window.__shotReady = true;
  }
}

boot();
