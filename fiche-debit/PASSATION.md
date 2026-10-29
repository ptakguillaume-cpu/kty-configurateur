# Passation : fiche de débit Classic

## Utiliser sans rien installer
Le fichier **`autonome/Fiche-de-debit-Classic.html`** contient tout (gammes Classic et RDB1, choix en haut de la fiche) : calculs, 1 931 codes produit, dessins, impression, export Excel.
- Double-clic pour l'ouvrir (Chrome ou Edge conseillés). **Pas d'internet, pas de compte, pas de serveur.**
- Il peut être copié sur un PC, un partage réseau, une clé USB ou envoyé par mail.
- **PDF / Imprimer** : A4 paysage, une page. **Excel** et **Enregistrer sous…** : fichiers à classer comme n'importe quel document.
- Chaque fiche est un fichier `.json` à rouvrir avec « Ouvrir… ». Le brouillon automatique reste dans le navigateur de l'appareil (il est perdu si on change de navigateur ou de dossier : ne pas s'y fier, enregistrer la fiche).

## Changer un code sans toucher au programme : la « Bibliothèque des codes »
Bouton **« Bibliothèque des codes »** en haut de la fiche. Trois onglets :
- **Codes par ligne** : le code de chaque ligne de la fiche, pour chaque finition (et les accessoires). On corrige la case, c'est enregistré tout de suite. Une case vide = pas de code pour cette finition. Un code en **rouge** n'existe pas dans le catalogue.
- **Catalogue** : chercher un produit, modifier sa désignation, son code EDI ou sa finition, **ajouter** un nouveau produit, en supprimer un.
- **Échanges** : enregistrer la bibliothèque dans un fichier (à donner aux autres postes), l'ouvrir sur un autre poste, **exporter vers Excel**, corriger dans Excel, **réimporter**. Si Excel enlève des zéros (000959 devient 959), ils sont rétablis à l'import quand le code existe. « Revenir aux codes d'origine » remet l'état de départ.

Bon à savoir :
- La bibliothèque est gardée **dans le navigateur de l'appareil**. Pour que tous les postes aient les mêmes codes : un poste modifie, enregistre la bibliothèque, les autres l'ouvrent.
- Quand l'outil est mis à jour avec de nouveaux codes, **les lignes que vous n'avez jamais modifiées dans la bibliothèque suivent les nouveaux codes** ; une ligne que vous avez corrigée garde votre code.
- Une fiche ouverte plus tard affiche les codes de la bibliothèque **du moment** (une fiche enregistrée avant un changement de code montrera le nouveau code).
- On ne peut pas créer une nouvelle *ligne* de fiche (nouvelle longueur, nouvelle famille) : pour un produit en plus, utiliser « + Ligne libre » sur la fiche, ou demander une évolution.

## Suivi des modifications (pour le dépôt)
- **« Figer cette version »** (haut de la fiche) : à faire quand la fiche est envoyée. Elle devient la version n°0. Le bouton « Arrêter le suivi » n'apparaît qu'ensuite.
- Ensuite, chaque changement apparaît en **écriture violette** (le fond des cases reste gris / blanc, réservé au stabilo) : « ajouté », ou « avant 17 » pour une quantité modifiée ou retirée. Cela vaut pour les saisies comme pour les lignes calculées (couvre-joint, clips, équerres, mousse…). Un bandeau « MODIFICATION n°1 » s'imprime en haut de la fiche ; les produits retirés de la liste restent visibles, barrés.
- **« Valider les modifications »** : fige la fiche corrigée comme nouvelle version (n°1, n°2…), les mentions repartent de zéro. **« Arrêter le suivi »** : supprime le suivi.
- Le suivi est enregistré avec la fiche (fichier « Enregistrer sous… ») et la liste des changements est ajoutée à l'export Excel.

## Nouvelle fiche : le formulaire « Types de cloison et portes » (Classic)
« Nouvelle fiche » ouvre un formulaire (on peut le passer ; le bouton « Type de cloison… » des options le rouvre). Il remplit des cases **que l'on peut toujours corriger à la main** :
- **Types de cloison** (PTH, PTH avec imposte, VTH, VTH avec imposte, VSA, VSA avec imposte), avec le **nombre de modules** de chaque type, plusieurs types possibles. Traverses par module : 0 pour PTH et VTH, 1 pour PTH imposte, VTH imposte et VSA, 2 pour VSA imposte (allège + imposte). Chaque traverse = 2 équerres ; elles sont coupées dans des montants de 2500 (2 traverses par montant).
- **Cloison de 2500 de haut** (case) : les montants des traverses sont alors comptés à part et toutes les équerres des traverses sont ajoutées. Sinon, les montants des traverses sont **ajoutés automatiquement à la ligne Montant 2500** (case « Montants de 2500 pour les traverses » des options ; info « dont N pour les traverses » au survol). Ne plus les saisir à la main.
- **Portes : nombre de jeux de paumelles** : portes alu SV → ligne « Jeu 3 paumelles alu » ; portes alu isolant (et CA toute hauteur) → « Jeu 4 paumelles alu » ; portes bois toute hauteur → ligne « Jeu 4 pau. porte bois toute hauteur » ajoutée à la liste des produits (code de la finition). Les jeux alu sont **retirés du Jeu 3 paumelles bois** (calculé avec les huisseries simples) ; l'option « Portes CA » devient inutile si le formulaire est rempli.
- **Huisseries double alu type B** : choix SV ou isolant ; la quantité saisie sur les huisseries type B (1270 à 1870) remplit alors automatiquement **Jeu 6 paumelles alu** (SV) ou **Jeu 8 paumelles alu** (isolant). Choisir « je saisis moi-même » si les deux types sont mélangés.
- Le Jeu 3 paumelles bois reste à 0 s'il n'y a aucune huisserie simple dans la grille (cas des huisseries TH).

