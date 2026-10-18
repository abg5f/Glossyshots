/**
 * Éditeur : une capture, des masquages et annotations modifiables, un fond.
 * L'état vit ici ; le dessin est délégué à `render.ts` (affichage et export partagés).
 */
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { applyI18n, initLang, lang, setLang, t, type Lang } from "../lib/i18n";
import { hydrateIcons, icon } from "../lib/icons";
import { copyImage, fetchShot, savePng, type SystemState } from "../lib/ipc";
import { backgrounds, thumbnail } from "./backgrounds";
import {
  bounds,
  defaultLook,
  exportCanvas,
  isMagnify,
  isRedaction,
  layout,
  lensRect,
  render,
  Source,
  strokeWidth,
  type Annot,
  type Focus,
  type Kind,
  type Look,
  type Size,
} from "./render";

type Tool = "select" | Kind;
type Pt = { x: number; y: number };
type Handle = "nw" | "ne" | "sw" | "se" | "p1" | "p2" | "lnw" | "lne" | "lsw" | "lse";

const COLORS = ["#ff4d4f", "#ffb020", "#2f8cff", "#22c55e", "#f5f5f7"];
const STORE = "glossyshots.editor.v1";
const $ = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector<T>(sel)!;

// ───────────────────────────── État ─────────────────────────────

const saved = readStore();
let source: Source | null = null;
let annots: Annot[] = [];
let past: Annot[][] = [];
let future: Annot[][] = [];
let selectedId: number | null = null;
let nextId = 1;
const TOOLS: Tool[] = ["select", "blur", "magnify", "rect", "ellipse", "arrow"];
let tool: Tool = saved.tool && TOOLS.includes(saved.tool) ? saved.tool : "select";
let color = saved.color ?? COLORS[0];
let size: Size = saved.size ?? 2;
let zoom = saved.zoom ?? 1.5;
let focus: Focus = saved.focus ?? "blur";
/** Copie automatique de chaque nouvelle capture dans le presse-papiers (activée par défaut). */
let autoCopy = saved.autoCopy ?? true;
const look: Look = { ...defaultLook, ...saved.look };

let view = { scale: 1, ox: 0, oy: 0 };
let drag:
  | { mode: "create"; annot: Annot; origin: Pt }
  | { mode: "move"; annot: Annot; start: Pt; orig: Annot }
  | { mode: "resize"; annot: Annot; handle: Handle; orig: Annot }
  | { mode: "pan"; annot: Annot; start: Pt; orig: Annot }
  | null = null;
let frame = 0;
let system: SystemState | null = null;

function readStore(): {
  tool?: Tool;
  color?: string;
  size?: Size;
  zoom?: number;
  focus?: Focus;
  autoCopy?: boolean;
  look?: Partial<Look>;
} {
  try {
    return JSON.parse(localStorage.getItem(STORE) ?? "{}");
  } catch {
    return {};
  }
}

function persist(): void {
  try {
    localStorage.setItem(STORE, JSON.stringify({ tool, color, size, zoom, focus, autoCopy, look }));
  } catch {
    /* stockage indisponible : préférences non mémorisées, sans gravité */
  }
}

// ───────────────────────────── Affichage ─────────────────────────────

const app = $("#app");
const stage = $("#stage");
const canvas = $<HTMLCanvasElement>("#view");
const ctx = canvas.getContext("2d")!;

function invalidate(): void {
  if (!frame) frame = requestAnimationFrame(paint);
}

function fit(): void {
  const dpr = window.devicePixelRatio;
  const r = stage.getBoundingClientRect();
  canvas.width = Math.round(r.width * dpr);
  canvas.height = Math.round(r.height * dpr);
  if (!source) return;
  const L = layout(source, look);
  const margin = 48;
  // Jamais au-delà du 1:1 physique : une petite capture reste nette.
  const scale = Math.min((r.width - margin * 2) / L.W, (r.height - margin * 2) / L.H, 1 / dpr);
  view = {
    scale: Math.max(scale, 0.02),
    ox: (r.width - L.W * scale) / 2,
    oy: (r.height - L.H * scale) / 2,
  };
}

