/**
 * Visuel fixe pour les posts (Reddit, réseaux) : la loupe en vedette.
 * Rendu avec le vrai moteur de l'app, comme la vidéo.
 */
import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { icon, type IconName } from "../../src/lib/icons";
import type { Lang } from "./copy";
import { ShotCanvas, defaultLook, place, useSource, type Annot, type Look } from "./shot";

const FONT = '"Segoe UI Variable Display", "Segoe UI", system-ui, sans-serif';
const C = { bg: "#131418", text: "#eef0f4", text2: "#a9adb8", accent: "#f2795a", line: "#2c2e35" };

const LOOK: Look = { ...defaultLook, bg: "dusk", padding: 0.075 };
const CARD = { x1: 288, y1: 456, x2: 1232, y2: 646 };
const ANNOTS: Annot[] = [
  { id: 1, kind: "blur", x1: 322, y1: 274, x2: 778, y2: 310, color: "", size: 2 },
  { id: 2, kind: "blur", x1: 322, y1: 518, x2: 938, y2: 558, color: "", size: 2 },
  { id: 4, kind: "magnify", ...CARD, color: "#ff4d4f", size: 2, zoom: 1.13, dx: -10, dy: -40, focus: "blur" },
];
const BOX = { x: 800, y: 120, w: 1060, h: 840 };

const copy = {
  en: {
    title: "Make any part of your screenshot pop",
    sub: "Free, open-source screenshot tool for Windows and macOS",
    callout: "Magnifier: zoom it, move it, blur the rest",
    features: [
      ["magnify", "Magnifier with shadow, up to 400 %"],
      ["blur", "Blur that can't be reversed"],
      ["capture", "Print Screen, select, copy"],
      ["check", "Free, MIT, no account, offline"],
    ] as [IconName, string][],
  },
  fr: {
    title: "Faites ressortir n'importe quelle zone de vos captures",
    sub: "Outil de capture gratuit et open source, Windows et macOS",
    callout: "Loupe : agrandie, déplaçable, le reste flouté",
    features: [
      ["magnify", "Loupe avec ombre, jusqu'à 400 %"],
      ["blur", "Flou impossible à inverser"],
      ["capture", "Impr. écran, sélection, copie"],
      ["check", "Gratuit, MIT, sans compte, hors ligne"],
    ] as [IconName, string][],
  },
};

const Icon: React.FC<{ name: IconName; size: number }> = ({ name, size }) => (
  <span
    style={{ display: "inline-flex", width: size, height: size }}
    dangerouslySetInnerHTML={{
      __html: icon(name).replace(
        'class="icon"',
        `width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`,
      ),
    }}
  />
);

export const Promo: React.FC<{ lang: Lang }> = ({ lang }) => {
  const t = copy[lang];
  const source = useSource(lang);
  if (!source) return null;
  const p = place(source, LOOK, LOOK, BOX);
  // Coin haut-gauche de la vue agrandie, pour y accrocher l'étiquette.
  const z = 1.13;
  const w = (CARD.x2 - CARD.x1) * z;
  const h = (CARD.y2 - CARD.y1) * z;
  const cx = (CARD.x1 + CARD.x2) / 2 - 10;
  const cy = (CARD.y1 + CARD.y2) / 2 - 40;
  const lensTop = p.at(cx - w / 2, cy - h / 2);
  const lensBottom = p.at(cx, cy + h / 2);

  return (
    <AbsoluteFill
      style={{
        background: C.bg,
        backgroundImage: "radial-gradient(rgba(255,255,255,0.035) 1.5px, transparent 1.5px)",
        backgroundSize: "28px 28px",
        fontFamily: FONT,
      }}
    >
      <ShotCanvas source={source} look={LOOK} fit={LOOK} box={BOX} annots={ANNOTS} />

      {/* Étiquette de la loupe */}
      <div
        style={{
          position: "absolute",
          left: lensTop.x + 18,
          top: lensBottom.y + 26,
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 20px 12px 16px",
          borderRadius: 999,
          background: "#fff",
          color: "#1b1c22",
          font: `650 26px ${FONT}`,
          boxShadow: "0 12px 30px rgba(10,10,30,.35)",
        }}
      >
        <span style={{ color: "#e2493a", display: "inline-flex" }}>
          <Icon name="magnify" size={28} />
        </span>
        {t.callout}
      </div>

      {/* Colonne texte */}
      <div style={{ position: "absolute", left: 96, top: 120, width: 640 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 56 }}>
          <Img src={staticFile("logo.svg")} width={72} height={72} />
          <span style={{ font: `700 46px ${FONT}`, color: C.text, letterSpacing: "-0.02em" }}>Glossyshots</span>
        </div>
        <div style={{ font: `700 66px/1.08 ${FONT}`, color: C.text, letterSpacing: "-0.025em" }}>{t.title}</div>
        <div style={{ font: `500 28px/1.4 ${FONT}`, color: C.text2, marginTop: 24 }}>{t.sub}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 22, marginTop: 56 }}>
          {t.features.map(([name, label]) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <span
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  display: "grid",
                  placeItems: "center",
                  background: "rgba(242,121,90,.15)",
                  color: C.accent,
                  flex: "none",
                }}
              >
                <Icon name={name} size={26} />
              </span>
              <span style={{ font: `600 30px ${FONT}`, color: C.text }}>{label}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 64, font: `500 26px "Cascadia Mono", Consolas, monospace`, color: C.text2 }}>
          github.com/abg5f/Glossyshots
        </div>
      </div>
    </AbsoluteFill>
  );
};
