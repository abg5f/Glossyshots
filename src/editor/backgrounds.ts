/**
 * Fonds générés (aucune image embarquée : zéro poids, zéro droit d'auteur, net à toute taille).
 * « Fonds d'écran » : dégradés maillés, taches de lumière superposées façon Bloom.
 * « Dégradés » : linéaires à deux ou trois arrêts.
 */

export type BackgroundId = string;

export interface Background {
  id: BackgroundId;
  kind: "wallpaper" | "gradient" | "custom";
  name: { fr: string; en: string };
  paint(ctx: CanvasRenderingContext2D, w: number, h: number): void;
}

interface Blob {
  x: number;
  y: number;
  r: number;
  color: string;
}

function mesh(base: [string, string], blobs: Blob[]) {
  return (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, base[0]);
    g.addColorStop(1, base[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    const m = Math.max(w, h);
    for (const b of blobs) {
      const cx = b.x * w;
      const cy = b.y * h;
      const r = b.r * m;
      const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      rg.addColorStop(0, b.color);
      rg.addColorStop(1, transparent(b.color));
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, w, h);
    }
  };
}

/** Même teinte, alpha nul : évite le gris sale d'un dégradé vers `transparent`. */
function transparent(hex: string): string {
  return `${hex.slice(0, 7)}00`;
}

function linear(stops: string[], angle = 135) {
  return (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const a = (angle * Math.PI) / 180;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    const half = (Math.abs(w * dx) + Math.abs(h * dy)) / 2;
    const g = ctx.createLinearGradient(w / 2 - dx * half, h / 2 - dy * half, w / 2 + dx * half, h / 2 + dy * half);
    stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  };
}

