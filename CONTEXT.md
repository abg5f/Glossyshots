# Context — Clicadre

> Dernière mise à jour : 2026-10-12

## État actuel
v0.1.0 fonctionnelle en dev (`npm run app:dev`) : capture de zone, flou, pixelisation, ellipse, rectangle, flèche, fonds générés, copier / enregistrer, zone de notification, FR/EN, réglage Impr. écran. README EN + FR, vidéo de démo FR/EN + GIF rendus dans `docs/media/`. Dépôt GitHub public pas encore créé (attend validation).

Testé : `cargo clippy -D warnings`, 3 tests unitaires Rust (découpe, format binaire), typecheck TS, build Vite, éditeur dans le navigateur avec backend simulé (flou, cercle, poignées, fonds, FR/EN, Ctrl+C).
**Pas encore testé en conditions réelles** : capture native + overlay, presse-papiers Windows, bascule de la clé Impr. écran, autostart, macOS.

## Décisions prises
- Stack Tauri 2 + Rust plutôt qu'Electron (performance, ~10 Mo).
- Après la sélection : éditeur avec fond appliqué automatiquement (dernier fond mémorisé, « bloom » par défaut).
- Interface graphite sombre, accent corail unique, polices système.
- Fonds générés par code (pas d'images embarquées) : 8 maillés + 10 dégradés + dégradé perso.
- Nom « Clicadre », dépôt `abg5f/clicadre`, licence MIT.
- Impr. écran : bascule HKCU `PrintScreenKeyForSnippingEnabled` déclenchée par l'utilisateur dans Réglages ; secours Ctrl+Shift+X.

## En cours / TODOs
- Tester le chemin natif réel (Impr. écran / Ctrl+Shift+X, overlay, presse-papiers).
- Créer le dépôt public `abg5f/clicadre` et pousser (après validation).
- Premier tag `v0.1.0` pour générer les installeurs via GitHub Actions.
- Roadmap : texte et étapes numérotées, détection de fenêtre, historique, fond d'écran perso / image, formats réseaux sociaux, signature.

## Problèmes connus
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