## Grille Classic : ce qui a changé
- **Montant et couvre-joint plat de 3700** ajoutés (montant 001452 ; couvre-joint 001711 à 001713 et 8069, 12 clips ; **le code 7016 FT du couvre-joint 3700 reste à ajouter** dans la Bibliothèque).
- **Montant spécial renforcé** : nouveaux codes 006600, 006602, 006603, 006604, 006605 (brut, toutes finitions).
- **Clips de lisse** déplacés dans le tableau des accessoires. **Paumelles** : « Jeu 2 paumelles clarit » et « Serrure clarit » remplacés par Jeu 3 alu, Jeu 4 alu, Jeu 6 alu et Jeu 8 alu (2050) ; les anciennes quantités des fiches déjà enregistrées sont reprises (clips dans les accessoires, clarit et serrure dans la liste des produits).
- **Huisseries double alu carré type B** (1270, 1470, 1670, 1870) dans la grille : +2 couvre-joints plats chacune, sans effet sur le Jeu 6 paumelles bois.
- Les lignes **capot 2700 / 3250 et angle libre 2550 / 2700 / 3250** (codes seulement en anodisé) ne s'affichent **qu'en anodisé** ; en anodisé, le bloc Angle libre passe en bas du tableau de gauche. Plus de ligne vide sous le jonc. **Le Jeu 8 paumelles bois toute hauteur n'a pas de code en 9005 MAT** dans le catalogue.
- Blocs parclose en un seul rectangle, comme l'Excel d'origine. Les tableaux de gauche et du milieu s'étirent pour remplir la page (pas de case vide) ; lignes un peu plus serrées en anodisé.

## Liste CODE / Désignation / Qts
- Bouton **« + Huisseries… »** : ajoute les huisseries double alu carré type B (1270 à 1870) et les huisseries TH carré (SV / DV, avec ou sans traverse, sur mesure : la dimension se précise dans la désignation), avec le code de la finition. Les huisseries doubles ajoutent aussi leur jeu de paumelles (Jeu 6 pour les type B ; Jeu 8 alu isolant, alu toute hauteur ou bois toute hauteur selon le choix « Portes des huisseries doubles TH »).
- La liste est organisée **par blocs de porte** : une huisserie ouvre un bloc (la première en tête de liste), puis paumelles, vantail, reste. Les lignes déjà présentes ne bougent pas.

## Enregistrer, imprimer
- **Enregistrer sous… / Excel** : sur Chrome et Edge, vraie fenêtre « Enregistrer sous » (dossier et nom au choix) ; sur Firefox et Safari, le fichier va dans Téléchargements. PDF : imprimer, imprimante « Enregistrer au format PDF ».
- La fiche tient sur **une page A4 paysage** en blanc, anodisé et RAL, avec une petite marge de sécurité en bas. Les « 0 » calculés ne s'impriment pas.
- Quantités : chiffres seulement ; Entrée passe à la case suivante ; cases plus hautes sur tablette. Recherche de produit par mots entiers (« jeu 4 » ne ressort plus que les « Jeu 4… »).
- Mise à jour : une nouvelle version s'applique dès la fermeture et la réouverture de l'application (une fois), puis automatiquement.

## Adresse principale du site
`_redirects` (Netlify) envoie l'adresse principale vers la fiche ; l'outil fait de même pour ceux qui l'ont déjà en mémoire. Le configurateur de cloisons n'est plus mis en avant mais reste dans le dépôt et sur `/index.html`. Pour le remettre en page d'accueil : supprimer le fichier `_redirects` et retirer le bloc « adresse principale » de `sw.js`.

## Qui détient quoi
- **Aucune donnée n'est envoyée nulle part** : l'outil n'a aucun serveur ni compte.
- Le code est dans le dépôt GitHub `kty-configurateur` (dossier `fiche-debit/`). Pour le donner à l'entreprise : GitHub, *Settings*, *Transfer ownership* vers l'organisation, ou ajouter un collègue comme propriétaire.
- Le site en ligne (Netlify) se transfère de la même façon : *Team settings*, *Transfer site*.

## Mettre à jour (personne technique)
0. Pour changer des codes, **ne pas passer par là** : utiliser la Bibliothèque des codes (ci-dessus). Les étapes suivantes servent à changer les codes *de départ* livrés avec l'outil.
1. Catalogue : modifier `fiche-debit/catalogue.json` (un code = un texte exact, zéros de tête compris : `007280`, `8001` et `7346` sont trois codes différents).
2. Régénérer les données : `python3 fiche-debit/outils/generer_donnees.py fiche.xlsx fiche-debit/catalogue.json fiche-debit`, **puis** `python3 fiche-debit/outils/ajustements_classic.py` (réapplique les ajustements de la Classic : 3700, clips, paumelles alu, huisseries type B, montant spécial renforcé… ; sans danger si relancé)
3. Régénérer le fichier autonome : `python3 fiche-debit/outils/construire_autonome.py`
4. Vérifier : `node fiche-debit/tests/calcul.test.mjs fiche-debit/tests/cas_xls.json` `node fiche-debit/tests/bibliotheque.test.mjs` et `node fiche-debit/tests/revision.test.mjs`

Gamme RDB1 : `RDB1.md` ; régénérer ses données : `python3 fiche-debit/outils/generer_rdb1.py base.xlsx a7016.xlsx a9005.xlsx fiche-debit/catalogue.json fiche-debit` (Excel RDB1 convertis en .xlsx).
Règles de calcul : `REGLES_FICHE.md`. Différences avec l'ancien XLS : `ETAPE3_A_VALIDER.md`. Catalogue lu dans le PDF : `RAPPORT_ETAPE1.md`.