function paint(): void {
  frame = 0;
  const dpr = window.devicePixelRatio;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!source) return;
  fit();
  const k = view.scale * dpr;
  ctx.setTransform(k, 0, 0, k, view.ox * dpr, view.oy * dpr);
  ctx.imageSmoothingQuality = "high";
  const draft = drag?.mode === "create" ? [drag.annot] : [];
  const L = render(ctx, source, look, [...annots, ...draft], k);
  drawSelection(L.pad);
}

/** Contour et poignées de l'annotation sélectionnée (affichage seulement, jamais exporté). */
function drawSelection(pad: number): void {
  const a = annots.find((x) => x.id === selectedId) ?? (drag?.mode === "create" ? drag.annot : null);
  if (!a || !source) return;
  const px = 1 / view.scale; // un pixel CSS en unités de composition
  ctx.save();
  ctx.translate(pad, pad);
  if (a.kind !== "arrow") {
    const b = bounds(a);
    ctx.setLineDash([5 * px, 4 * px]);
    ctx.lineWidth = 1.25 * px;
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.strokeRect(b.x, b.y, b.w, b.h);
    ctx.setLineDash([]);
  }
  if (a.id === selectedId) {
    for (const [h, p] of handles(a)) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5.5 * px, 0, Math.PI * 2);
      // Poignées de zoom de la loupe pleines, poignées de la zone source creuses.
      ctx.fillStyle = h.startsWith("l") ? "#ff7a59" : "#ffffff";
      ctx.shadowColor = "rgba(0,0,0,0.35)";
      ctx.shadowBlur = 4;
      ctx.fill();
      ctx.shadowColor = "transparent";
      ctx.lineWidth = 2 * px;
      ctx.strokeStyle = h.startsWith("l") ? "#ffffff" : "#ff7a59";
      ctx.stroke();
    }
  }
  ctx.restore();
}

function handles(a: Annot): [Handle, Pt][] {
  if (a.kind === "arrow") {
    return [
      ["p1", { x: a.x1, y: a.y1 }],
      ["p2", { x: a.x2, y: a.y2 }],
    ];
  }
  const b = bounds(a);
  const list: [Handle, Pt][] = [
    ["nw", { x: b.x, y: b.y }],
    ["ne", { x: b.x + b.w, y: b.y }],
    ["sw", { x: b.x, y: b.y + b.h }],
    ["se", { x: b.x + b.w, y: b.y + b.h }],
  ];
  if (isMagnify(a.kind)) {
    const r = lensRect(a);
    list.push(
      ["lnw", { x: r.x, y: r.y }],
      ["lne", { x: r.x + r.w, y: r.y }],
      ["lsw", { x: r.x, y: r.y + r.h }],
      ["lse", { x: r.x + r.w, y: r.y + r.h }],
    );
  }
  return list;
}

/** Coordonnées écran → pixels de la capture (origine au coin de l'image, hors marge). */
function toImage(e: PointerEvent): Pt {
  const r = canvas.getBoundingClientRect();
  const pad = source ? layout(source, look).pad : 0;
  return {
    x: (e.clientX - r.left - view.ox) / view.scale - pad,
    y: (e.clientY - r.top - view.oy) / view.scale - pad,
  };
}

// ───────────────────────────── Historique ─────────────────────────────

const clone = (list: Annot[]) => list.map((a) => ({ ...a }));

function checkpoint(): void {
  past.push(clone(annots));
  if (past.length > 100) past.shift();
  future = [];
  syncChrome();
}

function undo(): void {
  if (!past.length) return;
  future.push(clone(annots));
  annots = past.pop()!;
  if (!annots.some((a) => a.id === selectedId)) selectedId = null;
  syncChrome();
  invalidate();
}

function redo(): void {
  if (!future.length) return;
  past.push(clone(annots));
  annots = future.pop()!;
  syncChrome();
  invalidate();
}

// ───────────────────────────── Interaction ─────────────────────────────

function hitHandle(p: Pt): Handle | null {
  const a = annots.find((x) => x.id === selectedId);
  if (!a) return null;
  const tol = 9 / view.scale;
  for (const [h, q] of handles(a)) if (Math.hypot(p.x - q.x, p.y - q.y) <= tol) return h;
  return null;
}

/** Vue agrandie d'une loupe sous le pointeur (la plus haute d'abord). */
function hitLens(p: Pt): Annot | null {
  for (let i = annots.length - 1; i >= 0; i--) {
    const a = annots[i];
    if (!isMagnify(a.kind)) continue;
    const r = lensRect(a);
    if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) return a;
  }
  return null;
}

