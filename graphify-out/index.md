# Graphe de connaissances — Glossyshots

197 nœuds, 228 arêtes, 6 communautés.

Types : function (143), file (22), tauri-command (16), struct (7), dependency (7), event (2)

## God nodes

- **src/editor/main.ts** (file, degré 58)
- **src-tauri/src/lib.rs** (file, degré 42)
- **src-tauri/src/settings.rs** (file, degré 24)
- **src/overlay/main.ts** (file, degré 22)
- **src/editor/render.ts** (file, degré 18)
- **src-tauri/src/shortcut.rs** (file, degré 11)
- **src/lib/i18n.ts** (file, degré 10)
- **src-tauri/src/log.rs** (file, degré 9)
- **src-tauri/src/tray.rs** (file, degré 8)
- **src/editor/backgrounds.ts** (file, degré 8)
- **src/lib/ipc.ts** (file, degré 8)
- **video/src/Demo.tsx** (file, degré 8)
- **video/src/shot.tsx** (file, degré 8)
- **src/editor/redact.ts** (file, degré 6)
- **src/lib/icons.ts** (file, degré 5)
- **video/src/Promo.tsx** (file, degré 4)
- **dev/fake-screenshot.ts** (file, degré 3)
- **video/src/copy.ts** (file, degré 3)
- **video/src/Root.tsx** (file, degré 3)

## Commandes natives (IPC)

- `cancel_capture` : défini dans src-tauri/src/lib.rs ; appelé par src/overlay/main.ts
- `capture_pending` : défini dans src-tauri/src/lib.rs ; appelé par src/overlay/main.ts
- `commit_selection` : défini dans src-tauri/src/lib.rs ; appelé par src/overlay/main.ts
- `copy_image` : défini dans src-tauri/src/lib.rs ; appelé par src/lib/ipc.ts
- `get_capture` : défini dans src-tauri/src/lib.rs ; appelé par src/overlay/main.ts
- `get_crop` : défini dans src-tauri/src/lib.rs ; appelé par src/editor/main.ts
- `get_settings` : défini dans src-tauri/src/settings.rs ; appelé par src/lib/i18n.ts
- `get_system_state` : défini dans src-tauri/src/settings.rs ; appelé par src/editor/main.ts
- `overlay_ready` : défini dans src-tauri/src/lib.rs ; appelé par src/overlay/main.ts
- `request_capture` : défini dans src-tauri/src/lib.rs ; appelé par src/editor/main.ts
- `reveal_path` : défini dans src-tauri/src/lib.rs ; appelé par src/editor/main.ts
- `save_png` : défini dans src-tauri/src/lib.rs ; appelé par src/lib/ipc.ts
- `set_autostart` : défini dans src-tauri/src/settings.rs ; appelé par src/editor/main.ts
- `set_language` : défini dans src-tauri/src/settings.rs ; appelé par src/lib/i18n.ts
- `set_printscreen_for_glossyshots` : défini dans src-tauri/src/settings.rs ; appelé par src/editor/main.ts
- `take_editor_pending` : défini dans src-tauri/src/lib.rs ; appelé par src/editor/main.ts

## Événements

- `editor:capture` : émis par src-tauri/src/lib.rs → écouté par src/editor/main.ts
- `overlay:capture` : émis par src-tauri/src/lib.rs → écouté par src/overlay/main.ts

## Communautés

- **src/editor** (73 nœuds) : src/editor/backgrounds.ts, src/editor/main.ts, src/editor/redact.ts, src/editor/render.ts
- **src-tauri/src** (72 nœuds) : src-tauri/src/lib.rs, src-tauri/src/log.rs, src-tauri/src/main.rs, src-tauri/src/settings.rs, src-tauri/src/shortcut.rs, src-tauri/src/tray.rs
- **src/overlay** (21 nœuds) : src/overlay/main.ts
- **src/lib** (15 nœuds) : src/lib/i18n.ts, src/lib/icons.ts, src/lib/ipc.ts
- **video/src** (12 nœuds) : video/src/Demo.tsx, video/src/Promo.tsx, video/src/Root.tsx, video/src/copy.ts, video/src/index.ts, video/src/shot.tsx
- **dev** (4 nœuds) : dev/fake-screenshot.ts, dev/mock.ts

