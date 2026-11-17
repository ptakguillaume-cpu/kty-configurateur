"""Alignement sur les bons de commande de NOVEMBRE 2026 validés par le directeur (à lancer APRÈS les autres ajustements, sans danger si relancé).
Usage : python3 fiche-debit/outils/ajustements_nov2026.py   (depuis la racine du dépôt)
Classic : retire l'angle 90° 00P2D (milieu), les huisseries double type B et les jeux de paumelles alu 4 / 6 / 8 de la grille (ces produits restent
  disponibles dans la liste CODE / Désignation et le bouton « + Huisseries… ») ; ajoute sous les huisseries : portes bois 830 / 930, béquilles Eco, cylindre 30x30,
  vantaux SV 828 / 928 G et D ; le jeu 3 alu passe après les vantaux ; clips de lisse : « Boîte de 100 » et « Boîte de 25 » en tête des accessoires,
  « Clip de lisse 2360 » en bas de la colonne de gauche ; couvre-joint plat 3700 en 7016 FT (007412).
RDB1 : retire le jeu 2 clarit et la serrure clarit, la « Mousse intérieure de lisse » et les clips de lisse 100 / 25 passent dans les accessoires ; le meneau 5800 revient.
Puis recalcule l'affichage des codes (« aff ») d'après les bons de commande de novembre (Classic : 5 finitions ; RDB1 : 7016 FT et 9005 MAT)."""
import json, os, re, sys
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
def charger(nom):
    s = open(os.path.join(R, nom), encoding='utf-8').read(); a, b = s.index('{'), s.rindex('}') + 1
    return s, a, b, json.loads(s[a:b])
def ecrire(nom, s, a, b, F): open(os.path.join(R, nom), 'w', encoding='utf-8').write(s[:a] + json.dumps(F, ensure_ascii=False, separators=(',', ':')) + s[b:])
FIN = ['9005 MAT', '7016 FT', 'BLANC 9016', 'ANODISÉ', 'RAL']
def renumeroter(F):
    for cote in ('gauche', 'droite'):
        n = min(i['ligne'] for i in F[cote] if i['ligne'])
        for i in F[cote]: i['ligne'] = n; n += 1
def item(i, **kw): return dict(id=i, ligne=0, famille=kw.pop('famille', ''), codeFamille=kw.pop('codeFamille', ''), longueur=kw.pop('longueur', None), calcule=False, **kw)