function hitAnnot(p: Pt): Annot | null {
  const tol = 8 / view.scale;
  for (let i = annots.length - 1; i >= 0; i--) {
    const a = annots[i];
    if (a.kind === "arrow") {
      if (distToSegment(p, { x: a.x1, y: a.y1 }, { x: a.x2, y: a.y2 }) <= tol + strokeWidth(a, source!.unit)) return a;
      continue;
    }
    const b = bounds(a);
    if (p.x >= b.x - tol && p.x <= b.x + b.w + tol && p.y >= b.y - tol && p.y <= b.y + b.h + tol) return a;
  }
  return null;
}

function distToSegment(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy || 1;
  const u = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  return Math.hypot(p.x - (a.x + u * dx), p.y - (a.y + u * dy));
}

/** Maj : cercle/carré parfait, flèche par pas de 45°. */
function constrain(kind: Kind, o: Pt, p: Pt, shift: boolean): Pt {
  if (!shift) return p;
  const dx = p.x - o.x;
  const dy = p.y - o.y;
  if (kind === "arrow") {
    const ang = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4);
    const len = Math.hypot(dx, dy);
    return { x: o.x + Math.cos(ang) * len, y: o.y + Math.sin(ang) * len };
  }
  const m = Math.max(Math.abs(dx), Math.abs(dy));
  return { x: o.x + Math.sign(dx || 1) * m, y: o.y + Math.sign(dy || 1) * m };
}

canvas.addEventListener("pointerdown", (e) => {
  if (!source || e.button !== 0) return;
  canvas.setPointerCapture(e.pointerId);
  const p = toImage(e);

  const h = hitHandle(p);
  if (h) {
    const a = annots.find((x) => x.id === selectedId)!;
    checkpoint();
    drag = { mode: "resize", annot: a, handle: h, orig: { ...a } };
    return;
  }

  // Glisser une vue agrandie la déplace (outils Sélection et Loupe).
  const lens = tool === "select" || tool === "magnify" ? hitLens(p) : null;
  if (lens) {
    selectedId = lens.id;
    checkpoint();
    drag = { mode: "pan", annot: lens, start: p, orig: { ...lens } };
    syncChrome();
    invalidate();
    return;
  }

  if (tool === "select") {
    const hit = hitAnnot(p);
    selectedId = hit?.id ?? null;
    if (hit) {
      checkpoint();
      drag = { mode: "move", annot: hit, start: p, orig: { ...hit } };
    }
    syncChrome();
    invalidate();
    return;
  }

  selectedId = null;
  const annot: Annot = { id: nextId++, kind: tool, x1: p.x, y1: p.y, x2: p.x, y2: p.y, color, size };
  if (tool === "magnify") Object.assign(annot, { zoom, dx: 0, dy: 0, focus });
  drag = { mode: "create", annot, origin: p };
  invalidate();
});

canvas.addEventListener("pointermove", (e) => {
  if (!source) return;
  const p = toImage(e);
  if (!drag) {
    updateCursor(p);
    return;
  }
  if (drag.mode === "create") {
    const q = constrain(drag.annot.kind, drag.origin, p, e.shiftKey);
    drag.annot.x2 = q.x;
    drag.annot.y2 = q.y;
  } else if (drag.mode === "move") {
    const dx = p.x - drag.start.x;
    const dy = p.y - drag.start.y;
    Object.assign(drag.annot, {
      x1: drag.orig.x1 + dx,
      y1: drag.orig.y1 + dy,
      x2: drag.orig.x2 + dx,
      y2: drag.orig.y2 + dy,
    });
    // Déplacer la zone source d'une loupe laisse la vue agrandie en place.
    if (isMagnify(drag.annot.kind)) {
      drag.annot.dx = (drag.orig.dx ?? 0) - dx;
      drag.annot.dy = (drag.orig.dy ?? 0) - dy;
    }
  } else if (drag.mode === "pan") {
    drag.annot.dx = (drag.orig.dx ?? 0) + p.x - drag.start.x;
    drag.annot.dy = (drag.orig.dy ?? 0) + p.y - drag.start.y;
  } else {
    resize(drag.annot, drag.orig, drag.handle, p, e.shiftKey);
  }
  invalidate();
});

