/**
 * QuickRoom — app.js
 *
 * All units are in inches. 1 SVG unit = 1 inch.
 * Grid: small = 1 inch, large = 12 inches (1 foot).
 *
 * Architecture:
 *   state           – single source of truth
 *   render*()       – sync DOM to state
 *   drawShape()     – draws furniture shapes directly (no <use>/<symbol>)
 *   FURNITURE_DEFS  – default dimensions and draw functions per type
 *
 * Pan/zoom follows Figma conventions:
 *   Two-finger scroll / trackpad = pan
 *   Cmd+scroll or pinch = zoom
 */

// ─── Shape Drawing ──────────────────────────────────────────────────
// Each function draws directly into a <g> at the item's own coordinate
// space (0,0 to w,h). No <use>/<symbol> — avoids black-background bug.

const svgNS = 'http://www.w3.org/2000/svg';

// ─── Theme constants ────────────────────────────────────────────────
// Using the "Carrot" base from https://htmlcolorcodes.com/color-chart/flat-design-color-chart/
const FILL = '#FAE5D3';      // medium sage furniture fill
const STROKE = '#E67E22';    // dim sage border — quiet, not diagrammatic
const ACCENT = '#AF601A';    // secondary details
const CANVAS_BG = '#e0e0e0'; // canvas background
const WALL_T = 2;          // wall thickness in inches (expands outward)

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(svgNS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

function drawBed(g, w, h) {
  g.appendChild(svgEl('rect', { x: 0, y: 0, width: w, height: h, fill: FILL, stroke: STROKE, 'stroke-width': 0.45 }));
  const pw = w * 0.85, ph = h * 0.15;
  g.appendChild(svgEl('rect', { x: (w - pw) / 2, y: h * 0.03, width: pw, height: ph, fill: FILL, stroke: STROKE, 'stroke-width': 0.4 }));
  g.appendChild(svgEl('line', { x1: w / 2, y1: h * 0.03, x2: w / 2, y2: h * 0.03 + ph, stroke: ACCENT, 'stroke-width': 0.5 }));
}

function drawChair(g, w, h) {
  g.appendChild(svgEl('rect', { x: 0, y: h * 0.2, width: w, height: h * 0.8, fill: FILL, stroke: STROKE, 'stroke-width': 0.5 }));
  g.appendChild(svgEl('rect', { x: w * 0.05, y: 0, width: w * 0.9, height: h * 0.25, fill: FILL, stroke: STROKE, 'stroke-width': 0.4 }));
}

function drawTable(g, w, h) {
  g.appendChild(svgEl('ellipse', { cx: w / 2, cy: h / 2, rx: w / 2 - 0.5, ry: h / 2 - 0.5, fill: FILL, stroke: STROKE, 'stroke-width': 0.5 }));
}

function drawDesk(g, w, h) {
  g.appendChild(svgEl('rect', { x: 0, y: 0, width: w, height: h, fill: FILL, stroke: STROKE, 'stroke-width': 0.5 }));
  const dy = h * 0.75;
  g.appendChild(svgEl('line', { x1: 0, y1: dy, x2: w, y2: dy, stroke: ACCENT, 'stroke-width': 0.5 }));
  g.appendChild(svgEl('line', { x1: w / 2, y1: dy, x2: w / 2, y2: h, stroke: ACCENT, 'stroke-width': 0.5 }));
  g.appendChild(svgEl('circle', { cx: w * 0.25, cy: (dy + h) / 2, r: 0.6, fill: STROKE }));
  g.appendChild(svgEl('circle', { cx: w * 0.75, cy: (dy + h) / 2, r: 0.6, fill: STROKE }));
}

function drawBookshelf(g, w, h) {
  // Top-down view: thin unit with a back panel and a shelf lip visible at the front
  g.appendChild(svgEl('rect', { x: 0, y: 0, width: w, height: h, fill: FILL, stroke: STROKE, 'stroke-width': 0.5 }));
  // Back panel accent
  g.appendChild(svgEl('line', { x1: 0, y1: 1.2, x2: w, y2: 1.2, stroke: ACCENT, 'stroke-width': 0.3 }));
  // Front lip
  g.appendChild(svgEl('line', { x1: 0, y1: h - 1.2, x2: w, y2: h - 1.2, stroke: ACCENT, 'stroke-width': 0.3 }));
}

function drawWC(g, w, h) {
  g.appendChild(svgEl('rect', { x: w * 0.1, y: 0, width: w * 0.8, height: h * 0.3, fill: FILL, stroke: STROKE, 'stroke-width': 0.45 }));
  g.appendChild(svgEl('ellipse', { cx: w / 2, cy: h * 0.65, rx: w / 2 - 0.5, ry: h * 0.35 - 0.5, fill: FILL, stroke: STROKE, 'stroke-width': 0.5 }));
  g.appendChild(svgEl('ellipse', { cx: w / 2, cy: h * 0.65, rx: w * 0.3, ry: h * 0.25, fill: FILL, stroke: ACCENT, 'stroke-width': 0.5 }));
}

function drawRectangle(g, w, h) {
  g.appendChild(svgEl('rect', { x: 0, y: 0, width: w, height: h, fill: FILL, stroke: STROKE, 'stroke-width': 0.5 }));
}

function drawOval(g, w, h) {
  g.appendChild(svgEl('ellipse', { cx: w / 2, cy: h / 2, rx: w / 2 - 0.3, ry: h / 2 - 0.3, fill: FILL, stroke: STROKE, 'stroke-width': 0.5 }));
}

function drawLine(g, w, h) {
  g.appendChild(svgEl('line', { x1: 0, y1: h / 2, x2: w, y2: h / 2, stroke: STROKE, 'stroke-width': 0.45 }));
}

function drawArrow(g, w, h) {
  g.appendChild(svgEl('line', { x1: 0, y1: h / 2, x2: w - 2, y2: h / 2, stroke: STROKE, 'stroke-width': 0.5, 'marker-end': 'url(#arrowhead)' }));
}

function drawSofa(g, w, h) {
  // Seat base
  g.appendChild(svgEl('rect', { x: 0, y: h * 0.22, width: w, height: h * 0.78, fill: FILL, stroke: STROKE, 'stroke-width': 0.5, rx: 2 }));
  // Back cushion strip (sits between the armrests)
  g.appendChild(svgEl('rect', { x: w * 0.09, y: 0, width: w * 0.82, height: h * 0.3, fill: FILL, stroke: STROKE, 'stroke-width': 0.45, rx: 1.2 }));
  // Rounded armrests
  g.appendChild(svgEl('rect', { x: 0, y: h * 0.14, width: w * 0.09, height: h * 0.86, fill: FILL, stroke: STROKE, 'stroke-width': 0.5, rx: 1.5 }));
  g.appendChild(svgEl('rect', { x: w * 0.91, y: h * 0.14, width: w * 0.09, height: h * 0.86, fill: FILL, stroke: STROKE, 'stroke-width': 0.5, rx: 1.5 }));
  // Three seat cushions
  const cushY = h * 0.34, cushH = h * 0.6;
  const cushStart = w * 0.11, cushEnd = w * 0.89;
  const cushW = (cushEnd - cushStart) / 3;
  for (let i = 0; i < 3; i++) {
    g.appendChild(svgEl('rect', {
      x: cushStart + i * cushW + 0.4, y: cushY,
      width: cushW - 0.8, height: cushH,
      fill: 'none', stroke: ACCENT, 'stroke-width': 0.3, rx: 0.8,
    }));
  }
}

function drawCoffeeTable(g, w, h) {
  // Slab
  g.appendChild(svgEl('rect', { x: 0, y: 0, width: w, height: h, fill: FILL, stroke: STROKE, 'stroke-width': 0.5, rx: 0.8 }));
  // Inner tabletop inset (shelf/drawer outline)
  g.appendChild(svgEl('rect', { x: 2, y: 2, width: w - 4, height: h - 4, fill: 'none', stroke: ACCENT, 'stroke-width': 0.3, rx: 0.5 }));
  // Drawer pull
  g.appendChild(svgEl('line', { x1: w / 2 - 3, y1: h - 3.2, x2: w / 2 + 3, y2: h - 3.2, stroke: ACCENT, 'stroke-width': 0.5 }));
}

function drawTVStand(g, w, h) {
  // Long low console
  g.appendChild(svgEl('rect', { x: 0, y: 0, width: w, height: h, fill: FILL, stroke: STROKE, 'stroke-width': 0.5, rx: 0.5 }));
  // Back-edge accent (wall side)
  g.appendChild(svgEl('line', { x1: 0, y1: 1.2, x2: w, y2: 1.2, stroke: ACCENT, 'stroke-width': 0.3 }));
  // Door/drawer divisions (3 sections)
  g.appendChild(svgEl('line', { x1: w / 3, y1: 1.2, x2: w / 3, y2: h, stroke: ACCENT, 'stroke-width': 0.3 }));
  g.appendChild(svgEl('line', { x1: 2 * w / 3, y1: 1.2, x2: 2 * w / 3, y2: h, stroke: ACCENT, 'stroke-width': 0.3 }));
  // Handles on each door
  for (const cx of [w / 6, w / 2, 5 * w / 6]) {
    g.appendChild(svgEl('rect', { x: cx - 1.2, y: h - 3, width: 2.4, height: 0.9, fill: ACCENT, stroke: 'none', rx: 0.3 }));
  }
}

function drawDiningTable(g, w, h) {
  g.appendChild(svgEl('rect', { x: 0, y: 0, width: w, height: h, fill: FILL, stroke: STROKE, 'stroke-width': 0.5 }));
  const inset = 2;
  g.appendChild(svgEl('rect', { x: inset, y: inset, width: 2, height: 2, fill: STROKE, stroke: 'none' }));
  g.appendChild(svgEl('rect', { x: w - inset - 2, y: inset, width: 2, height: 2, fill: STROKE, stroke: 'none' }));
  g.appendChild(svgEl('rect', { x: inset, y: h - inset - 2, width: 2, height: 2, fill: STROKE, stroke: 'none' }));
  g.appendChild(svgEl('rect', { x: w - inset - 2, y: h - inset - 2, width: 2, height: 2, fill: STROKE, stroke: 'none' }));
}

function drawDiningChair(g, w, h) {
  g.appendChild(svgEl('rect', { x: 0, y: h * 0.25, width: w, height: h * 0.75, fill: FILL, stroke: STROKE, 'stroke-width': 0.45 }));
  g.appendChild(svgEl('rect', { x: w * 0.1, y: 0, width: w * 0.8, height: h * 0.2, fill: FILL, stroke: STROKE, 'stroke-width': 0.4 }));
}

function drawOfficeChair(g, w, h) {
  g.appendChild(svgEl('ellipse', { cx: w / 2, cy: h * 0.55, rx: w / 2 - 0.5, ry: h * 0.4, fill: FILL, stroke: STROKE, 'stroke-width': 0.45 }));
  g.appendChild(svgEl('rect', { x: w * 0.15, y: 0, width: w * 0.7, height: h * 0.3, fill: FILL, stroke: STROKE, 'stroke-width': 0.4 }));
}

function drawDrawerChest(g, w, h) {
  g.appendChild(svgEl('rect', { x: 0, y: 0, width: w, height: h, fill: FILL, stroke: STROKE, 'stroke-width': 0.5, rx: 0.5 }));
  // Back edge
  g.appendChild(svgEl('line', { x1: 0, y1: 1.2, x2: w, y2: 1.2, stroke: ACCENT, 'stroke-width': 0.3 }));
  // Three drawer divisions (narrow chest — tall stack of drawers)
  g.appendChild(svgEl('line', { x1: 0, y1: h * 0.4, x2: w, y2: h * 0.4, stroke: ACCENT, 'stroke-width': 0.3 }));
  g.appendChild(svgEl('line', { x1: 0, y1: h * 0.7, x2: w, y2: h * 0.7, stroke: ACCENT, 'stroke-width': 0.3 }));
  // Drawer handles
  for (const cy of [h * 0.22, h * 0.55, h * 0.85]) {
    g.appendChild(svgEl('rect', { x: w * 0.38, y: cy - 0.45, width: w * 0.24, height: 0.9, fill: ACCENT, stroke: 'none', rx: 0.3 }));
  }
}

function drawNightstand(g, w, h) {
  // Simple case with a single drawer front and a small handle
  g.appendChild(svgEl('rect', { x: 0, y: 0, width: w, height: h, fill: FILL, stroke: STROKE, 'stroke-width': 0.5, rx: 0.6 }));
  // Back edge (wall side)
  g.appendChild(svgEl('line', { x1: 0, y1: 1, x2: w, y2: 1, stroke: ACCENT, 'stroke-width': 0.3 }));
  // Drawer line
  g.appendChild(svgEl('line', { x1: 0, y1: h * 0.4, x2: w, y2: h * 0.4, stroke: ACCENT, 'stroke-width': 0.3 }));
  // Handle
  g.appendChild(svgEl('rect', { x: w * 0.35, y: h * 0.62, width: w * 0.3, height: 0.9, fill: ACCENT, stroke: 'none', rx: 0.3 }));
}

function drawSideTable(g, w, h) {
  g.appendChild(svgEl('rect', { x: 0, y: 0, width: w, height: h, fill: FILL, stroke: STROKE, 'stroke-width': 0.5, rx: 0.8 }));
  g.appendChild(svgEl('rect', { x: 1.6, y: 1.6, width: w - 3.2, height: h - 3.2, fill: 'none', stroke: ACCENT, 'stroke-width': 0.3, rx: 0.4 }));
}

function drawWardrobe(g, w, h) {
  g.appendChild(svgEl('rect', { x: 0, y: 0, width: w, height: h, fill: FILL, stroke: STROKE, 'stroke-width': 0.5 }));
  g.appendChild(svgEl('line', { x1: w / 2, y1: 0, x2: w / 2, y2: h, stroke: ACCENT, 'stroke-width': 0.5 }));
  g.appendChild(svgEl('circle', { cx: w * 0.45, cy: h / 2, r: 0.6, fill: STROKE }));
  g.appendChild(svgEl('circle', { cx: w * 0.55, cy: h / 2, r: 0.6, fill: STROKE }));
}

// Door conventions:
//   Wall aligns with y = 0 (top edge of the item box).
//   Frame panel sits on the wall; arc swings into the room (downward, y > 0).
//   "Opens Right" = hinge on LEFT, door swings to the right.
//   "Opens Left"  = hinge on RIGHT, door swings to the left.
//   Swing arc is a proper quarter circle of radius R = min(w, h-baseH).
//   snapToWall aligns the y=0 edge with the actual wall.
function drawDoorKnobs(g, hingeX, baseH) {
  const mw = 2.2, mh = 2.0;
  // Two small rects straddling the wall bar at the other end of the hinge pivot
  g.appendChild(svgEl('rect', { x: hingeX - mw / 2, y: -0.55, width: mw, height: mh, fill: STROKE, stroke: 'none', rx: 0.2 }));
  g.appendChild(svgEl('rect', { x: hingeX - mw / 2, y: baseH - mh + 0.55, width: mw, height: mh, fill: STROKE, stroke: 'none', rx: 0.2 }));
}

// "Door (Opens Left)" — hinge on RIGHT, door swings left into the room.
function drawDoor(g, w, h) {
  const baseH = 2;
  const R = Math.min(w, h - baseH);
  g.appendChild(svgEl('rect', { x: 0, y: 0, width: w, height: h, fill: 'transparent', stroke: 'none' }));
  // Wall frame
  g.appendChild(svgEl('rect', { x: 0, y: 0, width: w, height: baseH, fill: FILL, stroke: STROKE, 'stroke-width': 0.4 }));
  // Knob marks on the free (non-hinge) end — left side
  drawDoorKnobs(g, 3.2, baseH);
  // Open door panel (perpendicular to wall, hanging down from hinge on right)
  g.appendChild(svgEl('line', { x1: w, y1: baseH, x2: w, y2: baseH + R, stroke: STROKE, 'stroke-width': 0.8 , 'stroke-dasharray': '2 1.2'}));
  // Quarter-circle swing arc: from open-door tip back to closed position along the wall (SW of hinge)
  g.appendChild(svgEl('path', {
    d: `M ${w} ${baseH + R} A ${R} ${R} 0 0 1 ${w - R} ${baseH}`,
    fill: 'none', stroke: STROKE, 'stroke-width': 0.4, 'stroke-dasharray': '2 1.2',
  }));
}

// "Door (Opens Right)" — hinge on LEFT, door swings right into the room.
function drawDoorRight(g, w, h) {
  const baseH = 2;
  const R = Math.min(w, h - baseH);
  g.appendChild(svgEl('rect', { x: 0, y: 0, width: w, height: h, fill: 'transparent', stroke: 'none' }));
  g.appendChild(svgEl('rect', { x: 0, y: 0, width: w, height: baseH, fill: FILL, stroke: STROKE, 'stroke-width': 0.4 }));
  // Knob marks on the free (non-hinge) end — right side
  drawDoorKnobs(g, w - 3.2, baseH);
  // Open door panel hanging off the left hinge
  g.appendChild(svgEl('line', { x1: 0, y1: baseH, x2: 0, y2: baseH + R, stroke: STROKE, 'stroke-width': 0.8, 'stroke-dasharray': '2 1.2' }));
  // Quarter-circle swing arc (SE of hinge)
  g.appendChild(svgEl('path', {
    d: `M 0 ${baseH + R} A ${R} ${R} 0 0 0 ${R} ${baseH}`,
    fill: 'none', stroke: STROKE, 'stroke-width': 0.4, 'stroke-dasharray': '2 1.2',
  }));
}

function drawWindow(g, w, h) {
  g.appendChild(svgEl('rect', { x: 0, y: 0, width: w, height: h, fill: FILL, stroke: STROKE, 'stroke-width': 0.5 }));
  g.appendChild(svgEl('line', { x1: w / 2, y1: 0, x2: w / 2, y2: h, stroke: ACCENT, 'stroke-width': 0.5 }));
  g.appendChild(svgEl('line', { x1: 0, y1: h * 0.35, x2: w, y2: h * 0.35, stroke: ACCENT, 'stroke-width': 0.3 }));
  g.appendChild(svgEl('line', { x1: 0, y1: h * 0.65, x2: w, y2: h * 0.65, stroke: ACCENT, 'stroke-width': 0.3 }));
}

const DRAW_FNS = {
  bed: drawBed, chair: drawChair, table: drawTable, desk: drawDesk,
  bookshelf: drawBookshelf, wc: drawWC, rectangle: drawRectangle,
  oval: drawOval, line: drawLine, arrow: drawArrow,
  sofa: drawSofa, coffeetable: drawCoffeeTable, tvstand: drawTVStand,
  sidetable: drawSideTable,
  diningtable: drawDiningTable, diningchair: drawDiningChair,
  officechair: drawOfficeChair, 
  nightstand: drawNightstand, wardrobe: drawWardrobe,
  drawerchest: drawDrawerChest,
  door: drawDoor, doorright: drawDoorRight, window: drawWindow,
};

// ─── Furniture Definitions (inches) ──────────────────────────────────
// Queen bed: 60×80 in. IKEA-inspired defaults for everything else.
const FURNITURE_DEFS = {
  bed:       { w: 60, h: 80,  label: 'Bed' },       // Queen
  chair:     { w: 18, h: 18,  label: 'Chair' },      // IKEA dining chair
  table:     { w: 47, h: 47,  label: 'Table' },      // IKEA DOCKSTA round 47"
  desk:      { w: 47, h: 24,  label: 'Desk' },       // IKEA MICKE 47×24"
  bookshelf: { w: 31, h: 15,  label: 'Bookshelf' },  // IKEA KALLAX 31×15" (top-down)
  wc:        { w: 15, h: 28,  label: 'WC' },         // Standard toilet ~15×28"
  rectangle: { w: 36, h: 24,  label: 'Rectangle' },
  oval:      { w: 36, h: 24,  label: 'Oval' },
  line:      { w: 36, h: 2,   label: 'Line' },
  sofa:        { w: 84, h: 36,  label: 'Sofa' },         // ~7ft sofa, 36" deep
  coffeetable: { w: 48, h: 24,  label: 'Coffee Table' }, // IKEA LACK 48×24"
  tvstand:     { w: 59, h: 16,  label: 'TV Stand' },     // IKEA BESTÅ 59×16"
  sidetable:   { w: 18, h: 18,  label: 'Side Table' },   // End table
  diningtable: { w: 63, h: 35,  label: 'Dining Table' }, // IKEA EKEDALEN 63×35"
  diningchair: { w: 17, h: 17,  label: 'Dining Chair' }, // Standard 17×17"
  officechair: { w: 22, h: 22,  label: 'Office Chair' }, // Standard swivel
  nightstand:  { w: 18, h: 16,  label: 'Nightstand' },   // IKEA MALM-style
  wardrobe:    { w: 60, h: 24,  label: 'Wardrobe' },     // IKEA PAX 60×24"
  door:        { w: 32, h: 34,  label: 'Door (Opens Left)' },
  doorright:   { w: 32, h: 34,  label: 'Door (Opens Right)' },
  window:      { w: 36, h: 4,   label: 'Window' },       // 36" wide, thin for wall
  text:        { w: 36, h: 12,  label: 'Text' },
  arrow:       { w: 48, h: 4,   label: 'Arrow' },
};

const SNAP_DISTANCE = 6; // inches

// ─── Application State ───────────────────────────────────────────────
const state = {
  rooms: [
    { id: 1, x: 0, y: 0, w: 192, h: 144, label: 'Room 1' }, // 16×12 ft
  ],
  zoom: 3,  // 3px per inch at default zoom
  pan: { x: 60, y: 60 },
  items: [],
  selectedKind: null,
  selectedId: null,
  selectedIds: [],  // for multi-selection
  nextId: 2,
  dragging: null,
  panning: null,
  resizing: null,   // { kind, id, startX, startY, startW, startH, startObjX, startObjY, handleX, handleY }
  rotating: null,
};

// ─── DOM References ──────────────────────────────────────────────────
const $ = (sel) => document.querySelector(sel);
const canvas = $('#canvas');
const viewport = $('#viewport');
const roomsLayer = $('#rooms-layer');
const furnitureLayer = $('#furniture-layer');
const labelsLayer = $('#labels-layer');
const roomLabelsLayer = $('#room-labels-layer');
const furnitureLabelsLayer = $('#furniture-labels-layer');
const handlesLayer = $('#handles-layer');
const canvasContainer = $('#canvas-container');
const contextPanel = $('#context-panel');

// ─── Helpers ─────────────────────────────────────────────────────────

function screenToCanvas(sx, sy) {
  const rect = canvasContainer.getBoundingClientRect();
  return {
    x: (sx - rect.left - state.pan.x) / state.zoom,
    y: (sy - rect.top - state.pan.y) / state.zoom,
  };
}

function getItem(id) { return state.items.find(i => i.id === id); }
function getRoom(id) { return state.rooms.find(r => r.id === id); }
function getSelected() {
  if (!state.selectedId) return null;
  return state.selectedKind === 'room' ? getRoom(state.selectedId) : getItem(state.selectedId);
}

// ─── Rendering ───────────────────────────────────────────────────────

function renderViewport() {
  const { zoom, pan } = state;
  viewport.setAttribute('transform', `translate(${pan.x},${pan.y}) scale(${zoom})`);
  $('#zoom-level').textContent = Math.round(zoom * 100 / 3) + '%'; // normalize: zoom=3 → 100%
}

// ─── Label collision resolution ──────────────────────────────────────
// After labels are placed at their default positions, nudge any that
// overlap so every label remains readable.  Priority: room names >
// room dimensions > furniture labels.  Lower-priority labels move.

function resolveCollisions() {
  const PAD = 1.5;                // min gap between labels (SVG units)
  const MAX_ITER = 4;             // iterations of the nudge loop

  // Collect every <text> in the labels layer with its screen bbox
  const entries = [];
  labelsLayer.querySelectorAll('text').forEach(el => {
    try {
      const bbox = el.getBBox();
      if (bbox.width === 0 && bbox.height === 0) return;
      // Determine priority: room names (highest) > dim labels > furniture
      let priority = 0;                                     // furniture label
      if (el.classList.contains('dim-label')) priority = 1;  // room dimension
      const parentG = el.closest('.room-labels');
      if (parentG && !el.classList.contains('dim-label')) priority = 2; // room name

      // Get the cumulative transform so we work in viewport coordinates
      const ctm = el.getCTM();
      const svgRoot = canvas;
      const rootCTM = svgRoot.getCTM();
      if (!ctm || !rootCTM) return;
      // Transform bbox corners to viewport space
      const pt = svgRoot.createSVGPoint();
      pt.x = bbox.x; pt.y = bbox.y;
      const tl = pt.matrixTransform(ctm).matrixTransform(rootCTM.inverse());
      pt.x = bbox.x + bbox.width; pt.y = bbox.y + bbox.height;
      const br = pt.matrixTransform(ctm).matrixTransform(rootCTM.inverse());

      entries.push({
        el,
        priority,
        x: Math.min(tl.x, br.x), y: Math.min(tl.y, br.y),
        w: Math.abs(br.x - tl.x), h: Math.abs(br.y - tl.y),
        nudgeY: 0,
      });
    } catch (_) { /* getBBox can throw for hidden elements */ }
  });

  // Iterative pairwise nudge — lower-priority labels pushed down
  for (let iter = 0; iter < MAX_ITER; iter++) {
    let moved = false;
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const a = entries[i], b = entries[j];
        // AABB overlap check (with padding)
        const ox = Math.min(a.x + a.w + PAD, b.x + b.w + PAD) - Math.max(a.x - PAD, b.x - PAD);
        const oy = Math.min(a.y + a.h + PAD, b.y + b.h + PAD) - Math.max(a.y - PAD, b.y - PAD);
        if (ox <= 0 || oy <= 0) continue;  // no overlap

        // Push the lower-priority one (or the later one if tied) downward
        const loser = a.priority <= b.priority ? a : b;
        // If same priority, push the one that's lower on screen
        const mover = a.priority === b.priority ? (a.y > b.y ? a : b) : loser;

        mover.y += oy + PAD;
        mover.nudgeY += oy + PAD;
        moved = true;
      }
    }
    if (!moved) break;
  }

  // Apply accumulated nudges via a translate on each text element
  for (const e of entries) {
    if (e.nudgeY === 0) continue;
    // We need to convert the viewport-space nudge back into the text's local coordinate space
    // Since transforms may include rotation, we approximate by using the CTM scale factor
    const ctm = e.el.getCTM();
    const rootCTM = canvas.getCTM();
    if (!ctm || !rootCTM) continue;
    const localCTM = rootCTM.inverse().multiply(ctm);
    // The y-scale factor tells us how to convert viewport units → local units
    const scaleY = Math.sqrt(localCTM.b * localCTM.b + localCTM.d * localCTM.d);
    const localNudge = e.nudgeY / scaleY;
    const curY = parseFloat(e.el.getAttribute('y') || 0);
    e.el.setAttribute('y', curY + localNudge);
  }
}

