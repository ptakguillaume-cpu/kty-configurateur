# Passation : fiche de débit Classic

## Utiliser sans rien installer
Le fichier **`autonome/Fiche-de-debit-Classic.html`** contient tout : calculs, 1 929 codes produit, dessins, impression, export Excel.
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
- Une fiche ouverte plus tard affiche les codes de la bibliothèque **du moment** (une fiche enregistrée avant un changement de code montrera le nouveau code).
- On ne peut pas créer une nouvelle *ligne* de fiche (nouvelle longueur, nouvelle famille) : pour un produit en plus, utiliser « + Ligne libre » sur la fiche, ou demander une évolution.

## Qui détient quoi
- **Aucune donnée n'est envoyée nulle part** : l'outil n'a aucun serveur ni compte.
- Le code est dans le dépôt GitHub `kty-configurateur` (dossier `fiche-debit/`). Pour le donner à l'entreprise : GitHub, *Settings*, *Transfer ownership* vers l'organisation, ou ajouter un collègue comme propriétaire.
- Le site en ligne (Netlify) se transfère de la même façon : *Team settings*, *Transfer site*.

## Mettre à jour (personne technique)
0. Pour changer des codes, **ne pas passer par là** : utiliser la Bibliothèque des codes (ci-dessus). Les étapes suivantes servent à changer les codes *de départ* livrés avec l'outil.
1. Catalogue : modifier `fiche-debit/catalogue.json` (un code = un texte exact, zéros de tête compris : `007280`, `8001` et `7346` sont trois codes différents).
2. Régénérer les données : `python3 fiche-debit/outils/generer_donnees.py fiche.xlsx fiche-debit/catalogue.json fiche-debit`
3. Régénérer le fichier autonome : `python3 fiche-debit/outils/construire_autonome.py`
4. Vérifier : `node fiche-debit/tests/calcul.test.mjs fiche-debit/tests/cas_xls.json` et `node fiche-debit/tests/bibliotheque.test.mjs`

Règles de calcul : `REGLES_FICHE.md`. Différences avec l'ancien XLS : `ETAPE3_A_VALIDER.md`. Catalogue lu dans le PDF : `RAPPORT_ETAPE1.md`.
