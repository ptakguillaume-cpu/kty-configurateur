"""Affichage des codes comme sur les fiches Excel d'origine : chiffres seuls (sans zéros devant) quand la case Excel est un nombre, texte tel quel
(avec ses zéros) quand c'est un texte. Ajoute « aff » aux lignes de donnees.js / donnees-rdb1.js et aux accessoires (codes enregistrés = toujours complets, seul l'affichage change).
Usage : python3 fiche-debit/outils/affichage_codes.py fiche_classic.xlsx base.xlsx a7016.xlsx a9005.xlsx
  (fiche_classic.xlsx = XLS Classic converti ; base.xlsx / a7016.xlsx / a9005.xlsx = Excel RDB1 convertis). Sans danger si relancé.
Lignes absentes de l'Excel (3700, huisseries type B, paumelles alu…) : sans zéros, sauf les huisseries qui gardent leurs zéros comme les autres huisseries."""
import json, os, re, sys, openpyxl
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
FIN = ['9005 MAT', '7016 FT', 'BLANC 9016', 'ANODISÉ', 'RAL']
def sans0(s): return s.lstrip('0') or '0'
def aff_cellule(v):
    if v in (None, ''): return None
    if isinstance(v, (int, float)): return str(int(v))
    t = str(v).strip()
    return sans0(t[2:]) if re.fullmatch(r'[oO]{2}\d+', t) else t          # « oo6600 » = faute de frappe de l'Excel pour 6600
def charger(nom):
    s = open(os.path.join(D, nom), encoding='utf-8').read(); a, b = s.index('{'), s.rindex('}') + 1
    return s, a, b, json.loads(s[a:b])
def ecrire(nom, s, a, b, F): open(os.path.join(D, nom), 'w', encoding='utf-8').write(s[:a] + json.dumps(F, ensure_ascii=False, separators=(',', ':')) + s[b:])
def choisir(code, orig, famille):
    """Affichage retenu : celui de l'Excel d'origine si c'est le même code, sinon règle des lignes absentes de l'Excel."""
    if orig and orig.isdigit() and sans0(orig) == sans0(code): return orig
    return code if famille.startswith('Huisserie') else sans0(code)
# ---- Classic ----
classic, rdb = sys.argv[1], sys.argv[2:5]
s, a, b, F = charger('donnees.js')
ws = openpyxl.load_workbook(classic, data_only=True)['RAL 9016,7016, ANOD, RAL A DEFI']
COLS = {'gauche': dict(zip(FIN, ['V', 'Y', 'Z', 'AA', 'AD'])), 'droite': dict(zip(FIN, ['W', 'AB', 'AC', 'X', 'AE']))}
CODE_COL = {'gauche': 3, 'droite': 8}
for cote in ('gauche', 'droite'):
    for it in F[cote]:
        if it.get('vide') or not it.get('codes'): continue
        m = re.fullmatch(r'[GD](\d+)', it['id']); r = int(m.group(1)) if m else None
        aff = {}
        for f, code in it['codes'].items():
            orig = None
            if r and it['id'][0] == ('G' if cote == 'gauche' else 'D') and r + 34 <= ws.max_row:
                orig = aff_cellule(ws[f'{COLS[cote][f]}{r + 34}'].value) or aff_cellule(ws.cell(r, CODE_COL[cote]).value)
            aff[f] = choisir(code, orig, it['famille'])
        it['aff'] = {f: v for f, v in aff.items() if v != it['codes'][f]}
        if not it['aff']: it.pop('aff')
acc_orig = {'A34': 14, 'A35': 14, 'A36': 14, 'A37': 14, 'A38': 14, 'A39': 14, 'A40': 14, 'A41': 14, 'A42': 14, 'A43': 14, 'A44': 14}
for x in F['accessoires']:
    r = int(x['id'][1:]) if x['id'][1:].isdigit() else None
    orig = aff_cellule(ws.cell(r, 14).value) if x['id'] in acc_orig else None
    v = choisir(x['code'], orig, 'Accessoire')
    if v != x['code']: x['aff'] = v
    else: x.pop('aff', None)
ecrire('donnees.js', s, a, b, F)
print('Classic :', sum(1 for c in ('gauche', 'droite') for i in F[c] if i.get('aff')), 'lignes avec affichage particulier')
# ---- RDB1 ----
if len(rdb) == 3:
    s, a, b, R = charger('donnees-rdb1.js')
    base = openpyxl.load_workbook(rdb[0], data_only=True); S = {'BLANC 9016': (base['BLANC 9016'], 2), 'RAL': (base['RAL'], 0), 'ANODISÉ': (base['ANODISE'], 0)}
    for fn, nom in ((rdb[1], '7016 FT'), (rdb[2], '9005 MAT')):
        wb = openpyxl.load_workbook(fn, data_only=True); S[nom] = (wb[wb.sheetnames[0]], 0)
    for cote, col in (('gauche', 3), ('droite', 8)):
        for it in R[cote]:
            if it.get('vide') or not it.get('codes'): continue
            r = int(it['id'][1:]); aff = {}
            for f, code in it['codes'].items():
                w, dec = S[f]; orig = aff_cellule(w.cell(r + dec, col).value)
                aff[f] = choisir(code, orig, it['famille'])
            it['aff'] = {f: v for f, v in aff.items() if v != it['codes'][f]}
            if not it['aff']: it.pop('aff')
    for x in R['accessoires']: x.pop('aff', None); v = sans0(x['code']); (x.__setitem__('aff', v) if v != x['code'] else None)
    ecrire('donnees-rdb1.js', s, a, b, R); print('RDB1 :', sum(1 for c in ('gauche', 'droite') for i in R[c] if i.get('aff')), 'lignes')