function renderRooms() {
  roomsLayer.innerHTML = '';
  roomLabelsLayer.innerHTML = '';
  for (const room of state.rooms) {
    const isSelected = state.selectedKind === 'room' && state.selectedId === room.id;
    const g = svgEl('g', {
      class: 'room-item' + (isSelected ? ' selected' : ''),
      'data-room-id': room.id,
      transform: `translate(${room.x}, ${room.y})`,
    });
    // Wall band expands outward; floor rect = exact specified dimensions
    g.appendChild(svgEl('rect', { class: 'room-outline', x: -WALL_T, y: -WALL_T, width: room.w + 2 * WALL_T, height: room.h + 2 * WALL_T }));
    g.appendChild(svgEl('rect', { class: 'room-floor', x: 0, y: 0, width: room.w, height: room.h }));

    // Interior foot-inch grid aligned to room origin
    const gridG = svgEl('g', { class: 'room-grid', 'pointer-events': 'none' });
    // Clip to room bounds
    const clipId = 'room-clip-' + room.id;
    const clipPath = svgEl('clipPath', { id: clipId });
    clipPath.appendChild(svgEl('rect', { x: 0, y: 0, width: room.w, height: room.h }));
    gridG.appendChild(clipPath);
    const gridInner = svgEl('g', { 'clip-path': `url(#${clipId})` });
    // Inch lines (vertical then horizontal)
    let d = '';
    for (let x = 1; x < room.w; x++) d += `M${x},0V${room.h}`;
    for (let y = 1; y < room.h; y++) d += `M0,${y}H${room.w}`;
    if (d) gridInner.appendChild(svgEl('path', { d, fill: 'none', stroke: '#e8e4e0', 'stroke-width': '0.08' }));
    // Foot lines
    let dFt = '';
    for (let x = 12; x < room.w; x += 12) dFt += `M${x},0V${room.h}`;
    for (let y = 12; y < room.h; y += 12) dFt += `M0,${y}H${room.w}`;
    if (dFt) gridInner.appendChild(svgEl('path', { d: dFt, fill: 'none', stroke: '#ddd8d3', 'stroke-width': '0.18' }));
    gridG.appendChild(gridInner);
    g.appendChild(gridG);

    roomsLayer.appendChild(g);

    // Labels rendered in a separate top layer so they aren't occluded
    const lg = svgEl('g', { transform: `translate(${room.x}, ${room.y})`, class: 'room-labels', 'pointer-events': 'none' });

    const dimTop = svgEl('text', { class: 'dim-label', 'text-anchor': 'middle', x: room.w / 2, y: -(WALL_T + 3), 'font-size': '4' });
    dimTop.textContent = fmtDim(room.w);
    lg.appendChild(dimTop);

    const dimLeft = svgEl('text', { class: 'dim-label', 'text-anchor': 'middle', x: -(WALL_T + 3), y: room.h / 2, transform: `rotate(-90, ${-(WALL_T + 3)}, ${room.h / 2})`, 'font-size': '4' });
    dimLeft.textContent = fmtDim(room.h);
    lg.appendChild(dimLeft);

    const label = svgEl('text', { x: 3, y: 7, 'font-size': '4.5', fill: '#555', 'font-weight': '600', 'font-family': 'inherit', 'letter-spacing': '0.5' });
    label.textContent = (room.label || '').toUpperCase();
    lg.appendChild(label);

    roomLabelsLayer.appendChild(lg);
  }
  resolveCollisions();
}

