/**
 * Rendu de la composition : fond → ombre → capture arrondie → masquages → mise au point → formes → loupes.
 * Une seule fonction sert à l'affichage (réduit) et à l'export (pleine résolution).
 */
import { backgrounds, customGradient, type Background } from "./backgrounds";
import { secureFill, type Rect } from "./redact";

export type Kind = "blur" | "magnify" | "rect" | "ellipse" | "arrow";
export type Size = 1 | 2 | 3;
export type Focus = "none" | "dim" | "blur";

export interface Annot {
  id: number;
  kind: Kind;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  size: Size;
  /** Loupe : facteur d'agrandissement (1 → 3). */
  zoom?: number;
  /** Loupe : décalage du centre de la vue agrandie par rapport à la zone source (px image). */
  dx?: number;
  dy?: number;
  /** Loupe : traitement du reste de l'image. */
  focus?: Focus;
}

export interface Look {
  bg: string; // "none" | id de fond | "custom"
  padding: number; // 0 → 0.3 (fraction de la taille moyenne de la capture)
  radius: number; // 0 → 40
  shadow: number; // 0 → 1
  customFrom: string;
  customTo: string;
}

export const defaultLook: Look = {
  bg: "bloom",
  padding: 0.09,
  radius: 14,
  shadow: 0.6,
  customFrom: "#ff9a76",
  customTo: "#6a4bd6",
};

export const isRedaction = (k: Kind) => k === "blur";
export const isMagnify = (k: Kind) => k === "magnify";

/** Image source, ses pixels et les calques dérivés (mis en cache). */
export class Source {
  readonly w: number;
  readonly h: number;
  private px?: ImageData;
  private patches = new Map<string, HTMLCanvasElement>();
  private soft?: { key: string; canvas: HTMLCanvasElement };

  constructor(readonly bitmap: ImageBitmap) {
    this.w = bitmap.width;
    this.h = bitmap.height;
  }

  /** Unité visuelle : épaisseurs et rayons restent proportionnés à la capture. */
  get unit(): number {
    return Math.max(1, Math.max(this.w, this.h) / 1400);
  }

  private pixels(): ImageData {
    if (!this.px) {
      const c = document.createElement("canvas");
      c.width = this.w;
      c.height = this.h;
      const ctx = c.getContext("2d", { willReadFrequently: true })!;
      ctx.drawImage(this.bitmap, 0, 0);
      this.px = ctx.getImageData(0, 0, this.w, this.h);
    }
    return this.px;
  }

  /** Remplissage sécurisé d'une zone masquée (voir `redact.ts`). */
  patch(r: Rect, seed: number): HTMLCanvasElement {
    const key = `${seed}:${r.x},${r.y},${r.w},${r.h}`;
    let p = this.patches.get(key);
    if (!p) {
      p = secureFill(this.pixels(), r, seed);
      this.patches.set(key, p);
      if (this.patches.size > 48) this.patches.delete(this.patches.keys().next().value!);
    }
    return p;
  }

  /**
   * Version adoucie de la capture DÉJÀ MASQUÉE, pour l'effet « mise au point » des loupes.
   * Calculée à partir des pixels masqués : elle ne révèle jamais une zone floutée.
   */
  softened(annots: readonly Annot[]): HTMLCanvasElement {
    const key = redactions(this, annots)
      .map(([r, id]) => `${id}:${r.x},${r.y},${r.w},${r.h}`)
      .join("|");
    if (this.soft?.key !== key) {
      const base = document.createElement("canvas");
      base.width = this.w;
      base.height = this.h;
      drawImageLayer(base.getContext("2d")!, this, annots);
      const f = Math.min(14, Math.max(5, Math.round(Math.max(this.w, this.h) / 260)));
      const tiny = scaled(base, Math.ceil(this.w / f), Math.ceil(this.h / f));
      const mid = scaled(tiny, Math.ceil((this.w / f) * 3), Math.ceil((this.h / f) * 3));
      this.soft = { key, canvas: scaled(mid, this.w, this.h) };
    }
    return this.soft.canvas;
  }
}

function scaled(src: CanvasImageSource, w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = Math.max(1, w);
  c.height = Math.max(1, h);
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src, 0, 0, c.width, c.height);
  return c;
}

export interface Layout {
  W: number;
  H: number;
  pad: number;
  radius: number;
  bg: Background | null;
}

