# Fiche de débit Classic

Remplace le fichier Excel « Fiche de Débit Classic ». Fonctionne sans internet, sur PC et tablette : ouvrir `fiche-debit/` (bouton « Fiche de débit Classic » sur l'écran d'accueil du configurateur).

## Utilisation
- **Saisir** les quantités dans les deux tableaux. Le code de chaque ligne suit la **finition** choisie dans l'en-tête.
- **Couvre-joint plat** (calculé) : la petite case « ± » permet un ajout manuel.
- **Options de calcul** (sous la fiche) : montants de doublage, montants renforcés, traverses, départs en lisse, portes CA.
- **Ajouter un produit** : recherche par nom ou par code, puis « Ajouter » ; « + Ligne libre » pour un code hors catalogue.
- **Enregistrer sous…** : fichier `Fiche de Débit [chantier] [niveau].json` à rouvrir avec « Ouvrir… ».
- **Excel** : fichier `.xlsx` (codes en texte, zéros conservés).
- **PDF / Imprimer** : A4 paysage, une page ; choisir « Enregistrer au format PDF » dans la fenêtre d'impression.
- Un brouillon est gardé automatiquement sur l'appareil.

## Fichiers
| Fichier | Rôle |
|---|---|
| `calcul.js` | règles de calcul (formules du XLS + corrections validées) |
| `donnees.js`, `donnees-rdb1.js` | lignes de la fiche et codes par finition, gammes Classic et RDB1 (générés) |
| `catalogue.js` | 1 929 codes produit du PDF « nouveau Code Produit » (généré) |
| `catalogue.json`, `*.csv` | le même catalogue, lisible ; `RAPPORT_ETAPE1.md`, `REGLES_FICHE.md` : rapports validés |
| `app.js`, `index.html`, `style.css` | écran |
| `xlsx.js` | lecture et écriture Excel sans bibliothèque |
| `revision.js` | suivi des modifications (version figée, couleurs ajouté / modifié / retiré) |
| `bibliotheque.js` | bibliothèque des codes (modifier, ajouter, importer, exporter) |
| `autonome/Fiche-de-debit-Classic.html` | tout en un seul fichier, s'ouvre par double-clic (voir `PASSATION.md`) |
| `outils/generer_donnees.py` | régénère `donnees.js` et `catalogue.js` |
| `tests/` | tests du moteur de calcul et de l'import de la bibliothèque |

## Tests
```
node fiche-debit/tests/calcul.test.mjs fiche-debit/tests/cas_xls.json
node fiche-debit/tests/bibliotheque.test.mjs
node fiche-debit/tests/revision.test.mjs
```
Compare le moteur (en mode « formules d'origine ») au XLS recalculé sur 25 saisies aléatoires, puis vérifie les corrections validées.

## Mise à jour du catalogue
Modifier `catalogue.json`, puis :
```
python3 fiche-debit/outils/generer_donnees.py fiche.xlsx fiche-debit/catalogue.json fiche-debit
```
(`fiche.xlsx` = le XLS d'origine converti en .xlsx.) Les codes sont des **textes exacts** : `007280`, `8001` et `7346` sont trois codes différents.
Le PDF liste aussi des références qui n'existent plus dans certaines finitions : les tableaux de la fiche (donnés par le XLS) font foi, le catalogue n'ajoute rien de lui-même.
Après toute modification, augmenter le numéro de version dans `sw.js` pour que les tablettes rechargent les fichiers.