## Fichiers

- `dev/fake-screenshot.ts` : Capture factice (page « Paramètres du compte ») pour l'aperçu navigateur et la vidéo.
- `dev/mock.ts` : Simulateur du cœur Rust pour prévisualiser l'interface dans un navigateur (tests visuels, captures du README, vidéo). Jamais inclus dans le build. Usage : npm run dev puis http://localhost:1420/dev/editor.html
- `src-tauri/src/lib.rs` : Glossyshots : cœur natif. Flux : raccourci global → capture de l'écran sous le curseur (xcap) → fenêtre `overlay` (sélection de zone sur l'image figée) → découpe → fenêtre `editor` (flou, annotations, fond) → presse-papiers / PNG. Les pixel
- `src-tauri/src/log.rs` : Journal minimal dans `<app_log_dir>/glossyshots.log`. En version installée, la console n'existe pas : sans ce fichier, un raccourci perdu ou une fenêtre qui ne répond plus ne laisse aucune trace. Le fichier reste local (aucun envoi) et tour
- `src-tauri/src/main.rs`
- `src-tauri/src/settings.rs` : Préférences persistées (langue) et état système (Impr. écran, démarrage auto).
- `src-tauri/src/shortcut.rs` : Raccourcis globaux : Impr. écran (Windows/Linux) + un raccourci de secours. Deux pièges Windows, gérés ici : - Impr. écran avec une touche de modification encore enfoncée (Alt après un Alt+Tab, Ctrl, Maj) n'est pas « Impr. écran » pour le s
- `src-tauri/src/tray.rs` : Icône de la zone de notification, libellés selon la langue choisie.
- `src/editor/backgrounds.ts` : Fonds générés (aucune image embarquée : zéro poids, zéro droit d'auteur, net à toute taille). « Fonds d'écran » : dégradés maillés, taches de lumière superposées façon Bloom. « Dégradés » : linéaires à deux ou trois arrêts.
- `src/editor/main.ts` : Éditeur : une capture, des masquages et annotations modifiables, un fond. L'état vit ici ; le dessin est délégué à `render.ts` (affichage et export partagés).
- `src/editor/redact.ts` : Flou sécurisé. Un flou classique (gaussien, réduction/agrandissement, pixelisation) calcule chaque pixel masqué à partir des pixels cachés : c'est ce qui le rend attaquable (déconvolution, comparaison avec des rendus de texte connus, réseau
- `src/editor/render.ts` : Rendu de la composition : fond → ombre → capture arrondie → masquages → mise au point → formes → loupes. Une seule fonction sert à l'affichage (réduit) et à l'export (pleine résolution).
- `src/lib/i18n.ts`
- `src/lib/icons.ts` : Icônes au trait (dessin Lucide, ISC). Une seule famille, un seul trait.
- `src/lib/ipc.ts`
- `src/overlay/main.ts` : Overlay de sélection : l'écran figé, assombri, et une zone découpée en pleine lumière. Tout le dessin passe par deux canvas ; aucun reflow pendant le glisser.
- `video/src/Demo.tsx` : Glossyshots : vidéo de présentation (≈35 s, 1920×1080, 30 i/s). Accroche → capture brute → Impr. écran → flou & cercle → fonds → avant/après → atouts → fin.
- `video/src/Promo.tsx` : Visuel fixe pour les posts (Reddit, réseaux) : la loupe en vedette. Rendu avec le vrai moteur de l'app, comme la vidéo.
- `video/src/Root.tsx`
- `video/src/copy.ts`
- `video/src/index.ts`
- `video/src/shot.tsx` : Pont entre Remotion et le vrai moteur de rendu de Glossyshots (`src/editor/render.ts`) : ce que montre la vidéo est exactement ce que produit l'application.

_Généré par le skill graphify (analyse statique). Régénérer au prochain `/save`._