function resize(a: Annot, o: Annot, h: Handle, p: Pt, shift: boolean): void {
  if (h.startsWith("l")) {
    // Coin de la vue agrandie : règle le zoom autour de son centre.
    const b = bounds(o);
    const r = lensRect(o);
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    setZoomOf(a, Math.max(Math.abs(p.x - cx) / (b.w / 2 || 1), Math.abs(p.y - cy) / (b.h / 2 || 1)));
    zoom = a.zoom!;
    return;
  }
  if (h === "p1" || h === "p2") {
    const anchor = h === "p1" ? { x: o.x2, y: o.y2 } : { x: o.x1, y: o.y1 };
    const q = constrain("arrow", anchor, p, shift);
    if (h === "p1") Object.assign(a, { x1: q.x, y1: q.y });
    else Object.assign(a, { x2: q.x, y2: q.y });
    return;
  }
  const b = bounds(o);
  const anchor = {
    x: h === "nw" || h === "sw" ? b.x + b.w : b.x,
    y: h === "nw" || h === "ne" ? b.y + b.h : b.y,
  };
  const q = constrain(a.kind, anchor, p, shift);
  Object.assign(a, { x1: anchor.x, y1: anchor.y, x2: q.x, y2: q.y });
  if (isMagnify(a.kind)) {
    // Redimensionner la zone source ne déplace pas la vue agrandie.
    const r = lensRect(o);
    const nb = bounds(a);
    a.dx = r.x + r.w / 2 - (nb.x + nb.w / 2);
    a.dy = r.y + r.h / 2 - (nb.y + nb.h / 2);
  }
}

const ZOOM_MIN = 1;
const ZOOM_MAX = 4;

function setZoomOf(a: Annot, z: number): void {
  a.zoom = Math.round(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z)) * 20) / 20;
}

/** Un seul point d'annulation pour une rafale de réglages (molette, curseur). */
let burst = 0;
function checkpointOnce(): void {
  if (!burst) checkpoint();
  clearTimeout(burst);
  burst = window.setTimeout(() => (burst = 0), 600);
}

/** Règle le zoom de la loupe sélectionnée (ou celui des prochaines loupes). */
function applyZoom(z: number): void {
  const a = annots.find((x) => x.id === selectedId);
  if (a && isMagnify(a.kind)) {
    checkpointOnce();
    setZoomOf(a, z);
    zoom = a.zoom!;
  } else {
    zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));
  }
  persist();
  syncChrome();
  invalidate();
}

// Molette au-dessus de la scène, loupe sélectionnée : zoom fin.
canvas.addEventListener(
  "wheel",
  (e) => {
    const a = annots.find((x) => x.id === selectedId);
    if (!source || !a || !isMagnify(a.kind)) return;
    e.preventDefault();
    applyZoom((a.zoom ?? 1) * (e.deltaY < 0 ? 1.08 : 1 / 1.08));
  },
  { passive: false },
);

canvas.addEventListener("pointerup", (e) => {
  if (!drag) return;
  canvas.releasePointerCapture(e.pointerId);
  if (drag.mode === "create") {
    const a = drag.annot;
    const big = a.kind === "arrow" ? Math.hypot(a.x2 - a.x1, a.y2 - a.y1) > 6 : bounds(a).w > 3 && bounds(a).h > 3;
    if (big) {
      checkpoint();
      annots.push(a);
      selectedId = a.id;
    }
  } else if (sameGeometry(drag.annot, drag.orig)) {
    past.pop(); // simple clic : rien à annuler
  }
  drag = null;
  syncChrome();
  invalidate();
});

function sameGeometry(a: Annot, b: Annot): boolean {
  return a.x1 === b.x1 && a.y1 === b.y1 && a.x2 === b.x2 && a.y2 === b.y2 && a.dx === b.dx && a.dy === b.dy && a.zoom === b.zoom;
}

function updateCursor(p: Pt): void {
  const h = hitHandle(p);
  let cursor = tool === "select" ? "default" : "crosshair";
  if (h) cursor = /^l?(nw|se)$/.test(h) ? "nwse-resize" : /^l?(ne|sw)$/.test(h) ? "nesw-resize" : "move";
  else if ((tool === "select" || tool === "magnify") && hitLens(p)) cursor = "grab";
  else if (tool === "select" && hitAnnot(p)) cursor = "move";
  canvas.style.cursor = cursor;
}

