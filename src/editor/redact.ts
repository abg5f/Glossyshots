/**
 * Flou sécurisé.
 *
 * Un flou classique (gaussien, réduction/agrandissement, pixelisation) calcule chaque pixel
 * masqué à partir des pixels cachés : c'est ce qui le rend attaquable (déconvolution,
 * comparaison avec des rendus de texte connus, réseaux de « dé-floutage »).
 *
 * Ici, la zone masquée n'utilise JAMAIS ses propres pixels. Le remplissage est construit
 * uniquement à partir :
 *   1. d'une fine bande de pixels situés juste À L'EXTÉRIEUR du rectangle (pour se fondre
 *      dans l'image), interpolée sur toute la surface (patch de Coons) ;
 *   2. de fausses lignes de texte floues, tirées au hasard (graine = identifiant de
 *      l'annotation, aucun lien avec le contenu) ;
 *   3. d'un grain de bruit.
 * Il n'existe donc aucune information sur le contenu caché à retrouver dans l'export.
 */

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

type RGB = [number, number, number];

const BAND = 3; // épaisseur de la bande échantillonnée hors du rectangle
const CELL = 8; // résolution de la grille d'interpolation (px)
const NEUTRAL: RGB = [128, 128, 132];

/** Générateur pseudo-aléatoire déterministe (mulberry32) : stable pendant l'édition. */
function rng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Moyenne d'un bloc de pixels ; `null` s'il sort de l'image. */
function average(px: ImageData, x0: number, y0: number, x1: number, y1: number): RGB | null {
  if (x0 < 0 || y0 < 0 || x1 > px.width || y1 > px.height || x1 <= x0 || y1 <= y0) return null;
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  const d = px.data;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * px.width + x) * 4;
      r += d[i];
      g += d[i + 1];
      b += d[i + 2];
      n++;
    }
  }
  return [r / n, g / n, b / n];
}

/** Profil de couleurs le long d'un bord extérieur, `n` points. */
function edge(px: ImageData, r: Rect, side: "top" | "bottom" | "left" | "right", n: number): RGB[] | null {
  const out: RGB[] = [];
  for (let i = 0; i < n; i++) {
    const a = i / n;
    const b = (i + 1) / n;
    let c: RGB | null;
    if (side === "top" || side === "bottom") {
      const x0 = Math.floor(r.x + a * r.w);
      const x1 = Math.max(x0 + 1, Math.ceil(r.x + b * r.w));
      const y0 = side === "top" ? r.y - BAND : r.y + r.h;
      c = average(px, x0, y0, x1, y0 + BAND);
    } else {
      const y0 = Math.floor(r.y + a * r.h);
      const y1 = Math.max(y0 + 1, Math.ceil(r.y + b * r.h));
      const x0 = side === "left" ? r.x - BAND : r.x + r.w;
      c = average(px, x0, y0, x0 + BAND, y1);
    }
    if (!c) return null;
    out.push(c);
  }
  return out;
}

const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

let grain: HTMLCanvasElement | null = null;

/** Tuile de bruit indépendante de toute image. */
function grainTile(): HTMLCanvasElement {
  if (grain) return grain;
  grain = document.createElement("canvas");
  grain.width = grain.height = 96;
  const g = grain.getContext("2d")!;
  const img = g.createImageData(96, 96);
  const rand = rng(0x5eed);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = rand() * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return grain;
}

/**
 * Construit le remplissage d'une zone masquée. `px` est l'image complète ;
 * seuls les pixels hors de `r` sont lus.
 */
