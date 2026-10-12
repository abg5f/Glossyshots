/**
 * Clicadre : vidéo de présentation (≈35 s, 1920×1080, 30 i/s).
 * Accroche → capture brute → Impr. écran → flou & cercle → fonds → avant/après → atouts → fin.
 */
import React from "react";
import { AbsoluteFill, Audio, Easing, Img, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { backgrounds, thumbnail } from "../../src/editor/backgrounds";
import { icon, type IconName } from "../../src/lib/icons";
import { copy, type Lang } from "./copy";
import { ShotCanvas, defaultLook, place, useSource, type Annot, type Box, type Look } from "./shot";

// ───────────────────────────── Thème ─────────────────────────────

const C = {
  bg: "#131418",
  surface: "#1b1c21",
  surface2: "#23252b",
  line: "#2c2e35",
  text: "#eef0f4",
  text2: "#a9adb8",
  text3: "#7c818d",
  accent: "#f2795a",
  onAccent: "#2a1510",
  danger: "#ff5a5f",
};
const FONT = '"Segoe UI Variable Display", "Segoe UI", system-ui, sans-serif';
const MONO = '"Cascadia Mono", Consolas, monospace';

const out = Easing.bezier(0.22, 1, 0.36, 1);
const inOut = Easing.bezier(0.65, 0, 0.35, 1);

function io(f: number, range: [number, number], to: [number, number], ease = out) {
  return interpolate(f, range, to, { easing: ease, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
}

const lerpBox = (a: Box, b: Box, t: number): Box => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
  w: a.w + (b.w - a.w) * t,
  h: a.h + (b.h - a.h) * t,
});

const NONE: Look = { ...defaultLook, bg: "none", padding: 0, radius: 0, shadow: 0 };
const BLOOM: Look = { ...defaultLook, bg: "bloom" };

// Repères dans la capture factice (1280×800).
const EMAIL = { x1: 322, y1: 274, x2: 778, y2: 310 };
const APIKEY = { x1: 322, y1: 518, x2: 938, y2: 558 };
const BUTTON = { x1: 1030, y1: 660, x2: 1254, y2: 738 };

const blurAnnots = (tEmail: number, tKey: number): Annot[] => {
  const list: Annot[] = [];
  if (tEmail > 0)
    list.push({ id: 1, kind: "blur", ...EMAIL, x2: EMAIL.x1 + (EMAIL.x2 - EMAIL.x1) * tEmail, color: "", size: 2 });
  if (tKey > 0)
    list.push({ id: 2, kind: "blur", ...APIKEY, x2: APIKEY.x1 + (APIKEY.x2 - APIKEY.x1) * tKey, color: "", size: 2 });
  return list;
};

const ellipse = (t: number): Annot[] =>
  t > 0
    ? [
        {
          id: 3,
          kind: "ellipse",
          x1: BUTTON.x1,
          y1: BUTTON.y1,
          x2: BUTTON.x1 + (BUTTON.x2 - BUTTON.x1) * t,
          y2: BUTTON.y1 + (BUTTON.y2 - BUTTON.y1) * t,
          color: "#ff4d4f",
          size: 2,
        },
      ]
    : [];

const FINAL_ANNOTS = [...blurAnnots(1, 1), ...ellipse(1)];

// ───────────────────────────── Éléments partagés ─────────────────────────────

const Backdrop: React.FC = () => (
  <AbsoluteFill
    style={{
      background: C.bg,
      backgroundImage: "radial-gradient(rgba(255,255,255,0.035) 1.5px, transparent 1.5px)",
      backgroundSize: "28px 28px",
    }}
  />
);

const Icon: React.FC<{ name: IconName; size?: number; color?: string; stroke?: number }> = ({
  name,
  size = 24,
  color = "currentColor",
  stroke,
}) => (
  <span
    style={{ display: "inline-flex", width: size, height: size, color, ["--sw" as string]: stroke }}
    dangerouslySetInnerHTML={{
      __html: icon(name).replace('class="icon"', `width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="${stroke ?? 1.75}" stroke-linecap="round" stroke-linejoin="round"`),
    }}
  />
);

const Headline: React.FC<{ text: string; at: number; size?: number; color?: string; style?: React.CSSProperties }> = ({
  text,
  at,
  size = 64,
  color = C.text,
  style,
}) => {
  const f = useCurrentFrame();
  const words = text.split(" ");
  return (
    <div style={{ font: `650 ${size}px/1.1 ${FONT}`, letterSpacing: "-0.02em", color, ...style }}>
      {words.map((w, i) => {
        const t = io(f, [at + i * 3, at + i * 3 + 16], [0, 1]);
        return (
          <span key={i} style={{ display: "inline-block", opacity: t, transform: `translateY(${(1 - t) * 24}px)`, marginRight: "0.26em" }}>
            {w}
          </span>
        );
      })}
    </div>
  );
};

const Fade: React.FC<{ dur: number; inF?: number; outF?: number; children: React.ReactNode }> = ({
  dur,
  inF = 10,
  outF = 10,
  children,
}) => {
  const f = useCurrentFrame();
  const o = Math.min(inF ? io(f, [0, inF], [0, 1]) : 1, outF ? io(f, [dur - outF, dur], [1, 0], inOut) : 1);
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
};

const Cursor: React.FC<{ x: number; y: number; down?: boolean; cross?: boolean; opacity?: number }> = ({
  x,
  y,
  down,
  cross,
  opacity = 1,
}) =>
  cross ? (
    <svg width="40" height="40" style={{ position: "absolute", left: x - 20, top: y - 20, opacity }}>
      <path d="M20 2v36M2 20h36" stroke="#fff" strokeWidth="2" />
      <path d="M20 2v36M2 20h36" stroke="#000" strokeOpacity="0.5" strokeWidth="1" />
    </svg>
  ) : (
    <svg
      width="34"
      height="34"
      viewBox="0 0 24 24"
      style={{
        position: "absolute",
        left: x - 4,
        top: y - 3,
        opacity,
        transform: `scale(${down ? 0.86 : 1})`,
        transformOrigin: "4px 3px",
        filter: "drop-shadow(0 2px 4px rgba(0,0,0,.45))",
      }}
    >
      <path d="M4.5 3.2 19 10.6l-6.4 1.7-2.9 6.3z" fill="#fff" stroke="#111" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );

/** Trajectoire du curseur : suite de points clés [frame, x, y]. */
function track(f: number, keys: [number, number, number][]) {
  for (let i = 0; i < keys.length - 1; i++) {
    const [f0, x0, y0] = keys[i];
    const [f1, x1, y1] = keys[i + 1];
    if (f <= f1) {
      const t = io(f, [f0, f1], [0, 1], inOut);
      return { x: x0 + (x1 - x0) * t, y: y0 + (y1 - y0) * t };
    }
  }
  const last = keys[keys.length - 1];
  return { x: last[1], y: last[2] };
}

// ───────────────────────────── 1. Accroche ─────────────────────────────

const Hook: React.FC<{ lang: Lang }> = ({ lang }) => {
  const t = copy[lang];
  return (
    <Fade dur={75} inF={0}>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", textAlign: "center" }}>
        <Headline text={t.hook1} at={4} size={112} />
        <Headline text={t.hook2} at={16} size={112} color={C.accent} />
      </AbsoluteFill>
    </Fade>
  );
};

// ───────────────────────────── 2. Capture brute ─────────────────────────────

const Flag: React.FC<{ x: number; y: number; w: number; h: number; label: string; at: number; side: "top" | "right" }> = ({
  x,
  y,
  w,
  h,
  label,
  at,
  side,
}) => {
  const f = useCurrentFrame();
  const t = io(f, [at, at + 14], [0, 1]);
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: x - 8,
          top: y - 8,
          width: w + 16,
          height: h + 16,
          border: `3px dashed ${C.danger}`,
          borderRadius: 10,
          opacity: t,
          transform: `scale(${1.06 - 0.06 * t})`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: side === "right" ? x + w + 26 : x - 8,
          top: side === "right" ? y + h / 2 - 24 : y - 62,
          padding: "8px 16px",
          borderRadius: 999,
          background: C.danger,
          color: "#2b0607",
          font: `650 24px ${FONT}`,
          opacity: t,
          transform: side === "right" ? `translateX(${(1 - t) * -12}px)` : `translateY(${(1 - t) * 10}px)`,
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </div>
    </>
  );
};

