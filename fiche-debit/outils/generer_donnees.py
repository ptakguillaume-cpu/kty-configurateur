"""Génère fiche-debit/donnees.js et catalogue.js à partir du XLS converti en XLSX et du catalogue JSON.
Usage : python3 generer_donnees.py fiche.xlsx catalogue.json dossier_sortie
Les codes restent des textes exacts (zéros de tête conservés)."""
import sys, json, re, collections, openpyxl

xlsx, cat_path, out = sys.argv[1:4]
ws = openpyxl.load_workbook(xlsx, data_only=True)['RAL 9016,7016, ANOD, RAL A DEFI']
cat = json.load(open(cat_path, encoding='utf-8'))
P = {c['ref']: c for c in cat}
log = []

def code(v, where):
    """Valeur de cellule -> référence du catalogue (texte exact) ou None."""
    if v in (None, '', 0): return None
    if isinstance(v, (int, float)):
        n = int(v)
        for s in (('%06d' % n) if n < 8000 else str(n), str(n)):
            if s in P: return s
        log.append(f'{where}: {v!r} absent du catalogue (traité comme indisponible)'); return None
    s = str(v).strip().replace('oo', '00')
    if s in P: return s
    if s.isdigit() and s.zfill(6) in P: return s.zfill(6)
    log.append(f'{where}: {v!r} absent du catalogue'); return None

def longueur_catalogue(ref):
    d = P[ref]['designation']
    m = re.search(r'l[gG]?\.?\s*(\d{4})\s*mm', d) or re.search(r'(\d)m(\d\d)', d)
    if not m: return None
    return int(m.group(1)) if len(m.groups()) == 1 else int(m.group(1)) * 1000 + int(m.group(2)) * 10

FIN = ['9005 MAT', '7016 FT', 'BLANC 9016', 'ANODISÉ', 'RAL']
COLS = {'gauche': dict(zip(FIN, ['V', 'Y', 'Z', 'AA', 'AD'])), 'droite': dict(zip(FIN, ['W', 'AB', 'AC', 'X', 'AE']))}
CODE_COL = {'gauche': 3, 'droite': 8}; LONG_COL = {'gauche': 4, 'droite': 9}

# (premiere ligne, derniere ligne, famille, code famille, type)
G = [(4,5,'Lisse','00LIS'),(6,10,'Montant','00MON'),(11,15,'Couvre-joint plat','60CJP'),
     (16,16,'Parclose simple vitrage','sans joint'),(18,18,'Parclose simple vitrage','avec joint'),
     (19,19,'Parclose double vitrage','sans joints'),(21,21,'Parclose double vitrage','avec joints'),
     (22,26,'Meneau','00P3D'),(27,31,'Angle 90° carré','00P2DC'),(32,36,'Angle départ multiple','00ADM'),
     (37,41,'Départ multiple à couvre-joint','00DMCJ'),(42,44,'Clip de lisse','60ECA')]
D = [(4,8,'Départ','00DEP'),(9,11,'Couvre-joint Oméga',''),(12,12,'Jonc',''),(14,16,'Angle 90°','00P2D'),
     (17,21,'Montant spécial renforcé',''),(22,26,'Capot','00CAP'),(27,31,'Angle libre','00ANG'),
     (32,32,'Angle de doublage',''),(33,33,'Plat de doublage',''),(34,36,'Huisserie simple A/B carré',''),
     (37,40,'Huisserie DV type A carré',''),(41,41,'Jeu 3 paumelles bois',''),(42,42,'Jeu 6 paumelles bois',''),
     (43,43,'Jeu 2 paumelles clarit',''),(44,44,'Serrure clarit avec cylindre','')]
CALC = {'gauche': set(range(11, 16)), 'droite': {41, 42}}