function fmtDim(inches) {
  const ft = Math.floor(inches / 12);
  const rem = Math.round(inches % 12);
  if (ft > 0 && rem > 0) return `${ft}' ${rem}"`;
  if (ft > 0) return `${ft}'`;
  return `${rem}"`;
}

function renderFurniture() {
  furnitureLayer.innerHTML = '';
  furnitureLabelsLayer.innerHTML = '';
  for (const item of state.items) {
    const isSelected = (state.selectedKind === 'item' && state.selectedId === item.id) ||
                       (state.selectedKind === 'multi' && state.selectedIds.includes(item.id));
    const g = svgEl('g', {
      class: 'furniture-item' + (isSelected ? ' selected' : ''),
      'data-id': item.id,
      transform: `translate(${item.x}, ${item.y}) rotate(${item.rotation}, ${item.w / 2}, ${item.h / 2})`,
    });

    // Selection outline
    const outline = svgEl('rect', { class: 'selection-outline', x: -1, y: -1, width: item.w + 2, height: item.h + 2, fill: 'none' });
    if (!isSelected) outline.setAttribute('stroke', 'none');
    g.appendChild(outline);

    // Draw shape directly
    if (item.type === 'text') {
      const txt = svgEl('text', {
        x: item.w / 2, y: item.h / 2 + (item.fontSize || 5) * 0.35,
        'text-anchor': 'middle', 'font-size': item.fontSize || 5,
        'font-family': 'Inter, -apple-system, system-ui, sans-serif', fill: STROKE,
      });
      txt.textContent = item.text || 'Text';
      g.appendChild(txt);
    } else if (DRAW_FNS[item.type]) {
      DRAW_FNS[item.type](g, item.w, item.h);
    }

    // Hover overlay — semi-transparent warm tint, shown via CSS on :hover
    g.appendChild(svgEl('rect', { class: 'furniture-hover-overlay', x: 0, y: 0, width: item.w, height: item.h, fill: 'transparent', stroke: 'none' }));

    furnitureLayer.appendChild(g);

    // Label rendered in labels layer so it's never occluded by other furniture/rooms
    const displayName = item.label || FURNITURE_DEFS[item.type]?.label || item.type;
    const labelRot = ((item.rotation % 360) + 360) % 360;
    const baseY = item.h + 4;
    const labelAttrs = { x: item.w / 2, y: baseY, 'text-anchor': 'middle', 'font-size': '3', fill: '#555' };
    if (labelRot > 90 && labelRot < 270) labelAttrs.transform = `rotate(180, ${item.w / 2}, ${baseY})`;
    const label = svgEl('text', labelAttrs);

    const nameTspan = svgEl('tspan', { x: item.w / 2, dy: '0' });
    nameTspan.textContent = displayName;
    label.appendChild(nameTspan);

    const dimTspan = svgEl('tspan', { x: item.w / 2, dy: '3.2', 'font-size': '2.3', fill: '#aaa' });
    dimTspan.textContent = `${Math.round(item.w)}×${Math.round(item.h)}"`;
    label.appendChild(dimTspan);

    const lg = svgEl('g', {
      transform: `translate(${item.x}, ${item.y}) rotate(${item.rotation}, ${item.w / 2}, ${item.h / 2})`,
      class: 'furniture-labels',
      'pointer-events': 'none',
    });
    lg.appendChild(label);
    furnitureLabelsLayer.appendChild(lg);
  }
  resolveCollisions();
  renderHandles();
  renderContextPanel();
}