const Before: React.FC<{ lang: Lang }> = ({ lang }) => {
  const t = copy[lang];
  const f = useCurrentFrame();
  const source = useSource(lang);
  if (!source) return null;
  const box = { x: 380, y: 210, w: 1160, h: 730 };
  const p = place(source, NONE, NONE, box);
  const a = p.at(EMAIL.x1, EMAIL.y1);
  const k = p.at(APIKEY.x1, APIKEY.y1);
  const s = io(f, [0, 20], [0.96, 1]);
  return (
    <Fade dur={120}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 70, textAlign: "center" }}>
        <Headline text={t.before} at={2} size={56} color={C.text2} />
      </div>
      <AbsoluteFill style={{ transform: `scale(${s})` }}>
        <ShotCanvas source={source} look={NONE} fit={NONE} box={box} />
        <Flag x={a.x} y={a.y} w={(EMAIL.x2 - EMAIL.x1) * p.scale} h={(EMAIL.y2 - EMAIL.y1) * p.scale} label={t.flagPrivate} at={28} side="right" />
        <Flag x={k.x} y={k.y} w={(APIKEY.x2 - APIKEY.x1) * p.scale} h={(APIKEY.y2 - APIKEY.y1) * p.scale} label={t.flagPrivate} at={40} side="right" />
        <Flag x={p.ox} y={p.oy} w={1280 * p.scale} h={800 * p.scale} label={t.flagEdges} at={58} side="top" />
      </AbsoluteFill>
    </Fade>
  );
};

