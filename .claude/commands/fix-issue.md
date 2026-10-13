Diagnostique et corrige un bug dans Glossyshots.

Symptôme : $ARGUMENTS

1. **Reproduire** : identifie la commande / l'action qui déclenche le bug et récupère la sortie exacte (logs, stack trace, console navigateur, logs de déploiement).
2. **Localiser** : interroge `graphify-out/` s'il existe, sinon grep les messages d'erreur et symboles concernés. Lis les fichiers en entier.
3. **Cause racine** : formule une hypothèse et vérifie-la (log ciblé, test minimal) avant de corriger. Ne pas corriger le symptôme seul.
4. **Fix** : grep tous les appelants de la fonction modifiée ; applique le changement minimal.
5. **Vérifier** : rejoue la reproduction, puis `/check-build`. Ajoute un test de régression si un framework de test existe.
6. Note le problème et sa résolution dans `CONTEXT.md` (section « Problèmes connus » si non résolu).
