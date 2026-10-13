# Context — Glossyshots

> Dernière mise à jour : 2026-10-12

## État actuel
v0.2.0 : app renommée **Glossyshots** (ex-Clicadre), dépôt `abg5f/Glossyshots` (redirection GitHub depuis `abg5f/clicadre`). Nouveautés : outil Loupe (zone surélevée avec ombre, zoom 100–400 %, déplaçable, reste de l'image normal/assombri/flouté) et flou sécurisé (aucun pixel masqué réutilisé ; vérifié : 0 pixel de différence entre deux secrets différents). Pixeliser retiré. Vidéo 40 s FR/EN avec scène Loupe, musique lo-fi et bruitages synthétisés.

Testé : clippy, 3 tests Rust, typecheck, interactions de la loupe en JS (création, déplacement, molette), rendu de la loupe via Remotion, preuve d'indépendance du flou.
**Pas encore testé en conditions réelles** : capture native + overlay, presse-papiers Windows, bascule Impr. écran, autostart, macOS.

## Décisions prises
- Stack Tauri 2 + Rust plutôt qu'Electron (performance, installeur ~3 Mo).
- Après la sélection : éditeur avec fond appliqué automatiquement (dernier fond mémorisé, « bloom » par défaut).
- Interface graphite sombre, accent corail unique, polices système.
- Fonds générés par code (pas d'images embarquées) : 8 maillés + 10 dégradés + dégradé perso.
- Nom « Glossyshots », dépôt `abg5f/glossyshots`, licence MIT.
- Impr. écran : bascule HKCU `PrintScreenKeyForSnippingEnabled` déclenchée par l'utilisateur dans Réglages ; secours Ctrl+Shift+X.

## En cours / TODOs
- Tester le chemin natif réel (Impr. écran / Ctrl+Shift+X, overlay, presse-papiers).
- Roadmap : texte et étapes numérotées, détection de fenêtre, historique, fond d'écran perso / image, formats réseaux sociaux, signature.

## Problèmes connus
- La fausse clé API de la capture factice ne doit jamais ressembler à un vrai format (`sk_live_…` bloqué par le push protection GitHub).
- Git Bash masque `link.exe` : compiler Rust depuis PowerShell.
- Multi-écrans : seule l'image de l'écran sous la souris est capturée (pas de sélection à cheval).
- Titre de fenêtre maison : pas de « snap layouts » Windows 11 au survol du bouton agrandir.

## Fichiers clés
- `src-tauri/src/lib.rs` — orchestration capture → overlay → éditeur, commandes natives
- `src/editor/render.ts` — rendu partagé affichage/export
- `src/editor/main.ts` — logique de l'éditeur
- `src/overlay/main.ts` — sélection de zone
- `dev/mock.ts` — backend simulé pour l'aperçu navigateur
- `video/src/Demo.tsx` — vidéo de présentation

---
_Mis à jour via `/save`. Lire ce fichier en début de session pour reprendre le contexte._