// ───────────────────────────── 3. Impr. écran + sélection ─────────────────────────────

const WIN: Box = { x: 320, y: 150, w: 1280, h: 800 };

const Wallpaper: React.FC<{ id: string; w: number; h: number; style?: React.CSSProperties }> = ({ id, w, h, style }) => {
  const ref = React.useRef<HTMLCanvasElement>(null);
  React.useLayoutEffect(() => {
    const bg = backgrounds.find((b) => b.id === id)!;
    bg.paint(ref.current!.getContext("2d")!, w, h);
  }, [id, w, h]);
  return <canvas ref={ref} width={w} height={h} style={{ position: "absolute", left: 0, top: 0, ...style }} />;
};

const KeyCap: React.FC<{ label: string; pressed: number }> = ({ label, pressed }) => (
  <div
    style={{
      padding: "34px 54px",
      borderRadius: 26,
      background: "linear-gradient(#fbfbfd, #e4e6ec)",
      color: "#1c1e24",
      font: `650 64px ${FONT}`,
      boxShadow: `0 ${16 - pressed * 12}px 0 #b9bcc6, 0 ${30 - pressed * 18}px 50px rgba(0,0,0,.45)`,
      transform: `translateY(${pressed * 12}px)`,
      whiteSpace: "nowrap",
    }}
  >
    {label}
  </div>
);