function deleteSelected(): void {
  if (selectedId === null) return;
  checkpoint();
  annots = annots.filter((a) => a.id !== selectedId);
  selectedId = null;
  syncChrome();
  invalidate();
}

// ───────────────────────────── Outils & options ─────────────────────────────

const rail = $("#rail");
const toolopts = $("#toolopts");
const optColors = $("#opt-colors");
const optSizes = $("#opt-sizes");

function setTool(next: Tool): void {
  tool = next;
  if (next !== "select") selectedId = null;
  persist();
  syncChrome();
  invalidate();
}

function buildToolOptions(): void {
  optColors.innerHTML = COLORS.map(
    (c) => `<button class="dot" role="radio" data-color="${c}" style="--c:${c}" aria-label="${c}"></button>`,
  ).join("");
  optSizes.innerHTML = ([1, 2, 3] as Size[])
    .map((s) => `<button class="size" role="radio" data-size="${s}" style="--t:${[2, 3.5, 5.5][s - 1]}px" aria-label="${s}"></button>`)
    .join("");
}

optColors.addEventListener("click", (e) => {
  const b = (e.target as HTMLElement).closest<HTMLElement>("[data-color]");
  if (!b) return;
  color = b.dataset.color!;
  applyToSelected({ color });
});

optSizes.addEventListener("click", (e) => {
  const b = (e.target as HTMLElement).closest<HTMLElement>("[data-size]");
  if (!b) return;
  size = Number(b.dataset.size) as Size;
  applyToSelected({ size });
});

function applyToSelected(patch: Partial<Annot>): void {
  const a = annots.find((x) => x.id === selectedId);
  if (a && !isRedaction(a.kind)) {
    checkpoint();
    Object.assign(a, patch);
  }
  persist();
  syncChrome();
  invalidate();
}

rail.addEventListener("click", (e) => {
  const b = (e.target as HTMLElement).closest<HTMLElement>("[data-tool]");
  if (b) setTool(b.dataset.tool as Tool);
});

/** Remet l'interface en phase avec l'état (boutons, options, compteurs). */
function syncChrome(): void {
  rail.querySelectorAll<HTMLElement>("[data-tool]").forEach((b) => {
    b.setAttribute("aria-pressed", String(b.dataset.tool === tool));
  });

  const selected = annots.find((a) => a.id === selectedId);
  const kind: Kind | null = selected?.kind ?? (tool === "select" ? null : tool);
  const shapeColor = selected && !isRedaction(selected.kind) ? selected.color : color;
  const shapeSize = selected && !isRedaction(selected.kind) ? selected.size : size;
  const showShape = !!kind && !isRedaction(kind);
  const showHint = !!kind && isRedaction(kind) && !selected;
  const showLens = !!kind && isMagnify(kind);
  const lensZoom = selected && isMagnify(selected.kind) ? (selected.zoom ?? 1) : zoom;
  const lensFocus = selected && isMagnify(selected.kind) ? (selected.focus ?? "none") : focus;
  $("#opt-lens").hidden = !showLens;
  $("#opt-lens-sep").hidden = !showLens;
  const zoomInput = $<HTMLInputElement>("#opt-zoom");
  zoomInput.value = String(lensZoom);
  zoomInput.style.setProperty("--p", `${((lensZoom - ZOOM_MIN) / (ZOOM_MAX - ZOOM_MIN)) * 100}%`);
  $("#opt-zoom-out").textContent = `${Math.round(lensZoom * 100)} %`;
  document.querySelectorAll<HTMLElement>("#opt-focus [data-focus]").forEach((b) => {
    b.setAttribute("aria-checked", String(b.dataset.focus === lensFocus));
  });

  toolopts.hidden = !source || (!kind && !selected);
  optColors.hidden = !showShape;
  optSizes.hidden = !showShape;
  $("#opt-size-sep").hidden = !showShape;
  $("#opt-delete-sep").hidden = !selected || !showShape;
  $("#opt-delete").hidden = !selected;
  $("#opt-hint").hidden = !showHint;
  optColors.querySelectorAll<HTMLElement>("[data-color]").forEach((b) => {
    b.setAttribute("aria-checked", String(b.dataset.color === shapeColor));
  });
  optSizes.querySelectorAll<HTMLElement>("[data-size]").forEach((b) => {
    b.setAttribute("aria-checked", String(Number(b.dataset.size) === shapeSize));
  });

  $<HTMLButtonElement>("#btn-undo").disabled = !past.length;
  $<HTMLButtonElement>("#btn-redo").disabled = !future.length;
  $<HTMLButtonElement>("#btn-copy").disabled = !source;
  $<HTMLButtonElement>("#btn-save").disabled = !source;
}

