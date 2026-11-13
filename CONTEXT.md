# Context — Glossyshots

> Dernière mise à jour : 2026-11-13

## État actuel
v0.2.0 : app renommée **Glossyshots** (ex-Clicadre), dépôt `abg5f/Glossyshots` (redirection GitHub depuis `abg5f/clicadre`). Nouveautés : outil Loupe (zone surélevée avec ombre, zoom 100–400 %, déplaçable, reste de l'image normal/assombri/flouté) et flou sécurisé (aucun pixel masqué réutilisé ; vérifié : 0 pixel de différence entre deux secrets différents). Pixeliser retiré. Vidéo 40 s FR/EN avec scène Loupe, musique lo-fi et bruitages synthétisés.

v0.2.1 : presse-papiers fiable (12 essais sur thread dédié, fin de l'erreur 1418) + copie automatique de chaque capture (option dans Réglages, activée par défaut).
v0.2.2 (publiée) : Impr. écran réservée aussi avec Alt/Ctrl/Maj, surveillance toutes les 10 s qui reprend la touche, capture bloquée libérée après 3 s.
v0.2.3 (commit 35dab5a, tag poussé, build de release en cours au moment du save) : démarrage avec Windows activé une fois par défaut, suppression de l'ancienne entrée Run « Clicadre », réenregistrement des raccourcis à la sortie de veille, délais de garde qui rechargent overlay (1,5 s) / éditeur (2 s), éditeur affiché avant de masquer l'overlay (premier plan), journal local.

Testé en conditions réelles (Windows) : Impr. écran → overlay → éditeur → presse-papiers, autostart, reprise de la touche par la surveillance.
Pas testé : macOS en réel, rechargement de secours d'une page réellement figée (non reproductible).

## Décisions prises
- Stack Tauri 2 + Rust plutôt qu'Electron (performance, installeur ~3 Mo).
- Après la sélection : éditeur avec fond appliqué automatiquement (dernier fond mémorisé, « bloom » par défaut).
- Interface graphite sombre, accent corail unique, polices système.
- Fonds générés par code (pas d'images embarquées) : 8 maillés + 10 dégradés + dégradé perso.
- Nom « Glossyshots », dépôt `abg5f/Glossyshots`, licence MIT. Ne jamais recréer de dépôt `clicadre` (casserait la redirection).
- Impr. écran : bascule HKCU `PrintScreenKeyForSnippingEnabled` déclenchée par l'utilisateur dans Réglages ; secours Ctrl+Shift+X.
- Pas de mise à jour automatique ni de télémétrie : l'app reste 100 % hors ligne (refusé explicitement par l'utilisateur).
- Démarrage auto : opt-out (activé une fois via `autostartInitialized` dans settings.json), ensuite on respecte le choix et le « désactivé » du Gestionnaire des tâches.
- Diagnostic : journal fichier local `logs/glossyshots.log` (512 Ko, rotation), jamais envoyé.

## En cours / TODOs
- Publier la release v0.2.3 une fois le workflow `release.yml` terminé (notes prêtes dans le scratchpad, `notes023.md`), puis installer `Glossyshots_0.2.3_x64-setup.exe` sur le poste.
- Si « app à relancer après veille » revient : lire `%LOCALAPPDATA%\io.github.abg5f.glossyshots\logs\glossyshots.log`.
- Idées non validées : libellés sous les outils du rail, bouton « Faire ressortir » (rectangle → loupe), masquage en aplat plein.
- Roadmap : texte et étapes numérotées, détection de fenêtre, historique, fond d'écran perso / image, formats réseaux sociaux, signature.

## Problèmes connus
- La fausse clé API de la capture factice ne doit jamais ressembler à un vrai format (`sk_live_…` bloqué par le push protection GitHub).
- Git Bash masque `link.exe` : compiler Rust depuis PowerShell. Windows PowerShell 5.1 n'a pas `&&`.
- Multi-écrans : seule l'image de l'écran sous la souris est capturée (pas de sélection à cheval).
- Titre de fenêtre maison : pas de « snap layouts » Windows 11 au survol du bouton agrandir.
- Poste de dev : entrées de démarrage suspectes (syst.exe, offest, torrentu, desktops.ini.exe, old.exe…) signalées à l'utilisateur, non touchées ; à analyser avec Defender hors ligne.
- Tester un build local : `npx tauri build --no-bundle` (un simple `cargo build --release` charge le devUrl). L'instance installée doit être arrêtée (single-instance). Le test réécrit l'entrée Run vers l'exe de test : la remettre sur l'exe installé après.

## Fichiers clés
- `src-tauri/src/lib.rs` — orchestration capture → overlay → éditeur, commandes natives, délais de garde `watch_overlay` / `watch_editor`
- `src-tauri/src/shortcut.rs` — variantes d'Impr. écran, surveillance (touche libre ou sortie de veille)
- `src-tauri/src/settings.rs` — langue, autostart (`init_autostart`, nettoyage `Clicadre`), bascule Impr. écran
- `src-tauri/src/log.rs` — journal fichier et macro `log!`
- `src/editor/render.ts` — rendu partagé affichage/export
- `src/editor/main.ts` — logique de l'éditeur
- `src/overlay/main.ts` — sélection de zone
- `dev/mock.ts` — backend simulé pour l'aperçu navigateur
- `video/src/Demo.tsx` — vidéo de présentation

## Graphe de connaissances
> Mis à jour le 2026-11-13

God nodes (concepts centraux) : `src/editor/main.ts` (58), `src-tauri/src/lib.rs` (42), `src-tauri/src/settings.rs` (24), `src/overlay/main.ts` (22), `src/editor/render.ts` (18)
Communautés détectées : 6 (197 nœuds, 228 arêtes ; 16 commandes IPC, 2 événements)
Pour explorer : `graphify-out/index.md` (commandes IPC avec appelants, événements, communautés)

---
_Mis à jour via `/save`. Lire ce fichier en début de session pour reprendre le contexte._
