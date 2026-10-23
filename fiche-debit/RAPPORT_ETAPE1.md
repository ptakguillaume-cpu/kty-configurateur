# Étape 1 : catalogue des codes produit (à valider)

## Chiffres
| | |
|---|---|
| Codes lus dans le PDF « nouveau Code Produit » (42 pages) | **1 927** |
| Codes présents dans l'onglet CODE du XLS | **508** |
| Codes du PDF **absents du XLS** | **1 421** |
| Codes du XLS absents du PDF | 2 |
| Lignes du PDF à revérifier à l'œil | 212 |

Le XLS ne contient donc que **26 %** des codes (506 sur 1 927) : c'est la cause principale des codes manquants.

## 1. Vraies erreurs trouvées dans le XLS (même référence, sens différent)
| Réf. | Page PDF | Le PDF dit | Le XLS dit | Problème |
|---|---|---|---|---|
| 8128 | 16 | Huisserie Classic carré AB DV **avec** traverse – 9005 MAT | CARRÉ AB DV **sans** traverse | inversé |
| 8129 | 16 | Huisserie Classic carré AB DV **sans** traverse – 9005 MAT | CARRÉ AB DV **avec** traverse | inversé |
| 000683 | 24 | Kit intégral type **G** | Kit Intégral Type **H** | inversé |
| 000574 | 24 | Kit intégral type **H** | Kit Intégral Type **G** | inversé |
| 005655 | 25 | Kit intégral DV spécial | Kit Intégral Type **J** | à confirmer |
| 83010 | (XLS) | n'existe pas | Vantail serrure DV 828 PG – 9005 MAT | faute de frappe : c'est le **8310** du PDF (p40) |
| Z-DIV | (XLS) | n'existe pas | « Dessus Traverse à ??? Du Bas de la Porte » | **gardé** : option non référencée mais utilisée (marquée « hors catalogue ») |

## 2. Autres différences (sans gravité, libellés différents)
- 33 références ont un libellé écrit autrement (ex. « Vantail serrure SV 2036 x 728 mm PG - 7016FT » dans le XLS contre « …poussant gauche - RAL7016FT » dans le PDF). Même produit, libellé du PDF retenu.
- Dans le XLS, la colonne « Code EDI » contient **souvent un mot à la place du code** (« SV », « DV », « Rail Coulissant »…) sur 286 lignes. Le code EDI du PDF est retenu.

## 3. À revérifier sur le PDF (lecture du scan)
- **Désignations illisibles** : 8 sur 9 relues à l'œil sur le PDF et corrigées dans le catalogue. Il reste **005651** (p1) : la case désignation est **vide sur le PDF lui-même**.
- **Références avec suffixe** (000987.1, 006505.1, 005462.1 à .4, 007785.1, 005079.1 et .2) : vérifiées sur le PDF, ce sont de vraies références.
- 212 lignes au total sont dans `catalogue_a_verifier.csv`, avec la raison.
- Remarque : le scan a été lu automatiquement (OCR). Les accents sont parfois perdus (« carre » au lieu de « carré »), sans effet sur les codes.

## 4. Fichiers
- `catalogue.json` : catalogue complet, utilisé ensuite par l'outil.
- `catalogue_complet.csv` : le même, à ouvrir dans Excel.
- `catalogue_a_verifier.csv` : seulement les lignes douteuses.

## Répartition par finition
- RAL À DÉFINIR : 329
- (aucune) : 328
- 9005 MAT : 314
- ANODISÉ : 295
- BLANC 9016 : 294
- RAL7016FT : 293
- BRUT : 68

## 5. Codes mal écrits dans le XLS (cause probable des « bugs »)
Le PDF écrit les codes avec des **zéros devant** (6 chiffres sous 8000, par exemple `007280`) et sur 4 chiffres à partir de 8000 (`8001`). Le XLS les mélange :
- **35 codes** écrits sans les zéros (`7280`, `1341`, `7483`…) dans l'onglet CODE : une recherche sur `007280` ne les trouve pas.
- **3 codes à 5 chiffres** : `00516`, `00668`, `00556` (devraient être `000516`, `000668`, `000556`).
- **109 codes saisis comme des nombres** : Excel enlève alors les zéros.
- **43 doublons** dans l'onglet CODE.
- **Attention** : le PDF contient aussi `7346` à `7351` (4 chiffres, couvre-joint plat usiné, page 8). Ce sont d'**autres produits** que `007346` à `007351` (angles 90°, page 1). L'outil garde donc le code **exactement comme écrit**, en texte.
- **008001** (clip de lisse 25, confirmé par vous) n'est **pas dans le PDF** : il est gardé comme « hors catalogue », comme Z-DIV.