export function layout(src: Source, look: Look): Layout {
  const bg =
    look.bg === "none"
      ? null
      : look.bg === "custom"
        ? customGradient(look.customFrom, look.customTo)
        : (backgrounds.find((b) => b.id === look.bg) ?? backgrounds[0]);
  const pad = bg ? Math.round(look.padding * ((src.w + src.h) / 2)) : 0;
  const radius = Math.min(look.radius * src.unit, src.w / 2, src.h / 2);
  return { W: src.w + pad * 2, H: src.h + pad * 2, pad, radius, bg };
}

export function bounds(a: Annot) {
  return {
    x: Math.min(a.x1, a.x2),
    y: Math.min(a.y1, a.y2),
    w: Math.abs(a.x2 - a.x1),
    h: Math.abs(a.y2 - a.y1),
  };
}

/** Rectangle de la vue agrandie d'une loupe (px image). */
export function lensRect(a: Annot) {
  const b = bounds(a);
  const z = a.zoom ?? 1;
  const w = b.w * z;
  const h = b.h * z;
  const cx = b.x + b.w / 2 + (a.dx ?? 0);
  const cy = b.y + b.h / 2 + (a.dy ?? 0);
  return { x: cx - w / 2, y: cy - h / 2, w, h };
}

/** Zones masquées, recadrées sur l'image et alignées au pixel (aucun liseré de contenu). */
function redactions(src: Source, annots: readonly Annot[]): [Rect, number][] {
  const out: [Rect, number][] = [];
  for (const a of annots) {
    if (!isRedaction(a.kind)) continue;
    const b = bounds(a);
    const x = Math.max(0, Math.floor(b.x));
    const y = Math.max(0, Math.floor(b.y));
    const w = Math.min(src.w, Math.ceil(b.x + b.w)) - x;
    const h = Math.min(src.h, Math.ceil(b.y + b.h)) - y;
    if (w > 0 && h > 0) out.push([{ x, y, w, h }, a.id]);
  }
  return out;
}

/** Capture + masquages, en coordonnées image. */
function drawImageLayer(ctx: CanvasRenderingContext2D, src: Source, annots: readonly Annot[]): void {
  ctx.drawImage(src.bitmap, 0, 0);
  for (const [r, id] of redactions(src, annots)) ctx.drawImage(src.patch(r, id), r.x, r.y, r.w, r.h);
}

function drawShapes(ctx: CanvasRenderingContext2D, src: Source, annots: readonly Annot[], device: number): void {
  for (const a of annots) {
    if (!isRedaction(a.kind) && !isMagnify(a.kind)) drawShape(ctx, a, src.unit, device);
  }
}

/** Effet le plus marqué demandé par les loupes présentes. */
function focusOf(annots: readonly Annot[]): Focus {
  let f: Focus = "none";
  for (const a of annots) {
    if (!isMagnify(a.kind)) continue;
    if (a.focus === "blur") return "blur";
    if (a.focus === "dim") f = "dim";
  }
  return f;
}

/**
 * Dessine la composition dans `ctx`, déjà transformé en unités « pixels de composition ».
 * `device` = pixels écran par pixel de composition (les ombres canvas ignorent la transformation).
 */
