Scaffold une nouvelle fonctionnalité dans Clicadre.

Fonctionnalité : $ARGUMENTS

1. Lis `CLAUDE.md` et `CONTEXT.md` pour connaître la stack et les conventions actuelles. Si la stack n'est pas encore définie, demande-la avant de coder.
2. Si `graphify-out/` existe, interroge le graphe pour repérer les modules concernés.
3. Repère une fonctionnalité existante analogue et calque sa structure (nommage, emplacement, style).
4. Propose un plan court (fichiers créés/modifiés) puis implémente :
   - couche interface (page/route/commande CLI selon la stack),
   - logique métier (service/module),
   - tests si un framework de test est en place.
5. Lis chaque fichier avant de le modifier ; grep les appelants avant de toucher une fonction.
6. Lance `/check-build` pour valider.
7. Mets à jour `CLAUDE.md` (architecture/patterns) si la feature introduit un nouveau pattern.
