/**
 * Rendu de la composition : fond → ombre → capture arrondie → masquages → annotations.
 * Une seule fonction sert à l'affichage (réduit) et à l'export (pleine résolution).
 */
import { backgrounds, customGradient, type Background } from "./backgrounds";

export type Kind = "blur" | "pixelate" | "rect" | "ellipse" | "arrow";
export type Size = 1 | 2 | 3;

export interface Annot {
  id: number;
  kind: Kind;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  size: Size;
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

export const isRedaction = (k: Kind) => k === "blur" || k === "pixelate";

/** Image source et ses versions masquées, calculées une seule fois à la demande. */
export class Source {
  readonly w: number;
  readonly h: number;
  private blurred?: HTMLCanvasElement;
  private pixelated?: HTMLCanvasElement;

  constructor(readonly bitmap: ImageBitmap) {
    this.w = bitmap.width;
    this.h = bitmap.height;
  }

  /** Unité visuelle : épaisseurs et rayons restent proportionnés à la capture. */
  get unit(): number {
    return Math.max(1, Math.max(this.w, this.h) / 1400);
  }

  blur(): HTMLCanvasElement {
    if (!this.blurred) {
      // Réduction en cascade : flou doux, irréversible, sans halo transparent sur les bords.
      const f = Math.min(22, Math.max(10, Math.round(Math.max(this.w, this.h) / 140)));
      const tiny = scaled(this.bitmap, Math.ceil(this.w / f), Math.ceil(this.h / f), true);
      const mid = scaled(tiny, Math.ceil((this.w / f) * 3), Math.ceil((this.h / f) * 3), true);
      this.blurred = scaled(mid, this.w, this.h, true);
    }
    return this.blurred;
  }

  pixelate(): HTMLCanvasElement {
    if (!this.pixelated) {
      const block = Math.min(28, Math.max(9, Math.round(Math.max(this.w, this.h) / 90)));
      const tiny = scaled(this.bitmap, Math.ceil(this.w / block), Math.ceil(this.h / block), true);
      this.pixelated = scaled(tiny, Math.ceil(this.w / block) * block, Math.ceil(this.h / block) * block, false);
    }
    return this.pixelated;
  }
}

function scaled(src: CanvasImageSource, w: number, h: number, smooth: boolean): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = Math.max(1, w);
  c.height = Math.max(1, h);
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingEnabled = smooth;
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

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(pad, pad, src.w, src.h, radius);
  ctx.clip();
  ctx.drawImage(src.bitmap, pad, pad);
  for (const a of annots) {
    if (!isRedaction(a.kind)) continue;
    const b = bounds(a);
    const x = Math.max(0, Math.floor(b.x));
    const y = Math.max(0, Math.floor(b.y));
    const w = Math.min(src.w, Math.ceil(b.x + b.w)) - x;
    const h = Math.min(src.h, Math.ceil(b.y + b.h)) - y;
    if (w <= 0 || h <= 0) continue;
    const layer = a.kind === "blur" ? src.blur() : src.pixelate();
    ctx.drawImage(layer, x, y, w, h, pad + x, pad + y, w, h);
  }
  ctx.restore();

  for (const a of annots) {
    if (!isRedaction(a.kind)) drawShape(ctx, a, src.unit, pad, device);
  }
  return L;
}

export function strokeWidth(a: Annot, unit: number): number {
  return [3, 5, 8][a.size - 1] * unit;
}

function drawShape(ctx: CanvasRenderingContext2D, a: Annot, unit: number, pad: number, device: number): void {
  const lw = strokeWidth(a, unit);
  ctx.save();
  ctx.translate(pad, pad);
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
