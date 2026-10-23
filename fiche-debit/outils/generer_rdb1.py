"""Génère fiche-debit/donnees-rdb1.js à partir des 5 fiches Excel RDB1 (BON DE COMMANDE RDB1 KTY MAI 2026), converties en .xlsx.
Usage : python3 generer_rdb1.py base.xlsx a7016.xlsx a9005.xlsx catalogue.json dossier_sortie
  base.xlsx  = classeur à 3 feuilles « BLANC 9016 », « RAL », « ANODISE »
  a7016.xlsx / a9005.xlsx = classeurs d'une feuille (7016 FT, 9005 MAT)
Les fiches Excel RDB1 n'ont aucune formule, mais les calculs de la gamme RDB1 sont les mêmes que ceux de la Classic (confirmé par l'utilisateur).
Les codes restent des textes exacts (« oo7301 » saisi avec des lettres devient 007301)."""
import sys, json, re, collections, openpyxl

base, f7016, f9005, cat_path, out = sys.argv[1:6]
cat = json.load(open(cat_path, encoding='utf-8')); P = {c['ref']: c for c in cat}
FIN = ['9005 MAT', '7016 FT', 'BLANC 9016', 'ANODISÉ', 'RAL']
log = []

def feuille(f, nom, decalage):
    wb = openpyxl.load_workbook(f, data_only=True)
    return wb[nom] if nom else wb[wb.sheetnames[0]], decalage
SHEETS = {'BLANC 9016': feuille(base, 'BLANC 9016', 2), 'RAL': feuille(base, 'RAL', 0), 'ANODISÉ': feuille(base, 'ANODISE', 0),
          '7016 FT': feuille(f7016, None, 0), '9005 MAT': feuille(f9005, None, 0)}

def code(v, ou):
    if v in (None, ''): return None
    if isinstance(v, (int, float)):
        n = int(v); s = ('%06d' % n) if n < 8000 else str(n)
    else:
        s = str(v).strip().replace('oo', '00')
        if not s.isdigit(): return 'TEXTE:' + s
        s = s.zfill(6) if int(s) < 8000 and len(s) < 6 else s
    if s in ('007000', '7000'): return None                      # 7000 = « pas de code » dans l'Excel
    if s not in P:
        log.append(f'{ou}: {s} absent du catalogue'); return s
    return s

def lecture(fin, cote, r):
    ws, dec = SHEETS[fin]; rr = r + dec
    c, l = (3, 4) if cote == 'G' else (8, 9)
    return ws.cell(rr, c).value, ws.cell(rr, l).value

# ---- familles : (côté, ligne début, ligne fin, nom, code famille) — d'après la mise en page de l'Excel
FAMILLES = [
 ('G', 2, 4, 'Lisse', ''), ('G', 5, 9, 'Montant', '15MON'), ('G', 10, 14, 'Couvre-joint plat', '60CJP'), ('G', 15, 17, 'Pare close double V.', '15PAD'),
 ('G', 18, 22, 'Meneau', ''), ('G', 23, 26, 'Angle 90°', '15P2D'), ('G', 27, 30, 'Angle multiple', '00PVA'), ('G', 31, 36, 'Départ multiple à C. joint RDB1', ''),
 ('G', 37, 40, 'Capot de finition RDB1', '15CAP'), ('G', 41, 43, 'Clip de lisse', '60ECA'),
 ('D', 2, 6, 'Départ', '15DEP'), ('D', 7, 11, 'Couvre-joint Oméga', '60CJO'), ('D', 12, 13, 'Jonc', ''), ('D', 14, 16, 'Mousse intérieure de lisse', '15MOL'),
 ('D', 17, 19, 'Montant spécial RDB1', ''), ('D', 20, 20, 'GAMME CLASSIC', ''), ('D', 21, 25, 'Capot finition CLASSIC', ''), ('D', 26, 30, 'Angle libre CLASSIC', ''),
 ('D', 31, 31, 'Angle doubl.', ''), ('D', 32, 32, 'Plat doubl.', ''), ('D', 33, 35, 'Huisserie simple carré', ''), ('D', 36, 39, 'Huisserie D type A carré', ''),
 ('D', 40, 40, 'Jeu 3 paumelles bois', ''), ('D', 41, 41, 'Jeu 6 paumelles bois', ''), ('D', 42, 42, 'Jeu 2 paumelles clarit', ''), ('D', 43, 43, 'Serrure clarit avec cylindre', ''),
]
LIBELLE = {'Angle doubl.': 'Angle de doublage', 'Plat doubl.': 'Plat de doublage'}
res = {'gauche': [], 'droite': []}
for cote, a, b, nom, cf in FAMILLES:
    for r in range(a, b + 1):
        codes, longs, textes = {}, [], []
        for fin in FIN:
            c, l = lecture(fin, cote, r)
            s = code(c, f'{fin} {cote}{r}')
            if s and s.startswith('TEXTE:'): textes.append(s[6:]); s = None
            if s: codes[fin] = s
            if l not in (None, '') and not (isinstance(l, str) and not re.match(r'^\d+$', l.strip())): longs.append(str(int(float(l))) if not isinstance(l, str) else l.strip())
            elif isinstance(l, str) and l.strip(): textes.append(l.strip())
        item = dict(id=cote + str(r), ligne=r, famille=nom, codeFamille=cf, calcule=(nom == 'Couvre-joint plat' or nom in ('Jeu 3 paumelles bois', 'Jeu 6 paumelles bois')))   # mêmes calculs que la Classic
        if nom in LIBELLE: item['libelle'] = LIBELLE[nom]
        if nom == 'GAMME CLASSIC':
            item.update(vide=True, titre=nom, titreLarge=True, codes={}); res['droite'].append(item); continue
        if not codes:
            item.update(vide=True, codes={})
            if textes and cote == 'D' and nom.startswith('Mousse'): item['texteCode'] = collections.Counter(textes).most_common(1)[0][0]
            res['droite' if cote == 'D' else 'gauche'].append(item); continue
        item['codes'] = codes
        if longs:
            v = collections.Counter(longs).most_common(1)[0][0]
            if len(set(longs)) > 1: log.append(f'{cote}{r} {nom}: longueurs différentes selon la finition {sorted(set(longs))} -> « {v} » retenu')
            if nom.startswith('Huisserie'): item['largeur'] = int(v)
            elif v.isdigit(): item['longueur'] = int(v)
            else: item['texteLong'] = v                               # ex. « M/L »
        elif nom.startswith(('Jeu', 'Serrure')):
            item['edi'] = {'Jeu 3 paumelles bois': '42EBS', 'Jeu 6 paumelles bois': '42EBD', 'Jeu 2 paumelles clarit': '42EVS', 'Serrure clarit avec cylindre': '45SVS'}[nom]
        res['droite' if cote == 'D' else 'gauche'].append(item)

