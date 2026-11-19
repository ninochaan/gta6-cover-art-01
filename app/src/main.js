// Neon Coast Cover Studio — wires the editor: photo uploads, per-panel crop and
// position, layouts, grades, caption lettering, undo/redo and one-click export.
// ?shot=cover / ?shot=editor set up deterministic screenshot scenes (./shots.js).
import { drawCoverArt, ASPECTS, EXPORT_SIZES, defaultPanels } from './render.js';
import { LAYOUTS, LAYOUT_IDS, layoutPanelRects, titleBandFraction } from './layouts.js';
import { GRADES, GRADE_IDS } from './grades.js';
import { exportCoverSize, exportAllCoverSizes } from './export.js';
import { createHistory } from './history.js';
import { runShot } from './shots.js';

const $ = (id) => document.getElementById(id);
const canvas = $('cover');
const statusEl = $('status');

const SAMPLE_PHOTOS = [
  { name: 'Boulevard', src: 'samples/boulevard.jpg' },
  { name: 'Pier', src: 'samples/pier.jpg' },
];

/** Loads an image from a URL, resolving to the image once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function freshState() {
  return {
    layout: 'hero3',
    grade: 'sunset',
    title: 'NEON SHORE',
    subtitle: 'one last ride',
    badge: 'VICE CITY',
    aspect: 'square',
    heat: 5,
    panels: defaultPanels(),
  };
}

let state = freshState();
const history = createHistory(state);
const photos = []; // Loaded images, indexed by panel.photo; samples first.
let selectedPanel = 0;
let dragStart = null;

function photosReady() {
  return photos.length > 0 && photos[0];
}

function previewSize() {
  const aspect = ASPECTS[state.aspect];
  const scale = 900 / Math.max(aspect.w, aspect.h);
  return { w: Math.round(aspect.w * scale), h: Math.round(aspect.h * scale) };
}

function redraw() {
  if (!photosReady()) return;
  let w;
  let h;
  if (document.body.classList.contains('shot-cover')) {
    // A cover shot renders at the true export size, shown full-frame.
    const a = ASPECTS[state.aspect];
    w = a.w;
    h = a.h;
  } else {
    const preview = previewSize();
    w = preview.w;
    h = preview.h;
  }
  canvas.width = w;
  canvas.height = h;
  drawCoverArt(canvas, state, photos);
  syncPanelControls();
  $('undo').disabled = !history.canUndo();
  $('redo').disabled = !history.canRedo();
}

function commit(next) {
  state = next;
  history.commit(state);
  redraw();
}

function setStatus(msg) {
  statusEl.textContent = msg;
}

/** Copies the current state into the form controls (used by ?shot=editor). */
function syncInputsFromState() {
  $('title').value = state.title;
  $('subtitle').value = state.subtitle;
  $('badge').value = state.badge;
  $('aspect').value = state.aspect;
  $('heat').value = String(state.heat ?? 5);
}

/** Builds the layout picker buttons and the grade swatch buttons. */
function buildPickers() {
  const layoutBox = $('layouts');
  LAYOUT_IDS.forEach((id) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pick';
    b.textContent = LAYOUTS[id].label;
    b.dataset.layout = id;
    b.addEventListener('click', () => {
      commit({ ...state, layout: id });
      markActive(layoutBox, id, 'layout');
      setStatus(`${LAYOUTS[id].label} layout.`);
    });
    layoutBox.appendChild(b);
  });
  const gradeBox = $('grades');
  GRADE_IDS.forEach((id) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'swatch';
    b.textContent = GRADES[id].label;
    b.dataset.grade = id;
    b.style.background = `linear-gradient(135deg, rgb(${GRADES[id].ramp[0].join(',')}), rgb(${GRADES[id].ramp[2].join(',')}), rgb(${GRADES[id].ramp[3].join(',')}))`;
    b.addEventListener('click', () => {
      commit({ ...state, grade: id });
      markActive(gradeBox, id, 'grade');
      setStatus(`${GRADES[id].label} grade.`);
    });
    gradeBox.appendChild(b);
  });
  markActive(layoutBox, state.layout, 'layout');
  markActive(gradeBox, state.grade, 'grade');
}

