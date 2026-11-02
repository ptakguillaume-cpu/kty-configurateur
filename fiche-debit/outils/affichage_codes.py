"""Affichage des codes comme sur les fiches Excel d'origine : chiffres seuls (sans zéros devant) quand la case Excel est un nombre, texte tel quel
(avec ses zéros) quand c'est un texte. Ajoute « aff » aux lignes de donnees.js / donnees-rdb1.js et aux accessoires (codes enregistrés = toujours complets, seul l'affichage change).
Usage : python3 fiche-debit/outils/affichage_codes.py cbase.xlsx c7016.xlsx c9005.xlsx rbase.xlsx r7016.xlsx r9005.xlsx
  (bons de commande de mai 2026 convertis en .xlsx : Classic base (3 feuilles) / 7016 FT / 9005 MAT, puis RDB1 base / 7016 FT / 9005 MAT). Sans danger si relancé.
Un « oo » tapé dans l'Excel veut dire « 00 » : le code s'affiche avec ses zéros (006600).
Lignes absentes de l'Excel (3700, huisseries type B, paumelles alu…) : sans zéros, sauf les huisseries qui gardent leurs zéros comme les autres huisseries."""
import json, os, re, sys, openpyxl
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
FIN = ['9005 MAT', '7016 FT', 'BLANC 9016', 'ANODISÉ', 'RAL']
def sans0(s): return s.lstrip('0') or '0'
def aff_cellule(v):
    if v in (None, ''): return None
    if isinstance(v, (int, float)): return str(int(v))
    t = str(v).strip()
    return re.sub(r'^[oO]+(?=\d)', lambda m: '0' * len(m.group()), t)      # « oo6600 » = 006600 (les « o » sont des zéros)
def charger(nom):
    s = open(os.path.join(D, nom), encoding='utf-8').read(); a, b = s.index('{'), s.rindex('}') + 1
    return s, a, b, json.loads(s[a:b])
def ecrire(nom, s, a, b, F): open(os.path.join(D, nom), 'w', encoding='utf-8').write(s[:a] + json.dumps(F, ensure_ascii=False, separators=(',', ':')) + s[b:])
def choisir(code, orig, famille):
    """Affichage retenu : celui de l'Excel d'origine si c'est le même code, sinon règle des lignes absentes de l'Excel."""
    if orig and orig.isdigit() and sans0(orig) == sans0(code): return orig
    return code if famille.startswith('Huisserie') else sans0(code)
# ---- Classic ----
cb, c7, c9, rb, r7, r9 = sys.argv[1:7]
FEUILLES = {}
b = openpyxl.load_workbook(cb, data_only=True); FEUILLES.update({'BLANC 9016': (b['BLANC 9016'], 0), 'ANODISÉ': (b['ANODISE'], 0), 'RAL': (b['RAL'], 0)})
for fn, nom in ((c7, '7016 FT'), (c9, '9005 MAT')):
    w = openpyxl.load_workbook(fn, data_only=True); FEUILLES[nom] = (w[w.sheetnames[0]], 0)
s, a, b_, F = charger('donnees.js')
for cote, col in (('gauche', 3), ('droite', 8)):
    for it in F[cote]:
        if it.get('vide') or not it.get('codes'): continue
        m = re.fullmatch(r'[GD](\d+)', it['id']); r = int(m.group(1)) if m else None
        aff = {}
        for f, code in it['codes'].items():
            w, dec = FEUILLES[f]
            orig = aff_cellule(w.cell(r + dec, col).value) if r and it['id'][0] == ('G' if cote == 'gauche' else 'D') else None
            aff[f] = choisir(code, orig, it['famille'])
        it['aff'] = {f: v for f, v in aff.items() if v != it['codes'][f]}
        if not it['aff']: it.pop('aff')
CLIPS = {'A45': 42, 'A46': 43, 'A47': 44}        # clips de lisse : lignes 42 à 44 du bon de commande (colonne code de gauche)
for x in F['accessoires']:
    orig = aff_cellule(FEUILLES['BLANC 9016'][0].cell(CLIPS[x['id']], 3).value) if x['id'] in CLIPS else None
    v = choisir(x['code'], orig, 'Accessoire')
    if v != x['code']: x['aff'] = v
    else: x.pop('aff', None)
ecrire('donnees.js', s, a, b_, F)
print('Classic :', sum(1 for c in ('gauche', 'droite') for i in F[c] if i.get('aff')), 'lignes avec affichage particulier')
# ---- RDB1 ----
s, a, b_, R = charger('donnees-rdb1.js')
base = openpyxl.load_workbook(rb, data_only=True); S = {'BLANC 9016': (base['BLANC 9016'], 2), 'RAL': (base['RAL'], 0), 'ANODISÉ': (base['ANODISE'], 0)}
for fn, nom in ((r7, '7016 FT'), (r9, '9005 MAT')):
    w = openpyxl.load_workbook(fn, data_only=True); S[nom] = (w[w.sheetnames[0]], 0)
for cote, col in (('gauche', 3), ('droite', 8)):
    for it in R[cote]:
        if it.get('vide') or not it.get('codes'): continue
        r = int(it['id'][1:]); aff = {}
        for f, code in it['codes'].items():
            w, dec = S[f]; orig = aff_cellule(w.cell(r + dec, col).value)
            aff[f] = choisir(code, orig, it['famille'])
        it['aff'] = {f: v for f, v in aff.items() if v != it['codes'][f]}
        if not it['aff']: it.pop('aff')
for x in R['accessoires']:
    x.pop('aff', None); v = sans0(x['code'])
    if v != x['code']: x['aff'] = v
ecrire('donnees-rdb1.js', s, a, b_, R); print('RDB1 :', sum(1 for c in ('gauche', 'droite') for i in R[c] if i.get('aff')), 'lignes')