# ---- Mousse intérieure de lisse : la ligne du code (1221 « M/L ») est décalée d'une ligne selon la fiche ; on la fixe comme sur la fiche blanche
res['droite'] = [i for i in res['droite'] if i['famille'] != 'Mousse intérieure de lisse']
res['droite'] += [
    dict(id='D14', ligne=14, famille='Mousse intérieure de lisse', codeFamille='15MOL', calcule=False, vide=True, codes={}),
    dict(id='D15', ligne=15, famille='Mousse intérieure de lisse', codeFamille='15MOL', calcule=False, codes={f: '001221' for f in FIN}, texteLong='M/L'),
    dict(id='D16', ligne=16, famille='Mousse intérieure de lisse', codeFamille='15MOL', calcule=False, vide=True, codes={}, texteCode='rlx 5ml')]
res['droite'].sort(key=lambda i: i['ligne'])

# ---- cohérence : un même code par finition ne doit pas apparaître sur deux lignes différentes
vus = collections.defaultdict(list)
for cote in ('gauche', 'droite'):
    for it in res[cote]:
        for f, c in it.get('codes', {}).items(): vus[(f, c)].append(it['id'])
for (f, c), ids in vus.items():
    if len(ids) > 1 and not all(P.get(c, {}).get('finition') == 'BRUT' for _ in [0]) and c not in ('001221',):
        log.append(f'code {c} ({f}) utilisé sur plusieurs lignes : {ids}')

# ---- codes de l'Excel absents du PDF : ajoutés au catalogue (signalés)
AJOUTS = {'001239': 'Meneau RDB1 lg 5820mm, blanc 9016', '000126': 'Meneau RDB1 lg 5820mm, anodisé'}
cat_ajoutes = 0
for ref, des in AJOUTS.items():
    if ref not in P:
        cat.append(dict(ref=ref, designation=des, edi='15P3D', finition='BLANC 9016' if 'blanc' in des else 'ANODISÉ', page_pdf=0,
                        a_verifier='code issu de l\'Excel RDB1 (mai 2026), absent du PDF', hors_catalogue=True)); cat_ajoutes += 1
if cat_ajoutes: json.dump(cat, open(cat_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

ACCESS = [(34, 'Ruban adhésif vitrage 10 mm', '000782', '40DFT6'), (35, 'Ruban adhésif vitrage 12 mm', '005755', '40DFT9'), (36, 'Éclisse', '000783', '40ECL'),
          (37, 'Clip', '000144', '40CLI'), (38, 'Équerre', '000006', '40EQU'), (39, 'Joint 6 mm', '000001', '40JT6'), (40, 'Joint 8 mm', '000002', '40JT8'),
          (41, 'Joint 10 mm', '000648', '40JT10'), (42, 'Joint 12 mm', '000796', '40JT12'), (43, 'Cale vitrage', '001254', '60CV22'), (44, 'Mousse départ', '000143', '40MOD')]
acc = [dict(id='A%d' % r, libelle=l, code=c, edi=e, auto={37: 'clip', 38: 'equerre', 44: 'mousse'}.get(r)) for r, l, c, e in ACCESS]     # clip, équerre, mousse : calculés comme la Classic
for a in acc:
    if a['code'] not in P: log.append(f"accessoire {a['libelle']}: {a['code']} absent du catalogue")
js = 'export const FICHE_RDB1 = ' + json.dumps(dict(gauche=res['gauche'], droite=res['droite'], accessoires=acc), ensure_ascii=False, separators=(',', ':')) + ';\n'
open(out + '/donnees-rdb1.js', 'w', encoding='utf-8').write(js)
n = lambda c: sum(1 for i in res[c] if not i.get('vide'))
print(f"{n('gauche')} lignes de codes à gauche, {n('droite')} à droite ({len(res['gauche'])} et {len(res['droite'])} lignes avec les lignes vides) ; {cat_ajoutes} code(s) ajouté(s) au catalogue")
print('\n'.join(log))