res = {'gauche': [], 'droite': []}
for side, groups in (('gauche', G), ('droite', D)):
    for a, b, fam, cf in groups:
        for r in range(a, b + 1):
            cell = ws.cell(r, CODE_COL[side]).value
            if cell in (None, '', 0) and not ws.cell(r + 34, 22).value and side == 'droite' and r in (13,):
                continue
            codes = {}; tr = r + 34
            for f in FIN:
                c = code(ws[f'{COLS[side][f]}{tr}'].value, f'{side} ligne {r} {f}')
                if c: codes[f] = c
            if not codes:                               # code tapé directement dans la cellule (ex. clip de lisse 25)
                c = code(cell, f'{side} ligne {r} (cellule)')
                if c: codes = {f: c for f in FIN}
            if not codes: continue
            if len(set(codes.values())) == 1 and len(codes) == 5: pass
            lg_xls = ws.cell(r, LONG_COL[side]).value
            lg = int(lg_xls) if isinstance(lg_xls, (int, float)) else None
            ref0 = codes.get('BLANC 9016') or next(iter(codes.values()))
            lg_cat = longueur_catalogue(ref0)
            if fam.startswith('Huisserie') or fam.startswith('Jeu') or fam.startswith('Serrure'):
                lg_cat = None
            if lg_cat and lg and lg_cat != lg and abs(lg_cat - lg) > 30:
                log.append(f'{side} ligne {r}: longueur XLS {lg} mais le catalogue dit {lg_cat} ({ref0})')
            if lg is None and lg_cat and not fam.startswith(('Jeu', 'Serrure')):
                log.append(f'{side} ligne {r}: longueur absente du XLS, reprise du catalogue = {lg_cat}'); lg = lg_cat
            item = dict(id=('G' if side == 'gauche' else 'D') + str(r), ligne=r, famille=fam, codeFamille=cf,
                        longueur=lg, codes=codes, calcule=r in CALC[side])
            if fam.startswith('Huisserie'): item['largeur'] = lg; item['longueur'] = None
            if fam.startswith('Jeu') or fam.startswith('Serrure'):
                item['edi'] = str(ws.cell(r, 9).value or '')
            res[side].append(item)


# --- Suggestions seulement : codes présents dans le PDF mais absents des tableaux du XLS (même EDI, même longueur, même finition).
# NON appliquées : une référence peut ne plus exister dans une finition (ex. capot 2700 / 3250, angle libre 2550 / 2700 / 3250 : anodisé seulement). ---
COMPLETER = False
MAPF = {'9005 MAT': '9005 MAT', '7016 FT': 'RAL7016FT', 'BLANC 9016': 'BLANC 9016', 'ANODISÉ': 'ANODISÉ', 'RAL': 'RAL À DÉFINIR'}
def _lg(c):
    m = re.search(r'l[gG]?\.?\s*(\d{4})\s*mm', c['designation']) or re.search(r'[lI]g\.?\s*(\d{4})', c['designation'])
    return int(m.group(1)) if m else None
idx = collections.defaultdict(list)
for c in cat:
    if c.get('hors_catalogue') or not c['edi']: continue
    idx[(re.sub(r'[^0-9A-Z]', '', c['edi'].upper()), _lg(c), c['finition'])].append(c['ref'])
for side in ('gauche', 'droite'):
    for l in res[side]:
        if l['famille'].startswith(('Huisserie', 'Jeu', 'Serrure', 'Clip')): continue
        known = [P[c] for c in l['codes'].values() if P[c]['edi']]
        if not known: continue
        edi = re.sub(r'[^0-9A-Z]', '', known[0]['edi'].upper())
        for f in FIN:
            cand = idx.get((edi, l['longueur'], MAPF[f]), [])
            if f not in l['codes'] and len(cand) == 1:
                if COMPLETER: l['codes'][f] = cand[0]; l.setdefault('ajoutes', []).append(f)
                log.append(f"SUGGESTION (non appliquée) {side} ligne {l['ligne']} {l['famille']} {l['longueur']} {f}: {cand[0]} {P[cand[0]]['designation'][:50]}")

ACCESS = [(34,'Ruban adhésif vitrage 10 mm','000782','40DFT6'),(35,'Ruban adhésif vitrage 12 mm','005755','40DFT9'),
          (36,'Éclisse','000783','40ECL'),(37,'Clip','000144','40CLI'),(38,'Équerre','000006','40EQU'),
          (39,'Joint 6 mm','000001','40JT6'),(40,'Joint 8 mm','000002','40JT8'),(41,'Joint 10 mm','000648','40JT10'),
          (42,'Joint 12 mm','000796','40JT12'),(43,'Cale vitrage','001254','60CV22'),(44,'Mousse départ','000143','40MOD')]
acc = []
for r, lib, ref, edi in ACCESS:
    if ref not in P: log.append(f'accessoire {lib}: code {ref} absent du catalogue')
    acc.append(dict(id='A%d' % r, libelle=lib, code=ref, edi=edi, auto={37: 'clip', 38: 'equerre', 44: 'mousse'}.get(r)))
js = 'export const FICHE = ' + json.dumps(dict(finitions=FIN, gauche=res['gauche'], droite=res['droite'], accessoires=acc), ensure_ascii=False, separators=(',', ':')) + ';\n'
open(out + '/donnees.js', 'w', encoding='utf-8').write(js)
lite = [[c['ref'], c['designation'], c['edi'], c['finition'], 1 if c.get('hors_catalogue') else 0] for c in cat]
open(out + '/catalogue.js', 'w', encoding='utf-8').write('// [référence, désignation, code EDI, finition, hors catalogue]\nexport const CATALOGUE = ' + json.dumps(lite, ensure_ascii=False, separators=(',', ':')) + ';\n')
print(len(res['gauche']), 'lignes gauche', len(res['droite']), 'lignes droite')
print('\n'.join(log))