$("#opt-delete").addEventListener("click", deleteSelected);

const zoomInput = $<HTMLInputElement>("#opt-zoom");
zoomInput.min = String(ZOOM_MIN);
zoomInput.max = String(ZOOM_MAX);
zoomInput.step = "0.05";
zoomInput.addEventListener("input", () => applyZoom(Number(zoomInput.value)));

$("#opt-focus").addEventListener("click", (e) => {
  const b = (e.target as HTMLElement).closest<HTMLElement>("[data-focus]");
  if (!b) return;
  focus = b.dataset.focus as Focus;
  applyToSelected({ focus });
});
$("#btn-undo").addEventListener("click", undo);
$("#btn-redo").addEventListener("click", redo);

// ───────────────────────────── Panneau Fond ─────────────────────────────

const swWallpapers = $("#sw-wallpapers");
const swGradients = $("#sw-gradients");
const customRow = $("#custom-row");
const customFrom = $<HTMLInputElement>("#custom-from");
const customTo = $<HTMLInputElement>("#custom-to");

function buildSwatches(): void {
  const tile = (id: string, img: string, label: string) =>
    `<button class="swatch" role="radio" data-bg="${id}" style="--img:url(${img})" title="${label}" aria-label="${label}"></button>`;
  const none = `<button class="swatch swatch-none" role="radio" data-bg="none" data-i18n-title="panel.none">${icon("none")}</button>`;
  swWallpapers.innerHTML =
    none +
    backgrounds
      .filter((b) => b.kind === "wallpaper")
      .map((b) => tile(b.id, thumbnail(b), b.name[lang()]))
      .join("");
  swGradients.innerHTML = backgrounds
    .filter((b) => b.kind === "gradient")
    .map((b) => tile(b.id, thumbnail(b), b.name[lang()]))
    .join("");
  applyI18n(swWallpapers);
}

function onSwatch(e: Event): void {
  const b = (e.target as HTMLElement).closest<HTMLElement>("[data-bg]");
  if (!b) return;
  setLook({ bg: b.dataset.bg! });
}
swWallpapers.addEventListener("click", onSwatch);
swGradients.addEventListener("click", onSwatch);

customFrom.addEventListener("input", () => setLook({ bg: "custom", customFrom: customFrom.value }));
customTo.addEventListener("input", () => setLook({ bg: "custom", customTo: customTo.value }));

const sliders = [...document.querySelectorAll<HTMLElement>(".slider")];

function initSliders(): void {
  for (const s of sliders) {
    const input = s.querySelector("input")!;
    input.min = s.dataset.min!;
    input.max = s.dataset.max!;
    input.step = s.dataset.step!;
    input.addEventListener("input", () => setLook({ [s.dataset.key!]: Number(input.value) }));
  }
}

function setLook(patch: Partial<Look>): void {
  const sizeChanged = "bg" in patch || "padding" in patch;
  Object.assign(look, patch);
  persist();
  syncPanel();
  if (sizeChanged) updateMeta();
  invalidate();
}

function syncPanel(): void {
  document.querySelectorAll<HTMLElement>("[data-bg]").forEach((b) => {
    b.setAttribute("aria-checked", String(b.dataset.bg === look.bg));
  });
  customRow.classList.toggle("is-active", look.bg === "custom");
  customFrom.value = look.customFrom;
  customTo.value = look.customTo;
  const noBg = look.bg === "none";
  for (const s of sliders) {
    const key = s.dataset.key as "padding" | "radius" | "shadow";
    const input = s.querySelector("input")!;
    const value = look[key];
    input.value = String(value);
    input.disabled = noBg && key !== "radius";
    const min = Number(s.dataset.min);
    const max = Number(s.dataset.max);
    input.style.setProperty("--p", `${((value - min) / (max - min)) * 100}%`);
    s.querySelector("output")!.textContent =
      key === "radius" ? `${value}` : `${Math.round(value * Number(s.dataset.scale))} %`;
  }
  $("#nobg-note").hidden = !noBg;
}

