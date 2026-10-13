# Glossyshots

Outil de capture d'écran open source (MIT) pour Windows (prioritaire) et macOS : Impr. écran → sélection de zone → flou sécurisé / loupe / annotations → la capture est posée sur un fond (marge, coins arrondis, ombre) → copier ou enregistrer. Interface bilingue FR/EN.

Dépôt public : `abg5f/Glossyshots` (ex-`clicadre`, redirigé par GitHub ; dépôt git propre au dossier local `45_Clicadre`, imbriqué dans `0_Claude Code`). Ne jamais recréer de dépôt `clicadre` : cela casserait la redirection des liens déjà publiés.

## Stack technique

- **Tauri 2** (Rust) : fenêtres, zone de notification, raccourcis globaux, autostart, single-instance
- **Rust** : `xcap` (capture écran), `arboard` (presse-papiers image), `winreg` (touche Impr. écran, Windows)
- **Front** : TypeScript + Vite, **sans framework**, rendu Canvas 2D
- **Design** : tokens OKLCH (`src/styles/tokens.css`), graphite + un accent corail, polices système
- **Vidéo** : Remotion 4 (`video/`), réutilise le vrai moteur de rendu de l'app

## Commandes essentielles

| Action | Commande |
|--------|----------|
| Dev (app complète) | `npm run app:dev` |
| Dev (UI seule, navigateur, backend simulé) | `npm run dev` puis `http://localhost:1420/dev/editor.html` (`?lang=en`, `?empty`, `?snip`) |
| Build front | `npm run build` (typecheck + Vite) |
| Build installeurs | `npm run app:build` → `src-tauri/target/release/bundle/` |
| Lint Rust | `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings` |
| Tests Rust | `cargo test --manifest-path src-tauri/Cargo.toml` |
| Vidéo | `cd video && npm run render:fr` / `render:en` / `render:gif` / `npm run studio` |

> **Windows : lancer Cargo depuis PowerShell, jamais depuis Git Bash** (le `link` de coreutils masque `link.exe` de MSVC). Rust est dans `%USERPROFILE%\.cargo\bin` (ajouter au PATH si besoin). Prérequis : VS Build Tools 2022 + charge « Développement Desktop en C++ » (installée le 2026-10-12).

## Variables d'environnement

Aucune. L'app est entièrement hors ligne.

## Architecture

```
src-tauri/src/
  lib.rs        capture (xcap) → état → overlay → découpe → éditeur ; copy_image / save_png / reveal_path
  shortcut.rs   Impr. écran + secours (Ctrl+Shift+X ; Cmd+Shift+2 sur mac)
  settings.rs   langue (settings.json dans app_config_dir), clé HKCU PrintScreenKeyForSnippingEnabled, autostart
  tray.rs       menu de la zone de notification (libellés FR/EN)
src/
  overlay/main.ts   sélection : image figée, voile evenodd, loupe ×8, badge dimensions
  editor/main.ts    état, outils, poignées, historique, raccourcis, panneau Fond, réglages
  editor/render.ts  rendu unique affichage + export (fond → ombre → capture → masquages → mise au point → formes → loupes)
  editor/redact.ts  flou sécurisé : n'utilise JAMAIS les pixels de la zone masquée (bord extérieur + fausses lignes + grain)
  editor/backgrounds.ts  fonds générés (8 « wallpapers » maillés + 10 dégradés + perso)
  lib/i18n.ts       dictionnaires FR/EN, data-i18n / data-i18n-title
  lib/ipc.ts        format binaire (u32 LE largeur, u32 LE hauteur, RGBA)
dev/            mock du backend Tauri + capture factice (aperçu navigateur, vidéo) — hors build
video/          Remotion (Demo-fr, Demo-en, Teaser-en)
docs/media/     vidéos, GIF du README, image d'en-tête
```

Fenêtres déclarées dans `tauri.conf.json` : `overlay` (cachée, sans bordure, toujours devant) et `editor` (cachée, sans décorations, barre de titre maison). Fermer l'éditeur le **masque** (l'app reste dans la zone de notification).

## Patterns clés

- **Pixels en binaire brut** sur l'IPC (`tauri::ipc::Response` / `InvokeBody::Raw`), jamais en base64.
- **Une seule fonction de rendu** (`render.ts`) pour l'aperçu et l'export : toute nouvelle option visuelle s'ajoute là.
- Ajouter un **outil** : type `Kind` dans `render.ts` (+ dessin), bouton `data-tool` dans `editor.html`, raccourci dans `TOOL_KEYS`, libellés dans `i18n.ts`.
- **Flou** : ne jamais réintroduire un flou calculé depuis le contenu masqué (gaussien, réduction, pixelisation). Tout calque dérivé (ex. fond adouci des loupes) part de l'image DÉJÀ masquée.
- **Loupe** (`kind: "magnify"`) : `x1..y2` = zone source, `zoom` 1→4, `dx/dy` = décalage de la vue agrandie, `focus` = none/dim/blur pour le reste de l'image.
- Ajouter un **fond** : entrée dans `backgrounds` (`backgrounds.ts`), noms `{ fr, en }`.
- Ajouter un **texte** : clé dans les deux dictionnaires de `i18n.ts` (le type `Key` force la parité FR/EN).
- Ajouter une **commande native** : `#[tauri::command]` + `generate_handler!` dans `lib.rs`.
- Design : un seul accent, pas de tiret cadratin dans les textes, animations 120–240 ms en ease-out, `prefers-reduced-motion` respecté.

## Déploiement

- GitHub Actions : `ci.yml` (build + clippy) et `release.yml` (tag `v*` → installeurs Windows .exe/.msi et macOS .dmg arm64/x64 en release brouillon via `tauri-action`).
- Publier une version : bumper `version` dans `package.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`, puis `git tag vX.Y.Z && git push --tags`.
- Builds non signés pour l'instant (SmartScreen / Gatekeeper).

## Cartographie graphify

Le graphe de connaissances (skill `/graphify`) vit dans `graphify-out/`. Pour explorer :
- `/graphify` puis interroger — chercher par concept
- god nodes / communautés listés dans `graphify-out/index.md`

> Note : `graphify` est un skill (Claude écrit `graphify-out/`), pas un CLI shell.
> Pas encore généré : à créer au prochain `/save`.
