## Protocole de fin de travail (agents de Guillaume)

Les agents ci-dessous sont dans .claude/agents/. N'appelle que ceux qui existent dans ce dépôt, et seulement si le changement le justifie : un correctif d'une ligne ou un changement de texte n'en demande aucun.

Après une modification de code :
- toujours verificateur-code ; ne dis jamais « c'est terminé » avant qu'il réponde OK ;
- si l'affichage change : testeur-rendu, puis regarde le résultat avant de livrer ;
- si le code touche authentification, chiffrement, données de dossiers, synchronisation, montants ou délais : relecteur-securite ;
- si un document funéraire officiel, un montant ou un délai légal change : relecteur-conformite-funeraire ;
- si le jeu est piloté par un live TikTok : gardien-live-tiktok.

Avant un déploiement : recette-avant-deploiement. Elle liste ce que je dois tester moi-même ; ne conclus jamais « prêt pour la prod » à ma place.

En fin de session après un travail significatif : scribe-claudmap.

Méthode :
- lance en parallèle les agents indépendants, dans le même message ;
- garde les agents Opus (relecteur-securite, relecteur-conformite-funeraire) pour le code sensible, ils coûtent cher ;
- ne relis pas toi-même ce qu'un agent vient de contrôler ;
- termine par un résumé court : ce qui a été fait, le verdict de chaque agent appelé, ce qu'il me reste à tester.