function markActive(box, id, key) {
  box.querySelectorAll('button').forEach((b) => {
    b.classList.toggle('active', b.dataset[key] === id);
  });
}

/** Panel strip: one button per panel of the current layout, to select and re-photo it. */
function syncPanelControls() {
  const strip = $('panels');
  const rects = layoutPanelRects(state.layout, canvas.width, canvas.height,
    Math.round(canvas.height * titleBandFraction(state.aspect)), 6);
  const panel = state.panels[selectedPanel] || state.panels[0];
  strip.innerHTML = '';
  rects.forEach((_, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'panel-btn' + (i === selectedPanel ? ' active' : '');
    b.textContent = `Panel ${i + 1} · ${photos[state.panels[i]?.photo]?.dataset?.name ?? 'photo'}`;
    b.addEventListener('click', () => {
      selectedPanel = i;
      redraw();
    });
    strip.appendChild(b);
  });
  $('zoom').value = panel.zoom;
  $('zoomVal').textContent = `${Math.round(panel.zoom * 100)}%`;
  $('photoPick').value = String(panel.photo);
  const sel = $('photoPick');
  sel.innerHTML = '';
  photos.forEach((img, i) => {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = img.dataset.name || `Photo ${i + 1}`;
    sel.appendChild(opt);
  });
  sel.value = String(panel.photo);
}

/** Drag on the preview pans the selected panel; the wheel zooms it. */
function wireCanvasPan() {
  canvas.addEventListener('pointerdown', (e) => {
    const r = canvas.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * canvas.width;
    const y = ((e.clientY - r.top) / r.height) * canvas.height;
    const titleH = Math.round(canvas.height * titleBandFraction(state.aspect));
    const rects = layoutPanelRects(state.layout, canvas.width, canvas.height, titleH, 6);
    const hit = rects.findIndex((rc) => x >= rc.x && x <= rc.x + rc.w && y >= rc.y && y <= rc.y + rc.h);
    if (hit >= 0) selectedPanel = hit;
    dragStart = { x, y, panel: { ...state.panels[selectedPanel] } };
    canvas.setPointerCapture(e.pointerId);
    redraw();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragStart) return;
    const r = canvas.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * canvas.width;
    const y = ((e.clientY - r.top) / r.height) * canvas.height;
    const panels = state.panels.map((p) => ({ ...p }));
    panels[selectedPanel].ox = Math.max(-0.5, Math.min(0.5,
      dragStart.panel.ox + (x - dragStart.x) / canvas.width));
    panels[selectedPanel].oy = Math.max(-0.5, Math.min(0.5,
      dragStart.panel.oy + (y - dragStart.y) / canvas.height));
    state = { ...state, panels };
    redraw();
  });
  canvas.addEventListener('pointerup', () => {
    if (!dragStart) return;
    dragStart = null;
    history.commit(state);
    redraw();
  });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const panels = state.panels.map((p) => ({ ...p }));
    panels[selectedPanel].zoom = Math.max(1, Math.min(3,
      panels[selectedPanel].zoom * (e.deltaY < 0 ? 1.08 : 0.92)));
    commit({ ...state, panels });
  }, { passive: false });
}