export const backgrounds: Background[] = [
  {
    id: "bloom",
    kind: "wallpaper",
    name: { fr: "Éclosion", en: "Bloom" },
    paint: mesh(["#0b2a8a", "#2f7bf5"], [
      { x: 0.72, y: 0.38, r: 0.55, color: "#7fb2ffcc" },
      { x: 0.55, y: 0.62, r: 0.38, color: "#c7dcffb0" },
      { x: 0.12, y: 0.9, r: 0.5, color: "#1a3fc4ee" },
      { x: 0.92, y: 0.05, r: 0.35, color: "#a8c4ff90" },
    ]),
  },
  {
    id: "dusk",
    kind: "wallpaper",
    name: { fr: "Crépuscule", en: "Dusk" },
    paint: mesh(["#2a1052", "#ff7a59"], [
      { x: 0.2, y: 0.2, r: 0.6, color: "#5b2bb5cc" },
      { x: 0.85, y: 0.75, r: 0.55, color: "#ffb38add" },
      { x: 0.55, y: 0.5, r: 0.35, color: "#ff5e8a99" },
    ]),
  },
  {
    id: "lagoon",
    kind: "wallpaper",
    name: { fr: "Lagon", en: "Lagoon" },
    paint: mesh(["#063a4a", "#18b8a8"], [
      { x: 0.8, y: 0.2, r: 0.5, color: "#7ff0d8bb" },
      { x: 0.15, y: 0.75, r: 0.55, color: "#0a5f8fdd" },
      { x: 0.6, y: 0.85, r: 0.35, color: "#b8fff099" },
    ]),
  },
  {
    id: "orchid",
    kind: "wallpaper",
    name: { fr: "Orchidée", en: "Orchid" },
    paint: mesh(["#3b0b5c", "#d94fb0"], [
      { x: 0.25, y: 0.3, r: 0.5, color: "#8a3cf0cc" },
      { x: 0.8, y: 0.65, r: 0.5, color: "#ff9bd5bb" },
      { x: 0.5, y: 0.05, r: 0.3, color: "#ffd1f088" },
    ]),
  },
  {
    id: "dune",
    kind: "wallpaper",
    name: { fr: "Dune", en: "Dune" },
    paint: mesh(["#f3d9b8", "#e9a77c"], [
      { x: 0.2, y: 0.25, r: 0.55, color: "#fff2e0dd" },
      { x: 0.85, y: 0.8, r: 0.5, color: "#d9825fbb" },
      { x: 0.65, y: 0.3, r: 0.3, color: "#ffd2a8aa" },
    ]),
  },
  {
    id: "night",
    kind: "wallpaper",
    name: { fr: "Nuit", en: "Night" },
    paint: mesh(["#070a1f", "#1b1747"], [
      { x: 0.78, y: 0.28, r: 0.45, color: "#5a3ee0aa" },
      { x: 0.2, y: 0.8, r: 0.45, color: "#1e7ae088" },
      { x: 0.5, y: 0.5, r: 0.25, color: "#c08cff55" },
    ]),
  },
  {
    id: "mint",
    kind: "wallpaper",
    name: { fr: "Menthe", en: "Mint" },
    paint: mesh(["#d8f5e4", "#7fd3b0"], [
      { x: 0.15, y: 0.2, r: 0.5, color: "#ffffffcc" },
      { x: 0.85, y: 0.8, r: 0.5, color: "#3fb68acc" },
      { x: 0.7, y: 0.25, r: 0.3, color: "#c8f7a8aa" },
    ]),
  },
  {
    id: "mist",
    kind: "wallpaper",
    name: { fr: "Brume", en: "Mist" },
    paint: mesh(["#dfe6f2", "#b9c6dd"], [
      { x: 0.8, y: 0.2, r: 0.55, color: "#f6f8fcdd" },
      { x: 0.2, y: 0.85, r: 0.5, color: "#a5b4d6bb" },
      { x: 0.45, y: 0.45, r: 0.3, color: "#e8dcf5aa" },
    ]),
  },

  { id: "peach", kind: "gradient", name: { fr: "Pêche", en: "Peach" }, paint: linear(["#ffd3a5", "#fd6585"]) },
  { id: "citrus", kind: "gradient", name: { fr: "Agrume", en: "Citrus" }, paint: linear(["#f6d365", "#fda085"]) },
  { id: "lavender", kind: "gradient", name: { fr: "Lavande", en: "Lavender" }, paint: linear(["#a18cd1", "#fbc2eb"]) },
  { id: "sky", kind: "gradient", name: { fr: "Ciel", en: "Sky" }, paint: linear(["#89f7fe", "#66a6ff"]) },
  { id: "ocean", kind: "gradient", name: { fr: "Océan", en: "Ocean" }, paint: linear(["#2b5876", "#4e4376"]) },
  { id: "forest", kind: "gradient", name: { fr: "Forêt", en: "Forest" }, paint: linear(["#134e5e", "#71b280"]) },
  { id: "ruby", kind: "gradient", name: { fr: "Rubis", en: "Ruby" }, paint: linear(["#ee0979", "#ff6a00"]) },
  { id: "aurora", kind: "gradient", name: { fr: "Aurore", en: "Aurora" }, paint: linear(["#00c6fb", "#005bea", "#7b2ff7"]) },
  { id: "glacier", kind: "gradient", name: { fr: "Glacier", en: "Glacier" }, paint: linear(["#e0eafc", "#cfdef3"]) },
  { id: "slate", kind: "gradient", name: { fr: "Ardoise", en: "Slate" }, paint: linear(["#3a3f4b", "#16181d"]) },
];

export function customGradient(from: string, to: string): Background {
  return {
    id: "custom",
    kind: "custom",
    name: { fr: "Perso", en: "Custom" },
    paint: linear([from, to]),
  };
}

/** Vignette rendue une fois (même code que l'export : ce qu'on voit est ce qu'on obtient). */
export function thumbnail(bg: Background, w = 112, h = 76): string {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  bg.paint(c.getContext("2d")!, w, h);
  return c.toDataURL("image/png");
}