// ─── Handles (8-point resize + rotation) ─────────────────────────────

function renderHandles() {
  handlesLayer.innerHTML = '';
  if (state.selectedKind === 'multi') return;
  const sel = getSelected();
  if (!sel) return;

  const isRoom = state.selectedKind === 'room';
  const rotation = isRoom ? 0 : (sel.rotation || 0);

  const g = svgEl('g', {
    transform: `translate(${sel.x}, ${sel.y}) rotate(${rotation}, ${sel.w / 2}, ${sel.h / 2})`,
  });

  // 8 resize handles: corners + edge midpoints
  // handleX/handleY: 0=left/top edge, 1=right/bottom edge, 0.5=middle (no resize on that axis for edges)
  const handleSize = 3;
  const hs = handleSize / 2;
  const handles = [
    { hx: 0, hy: 0, cursor: 'nwse-resize' },  // top-left
    { hx: 1, hy: 0, cursor: 'nesw-resize' },  // top-right
    { hx: 0, hy: 1, cursor: 'nesw-resize' },  // bottom-left
    { hx: 1, hy: 1, cursor: 'nwse-resize' },  // bottom-right
    { hx: 0.5, hy: 0, cursor: 'ns-resize' },  // top-center
    { hx: 0.5, hy: 1, cursor: 'ns-resize' },  // bottom-center
    { hx: 0, hy: 0.5, cursor: 'ew-resize' },  // left-center
    { hx: 1, hy: 0.5, cursor: 'ew-resize' },  // right-center
  ];

  for (const h of handles) {
    const cx = sel.w * h.hx;
    const cy = sel.h * h.hy;
    const handle = svgEl('rect', {
      class: 'resize-handle',
      x: cx - hs, y: cy - hs,
      width: handleSize, height: handleSize, rx: 0.5,
      style: `cursor: ${h.cursor}`,
    });
    handle.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      state.resizing = {
        kind: state.selectedKind,
        id: sel.id,
        startX: e.clientX,
        startY: e.clientY,
        startW: sel.w,
        startH: sel.h,
        startObjX: sel.x,
        startObjY: sel.y,
        handleX: h.hx,
        handleY: h.hy,
      };
    });
    g.appendChild(handle);
  }

  // Rotation handle (items only)
  if (!isRoom) {
    const rotLen = 10;
    g.appendChild(svgEl('line', { class: 'rotate-handle-line', x1: sel.w / 2, y1: 0, x2: sel.w / 2, y2: -rotLen }));
    const rotCircle = svgEl('circle', { class: 'rotate-handle', cx: sel.w / 2, cy: -rotLen, r: 2.5 });
    rotCircle.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      state.rotating = { id: sel.id, centerX: sel.x + sel.w / 2, centerY: sel.y + sel.h / 2 };
    });
    g.appendChild(rotCircle);
  }

  handlesLayer.appendChild(g);
}