const Capture: React.FC<{ lang: Lang }> = ({ lang }) => {
  const t = copy[lang];
  const f = useCurrentFrame();
  const source = useSource(lang);
  if (!source) return null;

  const keyIn = io(f, [4, 16], [0, 1]);
  const pressed = io(f, [20, 24], [0, 1]) - io(f, [27, 32], [0, 1]);
  const keyOut = io(f, [32, 42], [1, 0]);
  const dim = io(f, [30, 40], [0, 0.55]);
  const sel = io(f, [48, 90], [0, 1], inOut);
  const start = { x: WIN.x - 2, y: WIN.y - 2 };
  const end = { x: WIN.x + WIN.w + 2, y: WIN.y + WIN.h + 2 };
  const cur = { x: start.x + (end.x - start.x) * sel, y: start.y + (end.y - start.y) * sel };
  const w = cur.x - start.x;
  const h = cur.y - start.y;
  const pxW = Math.round((w / WIN.w) * 1280);
  const pxH = Math.round((h / WIN.h) * 800);
  const hint = io(f, [38, 48], [0, 1]) * io(f, [50, 58], [1, 0]);
  const exit = io(f, [100, 120], [0, 1], inOut);

  return (
    <AbsoluteFill style={{ opacity: io(f, [0, 8], [0, 1]) * (1 - exit) }}>
      <Wallpaper id="night" w={1920} h={1080} />
      <div
        style={{
          position: "absolute",
          left: WIN.x,
          top: WIN.y,
          width: WIN.w,
          height: WIN.h,
          borderRadius: 10,
          overflow: "hidden",
          boxShadow: "0 30px 80px rgba(0,0,0,.55)",
        }}
      >
        <ShotCanvas source={source} look={NONE} fit={NONE} box={{ x: 0, y: 0, w: 1280, h: 800 }} />
      </div>

      {/* Voile avec découpe */}
      <svg width="1920" height="1080" style={{ position: "absolute", inset: 0 }}>
        <path
          fillRule="evenodd"
          fill={`rgba(8,9,14,${dim})`}
          d={`M0 0H1920V1080H0Z M${start.x} ${start.y}h${w}v${h}h${-w}Z`}
        />
        {sel > 0 && (
          <>
            <rect x={start.x} y={start.y} width={w} height={h} fill="none" stroke="#fff" strokeWidth="2" />
            {[
              [start.x, start.y, 1, 1],
              [cur.x, start.y, -1, 1],
              [start.x, cur.y, 1, -1],
              [cur.x, cur.y, -1, -1],
            ].map(([x, y, dx, dy], i) => (
              <path
                key={i}
                d={`M${x} ${y + dy * 22}V${y}H${x + dx * 22}`}
                fill="none"
                stroke={C.accent}
                strokeWidth="5"
                strokeLinecap="round"
              />
            ))}
          </>
        )}
      </svg>

      {sel > 0.05 && (
        <div
          style={{
            position: "absolute",
            left: start.x,
            top: start.y - 50,
            padding: "7px 14px",
            borderRadius: 8,
            background: "rgba(22,23,30,.92)",
            border: "1px solid rgba(255,255,255,.12)",
            color: C.text,
            font: `500 24px ${MONO}`,
          }}
        >
          {pxW} × {pxH}
        </div>
      )}

      <div
        style={{
          position: "absolute",
          left: "50%",
          bottom: 56,
          transform: `translate(-50%, ${(1 - hint) * 10}px)`,
          opacity: hint,
          padding: "14px 26px",
          borderRadius: 999,
          background: "rgba(24,25,32,.92)",
          border: "1px solid rgba(255,255,255,.1)",
          color: C.text,
          font: `500 26px ${FONT}`,
        }}
      >
        {t.hint}
      </div>

      {f >= 44 && <Cursor x={cur.x} y={cur.y} cross opacity={io(f, [44, 48], [0, 1]) * io(f, [92, 98], [1, 0])} />}

      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: keyIn * keyOut }}>
        <div style={{ transform: `scale(${0.85 + 0.15 * keyIn})` }}>
          <KeyCap label={t.key} pressed={Math.max(0, pressed)} />
        </div>
      </AbsoluteFill>

      <div style={{ position: "absolute", left: 0, right: 0, top: 46, textAlign: "center", opacity: io(f, [40, 50], [0, 1]) }}>
        <Headline text={t.oneKey} at={40} size={60} />
      </div>
    </AbsoluteFill>
  );
};

// ───────────────────────────── 4. Éditeur : flou & cercle ─────────────────────────────

const EDITOR: Box = { x: 160, y: 140, w: 1600, h: 900 };
const BAR = 50;
const RAIL = 64;
const PANEL = 280;
const STAGE: Box = { x: EDITOR.x + RAIL + 50, y: EDITOR.y + BAR + 46, w: EDITOR.w - RAIL - PANEL - 100, h: EDITOR.h - BAR - 92 };

const TOOLS: IconName[] = ["select", "blur", "ellipse", "rect", "arrow"];
const toolY = (i: number) => EDITOR.y + BAR + 22 + i * 56 + (i >= 1 ? 16 : 0) + (i >= 2 ? 16 : 0);

const thumbs = new Map<string, string>();
const thumb = (id: string) => {
  if (!thumbs.has(id)) thumbs.set(id, thumbnail(backgrounds.find((b) => b.id === id)!, 112, 76));
  return thumbs.get(id)!;
};

