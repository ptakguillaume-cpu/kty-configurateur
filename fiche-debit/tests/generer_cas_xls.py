"""Crée N variantes du XLS avec des saisies aléatoires, les fait recalculer par LibreOffice et écrit les résultats attendus (JSON).
Usage : python3 generer_cas_xls.py fiche.xlsx dossier_travail N"""
import sys, json, random, subprocess, os, openpyxl, warnings
warnings.filterwarnings('ignore')
src, work, N = sys.argv[1], sys.argv[2], int(sys.argv[3]); random.seed(7)
os.makedirs(work, exist_ok=True)
SH = 'RAL 9016,7016, ANOD, RAL A DEFI'
gauche = [r for r in list(range(4, 11)) + [16, 18, 19] + list(range(21, 45)) if r not in range(11, 16)]
droite = [r for r in range(4, 41)] + [43, 44]
LG = [2.5, 2.7, 3.05, 3.25, 5.75]
cases, saisies = [], []
for i in range(N):
    wb = openpyxl.load_workbook(src); ws = wb[SH]
    c = dict(qte={}, opt={})
    for r in gauche:
        v = random.choice([0, 0, 0, 1, 2, 3, 5, 8, 12]); ws[f'E{r}'] = v; c['qte'][f'G{r}'] = v
    for r in droite:
        if r in (41, 42): continue
        v = random.choice([0, 0, 0, 1, 2, 3, 4, 6]); ws[f'J{r}'] = v; c['qte'][f'D{r}'] = v
    o = dict(R7=random.choice([0, 0, 1, 2]), S7=random.choice(LG), T7=random.choice([0, 0, 1, 2]), U7=random.choice(LG),
             R10=random.choice([0, 6]), R13=random.choice([0, 1, 2]), S13=random.choice([730, 830, 930]),
             R15=random.choice([0, 1]), T15=random.choice([1256, 1456, 1656, 1856]), R44=random.choice([0, 0, 1, 2]))
    for k, v in o.items(): ws[k] = v
    c['opt'] = o
    p = f'{work}/cas{i}.xlsx'; wb.save(p); cases.append(p); saisies.append(c)
subprocess.run(['soffice', '--headless', '--convert-to', 'xlsx', '--outdir', f'{work}/calc'] + cases, capture_output=True)
out = []
for i, p in enumerate(cases):
    ws = openpyxl.load_workbook(f'{work}/calc/cas{i}.xlsx', data_only=True)[SH]
    g = lambda a: ws[a].value
    saisies[i]['attendu'] = dict(cj=[g(f'E{r}') for r in range(11, 16)], clips=g('P37'), equerres=g('P38'), mousse=g('P44'), J41=g('J41'), J42=g('J42'))
json.dump(saisies, open(f'{work}/cas.json', 'w'))
print(len(saisies), 'cas écrits')