function renderContextPanel() {
  if (state.selectedKind === 'multi' && state.selectedIds.length > 0) {
    contextPanel.classList.remove('hidden');
    $('#ctx-single').classList.add('hidden');
    $('#ctx-multi').classList.remove('hidden');

    const count = state.selectedIds.length;
    $('#ctx-multi-title').textContent = `${count} Selected Item${count !== 1 ? 's' : ''}`;

    const namesEl = $('#ctx-multi-names');
    namesEl.innerHTML = '';
    for (const id of state.selectedIds) {
      const item = getItem(id);
      if (!item) continue;
      const name = item.label || FURNITURE_DEFS[item.type]?.label || item.type;
      const div = document.createElement('div');
      div.className = 'context-multi-name-item';
      div.textContent = name;
      namesEl.appendChild(div);
    }
    return;
  }

  $('#ctx-single').classList.remove('hidden');
  $('#ctx-multi').classList.add('hidden');

  const sel = getSelected();
  if (!sel) { contextPanel.classList.add('hidden'); return; }
  contextPanel.classList.remove('hidden');
  const defaultLabel = state.selectedKind === 'room'
    ? (sel.label || '')
    : (sel.label || FURNITURE_DEFS[sel.type]?.label || sel.type);
  $('#ctx-name').value = sel.label || defaultLabel;
  $('#ctx-width').value = Math.round(sel.w);
  $('#ctx-height').value = Math.round(sel.h);
  $('#ctx-x').value = Math.round(sel.x);
  $('#ctx-y').value = Math.round(sel.y);
  $('#ctx-rotation').value = Math.round(sel.rotation || 0);

  const isText = state.selectedKind === 'item' && sel.type === 'text';
  $('#ctx-text-label').classList.toggle('hidden', !isText);
  $('#ctx-fontsize-label').classList.toggle('hidden', !isText);
  if (isText) {
    $('#ctx-text').value = sel.text || '';
    $('#ctx-fontsize').value = sel.fontSize || 5;
  }
  const rotLabel = $('#ctx-rotation').closest('label');
  if (rotLabel) rotLabel.style.display = state.selectedKind === 'room' ? 'none' : '';
}

// ─── Actions ─────────────────────────────────────────────────────────

function addItem(type, x, y) {
  const def = FURNITURE_DEFS[type];
  if (!def) return;
  const item = { id: state.nextId++, type, x: x - def.w / 2, y: y - def.h / 2, w: def.w, h: def.h, rotation: 0 };
  if (type === 'text') { item.text = 'Text'; item.fontSize = 5; }
  state.items.push(item);
  state.selectedKind = 'item';
  state.selectedId = item.id;
  renderFurniture();
  return item;
}

function addRoom(x, y) {
  const room = { id: state.nextId++, x: x - 72, y: y - 60, w: 144, h: 120, label: 'Room ' + (state.rooms.length + 1) };
  state.rooms.push(room);
  state.selectedKind = 'room';
  state.selectedId = room.id;
  renderRooms(); renderHandles(); renderContextPanel();
  return room;
}

function rotateItem90(id) {
  if (state.selectedKind === 'room') return;
  const item = getItem(id);
  if (!item) return;
  item.rotation = (item.rotation + 90) % 360;
  renderFurniture();
}

function duplicateSelected() {
  const sel = getSelected();
  if (!sel) return;
  if (state.selectedKind === 'room') {
    const dup = { ...sel, id: state.nextId++, x: sel.x + 12, y: sel.y + 12, label: 'Room ' + (state.rooms.length + 1) };
    state.rooms.push(dup);
    state.selectedId = dup.id;
    renderRooms(); renderHandles(); renderContextPanel();
  } else {
    const dup = { ...sel, id: state.nextId++, x: sel.x + 12, y: sel.y + 12 };
    state.items.push(dup);
    state.selectedId = dup.id;
    renderFurniture();
  }
}

function deleteSelected() {
  if (state.selectedKind === 'room') {
    state.rooms = state.rooms.filter(r => r.id !== state.selectedId);
  } else {
    state.items = state.items.filter(i => i.id !== state.selectedId);
  }
  state.selectedKind = null; state.selectedId = null;
  renderRooms(); renderFurniture(); renderHandles(); renderContextPanel();
}

function selectItem(id) {
  state.selectedKind = 'item'; state.selectedId = id; state.selectedIds = [];
  renderRooms(); renderFurniture();
}
function selectRoom(id) {
  state.selectedKind = 'room'; state.selectedId = id; state.selectedIds = [];
  renderRooms(); renderFurniture(); renderHandles(); renderContextPanel();
}
function deselectAll() {
  state.selectedKind = null; state.selectedId = null; state.selectedIds = [];
  renderRooms(); renderFurniture();
}