export function secureFill(px: ImageData, r: Rect, seed: number): HTMLCanvasElement {
  const gw = Math.max(2, Math.ceil(r.w / CELL));
  const gh = Math.max(2, Math.ceil(r.h / CELL));
  let top = edge(px, r, "top", gw);
  let bottom = edge(px, r, "bottom", gw);
  let left = edge(px, r, "left", gh);
  let right = edge(px, r, "right", gh);

  // Bords collés au cadre de l'image : on les remplace par la moyenne des bords valides.
  const valid = [top, bottom, left, right].filter((e): e is RGB[] => !!e).flat();
  const fallback: RGB = valid.length
    ? [0, 1, 2].map((k) => valid.reduce((s, c) => s + c[k], 0) / valid.length) as RGB
    : NEUTRAL;
  top ??= Array(gw).fill(fallback);
  bottom ??= Array(gw).fill(fallback);
  left ??= Array(gh).fill(fallback);
  right ??= Array(gh).fill(fallback);

  // Patch de Coons : interpolation lisse entre les quatre bords.
  const c00 = mix(top[0], left[0], 0.5);
  const c10 = mix(top[gw - 1], right[0], 0.5);
  const c01 = mix(bottom[0], left[gh - 1], 0.5);
  const c11 = mix(bottom[gw - 1], right[gh - 1], 0.5);
  const small = document.createElement("canvas");
  small.width = gw;
  small.height = gh;
  const sctx = small.getContext("2d")!;
  const img = sctx.createImageData(gw, gh);
  let lum = 0;
  for (let j = 0; j < gh; j++) {
    const v = gh === 1 ? 0 : j / (gh - 1);
    for (let i = 0; i < gw; i++) {
      const u = gw === 1 ? 0 : i / (gw - 1);
      const o = (j * gw + i) * 4;
      for (let k = 0; k < 3; k++) {
        const val =
          (1 - v) * top[i][k] + v * bottom[i][k] + (1 - u) * left[j][k] + u * right[j][k] -
          ((1 - u) * (1 - v) * c00[k] + u * (1 - v) * c10[k] + (1 - u) * v * c01[k] + u * v * c11[k]);
        img.data[o + k] = val;
      }
      img.data[o + 3] = 255;
      lum += 0.2126 * img.data[o] + 0.7152 * img.data[o + 1] + 0.0722 * img.data[o + 2];
    }
  }
  sctx.putImageData(img, 0, 0);
  lum /= gw * gh * 255;

  const out = document.createElement("canvas");
  out.width = Math.max(1, Math.round(r.w));
  out.height = Math.max(1, Math.round(r.h));
  const ctx = out.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(small, 0, 0, out.width, out.height);

  // Fausses lignes de texte, très floues : on voit qu'il y avait « quelque chose »,
  // sans que cela dépende du contenu réel.
  const rand = rng(seed * 2654435761);
  const lines = Math.max(1, Math.min(12, Math.round(r.h / 26)));
  const k = 6; // facteur de flou des lignes
  const lw = Math.max(2, Math.ceil(out.width / k));
  const lh = Math.max(2, Math.ceil(out.height / k));
  const layer = document.createElement("canvas");
  layer.width = lw;
  layer.height = lh;
  const lctx = layer.getContext("2d")!;
  lctx.fillStyle = lum > 0.5 ? "rgba(20, 22, 30, 0.34)" : "rgba(245, 246, 250, 0.3)";
  const step = lh / lines;
  for (let i = 0; i < lines; i++) {
    const len = (i === lines - 1 && lines > 1 ? 0.3 + rand() * 0.35 : 0.55 + rand() * 0.4) * lw;
    const x = (0.04 + rand() * 0.05) * lw;
    const h = Math.max(1, step * 0.42);
    lctx.beginPath();
    lctx.roundRect(x, i * step + (step - h) / 2, Math.min(len, lw - x), h, h / 2);
    lctx.fill();
  }
  ctx.drawImage(layer, 0, 0, out.width, out.height);

  // Grain : casse les aplats et achève de rendre l'effet « dépoli ».
  ctx.globalAlpha = 0.07;
  ctx.globalCompositeOperation = "overlay";
  ctx.fillStyle = ctx.createPattern(grainTile(), "repeat")!;
  ctx.fillRect(0, 0, out.width, out.height);
  return out;
}
