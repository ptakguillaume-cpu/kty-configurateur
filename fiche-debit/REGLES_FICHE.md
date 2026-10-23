# Étape 2 : règles de la fiche de débit (à valider)

Ce document décrit comment fonctionne votre XLS, en clair, puis liste les points qui semblent des erreurs, avec la correction proposée. **Rien n'est repris dans l'outil avant votre accord.**

## 1. Ce que fait le XLS

### Saisie (cases à remplir)
| Zone | Contenu |
|---|---|
| En-tête | Société, référence chantier, niveau (R+1…), **finition** (liste), devis ou commande |
| Colonne gauche (E4:E44) | Lisse, montants, parcloses, meneaux, angles carrés, angles départ multiple, départ multiple à couvre-joint, clip de lisse |
| Colonne droite (J4:J40) | Départ, couvre-joint Oméga, angle 90° P2D, montant spécial renforcé, capot, angle libre, angle/plat de doublage, huisseries |
| Options (R7:U15) | Nombre de montants de doublage et leur longueur, largeurs de portes (CA simple, CA double vantail), RAL demandé |
| Recherche libre (S37:S38) | Choix d'un produit hors fiche + RAL, ajouté à la liste des codes |

### Calcul
- **Code produit** : pour chaque ligne, le code est pris dans un tableau caché (colonnes V à AE) selon la finition choisie (9005 MAT, 7016 FT, blanc 9016, anodisé, RAL à définir).
- **Quantités calculées automatiquement** : couvre-joint plat (E11:E15), clips, équerres, mousse de départ, jeux de paumelles (J41, J42).
- **Liste de sortie** (CODE / Désignation / Qts) : remplie par une macro qui ajoute le produit cherché à la première ligne libre, avec une désignation abrégée (« Huisserie » devient « Huis. », « poussant gauche » devient « PG »…).

### Macros reprises dans l'outil
| Macro du XLS | Fonction dans l'outil |
|---|---|
| EFFACER (avec confirmation) | Bouton « Nouvelle fiche » avec confirmation |
| AjouterProduit | Recherche d'un produit + RAL, ajout à la liste, abréviations identiques |
| Enregistrer_sous | « Fiche de Débit [chantier] [niveau] » en PDF, en Excel (.xlsx) et en fichier de sauvegarde |
| enregistrer | Imprimer |
| Cercle rouge | Cercle rouge sur la ligne « avec joint » quand E16, E18, E19 ou E21 est rempli |

## 2. Règles de calcul actuelles, en clair

- **Couvre-joint plat, par longueur** = 2 × (montants + meneaux + angles départ multiple + départ multiple à C. joint + départ + montants spéciaux renforcés de cette longueur)
  − (montants de doublage de cette longueur, option R7) − (couvre-joint Oméga) + (montants spéciaux renforcés, option U9, ×2)
  Pour 2,50 m seulement : + huisseries simples + 2 × huisseries DV + 2.
- **Clips** = couvre-joints plats × (8, 9, 10, 11, 12 selon la longueur 2,5 / 2,7 / 3,05 / 3,25 / 5,75), arrondi à la boîte de 100.
- **Équerres** = 2 × (montants, angles départ multiple, départ multiple C. joint, départ, angles 90° P2D, montants spéciaux renforcés) + 2 × R10 (option « Nb de montants pour traverse / DL ») + 6 × meneaux + 4 × angles carrés + U9, moins 2 × R44 (voir point I).
- **Mousse de départ** = longueur × 2 × quantité de départs, arrondie à 5 m, par longueur.
- **Jeux de paumelles** : huisseries simples moins celles des portes CA simples ; huisseries DV moins celles des CA double vantail.

## 3. Points douteux, et ce que je propose

| N° | Où | Constat | Proposition | Votre avis |
|---|---|---|---|---|
| A | E12 (2,7 m) | soustrait **J10** (Oméga 3050) alors qu'il n'y a pas d'Oméga 2700 | ne rien soustraire | |
| B | E14 (3,25 m) | soustrait **J10** (Oméga 3050) alors qu'il n'y a pas d'Oméga 3250 | ne rien soustraire | |
| C | E15 (5,75 m) | ajoute les montants spéciaux si U7 = **3,25** (au lieu de 5,75) | tester 5,75 | |
| D | E11 seulement | ajoute « huisseries simples + 2 × huisseries DV + 2 » ; le « +2 » est une constante sans explication | garder les huisseries sur 2,50 m ; **le +2 : à vous de dire** | |
| E | D21 | `=SI(C18=0;"";3000)` teste **C18** au lieu de **C21** (copier-coller) | tester C21 | |
| F | Options S8 / U8 | la 2e ligne de longueur (2,5 et 5,75) existe mais **aucune formule ne la lit** | prendre en compte les 2 lignes (R7+R8, T7+T8) | |
| G | Clips V28 | 5,75 m = ×12 clips, alors que 3,25 m = ×11 : progression incohérente | à vous de me donner le bon nombre pour 5,75 m | |
| H | Clip de lisse, ligne 43 | code tapé **008001** = « Angle 90° lg 2700 – 9005 MAT » pour une longueur 25, quantité 50 | à vous de dire quel clip de lisse c'est | |
| I | R44 | cellule non étiquetée, retirée de P38 (équerres) et P44 (mousse) : « −R44×2 » et « −5×R44 » | à vous de dire ce que c'est | |
| J | Formule G12 (jonc) | si RAL à définir : affiche un **code** au lieu d'un nom de couleur | afficher « RAL à définir » | |

## 4. Contrôle des codes cachés (V à AE)
Tous les codes des tableaux de finition ont été comparés au PDF : **tous existent** et la finition correspond à la colonne (blanc, anodisé, 7016, 9005, RAL).
Les produits « brut » (montants spéciaux renforcés 6600 à 6605, départ, montant) ont volontairement le même code dans toutes les colonnes.
Le jonc anodisé donne « Jonc gris RAL 7035 » (134) : voulu, la fiche l'affiche aussi (« GRIS 7035 »).

Donc les codes faux viennent surtout de **l'onglet CODE incomplet** (508 codes sur 1 925), pas de ces tableaux.