function toggleItemSelection(id) {
  // Build pool from current selection
  let pool = state.selectedKind === 'multi' ? [...state.selectedIds]
           : state.selectedKind === 'item'  ? [state.selectedId]
           : [];

  const idx = pool.indexOf(id);
  if (idx >= 0) {
    pool.splice(idx, 1);
  } else {
    pool.push(id);
  }

  if (pool.length === 0) {
    state.selectedKind = null; state.selectedId = null; state.selectedIds = [];
  } else if (pool.length === 1) {
    state.selectedKind = 'item'; state.selectedId = pool[0]; state.selectedIds = [];
  } else {
    state.selectedKind = 'multi'; state.selectedId = null; state.selectedIds = pool;
  }
  renderRooms(); renderFurniture();
}

function rotateGroup() {
  const items = state.selectedIds.map(id => getItem(id)).filter(Boolean);
  if (items.length === 0) return;

  // Centroid of all item visual centers
  const cx = items.reduce((s, i) => s + i.x + i.w / 2, 0) / items.length;
  const cy = items.reduce((s, i) => s + i.y + i.h / 2, 0) / items.length;

  // Rotate each item's center 90° clockwise around the centroid, then rotate the item itself
  for (const item of items) {
    const dx = (item.x + item.w / 2) - cx;
    const dy = (item.y + item.h / 2) - cy;
    // 90° clockwise in screen coords (y-down): (dx, dy) → (-dy, dx)
    const newDx = -dy;
    const newDy =  dx;
    item.x = cx + newDx - item.w / 2;
    item.y = cy + newDy - item.h / 2;
    item.rotation = (item.rotation + 90) % 360;
  }
  renderFurniture();
}

function deleteGroup() {
  state.items = state.items.filter(i => !state.selectedIds.includes(i.id));
  state.selectedKind = null; state.selectedId = null; state.selectedIds = [];
  renderFurniture();
}

// ─── Room Snapping ───────────────────────────────────────────────────

function snapRoom(room) {
  for (const other of state.rooms) {
    if (other.id === room.id) continue;
    const sd = SNAP_DISTANCE;
    // Edge-to-edge snapping
    if (Math.abs((room.x + room.w) - other.x) < sd) room.x = other.x - room.w;
    if (Math.abs(room.x - (other.x + other.w)) < sd) room.x = other.x + other.w;
    if (Math.abs((room.y + room.h) - other.y) < sd) room.y = other.y - room.h;
    if (Math.abs(room.y - (other.y + other.h)) < sd) room.y = other.y + other.h;
    // Align edges
    if (Math.abs(room.x - other.x) < sd) room.x = other.x;
    if (Math.abs((room.x + room.w) - (other.x + other.w)) < sd) room.x = other.x + other.w - room.w;
    if (Math.abs(room.y - other.y) < sd) room.y = other.y;
    if (Math.abs((room.y + room.h) - (other.y + other.h)) < sd) room.y = other.y + other.h - room.h;
  }
}

// ─── Wall Snapping for Doors & Windows ──────────────────────────────

function snapToWall(item) {
  const isDoor = item.type === 'door' || item.type === 'doorright';
  if (!isDoor && item.type !== 'window') return;
  const sd = SNAP_DISTANCE;
  let bestDist = sd;
  let bestSnap = null;

  const cx = item.x + item.w / 2;
  const cy = item.y + item.h / 2;

  // Windows straddle the wall (centered). Doors sit fully inside the room with
  // their natural y=0 edge on the wall. Distance checks mirror the final snap:
  // windows measured from center, doors from the wall-adjacent edge — otherwise
  // the door appears to ignore the wall until its center crosses it.
  for (const room of state.rooms) {
    // Top wall
    let probe = isDoor ? item.y : cy;
    let d = Math.abs(probe - room.y);
    if (d < bestDist && cx >= room.x - sd && cx <= room.x + room.w + sd) {
      bestDist = d;
      bestSnap = { y: isDoor ? room.y : room.y - item.h / 2, rotation: 0, wallAxis: 'h' };
    }
    // Bottom wall
    probe = isDoor ? item.y + item.h : cy;
    d = Math.abs(probe - (room.y + room.h));
    if (d < bestDist && cx >= room.x - sd && cx <= room.x + room.w + sd) {
      bestDist = d;
      bestSnap = { y: isDoor ? room.y + room.h - item.h : room.y + room.h - item.h / 2, rotation: 180, wallAxis: 'h' };
    }
    // Left wall
    probe = isDoor ? item.x : cx;
    d = Math.abs(probe - room.x);
    if (d < bestDist && cy >= room.y - sd && cy <= room.y + room.h + sd) {
      bestDist = d;
      bestSnap = { x: isDoor ? room.x : room.x - item.w / 2, rotation: 270, wallAxis: 'v' };
    }
    // Right wall
    probe = isDoor ? item.x + item.w : cx;
    d = Math.abs(probe - (room.x + room.w));
    if (d < bestDist && cy >= room.y - sd && cy <= room.y + room.h + sd) {
      bestDist = d;
      bestSnap = { x: isDoor ? room.x + room.w - item.w : room.x + room.w - item.w / 2, rotation: 90, wallAxis: 'v' };
    }
  }

  if (bestSnap) {
    if (bestSnap.wallAxis === 'h') {
      item.y = bestSnap.y;
    } else {
      item.x = bestSnap.x;
    }
    item.rotation = bestSnap.rotation;
  }
}

// ─── Event Handlers ──────────────────────────────────────────────────

// --- Palette ---
document.querySelectorAll('.palette-item').forEach(el => {
  el.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('text/plain', el.dataset.type);
    e.dataTransfer.effectAllowed = 'copy';
  });
  el.addEventListener('click', () => {
    const type = el.dataset.type;
    const ref = state.rooms[0];
    if (type === 'room') {
      addRoom(ref ? ref.x + ref.w / 2 : 96, ref ? ref.y + ref.h + 72 : 120);
    } else {
      addItem(type, ref ? ref.x + ref.w / 2 : 96, ref ? ref.y + ref.h / 2 : 72);
    }
  });
});

canvasContainer.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
canvasContainer.addEventListener('drop', (e) => {
  e.preventDefault();
  const type = e.dataTransfer.getData('text/plain');
  if (!type) return;
  const { x, y } = screenToCanvas(e.clientX, e.clientY);
  type === 'room' ? addRoom(x, y) : (FURNITURE_DEFS[type] && addItem(type, x, y));
});

// --- Canvas mouse ---
canvas.addEventListener('mousedown', (e) => {
  const itemEl = e.target.closest('.furniture-item');
  if (itemEl) {
    const id = parseInt(itemEl.dataset.id, 10);
    if (e.shiftKey) {
      toggleItemSelection(id);
      return;
    }
    // Clicking on a member of the current multi-selection: drag the whole group
    if (state.selectedKind === 'multi' && state.selectedIds.includes(id)) {
      const { x, y } = screenToCanvas(e.clientX, e.clientY);
      const offsets = state.selectedIds.map(sid => {
        const it = getItem(sid);
        return { id: sid, offsetX: x - it.x, offsetY: y - it.y };
      });
      state.dragging = { kind: 'group', offsets };
      return;
    }
    selectItem(id);
    const item = getItem(id);
    if (!item) return;
    const { x, y } = screenToCanvas(e.clientX, e.clientY);
    state.dragging = { kind: 'item', id, offsetX: x - item.x, offsetY: y - item.y };
    return;
  }
  const roomEl = e.target.closest('.room-item');
  if (roomEl) {
    const id = parseInt(roomEl.dataset.roomId, 10);
    selectRoom(id);
    const room = getRoom(id);
    if (!room) return;
    const { x, y } = screenToCanvas(e.clientX, e.clientY);
    state.dragging = { kind: 'room', id, offsetX: x - room.x, offsetY: y - room.y };
    return;
  }
  if (e.target.closest('.quick-action-btn') || e.target.closest('.resize-handle') || e.target.closest('.rotate-handle')) return;

  deselectAll();
  state.panning = { startX: e.clientX, startY: e.clientY, startPanX: state.pan.x, startPanY: state.pan.y };
  canvas.style.cursor = 'grabbing';
});

