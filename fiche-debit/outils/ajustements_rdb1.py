"""Ajustements de la gamme RDB1 d'après les bons de commande RDB1 de mai 2026 (à lancer APRÈS generer_rdb1.py, sans danger si relancé).
Usage : python3 fiche-debit/outils/ajustements_rdb1.py
Retire le Meneau 5800 (001239 blanc, 000126 anodisé, 8203 9005 MAT) et le Clip de lisse 25 (008001) : absents des bons de commande."""
import json, os
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'donnees-rdb1.js')
s = open(D, encoding='utf-8').read(); a, b = s.index('{'), s.rindex('}') + 1
F = json.loads(s[a:b])
n = 0
for cote in ('gauche', 'droite'):
    for it in F[cote]:
        if it['id'] in ('G20', 'G42') and it.get('codes'):
            it['codes'] = {}; it['vide'] = True; it.pop('aff', None); n += 1
open(D, 'w', encoding='utf-8').write(s[:a] + json.dumps(F, ensure_ascii=False, separators=(',', ':')) + s[b:])
print(n, 'ligne(s) RDB1 vidée(s)')
