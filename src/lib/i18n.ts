import { invoke } from "@tauri-apps/api/core";

export type Lang = "fr" | "en";

const fr = {
  "overlay.hint": "Glissez pour sélectionner une zone",
  "overlay.full": "plein écran",
  "overlay.cancel": "annuler",
  "key.space": "Espace",
  "key.esc": "Échap",

  "app.newCapture": "Nouvelle capture",
  "app.undo": "Annuler",
  "app.redo": "Rétablir",
  "app.settings": "Réglages",
  "app.save": "Enregistrer",
  "app.copy": "Copier",
  "app.minimize": "Réduire",
  "app.maximize": "Agrandir",
  "app.close": "Fermer",

  "tool.select": "Sélection",
  "tool.blur": "Flou",
  "tool.rect": "Rectangle",
  "tool.ellipse": "Cercle",
  "tool.arrow": "Flèche",
  "tool.magnify": "Loupe",
  "tool.zoom": "Agrandissement",
  "tool.focus": "Reste de l'image",
  "focus.none": "Normal",
  "focus.dim": "Assombri",
  "focus.blur": "Flouté",
  "tool.redactHint": "Glissez sur ce qui doit rester privé : le contenu est remplacé, pas seulement flouté",
  "tool.color": "Couleur",
  "tool.width": "Épaisseur",
  "tool.delete": "Supprimer",

  "panel.background": "Fond",
  "panel.none": "Aucun fond",
  "panel.wallpapers": "Fonds d'écran",
  "panel.gradients": "Dégradés",
  "panel.custom": "Dégradé perso",
  "panel.from": "Couleur de départ",
  "panel.to": "Couleur d'arrivée",
  "panel.layout": "Mise en forme",
  "panel.padding": "Marge",
  "panel.radius": "Arrondi",
  "panel.shadow": "Ombre",
  "panel.noBgNote": "Sans fond, la capture est exportée telle quelle.",

  "empty.title": "Prêt à capturer",
  "empty.body": "Appuyez sur {key} n'importe où pour sélectionner une zone de l'écran.",
  "empty.cta": "Capturer maintenant",
  "empty.or": "ou",
  "empty.snipping": "Sous Windows, la touche Impr. écran ouvre encore l'Outil Capture.",
  "empty.snippingCta": "Utiliser Impr. écran pour Glossyshots",

  "settings.title": "Réglages",
  "settings.language": "Langue",
  "settings.printscreen": "Impr. écran lance Glossyshots",
  "settings.printscreenHelp": "Libère la touche réservée à l'Outil Capture de Windows. Si elle ouvre encore l'Outil Capture, fermez puis rouvrez votre session.",
  "settings.autostart": "Lancer au démarrage",
  "settings.autostartHelp": "Glossyshots attend discrètement dans la zone de notification.",
  "settings.shortcut": "Raccourci de secours",

  "toast.copied": "Copié dans le presse-papiers",
  "toast.saved": "Enregistré dans Images › Glossyshots",
  "toast.show": "Afficher",
  "toast.error": "Échec : {msg}",
  "toast.printscreenOn": "Impr. écran lance maintenant Glossyshots",
  "toast.printscreenOff": "Impr. écran est rendue à l'Outil Capture",
} as const;

export type Key = keyof typeof fr;