function updateMeta(): void {
  const meta = $("#meta");
  if (!source) {
    meta.textContent = "";
    return;
  }
  const L = layout(source, look);
  meta.textContent = `${L.W} × ${L.H}`;
}

// ───────────────────────────── Copier / Enregistrer ─────────────────────────────

const toast = $("#toast");
let toastTimer = 0;

function showToast(text: string, opts: { error?: boolean; action?: { label: string; run: () => void } } = {}): void {
  clearTimeout(toastTimer);
  toast.classList.toggle("is-error", !!opts.error);
  toast.innerHTML = `${icon(opts.error ? "alert" : "check")}<span></span>`;
  toast.querySelector("span")!.textContent = text;
  if (opts.action) {
    const b = document.createElement("button");
    b.textContent = opts.action.label;
    b.addEventListener("click", opts.action.run);
    toast.append(b);
  }
  toast.classList.add("is-visible");
  toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), opts.action ? 5000 : 2600);
}

async function withButton(id: string, job: () => Promise<void>): Promise<void> {
  const btn = $<HTMLButtonElement>(id);
  if (!source || btn.classList.contains("is-busy")) return;
  btn.classList.add("is-busy");
  try {
    await job();
  } catch (err) {
    showToast(t("toast.error", { msg: String(err) }), { error: true });
  } finally {
    btn.classList.remove("is-busy");
  }
}

function copy(auto = false): Promise<void> {
  return withButton("#btn-copy", async () => {
    await copyImage(exportCanvas(source!, look, annots));
    const btn = $("#btn-copy");
    btn.classList.add("is-done");
    setTimeout(() => btn.classList.remove("is-done"), 1400);
    showToast(t(auto ? "toast.autoCopied" : "toast.copied"));
  });
}

function save(): Promise<void> {
  return withButton("#btn-save", async () => {
    const path = await savePng(exportCanvas(source!, look, annots));
    showToast(t("toast.saved"), {
      action: { label: t("toast.show"), run: () => void invoke("reveal_path", { path }) },
    });
  });
}

$("#btn-copy").addEventListener("click", () => void copy());
$("#btn-save").addEventListener("click", () => void save());

const newCapture = () => void invoke("request_capture");
$("#btn-new").addEventListener("click", newCapture);
$("#btn-capture-now").addEventListener("click", newCapture);

// ───────────────────────────── Fenêtre ─────────────────────────────

const win = getCurrentWindow();
$("#win-min").addEventListener("click", () => void win.minimize());
$("#win-max").addEventListener("click", () => void win.toggleMaximize());
$("#win-close").addEventListener("click", () => void win.hide());

// ───────────────────────────── Réglages ─────────────────────────────

const settings = $("#settings");
const settingsBtn = $("#btn-settings");

function toggleSettings(open = settings.hidden): void {
  settings.hidden = !open;
  settingsBtn.setAttribute("aria-expanded", String(open));
  if (open) void refreshSystem();
}

settingsBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  toggleSettings();
});

document.addEventListener("pointerdown", (e) => {
  if (!settings.hidden && !settings.contains(e.target as Node) && e.target !== settingsBtn) toggleSettings(false);
});

$("#lang-switch").addEventListener("click", async (e) => {
  const b = (e.target as HTMLElement).closest<HTMLElement>("[data-lang]");
  if (!b) return;
  await setLang(b.dataset.lang as Lang);
  relabel();
});

$("#sw-printscreen").addEventListener("click", () => void togglePrintscreen());
$("#btn-free-printscreen").addEventListener("click", () => void togglePrintscreen(true));

async function togglePrintscreen(force?: boolean): Promise<void> {
  const enable = force ?? !(system?.snippingOwnsPrintscreen === false);
  try {
    system = await invoke<SystemState>("set_printscreen_for_glossyshots", { enabled: enable });
    showToast(t(enable ? "toast.printscreenOn" : "toast.printscreenOff"));
  } catch (err) {
    showToast(t("toast.error", { msg: String(err) }), { error: true });
  }
  syncSystem();
}

$("#sw-autocopy").addEventListener("click", () => {
  autoCopy = !autoCopy;
  persist();
  syncSystem();
});

$("#sw-autostart").addEventListener("click", async () => {
  try {
    system = await invoke<SystemState>("set_autostart", { enabled: !system?.autostart });
  } catch (err) {
    showToast(t("toast.error", { msg: String(err) }), { error: true });
  }
  syncSystem();
});