window.addEventListener('mousemove', (e) => {
  if (state.rotating) {
    const { x, y } = screenToCanvas(e.clientX, e.clientY);
    let angle = Math.atan2(x - state.rotating.centerX, -(y - state.rotating.centerY)) * (180 / Math.PI);
    if (angle < 0) angle += 360;
    const item = getItem(state.rotating.id);
    if (item) {
      // Snap to right angles (0, 90, 180, 270) within 5°
      const snapAngles = [0, 90, 180, 270, 360];
      let snapped = Math.round(angle);
      for (const sa of snapAngles) {
        if (Math.abs(snapped - sa) <= 5) { snapped = sa % 360; break; }
      }
      item.rotation = snapped;
      renderFurniture();
    }
    return;
  }
  if (state.dragging) {
    const { x, y } = screenToCanvas(e.clientX, e.clientY);
    if (state.dragging.kind === 'group') {
      for (const { id, offsetX, offsetY } of state.dragging.offsets) {
        const it = getItem(id);
        if (!it) continue;
        it.x = x - offsetX;
        it.y = y - offsetY;
      }
      renderFurniture();
    } else if (state.dragging.kind === 'room') {
      const room = getRoom(state.dragging.id);
      if (!room) return;
      room.x = x - state.dragging.offsetX;
      room.y = y - state.dragging.offsetY;
      snapRoom(room);
      renderRooms(); renderHandles(); renderContextPanel();
    } else {
      const item = getItem(state.dragging.id);
      if (!item) return;
      item.x = x - state.dragging.offsetX;
      item.y = y - state.dragging.offsetY;
      snapToWall(item);
      renderFurniture();
    }
    return;
  }
  if (state.resizing) {
    const r = state.resizing;
    const obj = r.kind === 'room' ? getRoom(r.id) : getItem(r.id);
    if (!obj) return;
    let dx = (e.clientX - r.startX) / state.zoom;
    let dy = (e.clientY - r.startY) / state.zoom;

    // Rotate mouse delta into object's local coordinate system
    const rotation = (r.kind === 'room') ? 0 : (obj.rotation || 0);
    if (rotation !== 0) {
      const rad = -rotation * Math.PI / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const ldx = dx * cos - dy * sin;
      const ldy = dx * sin + dy * cos;
      dx = ldx;
      dy = ldy;
    }

    if (e.shiftKey) {
      // Proportional resize
      const aspect = r.startW / r.startH;
      const d = Math.abs(dx) > Math.abs(dy) ? dx : dy;
      const signX = r.handleX === 0 ? -1 : 1;
      const newW = Math.max(4, r.startW + d * signX);
      const newH = Math.max(4, newW / aspect);
      if (r.handleX === 0) obj.x = r.startObjX + (r.startW - newW);
      if (r.handleY === 0) obj.y = r.startObjY + (r.startH - newH);
      obj.w = newW;
      obj.h = newH;
    } else {
      // Independent axis resize based on which handle
      if (r.handleX === 0) {
        obj.w = Math.max(4, r.startW - dx);
        obj.x = r.startObjX + (r.startW - obj.w);
      } else if (r.handleX === 1) {
        obj.w = Math.max(4, r.startW + dx);
      }

      if (r.handleY === 0) {
        obj.h = Math.max(4, r.startH - dy);
        obj.y = r.startObjY + (r.startH - obj.h);
      } else if (r.handleY === 1) {
        obj.h = Math.max(4, r.startH + dy);
      }
    }

    if (r.kind === 'room') { renderRooms(); renderHandles(); renderContextPanel(); }
    else { renderFurniture(); }
    return;
  }
  if (state.panning) {
    state.pan.x = state.panning.startPanX + (e.clientX - state.panning.startX);
    state.pan.y = state.panning.startPanY + (e.clientY - state.panning.startY);
    renderViewport();
  }
});

window.addEventListener('mouseup', () => {
  state.dragging = null; state.resizing = null; state.panning = null; state.rotating = null;
  canvas.style.cursor = '';
});

// --- Right-click context menu ---
const ctxMenu = $('#ctx-menu');

function hideCtxMenu() { ctxMenu.classList.add('hidden'); }

canvas.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  const itemEl = e.target.closest('.furniture-item');
  const roomEl = e.target.closest('.room-item');
  if (itemEl) {
    const id = parseInt(itemEl.dataset.id, 10);
    selectItem(id);
  } else if (roomEl) {
    const id = parseInt(roomEl.dataset.roomId, 10);
    selectRoom(id);
  } else {
    hideCtxMenu();
    return;
  }
  const containerRect = canvasContainer.getBoundingClientRect();
  ctxMenu.style.left = (e.clientX - containerRect.left) + 'px';
  ctxMenu.style.top = (e.clientY - containerRect.top) + 'px';
  ctxMenu.classList.remove('hidden');
});

ctxMenu.querySelector('[data-action="rotate"]').addEventListener('click', () => {
  if (state.selectedKind === 'item' && state.selectedId) rotateItem90(state.selectedId);
  hideCtxMenu();
});
ctxMenu.querySelector('[data-action="duplicate"]').addEventListener('click', () => {
  if (state.selectedId) duplicateSelected();
  hideCtxMenu();
});
ctxMenu.querySelector('[data-action="delete"]').addEventListener('click', () => {
  if (state.selectedId) deleteSelected();
  hideCtxMenu();
});

window.addEventListener('mousedown', (e) => {
  if (!ctxMenu.contains(e.target)) hideCtxMenu();
});

// --- Scroll/Zoom: Figma-style ---
// Two-finger trackpad scroll = pan (no modifier)
// Cmd+scroll or pinch (ctrlKey on trackpad pinch) = zoom
canvasContainer.addEventListener('wheel', (e) => {
  e.preventDefault();

  if (e.ctrlKey || e.metaKey) {
    // Zoom (pinch or Cmd+scroll)
    const zoomFactor = 1 - e.deltaY * 0.005;
    const newZoom = Math.max(0.3, Math.min(30, state.zoom * zoomFactor));

    const rect = canvasContainer.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    state.pan.x = mx - (mx - state.pan.x) * (newZoom / state.zoom);
    state.pan.y = my - (my - state.pan.y) * (newZoom / state.zoom);
    state.zoom = newZoom;
  } else {
    // Pan (two-finger scroll)
    state.pan.x -= e.deltaX;
    state.pan.y -= e.deltaY;
  }
  renderViewport();
}, { passive: false });

// --- Layout Title ---
const layoutTitleInput = $('#layout-title');
const defaultTitle = 'Plan ' + (Math.floor(10000 + Math.random() * 90000));
layoutTitleInput.value = defaultTitle;
layoutTitleInput.style.width = (layoutTitleInput.value.length + 2) + 'ch';
layoutTitleInput.addEventListener('input', () => {
  layoutTitleInput.style.width = (Math.max(10, layoutTitleInput.value.length + 2)) + 'ch';
});

// --- Floating Zoom Controls ---
$('#btn-zoom-in').addEventListener('click', () => { state.zoom = Math.min(30, state.zoom * 1.25); renderViewport(); });
$('#btn-zoom-out').addEventListener('click', () => { state.zoom = Math.max(0.3, state.zoom / 1.25); renderViewport(); });

// Room dimensions are now edited via the Selected Item panel when a room is selected.

// --- Context panel ---
['ctx-width', 'ctx-height', 'ctx-x', 'ctx-y', 'ctx-rotation'].forEach(id => {
  $(`#${id}`).addEventListener('change', () => {
    const sel = getSelected(); if (!sel) return;
    const val = parseFloat($(`#${id}`).value); if (isNaN(val)) return;
    switch (id) {
      case 'ctx-width':    sel.w = Math.max(2, val); break;
      case 'ctx-height':   sel.h = Math.max(2, val); break;
      case 'ctx-x':        sel.x = val; break;
      case 'ctx-y':        sel.y = val; break;
      case 'ctx-rotation': sel.rotation = ((val % 360) + 360) % 360; break;
    }
    if (state.selectedKind === 'room') { renderRooms(); renderHandles(); renderContextPanel(); }
    else { renderFurniture(); }
  });
});

$('#ctx-name').addEventListener('change', () => {
  const sel = getSelected(); if (!sel) return;
  sel.label = $('#ctx-name').value;
  if (state.selectedKind === 'room') { renderRooms(); renderHandles(); renderContextPanel(); }
  else { renderFurniture(); }
});