export function render(
  ctx: CanvasRenderingContext2D,
  src: Source,
  look: Look,
  annots: readonly Annot[],
  device: number,
): Layout {
  const L = layout(src, look);
  const { pad, radius } = L;

  if (L.bg) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, L.W, L.H);
    ctx.clip();
    L.bg.paint(ctx, L.W, L.H);
    ctx.restore();

    if (look.shadow > 0) {
      const m = (src.w + src.h) / 2;
      const s = look.shadow;
      // Deux ombres : une ambiante large, une de contact serrée.
      for (const [blur, dy, alpha] of [
        [0.07 * m * s, 0.03 * m * s, 0.42 * s],
        [0.012 * m, 0.004 * m, 0.22 * s],
      ]) {
        ctx.save();
        ctx.shadowColor = `rgba(12, 14, 30, ${alpha})`;
        ctx.shadowBlur = blur * device;
        ctx.shadowOffsetY = dy * device;
        ctx.fillStyle = "#808080";
        ctx.beginPath();
        ctx.roundRect(pad, pad, src.w, src.h, radius);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  const focus = focusOf(annots);
  ctx.save();
  ctx.translate(pad, pad);

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(0, 0, src.w, src.h, radius);
  ctx.clip();
  if (focus === "blur") ctx.drawImage(src.softened(annots), 0, 0);
  else drawImageLayer(ctx, src, annots);
  if (focus !== "none") {
    ctx.fillStyle = focus === "dim" ? "rgba(10, 12, 22, 0.42)" : "rgba(10, 12, 22, 0.16)";
    ctx.fillRect(0, 0, src.w, src.h);
  }
  ctx.restore();

  drawShapes(ctx, src, annots, device);
  for (const a of annots) if (isMagnify(a.kind)) drawLens(ctx, src, a, annots, device);

  ctx.restore();
  return L;
}

/** Loupe : la zone source, nette, agrandie, posée au-dessus de l'image avec une ombre. */
function drawLens(ctx: CanvasRenderingContext2D, src: Source, a: Annot, annots: readonly Annot[], device: number): void {
  const b = bounds(a);
  if (b.w < 2 || b.h < 2) return;
  const r = lensRect(a);
  const z = a.zoom ?? 1;
  const u = src.unit;
  const corner = Math.min(10 * u, r.w / 4, r.h / 4);
  const border = strokeWidth(a, u);

  for (const [blur, dy, alpha] of [
    [34 * u, 14 * u, 0.42],
    [6 * u, 2 * u, 0.25],
  ]) {
    ctx.save();
    ctx.shadowColor = `rgba(8, 10, 24, ${alpha})`;
    ctx.shadowBlur = blur * device;
    ctx.shadowOffsetY = dy * device;
    ctx.fillStyle = "#808080";
    ctx.beginPath();
    ctx.roundRect(r.x, r.y, r.w, r.h, corner);
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(r.x, r.y, r.w, r.h, corner);
  ctx.clip();
  ctx.translate(r.x, r.y);
  ctx.scale(z, z);
  ctx.translate(-b.x, -b.y);
  ctx.imageSmoothingQuality = "high";
  drawImageLayer(ctx, src, annots);
  drawShapes(ctx, src, annots, device * z);
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = a.color;
  ctx.lineWidth = border;
  ctx.beginPath();
  ctx.roundRect(r.x - border / 2, r.y - border / 2, r.w + border, r.h + border, corner + border / 2);
  ctx.stroke();
  ctx.restore();
}

export function strokeWidth(a: Annot, unit: number): number {
  return [3, 5, 8][a.size - 1] * unit;
}

function drawShape(ctx: CanvasRenderingContext2D, a: Annot, unit: number, device: number): void {
  const lw = strokeWidth(a, unit);
  ctx.save();
  ctx.strokeStyle = a.color;
  ctx.fillStyle = a.color;
  ctx.lineWidth = lw;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowColor = "rgba(0, 0, 0, 0.28)";
  ctx.shadowBlur = 5 * unit * device;
  ctx.shadowOffsetY = 1.5 * unit * device;

  const b = bounds(a);
  ctx.beginPath();
  if (a.kind === "rect") {
    ctx.roundRect(b.x, b.y, b.w, b.h, Math.min(8 * unit, b.w / 2, b.h / 2));
    ctx.stroke();
  } else if (a.kind === "ellipse") {
    ctx.ellipse(b.x + b.w / 2, b.y + b.h / 2, b.w / 2, b.h / 2, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (a.kind === "arrow") {
    drawArrow(ctx, a, lw);
  }
  ctx.restore();
}

function drawArrow(ctx: CanvasRenderingContext2D, a: Annot, lw: number): void {
  const dx = a.x2 - a.x1;
  const dy = a.y2 - a.y1;
  const len = Math.hypot(dx, dy);
  if (len < 1) return;
  const ux = dx / len;
  const uy = dy / len;
  const head = Math.min(len * 0.6, Math.max(lw * 3.4, 14));
  const half = head * 0.5;
  const bx = a.x2 - ux * head;
  const by = a.y2 - uy * head;

  ctx.moveTo(a.x1, a.y1);
  ctx.lineTo(bx + ux * lw * 0.5, by + uy * lw * 0.5);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(a.x2, a.y2);
  ctx.lineTo(bx - uy * half, by + ux * half);
  ctx.lineTo(bx + uy * half, by - ux * half);
  ctx.closePath();
  ctx.lineWidth = lw * 0.6;
  ctx.fill();
  ctx.stroke();
}

/** Composition pleine résolution, prête pour le presse-papiers ou le PNG. */
export function exportCanvas(src: Source, look: Look, annots: readonly Annot[]): HTMLCanvasElement {
  const L = layout(src, look);
  const c = document.createElement("canvas");
  c.width = L.W;
  c.height = L.H;
  render(c.getContext("2d")!, src, look, annots, 1);
  return c;
}