async function refreshSystem(): Promise<void> {
  try {
    system = await invoke<SystemState>("get_system_state");
  } catch {
    system = null;
  }
  syncSystem();
}

function syncSystem(): void {
  const isWindows = system?.platform === "windows";
  const ownsKey = isWindows && system?.snippingOwnsPrintscreen !== false;
  $("#row-printscreen").hidden = !isWindows;
  $("#sw-printscreen").setAttribute("aria-checked", String(isWindows && !ownsKey));
  $("#sw-autostart").setAttribute("aria-checked", String(!!system?.autostart));
  $("#sw-autocopy").setAttribute("aria-checked", String(autoCopy));
  $("#fallback-kbd").textContent = shortcutLabel(system?.fallbackShortcut ?? "Ctrl+Shift+X");
  $("#snip-notice").hidden = !ownsKey;
  document.querySelectorAll<HTMLElement>("#lang-switch [data-lang]").forEach((b) => {
    b.setAttribute("aria-checked", String(b.dataset.lang === lang()));
  });

  const keyLabel = system?.platform === "macos" ? shortcutLabel(system.fallbackShortcut) : lang() === "fr" ? "Impr. écran" : "Print Screen";
  const body = $("#empty-body");
  const [before, after] = t("empty.body").split("{key}");
  body.textContent = before;
  const kbd = document.createElement("kbd");
  kbd.textContent = keyLabel;
  body.append(kbd, after);
}

function shortcutLabel(s: string): string {
  return lang() === "fr" ? s.replace("Shift", "Maj") : s;
}

function relabel(): void {
  applyI18n();
  buildSwatches();
  syncPanel();
  syncSystem();
}

// ───────────────────────────── Clavier ─────────────────────────────

const TOOL_KEYS: Record<string, Tool> = { v: "select", b: "blur", m: "magnify", r: "rect", o: "ellipse", a: "arrow" };

window.addEventListener("keydown", (e) => {
  const target = e.target as HTMLElement;
  if (target instanceof HTMLInputElement && target.type !== "range") return;
  const mod = e.ctrlKey || e.metaKey;
  const key = e.key.toLowerCase();

  if (mod && key === "c") {
    e.preventDefault();
    void copy();
  } else if (mod && key === "s") {
    e.preventDefault();
    void save();
  } else if (mod && key === "z" && !e.shiftKey) {
    e.preventDefault();
    undo();
  } else if (mod && (key === "y" || (key === "z" && e.shiftKey))) {
    e.preventDefault();
    redo();
  } else if (e.key === "Delete" || e.key === "Backspace") {
    deleteSelected();
  } else if (e.key === "Escape") {
    if (!settings.hidden) toggleSettings(false);
    else if (selectedId !== null) {
      selectedId = null;
      syncChrome();
      invalidate();
    }
  } else if (!mod && !e.altKey && key === "n") {
    newCapture();
  } else if (!mod && !e.altKey && TOOL_KEYS[key] && source) {
    setTool(TOOL_KEYS[key]);
  }
});

// ───────────────────────────── Chargement d'une capture ─────────────────────────────

async function loadCrop(animate: boolean): Promise<void> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await fetchShot("get_crop");
  } catch {
    return; // aucune capture encore : on reste sur l'état vide
  }
  source?.bitmap.close();
  source = new Source(bitmap);
  annots = [];
  past = [];
  future = [];
  selectedId = null;
  app.dataset.state = "editing";
  toggleSettings(false);
  updateMeta();
  syncChrome();
  fit();
  paint();
  if (animate) {
    canvas.classList.remove("is-arriving");
    void canvas.offsetWidth;
    canvas.classList.add("is-arriving");
    // Nouvelle capture : elle part tout de suite dans le presse-papiers, fond compris.
    // Une retouche ensuite se recopie avec Ctrl+C.
    if (autoCopy) void copy(true);
  }
}

new ResizeObserver(() => {
  fit();
  invalidate();
}).observe(stage);

async function main(): Promise<void> {
  await initLang();
  hydrateIcons();
  applyI18n();
  buildToolOptions();
  buildSwatches();
  initSliders();
  syncPanel();
  syncChrome();
  await refreshSystem();
  await listen("editor:capture", () => void loadCrop(true));
  await loadCrop(false);
}

void main();
