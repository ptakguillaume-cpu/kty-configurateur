"""Codes « nouveaux » en rouge, comme sur les bons de commande de novembre 2026 (texte rouge dans le .xls) — à lancer APRÈS ajustements_nov2026.py, sans danger si relancé.
Usage : python3 fiche-debit/outils/codes_rouges_nov2026.py [dossier des bons .xls]   (cbase / c7016 / c9005 / r7016 / r9005 .xls)
Ajoute « rouge » aux lignes de donnees.js / donnees-rdb1.js et aux accessoires : { finition : 'c' (code) ou 'cl' (code et longueur) }.
RDB1 : seuls les bons 7016 FT et 9005 MAT existent ; les autres finitions reprennent les mêmes lignes que le 7016 FT."""
import json, os, re, sys, xlrd
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
BDC = sys.argv[1] if len(sys.argv) > 1 else '/tmp/claude-0/work/nov'
def charger(nom):
    s = open(os.path.join(R, nom), encoding='utf-8').read(); a, b = s.index('{'), s.rindex('}') + 1
    return s, a, b, json.loads(s[a:b])
def ecrire(nom, s, a, b, F): open(os.path.join(R, nom), 'w', encoding='utf-8').write(s[:a] + json.dumps(F, ensure_ascii=False, separators=(',', ':')) + s[b:])
def sans0(x): return x.lstrip('0') or '0'
def code(v):
    if v in ('', None): return None
    if isinstance(v, float): return str(int(v))
    t = re.sub(r'^[oO]+(?=\d)', lambda m: '0' * len(m.group()), str(v).strip())
    return t if re.fullmatch(r'\d+', t) else None
def rouges(fichier, feuille=None):
    b = xlrd.open_workbook(os.path.join(BDC, fichier), formatting_info=True)
    s = b.sheet_by_name(feuille) if feuille else b.sheet_by_index(0)
    est_rouge = lambda r, c: s.cell_value(r, c) != '' and b.font_list[b.xf_list[s.cell_xf_index(r, c)].font_index].colour_index == 10
    out = {'gauche': {}, 'droite': {}, 'acc': {}}
    for r in range(s.nrows):
        for cote, cc in (('gauche', 2), ('droite', 7), ('acc', 13)):
            if cc < s.ncols and est_rouge(r, cc) and code(s.cell_value(r, cc)):
                out[cote][sans0(code(s.cell_value(r, cc)))] = 'cl' if cote != 'acc' and est_rouge(r, cc + 1) else 'c'
    return out
def appliquer(F, par_finition):
    for cote in ('gauche', 'droite'):
        for it in F[cote]:
            it.pop('rouge', None)
            for f, c in (it.get('codes') or {}).items():
                k = par_finition.get(f, {}).get(cote, {}).get(sans0(c))
                if k: it.setdefault('rouge', {})[f] = k
    for a in F['accessoires']:
        a.pop('rouge', None)
        for f, d in par_finition.items():
            k = d['acc'].get(sans0(a['code']))
            if k: a.setdefault('rouge', {})[f] = k
cl = {'BLANC 9016': rouges('cbase.xls', 'BLANC 9016'), 'ANODISÉ': rouges('cbase.xls', 'ANODISE'), 'RAL': rouges('cbase.xls', 'RAL'), '7016 FT': rouges('c7016.xls'), '9005 MAT': rouges('c9005.xls')}
s, a, b, F = charger('donnees.js'); appliquer(F, cl); ecrire('donnees.js', s, a, b, F)
n1 = sum(1 for c in ('gauche', 'droite') for i in F[c] if i.get('rouge'))
rd = {'7016 FT': rouges('r7016.xls'), '9005 MAT': rouges('r9005.xls')}
s, a, b, Rb = charger('donnees-rdb1.js'); appliquer(Rb, rd)
for it in Rb['gauche'] + Rb['droite'] + Rb['accessoires']:                    # autres finitions : les mêmes lignes que le 7016 FT (les codes, eux, changent d'une finition à l'autre)
    if it.get('rouge', {}).get('7016 FT'):
        for f in ('BLANC 9016', 'ANODISÉ', 'RAL'): it['rouge'][f] = it['rouge']['7016 FT']
ecrire('donnees-rdb1.js', s, a, b, Rb)
print('Classic :', n1, 'lignes avec codes rouges ; RDB1 :', sum(1 for c in ('gauche', 'droite') for i in Rb[c] if i.get('rouge')))
