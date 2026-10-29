"""Ajustements de la fiche Classic demandés après la fiche « MUSÉE MODANE » (à lancer APRÈS generer_donnees.py, sans danger si relancé).
Usage : python3 fiche-debit/outils/ajustements_classic.py   (depuis la racine du dépôt)
 - ajoute le montant 00MON de 3700 (001452, brut) et le couvre-joint plat de 3700 (001711…001713, 8069 ; 7016 FT à compléter dans la bibliothèque) ;
 - retire le bloc « Clip de lisse » de gauche (il passe dans le tableau des accessoires) ;
 - 2e série : retire la ligne vide du jonc, ajoute les huisseries double alu carré type B (1270 à 1870), rend les lignes « anodisé seulement » conditionnelles, ajoute des lignes de remplissage ;
 - remplace « Jeu 2 paumelles clarit » et « Serrure clarit » par « Jeu 3 paumelles alu » et « Jeu 4 paumelles alu ».
Les identifiants de lignes existants ne changent pas (les fiches enregistrées restent lisibles) ; seul l'ordre d'affichage (« ligne ») est renuméroté."""
import json, os
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'donnees.js')
s = open(D, encoding='utf-8').read(); a, b = s.index('{'), s.rindex('}') + 1
F = json.loads(s[a:b])
FIN = F['finitions']
ids = lambda cote: [i['id'] for i in F[cote]]
if 'G9b' not in ids('gauche'):
    g = F['gauche']
    g.insert(next(k for k, i in enumerate(g) if i['id'] == 'G9') + 1, dict(id='G9b', ligne=0, famille='Montant', codeFamille='00MON', longueur=3700, codes={f: '001452' for f in FIN}, calcule=False))
    g.insert(next(k for k, i in enumerate(g) if i['id'] == 'G14') + 1, dict(id='G14b', ligne=0, famille='Couvre-joint plat', codeFamille='60CJP', longueur=3700,
             codes={'9005 MAT': '8069', 'BLANC 9016': '001712', 'ANODISÉ': '001711', 'RAL': '001713'}, calcule=True))      # 7016 FT : code à ajouter plus tard (bibliothèque)
    g[:] = [i for i in g if i['id'] not in ('G42', 'G43', 'G44')]
    last = max(i['ligne'] for i in g)
    g += [dict(id='GV1', ligne=0, famille='', codeFamille='', vide=True, codes={})]   # complète le bas du tableau de gauche (même nombre de lignes qu'au milieu)
if 'D45' not in ids('droite'):
    d = F['droite']; k = next(k for k, i in enumerate(d) if i['id'] == 'D43')
    new = [dict(id='D45', ligne=0, famille='Jeu 3 paumelles alu', codeFamille='', longueur=None, calcule=False, edi='42EAS',
                codes={'9005 MAT': '8158', '7016 FT': '007607', 'BLANC 9016': '000375', 'ANODISÉ': '000421', 'RAL': '000416'}),
           dict(id='D46', ligne=0, famille='Jeu 4 paumelles alu', codeFamille='', longueur=None, calcule=False, edi='42EAS4TH',
                codes={'9005 MAT': '8163', '7016 FT': '007612', 'BLANC 9016': '000743', 'ANODISÉ': '000970', 'RAL': '000916'})]
    d[k:k + 2] = new
if 'A45' not in [a['id'] for a in F['accessoires']]:
    F['accessoires'] += [dict(id='A45', libelle='Clip de lisse 100', code='000499', edi='60ECA', auto=None), dict(id='A46', libelle='Clip de lisse 25', code='008001', edi='60ECA', auto=None),
                         dict(id='A47', libelle='Clip de lisse 2360', code='000014', edi='60ECA', auto=None)]
if 'D47' not in ids('droite'):                           # 2e série : huisseries double alu carré type B, lignes anodisé seulement, remplissages
    d = F['droite']
    d[:] = [i for i in d if i['id'] != 'D13']             # ligne vide du jonc
    for i in d:
        if i['id'] in ('D23', 'D25', 'D27', 'D28', 'D30'): i['seulement'] = ['ANODISÉ']      # n'existent plus qu'en anodisé : visibles seulement dans cette finition
    B = {1270: ['8122', '007566', '007266', '007267', '007268'], 1470: ['8123', '007567', '007269', '007270', '007271'],
         1670: ['8124', '007568', '007272', '007273', '007274'], 1870: ['8125', '007561', '007275', '007276', '007277']}     # ordre : 9005 MAT, 7016 FT, BLANC 9016, ANODISÉ, RAL
    k = next(k for k, i in enumerate(d) if i['id'] == 'D40') + 1
    for n, (w, c) in enumerate(B.items()):
        d.insert(k + n, dict(id='D%d' % (47 + n), ligne=0, famille='Huisserie DV type B carré', codeFamille='', longueur=None, calcule=False, largeur=w, codes=dict(zip(FIN, c))))
    g = F['gauche']
    for i in g:
        if i['id'] == 'GV1': i['remplissage'] = True
    g += [dict(id='GV%d' % n, ligne=0, famille='', codeFamille='', vide=True, remplissage=True, codes={}) for n in range(2, 6)]
    d += [dict(id='DV%d' % n, ligne=0, famille='', codeFamille='', vide=True, remplissage=True, codes={}) for n in range(1, 6)]
if 'D51' not in ids('droite'):                           # 3e série : jeux de 6 et de 8 paumelles alu, hauteur 2050 (saisie manuelle)
    d = F['droite']; k = next(k for k, i in enumerate(d) if i['id'] == 'DV1')
    d[k:k] = [dict(id='D51', ligne=0, famille='Jeu 6 paumelles alu', codeFamille='', longueur=None, calcule=False, edi='42EAD', codes=dict(zip(FIN, ['8167', '007616', '000790', '000431', '000791']))),
              dict(id='D52', ligne=0, famille='Jeu 8 paumelles alu', codeFamille='', longueur=None, calcule=False, edi='42EAD8', codes=dict(zip(FIN, ['8171', '007620', '001134', '001133', '001135'])))]
for cote in ('gauche', 'droite'):                       # ordre d'affichage : numéros de ligne consécutifs (les « id » ne changent pas)
    n = min(i['ligne'] for i in F[cote] if i['ligne'])
    for i in F[cote]: i['ligne'] = n; n += 1
open(D, 'w', encoding='utf-8').write(s[:a] + json.dumps(F, ensure_ascii=False, separators=(',', ':')) + s[b:])
print('gauche', len(F['gauche']), 'lignes ; droite', len(F['droite']), 'lignes ; accessoires', len(F['accessoires']))