$('#ctx-text').addEventListener('change', () => {
  const item = getItem(state.selectedId);
  if (item && item.type === 'text') { item.text = $('#ctx-text').value; renderFurniture(); }
});
$('#ctx-fontsize').addEventListener('change', () => {
  const item = getItem(state.selectedId);
  if (item && item.type === 'text') { item.fontSize = Math.max(2, parseInt($('#ctx-fontsize').value, 10) || 5); renderFurniture(); }
});

$('#ctx-rotate').addEventListener('click', () => { if (state.selectedKind === 'item' && state.selectedId) rotateItem90(state.selectedId); });
$('#ctx-duplicate').addEventListener('click', () => { if (state.selectedId) duplicateSelected(); });
$('#ctx-delete').addEventListener('click', () => { if (state.selectedId) deleteSelected(); });
$('#ctx-rotate-all').addEventListener('click', () => rotateGroup());
$('#ctx-delete-all').addEventListener('click', () => deleteGroup());

canvas.addEventListener('dblclick', (e) => {
  const itemEl = e.target.closest('.furniture-item');
  if (!itemEl) return;
  const id = parseInt(itemEl.dataset.id, 10);
  const item = getItem(id); if (!item) return;
  selectItem(id);
  $('#ctx-name').focus(); $('#ctx-name').select();
});

document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  if (state.selectedKind === 'multi') {
    if (e.key === 'Delete' || e.key === 'Backspace') { deleteGroup(); return; }
    if (e.key === 'Escape') { deselectAll(); return; }
    if (e.key === 'r' || e.key === 'R') { rotateGroup(); return; }
    return;
  }
  if (state.selectedId) {
    const sel = getSelected(); if (!sel) return;
    if (e.key === 'Delete' || e.key === 'Backspace') { deleteSelected(); return; }
    if (e.key === 'Escape') { deselectAll(); return; }
    if (state.selectedKind === 'item') {
      if (e.key === 'r' || e.key === 'R') { rotateItem90(state.selectedId); return; }
      if ((e.key === 'd' || e.key === 'D') && (e.ctrlKey || e.metaKey)) { e.preventDefault(); duplicateSelected(); return; }
    }
    const step = e.shiftKey ? 6 : 1; // 6 inches (half foot) or 1 inch
    switch (e.key) {
      case 'ArrowUp':    e.preventDefault(); sel.y -= step; break;
      case 'ArrowDown':  e.preventDefault(); sel.y += step; break;
      case 'ArrowLeft':  e.preventDefault(); sel.x -= step; break;
      case 'ArrowRight': e.preventDefault(); sel.x += step; break;
      default: return;
    }
    if (state.selectedKind === 'room') { renderRooms(); renderHandles(); renderContextPanel(); }
    else { renderFurniture(); }
  }
  if (e.key === 'Escape') deselectAll();
});

// ─── Save / Load / Export ────────────────────────────────────────────

$('#btn-save').addEventListener('click', () => {
  const titleVal = ($('#layout-title').value || 'room-layout').trim();
  const data = {
    version: 3,
    unit: 'inches',
    layoutName: titleVal,
    view: { zoom: state.zoom, panX: state.pan.x, panY: state.pan.y },
    rooms: state.rooms.map(r => ({ x: r.x, y: r.y, w: r.w, h: r.h, label: r.label })),
    items: state.items.map(item => {
      const out = { type: item.type, x: +item.x.toFixed(2), y: +item.y.toFixed(2), w: +item.w.toFixed(2), h: +item.h.toFixed(2), rotation: item.rotation };
      if (item.label) out.label = item.label;
      if (item.type === 'text') { out.text = item.text; out.fontSize = item.fontSize; }
      return out;
    }),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const filename = titleVal.replace(/[/\\?%*:|"<>]/g, '-') || 'room-layout';
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  const ts = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  const a = document.createElement('a'); a.href = url; a.download = `${filename}_${ts}.json`; a.click();
  URL.revokeObjectURL(url);
});

function applyLayoutData(data) {
  if (data.rooms) {
    state.rooms = data.rooms.map((r, i) => ({ id: i + 1, x: r.x, y: r.y, w: r.w, h: r.h, label: r.label || `Room ${i + 1}` }));
  } else if (data.room) {
    state.rooms = [{ id: 1, x: 0, y: 0, w: data.room.w, h: data.room.h, label: 'Room 1' }];
  }
  const off = state.rooms.length;
  state.items = (data.items || []).map((item, i) => ({
    id: off + i + 1, type: item.type, x: item.x, y: item.y, w: item.w, h: item.h,
    rotation: item.rotation || 0, text: item.text, fontSize: item.fontSize, label: item.label,
  }));
  state.nextId = off + state.items.length + 1;
  state.selectedKind = null; state.selectedId = null;
  if (data.layoutName) $('#layout-title').value = data.layoutName;
  if (data.view) { state.zoom = data.view.zoom || 1; state.pan.x = data.view.panX || 0; state.pan.y = data.view.panY || 0; }
  renderRooms(); renderFurniture(); renderViewport();
}

$('#btn-load').addEventListener('click', () => { $('#file-input').click(); });
$('#file-input').addEventListener('change', (e) => {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      applyLayoutData(JSON.parse(ev.target.result));
    } catch (err) { alert('Could not load file: the JSON is in the wrong format.'); }
  };
  reader.readAsText(file);
  e.target.value = '';
});

$('#btn-example').addEventListener('click', () => {
  if (typeof EXAMPLE_LAYOUT === 'undefined') { alert('Example layout not bundled.'); return; }
  applyLayoutData(EXAMPLE_LAYOUT);
});

$('#btn-export').addEventListener('click', () => {
  const svgClone = canvas.cloneNode(true);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const r of state.rooms) { minX = Math.min(minX, r.x); minY = Math.min(minY, r.y); maxX = Math.max(maxX, r.x + r.w); maxY = Math.max(maxY, r.y + r.h); }
  for (const i of state.items) { minX = Math.min(minX, i.x); minY = Math.min(minY, i.y); maxX = Math.max(maxX, i.x + i.w); maxY = Math.max(maxY, i.y + i.h); }
  if (!isFinite(minX)) { minX = 0; minY = 0; maxX = 192; maxY = 144; }
  const pad = 12;
  const vbX = minX - pad, vbY = minY - pad, vbW = (maxX - minX) + pad * 2, vbH = (maxY - minY) + pad * 2;
  svgClone.setAttribute('viewBox', `${vbX} ${vbY} ${vbW} ${vbH}`);
  svgClone.setAttribute('width', vbW * 8);
  svgClone.setAttribute('height', vbH * 8);
  const vp = svgClone.querySelector('#viewport'); if (vp) vp.removeAttribute('transform');
  const bg = svgClone.querySelector('#canvas-bg'); if (bg) { bg.setAttribute('x', vbX); bg.setAttribute('y', vbY); bg.setAttribute('width', vbW); bg.setAttribute('height', vbH); }
  const gr = svgClone.querySelector('#grid-rect'); if (gr) { gr.setAttribute('x', vbX); gr.setAttribute('y', vbY); gr.setAttribute('width', vbW); gr.setAttribute('height', vbH); }
  const hl = svgClone.querySelector('#handles-layer'); if (hl) hl.innerHTML = '';

  // Inline all CSS styles to avoid black-fill issues when patterns/styles don't resolve
  // Set grid-rect to plain white background (grid lines are nice-to-have but patterns
  // don't reliably survive serialisation → image rendering)
  if (gr) gr.setAttribute('fill', CANVAS_BG);

  // Ensure all elements with fill="url(#...)" that might not resolve get a safe fallback
  svgClone.querySelectorAll('[fill^="url("]').forEach(el => {
    el.setAttribute('fill', CANVAS_BG);
  });

  const svgData = new XMLSerializer().serializeToString(svgClone);
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const ctx = c.getContext('2d'); ctx.fillStyle = CANVAS_BG; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0);
    const pngTitle = ($('#layout-title').value || 'room-layout').trim().replace(/[/\\?%*:|"<>]/g, '-');
    const a = document.createElement('a'); a.href = c.toDataURL('image/png'); a.download = pngTitle + '.png'; a.click();
    URL.revokeObjectURL(url);
  };
  img.src = url;
});

// ─── Initialize ──────────────────────────────────────────────────────
renderRooms();
renderViewport();
renderFurniture();