const EditorChrome: React.FC<{ lang: Lang; tool: number; copied: number; bg: string }> = ({ lang, tool, copied, bg }) => {
  const t = copy[lang];
  return (
    <div
      style={{
        position: "absolute",
        left: EDITOR.x,
        top: EDITOR.y,
        width: EDITOR.w,
        height: EDITOR.h,
        borderRadius: 14,
        overflow: "hidden",
        background: "#0f1013",
        boxShadow: `0 0 0 1px ${C.line}, 0 40px 100px rgba(0,0,0,.6)`,
      }}
    >
      {/* barre de titre */}
      <div style={{ height: BAR, display: "flex", alignItems: "center", gap: 12, padding: "0 18px", background: C.bg, borderBottom: `1px solid ${C.line}` }}>
        <Img src={staticFile("logo.svg")} width={24} height={24} />
        <span style={{ font: `650 20px ${FONT}`, color: C.text }}>Clicadre</span>
        <span style={{ font: `400 16px ${MONO}`, color: C.text3, paddingLeft: 12, borderLeft: `1px solid ${C.line}` }}>1510 × 1030</span>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 8, height: 38, padding: "0 16px", borderRadius: 9, background: C.surface2, color: C.text, font: `600 17px ${FONT}` }}>
          <Icon name="save" size={20} /> {t.tools.save}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            height: 38,
            padding: "0 16px",
            borderRadius: 9,
            background: C.accent,
            color: C.onAccent,
            font: `650 17px ${FONT}`,
            transform: `scale(${1 - 0.05 * Math.sin(Math.min(1, copied) * Math.PI)})`,
          }}
        >
          <Icon name={copied > 0.5 ? "check" : "copy"} size={20} stroke={copied > 0.5 ? 2.4 : 1.75} /> {t.tools.copy}
        </div>
      </div>
      {/* rail */}
      <div style={{ position: "absolute", left: 0, top: BAR, bottom: 0, width: RAIL, background: C.bg, borderRight: `1px solid ${C.line}` }}>
        {TOOLS.map((name, i) => (
          <div
            key={name}
            style={{
              position: "absolute",
              left: 10,
              top: toolY(i) - EDITOR.y - BAR - 22 + 22,
              width: 44,
              height: 44,
              borderRadius: 10,
              display: "grid",
              placeItems: "center",
              background: tool === i ? "rgba(242,121,90,.16)" : "transparent",
              color: tool === i ? C.accent : C.text2,
            }}
          >
            <Icon name={name} size={22} />
          </div>
        ))}
      </div>
      {/* scène */}
      <div
        style={{
          position: "absolute",
          left: RAIL,
          top: BAR,
          right: PANEL,
          bottom: 0,
          background: "#0f1013",
          backgroundImage: "radial-gradient(rgba(255,255,255,0.04) 1.2px, transparent 1.2px)",
          backgroundSize: "22px 22px",
        }}
      />
      {/* panneau */}
      <div style={{ position: "absolute", right: 0, top: BAR, bottom: 0, width: PANEL, padding: 22, background: C.surface, borderLeft: `1px solid ${C.line}` }}>
        <div style={{ font: `650 19px ${FONT}`, color: C.text, marginBottom: 16 }}>{t.tools.bg}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 9 }}>
          {backgrounds.slice(0, 16).map((b) => (
            <div
              key={b.id}
              style={{
                aspectRatio: "3 / 2",
                borderRadius: 8,
                backgroundImage: `url(${thumb(b.id)})`,
                backgroundSize: "cover",
                boxShadow: b.id === bg ? `0 0 0 2px ${C.surface}, 0 0 0 4px ${C.accent}` : "inset 0 0 0 1px rgba(255,255,255,.08)",
              }}
            />
          ))}
        </div>
        {[0.32, 0.36, 0.6].map((v, i) => (
          <div key={i} style={{ marginTop: i === 0 ? 34 : 26 }}>
            <div style={{ height: 5, borderRadius: 9, background: `linear-gradient(to right, ${C.accent} ${v * 100}%, ${C.surface2} ${v * 100}%)` }} />
          </div>
        ))}
      </div>
    </div>
  );
};

