import React from "react";
import { Composition, Sequence } from "remotion";
import { Demo, SCENES, TOTAL } from "./Demo";
import { Promo } from "./Promo";

/** Extrait pour le GIF du README : de la touche Impr. écran à la loupe. */
const TEASER_FROM = SCENES.capture[0];
const TEASER_TO = SCENES.spotlight[0] + SCENES.spotlight[1];

const Teaser: React.FC = () => (
  <Sequence from={-TEASER_FROM}>
    <Demo lang="en" />
  </Sequence>
);

export const Root: React.FC = () => (
  <>
    <Composition id="Demo-fr" component={Demo} defaultProps={{ lang: "fr" as const }} durationInFrames={TOTAL} fps={30} width={1920} height={1080} />
    <Composition id="Demo-en" component={Demo} defaultProps={{ lang: "en" as const }} durationInFrames={TOTAL} fps={30} width={1920} height={1080} />
    <Composition id="Promo-en" component={Promo} defaultProps={{ lang: "en" as const }} durationInFrames={1} fps={30} width={1920} height={1080} />
    <Composition id="Promo-fr" component={Promo} defaultProps={{ lang: "fr" as const }} durationInFrames={1} fps={30} width={1920} height={1080} />
    <Composition id="Teaser-en" component={Teaser} durationInFrames={TEASER_TO - TEASER_FROM} fps={30} width={1920} height={1080} />
  </>
);