# ---------------- catalogue : couvre-joint plat 3700 en 7016 FT (code du bon de commande de novembre) ----------------
cj = os.path.join(R, 'catalogue.json'); cat = json.load(open(cj, encoding='utf-8'))
if not any(c['ref'] == '007412' for c in cat):
    cat.append({'ref': '007412', 'designation': 'Couvre-joint plat lg 3700mm - RAL7016FT', 'edi': '60CJP', 'finition': '7016 FT' if False else 'RAL7016FT', 'page_pdf': 0, 'a_verifier': 'code du bon de commande de novembre 2026, absent du PDF', 'hors_catalogue': True})
    json.dump(cat, open(cj, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    lite = [[c['ref'], c['designation'], c['edi'], c['finition'], 1 if c.get('hors_catalogue') else 0] for c in cat]
    open(os.path.join(R, 'catalogue.js'), 'w', encoding='utf-8').write('// [référence, désignation, code EDI, finition, hors catalogue]\nexport const CATALOGUE = ' + json.dumps(lite, ensure_ascii=False, separators=(',', ':')) + ';\n')

# ---------------- Classic ----------------
s, a, b, F = charger('donnees.js')
d, g = F['droite'], F['gauche']
if not any(i['id'] == 'D53' for i in d):
    d[:] = [i for i in d if i['id'] not in ('D14', 'D16', 'D46', 'D47', 'D48', 'D49', 'D50', 'D51', 'D52')]
    for i in d:
        if i['id'] in ('D9', 'D10', 'D11'): i['codeFamille'] = '60CJO'
    tous = lambda c: {f: c for f in FIN}
    VANTAUX = {'D57': ('828', 'G', ['8304', '007630', '000227', '000223', '000233']), 'D58': ('828', 'D', ['8303', '007629', '000226', '000222', '000231']),
               'D59': ('928', 'G', ['8306', '007632', '000241', '000237', '000246']), 'D60': ('928', 'D', ['8305', '007631', '000238', '000235', '000242'])}
    k = next(k for k, i in enumerate(d) if i['id'] == 'D41')                       # Jeu 3 bois, puis portes bois, béquille ronde, cylindre, Jeu 6 bois
    d[k + 1:k + 1] = [item('D53', famille='Porte bois 830 Blanc Polaire', codes=tous('001341')), item('D54', famille='Porte bois 930 Blanc Polaire', codes=tous('001342')),
                      item('D55', famille='Béquille Inox Eco Ronde', codes=tous('005728')), item('D56', famille='Cylindre 30x30', codes=tous('001232'))]
    d[:] = [i for i in d if i['id'] not in ('D42', 'D45')]                         # Jeu 6 bois, ligne vide, vantaux SV, Jeu 3 alu, béquille ovale (ordre du bon de commande)
    k = next(k for k, i in enumerate(d) if i['id'] == 'D56') + 1
    ancien = {'D42': None, 'D45': None}
    s0, a0, b0, F0 = charger('donnees.js')
    for i in F0['droite']:
        if i['id'] in ancien: ancien[i['id']] = i
    nouveaux = [ancien['D42'], item('DB1', vide=True, codes={})]
    for i, (w, sens, c) in VANTAUX.items():
        nouveaux.append(item(i, famille=f'Vantail SV 2036 x {w} {sens}', edi='35VAS', codes=dict(zip(FIN, c))))
    nouveaux += [ancien['D45'], item('D61', famille='Béquille Inox Eco Ovale', codes=tous('001122'))]
    d[k:k] = nouveaux
    # colonne de gauche : plus de lignes vides en bas, « Clip de lisse 2360 » (le seul clip resté à gauche)
    g[:] = [i for i in g if not re.fullmatch(r'GV\d', i['id'])]
    g.append(item('G45', famille='Clip de lisse', codeFamille='', longueur=2360, codes=tous('000014')))
    for i in g:
        if i['id'] == 'G14b': i['codes']['7016 FT'] = '007412'
    # accessoires : boîtes de clips de lisse en tête
    acc = F['accessoires']
    ids = [x['id'] for x in acc]
    if 'A45' in ids:
        a45 = next(x for x in acc if x['id'] == 'A45'); a46 = next(x for x in acc if x['id'] == 'A46')
        a45['libelle'] = 'Boîte de 100'; a46['libelle'] = 'Boîte de 25'
        F['accessoires'] = [a45, a46] + [x for x in acc if x['id'] not in ('A45', 'A46', 'A47')]
renumeroter(F)
ecrire('donnees.js', s, a, b, F)
CLASSIC = F

# ---------------- RDB1 ----------------
s, a, b, Rb = charger('donnees-rdb1.js')
d, g = Rb['droite'], Rb['gauche']
if not any(x['id'] == 'A48' for x in Rb['accessoires']):
    for i in g:
        if i['id'] == 'G20':                                                        # le meneau 5800 revient (bon de commande de novembre)
            i['codes'] = dict(zip(FIN, ['8203', '007457', '001239', '000126', '001235'])); i.pop('vide', None); i['longueur'] = 5800; i.pop('aff', None)
    d[:] = [i for i in d if i['id'] not in ('D14', 'D15', 'D16', 'D42', 'D43')]
    g[:] = [i for i in g if i['id'] not in ('G41', 'G42')]
    tous = lambda c: {f: c for f in FIN}
    Rb['accessoires'] = [dict(id='A45', libelle='Boîte de 100', code='000499', edi='60ECA', auto=None), dict(id='A46', libelle='Boîte de 25', code='008001', edi='60ECA', auto=None),
                         dict(id='A48', libelle='Mousse intérieure de lisse', code='001221', edi='rlx 5 ml', auto=None)] + Rb['accessoires']
for cote in ('gauche', 'droite'):
    n = min(i['ligne'] for i in Rb[cote] if i['ligne'])
    for i in Rb[cote]: i['ligne'] = n; n += 1
ecrire('donnees-rdb1.js', s, a, b, Rb)

# ---------------- affichage des codes (« aff ») d'après les bons de commande de novembre ----------------
def sans0(x): return x.lstrip('0') or '0'
def aff_cellule(v):
    if v in (None, ''): return None
    if isinstance(v, (int, float)): return str(int(v))
    t = str(v).strip()
    return re.sub(r'^[oO]+(?=\d)', lambda m: '0' * len(m.group()), t)
def choisir(code, orig, famille):
    if orig and orig.isdigit() and sans0(orig) == sans0(code): return orig
    return code if famille.startswith('Huisserie') else sans0(code)
def affichages(chemin, feuille=None):
    """{ code sans zéros : affichage } lu dans les colonnes code / accessoires du bon de commande (.xlsx)."""
    import openpyxl, warnings; warnings.simplefilter('ignore')
    wb = openpyxl.load_workbook(chemin, data_only=True); ws = wb[feuille] if feuille else wb.worksheets[0]
    out = {}
    for r in range(3, 47):
        for col in (3, 8, 14):
            v = aff_cellule(ws.cell(r, col).value)
            if v and re.fullmatch(r'\d+', v): out.setdefault(sans0(v), v)
    return out
BDC = sys.argv[1] if len(sys.argv) > 1 else '/tmp/claude-0/work/nov'
if os.path.isdir(BDC):
    def appliquer(F, sources):
        for cote in ('gauche', 'droite'):
            for it in F[cote]:
                if it.get('vide') or not it.get('codes'): continue
                aff = dict(it.get('aff') or {})
                for f, code in it['codes'].items():
                    if f not in sources: continue
                    v = choisir(code, sources[f].get(sans0(code)), it['famille'])
                    if v != code: aff[f] = v
                    else: aff.pop(f, None)
                if aff: it['aff'] = aff
                else: it.pop('aff', None)
        for x in F['accessoires']:
            for f in ('7016 FT',):                                                   # l'affichage des accessoires ne dépend pas de la finition : on prend celui du 7016 FT
                if f in sources:
                    v = choisir(x['code'], sources[f].get(sans0(x['code'])), 'Accessoire')
                    if v != x['code']: x['aff'] = v
                    else: x.pop('aff', None)
    cl = {'BLANC 9016': affichages(f'{BDC}/cbase.xlsx', 'BLANC 9016'), 'ANODISÉ': affichages(f'{BDC}/cbase.xlsx', 'ANODISE'), 'RAL': affichages(f'{BDC}/cbase.xlsx', 'RAL'),
          '7016 FT': affichages(f'{BDC}/c7016.xlsx'), '9005 MAT': affichages(f'{BDC}/c9005.xlsx')}
    s, a, b, F = charger('donnees.js'); appliquer(F, cl); ecrire('donnees.js', s, a, b, F)
    rd = {'7016 FT': affichages(f'{BDC}/r7016.xlsx'), '9005 MAT': affichages(f'{BDC}/r9005.xlsx')}
    s, a, b, Rb = charger('donnees-rdb1.js'); appliquer(Rb, rd); ecrire('donnees-rdb1.js', s, a, b, Rb)
print('Classic : gauche', len(CLASSIC['gauche']), '/ droite', len(CLASSIC['droite']), '/ accessoires', len(CLASSIC['accessoires']), '| RDB1 : gauche', len(Rb['gauche']), '/ droite', len(Rb['droite']), '/ accessoires', len(Rb['accessoires']))
