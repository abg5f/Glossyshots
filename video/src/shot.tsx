/**
 * Pont entre Remotion et le vrai moteur de rendu de Glossyshots (`src/editor/render.ts`) :
 * ce que montre la vidéo est exactement ce que produit l'application.
 */
import React, { useLayoutEffect, useRef, useState } from "react";
import { continueRender, delayRender } from "remotion";
import { fakeScreenshot } from "../../dev/fake-screenshot";
import { layout, render, Source, type Annot, type Look } from "../../src/editor/render";
import type { Lang } from "./copy";

export type { Annot, Look };
export { defaultLook } from "../../src/editor/render";

const cache = new Map<Lang, Promise<Source>>();

function loadSource(lang: Lang): Promise<Source> {
  if (!cache.has(lang)) {
    cache.set(lang, createImageBitmap(fakeScreenshot(lang)).then((b) => new Source(b)));
  }
  return cache.get(lang)!;
}

export function useSource(lang: Lang): Source | null {
  const [source, setSource] = useState<Source | null>(null);
  const [handle] = useState(() => delayRender("capture factice"));
  React.useEffect(() => {
    loadSource(lang).then((s) => {
      setSource(s);
      continueRender(handle);
    });
  }, [lang, handle]);
  return source;
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Placement de la composition dans `box`, l'échelle étant figée sur `fit` (pas de saut quand la marge grandit). */
export function place(source: Source, look: Look, fit: Look, box: Box) {
  const L = layout(source, look);
  const F = layout(source, fit);
  const scale = Math.min(box.w / F.W, box.h / F.H);
  const ox = box.x + (box.w - L.W * scale) / 2;
  const oy = box.y + (box.h - L.H * scale) / 2;
  return {
    scale,
    ox,
    oy,
    L,
    /** Point de la capture (pixels image) → coordonnées vidéo. */
    at: (x: number, y: number) => ({ x: ox + (L.pad + x) * scale, y: oy + (L.pad + y) * scale }),
  };
}

export const ShotCanvas: React.FC<{
  source: Source;
  look: Look;
  fit: Look;
  box: Box;
  annots?: Annot[];
  /** Fond suivant en fondu enchaîné (0 → 1). */
  next?: { look: Look; t: number };
  style?: React.CSSProperties;
}> = ({ source, look, fit, box, annots = [], next, style }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const spare = useRef<HTMLCanvasElement | null>(null);
  useLayoutEffect(() => {
    const draw = (target: HTMLCanvasElement, l: Look) => {
      const ctx = target.getContext("2d")!;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, 1920, 1080);
      const p = place(source, l, fit, box);
      ctx.setTransform(p.scale, 0, 0, p.scale, p.ox, p.oy);
      ctx.imageSmoothingQuality = "high";
      render(ctx, source, l, annots, p.scale);
      return p;
    };
    const main = ref.current!;
    const p = draw(main, look);
    if (next && next.t > 0) {
      // Fondu du fond seulement : la capture elle-même ne doit jamais devenir translucide.
      spare.current ??= Object.assign(document.createElement("canvas"), { width: 1920, height: 1080 });
      draw(spare.current, next.look);
      const ctx = main.getContext("2d")!;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.beginPath();
      ctx.rect(0, 0, 1920, 1080);
      const r = p.L.radius * p.scale;
      const tl = p.at(0, 0);
      ctx.roundRect(tl.x, tl.y, source.w * p.scale, source.h * p.scale, r);
      ctx.clip("evenodd");
      ctx.globalAlpha = next.t;
      ctx.drawImage(spare.current, 0, 0);
      ctx.restore();
    }
  });
  return (
    <canvas
      ref={ref}
      width={1920}
      height={1080}
      style={{ position: "absolute", inset: 0, width: 1920, height: 1080, ...style }}
    />
  );
};
