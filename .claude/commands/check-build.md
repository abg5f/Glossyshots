Vérifie que Glossyshots est prêt à être déployé.

1. Lis la section « Commandes essentielles » de `CLAUDE.md`.
2. Exécute dans l'ordre, en s'arrêtant au premier échec : install des dépendances → lint → typecheck (si applicable) → tests → build.
3. Si une commande n'est pas encore définie, signale-le au lieu de l'inventer.
4. `git status` : vérifie qu'aucun secret (`.env`, clés) ni artefact de build n'est sur le point d'être commité.
5. Résume : ✅/❌ par étape, avec l'extrait d'erreur pertinent pour chaque échec.
