"""Ajustements de la fiche Classic demandés après la fiche « MUSÉE MODANE » (à lancer APRÈS generer_donnees.py, sans danger si relancé).
Usage : python3 fiche-debit/outils/ajustements_classic.py   (depuis la racine du dépôt)
 - ajoute le montant 00MON de 3700 (001452, brut) et le couvre-joint plat de 3700 (001711…001713, 8069 ; 7016 FT à compléter dans la bibliothèque) ;
 - retire le bloc « Clip de lisse » de gauche (il passe dans le tableau des accessoires) ;
 - remplace « Jeu 2 paumelles clarit » et « Serrure clarit » par « Jeu 3 paumelles alu » et « Jeu 4 paumelles alu toute hauteur ».
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
           dict(id='D46', ligne=0, famille='Jeu 4 paumelles alu TH', codeFamille='', longueur=None, calcule=False, edi='42EAS4TH',
                codes={'9005 MAT': '8163', '7016 FT': '007612', 'BLANC 9016': '000743', 'ANODISÉ': '000970', 'RAL': '000916'})]
    d[k:k + 2] = new
if 'A45' not in [a['id'] for a in F['accessoires']]:
    F['accessoires'] += [dict(id='A45', libelle='Clip de lisse 100', code='000499', edi='60ECA', auto=None), dict(id='A46', libelle='Clip de lisse 25', code='008001', edi='60ECA', auto=None),
                         dict(id='A47', libelle='Clip de lisse 2360', code='000014', edi='60ECA', auto=None)]
for cote in ('gauche', 'droite'):                       # ordre d'affichage : numéros de ligne consécutifs (les « id » ne changent pas)
    n = min(i['ligne'] for i in F[cote] if i['ligne'])
    for i in F[cote]: i['ligne'] = n; n += 1
open(D, 'w', encoding='utf-8').write(s[:a] + json.dumps(F, ensure_ascii=False, separators=(',', ':')) + s[b:])
print('gauche', len(F['gauche']), 'lignes ; droite', len(F['droite']), 'lignes ; accessoires', len(F['accessoires']))