const en: Record<Key, string> = {
  "overlay.hint": "Drag to select an area",
  "overlay.full": "full screen",
  "overlay.cancel": "cancel",
  "key.space": "Space",
  "key.esc": "Esc",

  "app.newCapture": "New capture",
  "app.undo": "Undo",
  "app.redo": "Redo",
  "app.settings": "Settings",
  "app.save": "Save",
  "app.copy": "Copy",
  "app.minimize": "Minimize",
  "app.maximize": "Maximize",
  "app.close": "Close",

  "tool.select": "Select",
  "tool.blur": "Blur",
  "tool.rect": "Rectangle",
  "tool.ellipse": "Circle",
  "tool.arrow": "Arrow",
  "tool.magnify": "Magnify",
  "tool.zoom": "Zoom",
  "tool.focus": "Rest of the image",
  "focus.none": "Normal",
  "focus.dim": "Dimmed",
  "focus.blur": "Blurred",
  "tool.redactHint": "Drag over anything private: the content is replaced, not just blurred",
  "tool.color": "Color",
  "tool.width": "Thickness",
  "tool.delete": "Delete",

  "panel.background": "Background",
  "panel.none": "No background",
  "panel.wallpapers": "Wallpapers",
  "panel.gradients": "Gradients",
  "panel.custom": "Custom gradient",
  "panel.from": "Start color",
  "panel.to": "End color",
  "panel.layout": "Layout",
  "panel.padding": "Padding",
  "panel.radius": "Corners",
  "panel.shadow": "Shadow",
  "panel.noBgNote": "Without a background, the capture is exported as is.",

  "empty.title": "Ready to capture",
  "empty.body": "Press {key} anywhere to select an area of your screen.",
  "empty.cta": "Capture now",
  "empty.or": "or",
  "empty.snipping": "On Windows, the Print Screen key still opens the Snipping Tool.",
  "empty.snippingCta": "Use Print Screen for Glossyshots",

  "settings.title": "Settings",
  "settings.language": "Language",
  "settings.printscreen": "Print Screen opens Glossyshots",
  "settings.printscreenHelp": "Frees the key reserved for the Windows Snipping Tool. If it still opens the Snipping Tool, sign out and back in.",
  "settings.autostart": "Launch at startup",
  "settings.autostartHelp": "Glossyshots waits quietly in the notification area.",
  "settings.shortcut": "Fallback shortcut",

  "toast.copied": "Copied to clipboard",
  "toast.saved": "Saved to Pictures › Glossyshots",
  "toast.show": "Show",
  "toast.error": "Failed: {msg}",
  "toast.printscreenOn": "Print Screen now opens Glossyshots",
  "toast.printscreenOff": "Print Screen is back with the Snipping Tool",
};

const dict: Record<Lang, Record<Key, string>> = { fr, en };

let current: Lang = "fr";

export function lang(): Lang {
  return current;
}

export function t(key: Key, vars?: Record<string, string>): string {
  let s = dict[current][key];
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, v);
  return s;
}

/** Remplit les éléments marqués `data-i18n`, `data-i18n-title` et `data-i18n-aria`. */
export function applyI18n(root: ParentNode = document): void {
  document.documentElement.lang = current;
  root.querySelectorAll<HTMLElement>("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n as Key);
  });
  root.querySelectorAll<HTMLElement>("[data-i18n-title]").forEach((el) => {
    const label = t(el.dataset.i18nTitle as Key);
    const kbd = el.dataset.kbd;
    el.title = kbd ? `${label} (${kbd})` : label;
    el.setAttribute("aria-label", label);
  });
}

function systemLang(): Lang {
  return navigator.language.toLowerCase().startsWith("fr") ? "fr" : "en";
}

/** Lit la langue enregistrée côté natif ; au premier lancement, adopte celle du système. */
export async function initLang(): Promise<Lang> {
  try {
    const settings = await invoke<{ language: Lang | null }>("get_settings");
    current = settings.language ?? systemLang();
    if (!settings.language) await invoke("set_language", { language: current });
  } catch {
    current = systemLang();
  }
  return current;
}

export async function setLang(next: Lang): Promise<void> {
  current = next;
  await invoke("set_language", { language: next });
  localStorage.setItem("glossyshots.lang", next);
  applyI18n();
}

/** Synchronise les autres fenêtres quand la langue change. */
window.addEventListener("storage", (e) => {
  if (e.key === "glossyshots.lang" && (e.newValue === "fr" || e.newValue === "en")) {
    current = e.newValue;
    applyI18n();
  }
});
