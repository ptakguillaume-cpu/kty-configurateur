# Passation : fiche de débit Classic

## Utiliser sans rien installer
Le fichier **`autonome/Fiche-de-debit-Classic.html`** contient tout : calculs, 1 929 codes produit, dessins, impression, export Excel.
- Double-clic pour l'ouvrir (Chrome ou Edge conseillés). **Pas d'internet, pas de compte, pas de serveur.**
- Il peut être copié sur un PC, un partage réseau, une clé USB ou envoyé par mail.
- **PDF / Imprimer** : A4 paysage, une page. **Excel** et **Enregistrer sous…** : fichiers à classer comme n'importe quel document.
- Chaque fiche est un fichier `.json` à rouvrir avec « Ouvrir… ». Le brouillon automatique reste dans le navigateur de l'appareil (il est perdu si on change de navigateur ou de dossier : ne pas s'y fier, enregistrer la fiche).

## Qui détient quoi
- **Aucune donnée n'est envoyée nulle part** : l'outil n'a aucun serveur ni compte.
- Le code est dans le dépôt GitHub `kty-configurateur` (dossier `fiche-debit/`). Pour le donner à l'entreprise : GitHub, *Settings*, *Transfer ownership* vers l'organisation, ou ajouter un collègue comme propriétaire.
- Le site en ligne (Netlify) se transfère de la même façon : *Team settings*, *Transfer site*.

## Mettre à jour (personne technique)
1. Catalogue : modifier `fiche-debit/catalogue.json` (un code = un texte exact, zéros de tête compris : `007280`, `8001` et `7346` sont trois codes différents).
2. Régénérer les données : `python3 fiche-debit/outils/generer_donnees.py fiche.xlsx fiche-debit/catalogue.json fiche-debit`
3. Régénérer le fichier autonome : `python3 fiche-debit/outils/construire_autonome.py`
4. Vérifier le calcul : `node fiche-debit/tests/calcul.test.mjs fiche-debit/tests/cas_xls.json`

Règles de calcul : `REGLES_FICHE.md`. Différences avec l'ancien XLS : `ETAPE3_A_VALIDER.md`. Catalogue lu dans le PDF : `RAPPORT_ETAPE1.md`.