const Editor: React.FC<{ lang: Lang }> = ({ lang }) => {
  const t = copy[lang];
  const f = useCurrentFrame();
  const source = useSource(lang);
  if (!source) return null;

  // Arrivée : la sélection rejoint la scène, le fond éclot autour.
  const arrive = io(f, [0, 24], [0, 1]);
  const bloom = io(f, [10, 40], [0, 1]);
  const look: Look = { ...BLOOM, padding: BLOOM.padding * bloom, radius: BLOOM.radius * bloom, shadow: BLOOM.shadow * bloom };
  const box = lerpBox(WIN, STAGE, arrive);

  const tEmail = io(f, [58, 82], [0, 1], inOut);
  const tKey = io(f, [92, 116], [0, 1], inOut);
  const tEll = io(f, [134, 158], [0, 1], inOut);
  const annots = [...blurAnnots(tEmail, tKey), ...ellipse(tEll)];
  const p = place(source, BLOOM, BLOOM, STAGE);
  const A = (x: number, y: number) => p.at(x, y);

  const railX = EDITOR.x + 32;
  const copyBtn = { x: EDITOR.x + EDITOR.w - 80, y: EDITOR.y + 25 };
  const cursor = track(f, [
    [30, 980, 760],
    [48, railX, toolY(1) + 22],
    [56, A(EMAIL.x1, EMAIL.y1).x, A(EMAIL.x1, EMAIL.y1).y],
    [58, A(EMAIL.x1, EMAIL.y1).x, A(EMAIL.x1, EMAIL.y1).y],
    [82, A(EMAIL.x2, EMAIL.y2).x, A(EMAIL.x2, EMAIL.y2).y],
    [90, A(APIKEY.x1, APIKEY.y1).x, A(APIKEY.x1, APIKEY.y1).y],
    [92, A(APIKEY.x1, APIKEY.y1).x, A(APIKEY.x1, APIKEY.y1).y],
    [116, A(APIKEY.x2, APIKEY.y2).x, A(APIKEY.x2, APIKEY.y2).y],
    [126, railX, toolY(2) + 22],
    [132, A(BUTTON.x1, BUTTON.y1).x, A(BUTTON.x1, BUTTON.y1).y],
    [134, A(BUTTON.x1, BUTTON.y1).x, A(BUTTON.x1, BUTTON.y1).y],
    [158, A(BUTTON.x2, BUTTON.y2).x, A(BUTTON.x2, BUTTON.y2).y],
    [170, copyBtn.x, copyBtn.y],
  ]);
  const down = (f >= 56 && f <= 82) || (f >= 90 && f <= 116) || (f >= 132 && f <= 158) || (f >= 170 && f <= 173);
  const tool = f < 52 ? 0 : f < 128 ? 1 : 2;
  const copied = io(f, [171, 175], [0, 1]);
  const caption = f < 124 ? t.blur : t.circle;
  const chrome = io(f, [4, 22], [0, 1]);

  return (
    <AbsoluteFill>
      <div style={{ opacity: chrome }}>
        <EditorChrome lang={lang} tool={tool} copied={copied} bg="bloom" />
      </div>
      <ShotCanvas source={source} look={look} fit={bloom > 0 ? BLOOM : NONE} box={box} annots={annots} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 40, textAlign: "center" }}>
        <Headline key={caption} text={caption} at={f < 124 ? 40 : 124} size={60} />
      </div>
      {f >= 30 && <Cursor x={cursor.x} y={cursor.y} down={down} opacity={io(f, [30, 36], [0, 1])} />}
    </AbsoluteFill>
  );
};

// ───────────────────────────── 5. Fonds ─────────────────────────────

const CYCLE = ["bloom", "dusk", "lagoon", "orchid", "peach", "aurora", "dune", "night"];