function wireControls() {
  buildPickers();
  wireCanvasPan();

  $('title').addEventListener('input', (e) => {
    state = { ...state, title: e.target.value };
    redraw();
  });
  $('title').addEventListener('change', () => history.commit(state));
  $('subtitle').addEventListener('input', (e) => {
    state = { ...state, subtitle: e.target.value };
    redraw();
  });
  $('subtitle').addEventListener('change', () => history.commit(state));
  $('badge').addEventListener('input', (e) => {
    state = { ...state, badge: e.target.value };
    redraw();
  });
  $('badge').addEventListener('change', () => history.commit(state));

  $('zoom').addEventListener('input', (e) => {
    const panels = state.panels.map((p) => ({ ...p }));
    panels[selectedPanel].zoom = Number(e.target.value);
    state = { ...state, panels };
    redraw();
  });
  $('zoom').addEventListener('change', () => history.commit(state));
  $('photoPick').addEventListener('change', (e) => {
    const panels = state.panels.map((p) => ({ ...p }));
    panels[selectedPanel].photo = Number(e.target.value);
    commit({ ...state, panels });
    setStatus(`Panel ${selectedPanel + 1} now uses ${photos[panels[selectedPanel].photo].dataset.name}.`);
  });

  $('aspect').addEventListener('change', (e) => {
    commit({ ...state, aspect: e.target.value });
    setStatus(`Previewing ${ASPECTS[e.target.value].label}.`);
  });
  $('heat').addEventListener('change', (e) => {
    commit({ ...state, heat: Number(e.target.value) });
  });

  $('undo').addEventListener('click', () => {
    const prev = history.undo();
    if (prev) {
      state = prev;
      syncInputsFromState();
      redraw();
      setStatus('Undone.');
    }
  });
  $('redo').addEventListener('click', () => {
    const next = history.redo();
    if (next) {
      state = next;
      syncInputsFromState();
      redraw();
      setStatus('Redone.');
    }
  });

  $('upload').addEventListener('change', async (e) => {
    const files = [...e.target.files];
    for (const file of files) {
      const img = await loadImage(URL.createObjectURL(file));
      img.dataset.name = file.name.replace(/\.[^.]+$/, '');
      photos.push(img);
    }
    const panels = state.panels.map((p) => ({ ...p }));
    panels[selectedPanel].photo = photos.length - 1;
    commit({ ...state, panels });
    setStatus(`${files.length} photo${files.length > 1 ? 's' : ''} added — all on your machine, never uploaded.`);
    e.target.value = '';
  });

  $('sampleBoulevard').addEventListener('click', async () => {
    await assignSample(0);
  });
  $('samplePier').addEventListener('click', async () => {
    await assignSample(1);
  });

  $('exportOne').addEventListener('click', async () => {
    setStatus('Exporting…');
    const name = await exportCoverSize(state, photos, state.aspect);
    setStatus(`Saved ${name} — share it anywhere.`);
  });
  $('exportAll').addEventListener('click', async () => {
    setStatus('Exporting all 4 sizes…');
    const names = await exportAllCoverSizes(state, photos, EXPORT_SIZES);
    setStatus(`Saved ${names.length} PNGs: ${names.join(', ')}.`);
  });
}

async function assignSample(index) {
  if (!photos[index]) return;
  const panels = state.panels.map((p) => ({ ...p }));
  panels[selectedPanel].photo = index;
  commit({ ...state, panels });
  setStatus(`Panel ${selectedPanel + 1} now uses ${photos[index].dataset.name}.`);
}

async function loadSamples() {
  for (const sample of SAMPLE_PHOTOS) {
    const img = await loadImage(sample.src);
    img.dataset.name = sample.name;
    photos.push(img);
  }
}

const params = new URLSearchParams(location.search);
const shot = params.get('shot');
if (shot) {
  runShot(shot, params, async (query) => {
    await loadSamples();
    state = {
      ...freshState(),
      layout: query.get('layout') || 'hero3',
      grade: query.get('grade') || 'sunset',
      aspect: query.get('aspect') || 'square',
      title: query.get('title') || 'NEON SHORE',
      subtitle: query.get('subtitle') || 'one last ride',
      badge: query.get('badge') || 'VICE CITY',
    };
    if (query.get('photo') === 'pier') {
      state.panels = state.panels.map((p) => ({ ...p, photo: 1 }));
    }
    if (shot === 'editor') {
      wireControls();
      syncInputsFromState();
    }
    document.fonts.load('100px Anton').catch(() => {});
    await document.fonts.ready;
    redraw();
  });
} else {
  loadSamples().then(() => {
    wireControls();
    redraw();
    setStatus('Pick a layout and a grade, drag a panel to reposition it, then export all sizes.');
  });
}
