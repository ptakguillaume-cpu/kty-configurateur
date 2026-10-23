# Étape 3 : écran de saisie, points à valider

## Ce qui est identique au XLS
- Les mêmes lignes, longueurs et familles, avec le **code de chaque ligne selon la finition** (9005 MAT, 7016 FT, blanc 9016, anodisé, RAL).
- Les formules : sur 25 saisies aléatoires, le moteur retrouve **exactement** les résultats du XLS recalculé (en mode « formules d'origine »).
- Devis / Commande entouré en rouge, cercle rouge sur « avec joint(s) » des parcloses, forfait laquage affiché en RAL, jonc selon la finition.
- Liste CODE / Désignation / Qts, accessoires (clip, équerre, mousse calculés), impression A4 paysage sur une page.
- Macros reprises : effacer (avec confirmation), ajouter un produit (désignation abrégée), enregistrer sous (PDF, Excel, fichier), imprimer.

## Ce qui diffère, volontairement
| Sujet | XLS | Outil |
|---|---|---|
| Capot 2700 et 3250, angle libre 2550, 2700 et 3250 | un code **seulement en anodisé** | **gardé tel quel** : ces références n'existent plus qu'en anodisé (confirmé). Dans les autres finitions la ligne affiche « — » et une alerte « n'existe plus qu'en ANODISÉ » si on saisit une quantité |
| Clip de lisse 25 | code `008001` tapé à la main | ligne conservée, code `008001` (hors catalogue) |
| Angle 90° 3250 (7e ligne droite) | longueur **vide** dans le XLS | longueur 3250 reprise du catalogue |
| Couvre-joint plat 2,50 m | « +2 » caché dans la formule | case « ± » d'ajout manuel (le cas AKPINAR affiche 58 + 2 manuel = 60 comme le XLS) |
| Quantités négatives | affichées telles quelles | alerte en haut de page ; équerres et mousse bornées à 0 |
| Ligne sans code pour la finition | « RAL ??? » | « — » en rouge et alerte |
| Désignation abrégée | coupe au premier « - », donc « Couvre-joint » devient « Couvre » ; coupe aussi à la virgule | retire seulement la **finition en fin de texte** et garde les dimensions |

## À confirmer
1. **Désignation abrégée** : voulez-vous aussi couper à la virgule comme le XLS ? Exemple avec le PDF : « Porte coulissante SV type A,dim 2036x728mm - anodisé » deviendrait « Porte coulissante SV type A » (dimension perdue). Je l'ai gardée ; la désignation reste modifiable ligne par ligne.
2. **Forfait laquage** (en RAL) : repris tel quel (« 500 / OUI / 1 »). Que représente le 500 ?
3. **Jeu 2 paumelles clarit** et **serrure clarit** : saisis à la main comme dans le XLS (pas de calcul).