const Backgrounds: React.FC<{ lang: Lang }> = ({ lang }) => {
  const t = copy[lang];
  const f = useCurrentFrame();
  const source = useSource(lang);
  if (!source) return null;
  const grow = io(f, [0, 26], [0, 1], inOut);
  const big: Box = { x: 260, y: 150, w: 1400, h: 760 };
  const box = lerpBox(STAGE, big, grow);
  const step = 20;
  const idx = Math.max(0, Math.floor((f - 30) / step));
  const i = Math.min(idx, CYCLE.length - 1);
  const local = f - 30 - idx * step;
  const tNext = i < CYCLE.length - 1 ? io(local, [step - 8, step], [0, 1], inOut) : 0;
  const look: Look = { ...BLOOM, bg: CYCLE[i] };
  const next: Look = { ...BLOOM, bg: CYCLE[Math.min(i + 1, CYCLE.length - 1)] };
  const active = tNext > 0.5 ? i + 1 : i;

  return (
    <AbsoluteFill>
      <div style={{ opacity: 1 - grow }}>
        <EditorChrome lang={lang} tool={2} copied={1} bg="bloom" />
      </div>
      <ShotCanvas source={source} look={look} fit={BLOOM} box={box} annots={FINAL_ANNOTS} next={{ look: next, t: tNext }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 46, textAlign: "center", opacity: grow }}>
        <Headline text={t.pick} at={14} size={60} />
      </div>
      <div
        style={{
          position: "absolute",
          left: "50%",
          bottom: 50,
          display: "flex",
          gap: 14,
          transform: `translate(-50%, ${(1 - grow) * 30}px)`,
          opacity: grow,
        }}
      >
        {CYCLE.map((id, k) => (
          <div
            key={id}
            style={{
              width: 96,
              height: 64,
              borderRadius: 12,
              backgroundImage: `url(${thumb(id)})`,
              backgroundSize: "cover",
              transform: `scale(${k === active ? 1.1 : 1})`,
              boxShadow: k === active ? `0 0 0 3px ${C.bg}, 0 0 0 6px ${C.accent}` : "inset 0 0 0 1px rgba(255,255,255,.1)",
              transition: "none",
            }}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};

// ───────────────────────────── 6. Avant / après ─────────────────────────────

const Compare: React.FC<{ lang: Lang }> = ({ lang }) => {
  const t = copy[lang];
  const f = useCurrentFrame();
  const source = useSource(lang);
  if (!source) return null;
  const l = io(f, [6, 26], [0, 1]);
  const r = io(f, [18, 40], [0, 1]);
  const left: Box = { x: 110, y: 330, w: 760, h: 480 };
  const right: Box = { x: 960, y: 250, w: 860, h: 640 };
  const label = (text: string, x: number, y: number, o: number, color: string) => (
    <div style={{ position: "absolute", left: x, top: y, font: `600 32px ${FONT}`, color, opacity: o }}>{text}</div>
  );
  return (
    <Fade dur={120}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 70, textAlign: "center" }}>
        <Headline text={t.compare} at={4} size={60} />
      </div>
      <AbsoluteFill style={{ opacity: l, transform: `translateY(${(1 - l) * 30}px)` }}>
        <ShotCanvas source={source} look={NONE} fit={NONE} box={left} />
      </AbsoluteFill>
      {label(t.compareLeft, left.x, left.y - 58, l, C.text3)}
      <AbsoluteFill style={{ opacity: r, transform: `translateY(${(1 - r) * 30}px) scale(${0.97 + 0.03 * r})` }}>
        <ShotCanvas source={source} look={{ ...BLOOM, bg: "dusk" }} fit={BLOOM} box={right} annots={FINAL_ANNOTS} />
      </AbsoluteFill>
      {label(t.compareRight, right.x + 40, right.y - 40, r, C.accent)}
    </Fade>
  );
};

// ───────────────────────────── 7. Atouts ─────────────────────────────

const Features: React.FC<{ lang: Lang }> = ({ lang }) => {
  const t = copy[lang];
  const f = useCurrentFrame();
  const source = useSource(lang);
  if (!source) return null;
  const drift = io(f, [0, 150], [0, 1], Easing.linear);
  return (
    <Fade dur={150}>
      <div style={{ position: "absolute", left: 130, top: 210, display: "flex", flexDirection: "column", gap: 34 }}>
        {t.features.map((line, i) => {
          const a = io(f, [8 + i * 10, 26 + i * 10], [0, 1]);
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 22, opacity: a, transform: `translateX(${(1 - a) * -24}px)` }}>
              <span style={{ width: 46, height: 46, borderRadius: 999, display: "grid", placeItems: "center", background: "rgba(242,121,90,.16)", color: C.accent }}>
                <Icon name="check" size={26} stroke={2.4} />
              </span>
              <span style={{ font: `600 40px ${FONT}`, color: C.text, letterSpacing: "-0.01em" }}>{line}</span>
            </div>
          );
        })}
      </div>
      <AbsoluteFill style={{ transform: `translate(${-20 * drift}px, ${-10 * drift}px)`, opacity: io(f, [10, 30], [0, 1]) }}>
        <ShotCanvas source={source} look={{ ...BLOOM, bg: "lagoon" }} fit={BLOOM} box={{ x: 1150, y: 260, w: 680, h: 560 }} annots={FINAL_ANNOTS} />
      </AbsoluteFill>
    </Fade>
  );
};

// ───────────────────────────── 8. Fin ─────────────────────────────

const Outro: React.FC<{ lang: Lang }> = ({ lang }) => {
  const t = copy[lang];
  const f = useCurrentFrame();
  const logo = io(f, [0, 20], [0, 1]);
  const line = (at: number) => io(f, [at, at + 16], [0, 1]);
  return (
    <Fade dur={90} outF={0}>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", textAlign: "center", gap: 0 }}>
        <Img src={staticFile("logo.svg")} width={168} height={168} style={{ opacity: logo, transform: `scale(${0.8 + 0.2 * logo})`, marginBottom: 30 }} />
        <div style={{ font: `700 132px/1 ${FONT}`, color: C.text, letterSpacing: "-0.03em", opacity: line(8) }}>Clicadre</div>
        <div style={{ font: `500 44px ${FONT}`, color: C.text2, marginTop: 26, opacity: line(16) }}>{t.tagline}</div>
        <div style={{ marginTop: 56, display: "flex", gap: 22, alignItems: "center", opacity: line(26) }}>
          <span style={{ font: `600 30px ${FONT}`, color: C.accent }}>{t.license}</span>
        </div>
        <div style={{ marginTop: 18, font: `500 30px ${MONO}`, color: C.text, opacity: line(32) }}>github.com/abg5f/clicadre</div>
      </AbsoluteFill>
    </Fade>
  );
};

// ───────────────────────────── Bande-son ─────────────────────────────

type Sfx = "click" | "mousedown" | "mouseup" | "key" | "shutter" | "pop" | "tick" | "whoosh" | "success" | "outro";

/** Bruitages calés image par image sur les actions animées (frames absolues). */
function cues(): [number, Sfx, number][] {
  const B = SCENES.before[0];
  const Cp = SCENES.capture[0];
  const E = SCENES.editor[0];
  const G = SCENES.backgrounds[0];
  const list: [number, Sfx, number][] = [
    [B, "whoosh", 0.35],
    [B + 28, "pop", 0.6],
    [B + 40, "pop", 0.6],
    [B + 58, "pop", 0.6],
    [Cp + 21, "key", 0.9],
    [Cp + 48, "mousedown", 0.95],
    [Cp + 90, "mouseup", 0.85],
    [Cp + 92, "shutter", 1.0],
    [E + 2, "whoosh", 0.4],
    [E + 50, "click", 1.0],
    [E + 57, "mousedown", 0.95],
    [E + 82, "mouseup", 0.85],
    [E + 91, "mousedown", 0.95],
    [E + 116, "mouseup", 0.85],
    [E + 127, "click", 1.0],
    [E + 133, "mousedown", 0.95],
    [E + 158, "mouseup", 0.85],
    [E + 171, "click", 1.0],
    [E + 174, "success", 0.45],
    [G + 2, "whoosh", 0.4],
    [SCENES.compare[0] + 2, "whoosh", 0.35],
    [SCENES.outro[0] + 6, "outro", 0.55],
  ];
  for (let k = 0; k < CYCLE.length - 1; k++) list.push([G + 30 + k * 20 + 16, "tick", 0.85]);
  for (let i = 0; i < 6; i++) list.push([SCENES.features[0] + 10 + i * 10, "pop", 0.4]);
  return list;
}

const Soundtrack: React.FC = () => (
  <>
    <Audio src={staticFile("audio/music.wav")} volume={0.34} />
    {cues().map(([from, name, volume], i) => (
      <Sequence key={i} from={from} durationInFrames={90} layout="none">
        <Audio src={staticFile(`audio/${name}.wav`)} volume={volume} />
      </Sequence>
    ))}
  </>
);

// ───────────────────────────── Montage ─────────────────────────────

export const SCENES = {
  hook: [0, 75],
  before: [75, 120],
  capture: [195, 120],
  editor: [315, 180],
  backgrounds: [495, 195],
  compare: [690, 120],
  features: [810, 150],
  outro: [960, 90],
} as const;
export const TOTAL = 1050;

export const Demo: React.FC<{ lang: Lang }> = ({ lang }) => (
  <AbsoluteFill style={{ fontFamily: FONT }}>
    <Backdrop />
    <Soundtrack />
    <Sequence from={SCENES.hook[0]} durationInFrames={SCENES.hook[1]}>
      <Hook lang={lang} />
    </Sequence>
    <Sequence from={SCENES.before[0]} durationInFrames={SCENES.before[1]}>
      <Before lang={lang} />
    </Sequence>
    <Sequence from={SCENES.capture[0]} durationInFrames={SCENES.capture[1]}>
      <Capture lang={lang} />
    </Sequence>
    <Sequence from={SCENES.editor[0]} durationInFrames={SCENES.editor[1]}>
      <Editor lang={lang} />
    </Sequence>
    <Sequence from={SCENES.backgrounds[0]} durationInFrames={SCENES.backgrounds[1]}>
      <Fade dur={SCENES.backgrounds[1]} inF={0}>
        <Backgrounds lang={lang} />
      </Fade>
    </Sequence>
    <Sequence from={SCENES.compare[0]} durationInFrames={SCENES.compare[1]}>
      <Compare lang={lang} />
    </Sequence>
    <Sequence from={SCENES.features[0]} durationInFrames={SCENES.features[1]}>
      <Features lang={lang} />
    </Sequence>
    <Sequence from={SCENES.outro[0]} durationInFrames={SCENES.outro[1]}>
      <Outro lang={lang} />
    </Sequence>
  </AbsoluteFill>
);
