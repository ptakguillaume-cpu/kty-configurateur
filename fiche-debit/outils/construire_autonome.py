"""Construit UN SEUL fichier HTML autonome (code, styles, dessins et catalogue inclus).
Il s'ouvre par double-clic, sans serveur, sans internet et sans compte.
Usage : python3 fiche-debit/outils/construire_autonome.py   (depuis la racine du dépôt)"""
import base64, os, re, sys

D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
lire = lambda n: open(os.path.join(D, n), encoding='utf-8').read()

def module_vers_script(nom, js):
    """Chaque module devient un bloc isolé (ses noms n'entrent pas en conflit avec ceux des autres)."""
    exports = re.findall(r"^export\s+(?:async\s+)?(?:const|let|function|class)\s+([A-Za-z_$][\w$]*)", js, flags=re.M)
    def importe(m):
        noms = ', '.join(re.sub(r'\s+as\s+', ': ', n.strip()) for n in m.group(1).split(',') if n.strip())
        return f"const {{ {noms} }} = __m_{m.group(2).replace('-', '_')};"
    js = re.sub(r"^import\s*\{([\s\S]*?)\}\s*from\s*['\"]\./([\w-]+)\.js['\"];?", importe, js, flags=re.M)
    js = re.sub(r"^export\s+(?=(?:async\s+)?(?:const|let|function|class)\b)", '', js, flags=re.M)
    nom = nom.replace('-', '_')
    return f"const __m_{nom} = (() => {{\n{js}\nreturn {{ {', '.join(exports)} }};\n}})();"

images = {}
for f in sorted(os.listdir(os.path.join(D, 'images'))):
    if f.endswith('.png'):
        images[f[:-4]] = 'data:image/png;base64,' + base64.b64encode(open(os.path.join(D, 'images', f), 'rb').read()).decode()
code = '\n'.join(module_vers_script(n[:-3], lire(n)) for n in ('calcul.js', 'xlsx.js', 'bibliotheque.js', 'donnees.js', 'donnees-rdb1.js', 'catalogue.js', 'app.js'))
code = re.sub(r"`images/\$\{([^}]+)\}\.png`", r"__IMG[\1]", code)
if 'images/' in code.replace('__IMG', ''): print('Attention : un chemin d\'image reste dans le code', file=sys.stderr)
import json
code = 'const __IMG = ' + json.dumps(images, separators=(',', ':')) + ';\n' + code
code = code.replace('</', '<\\/')

html = lire('index.html')
html = re.sub(r'\s*<link rel="(?:manifest|icon|stylesheet)"[^>]*>', '', html)
html = re.sub(r'\s*<meta name="theme-color"[^>]*>', '', html)
html = re.sub(r'\s*<a class="bouton discret" href="\.\./index\.html"[^>]*>.*?</a>', '', html)       # pas de retour au configurateur
html = html.replace('</head>', '<style>\n' + lire('style.css') + '\n</style>\n</head>')
html = re.sub(r'<script type="module" src="app.js"></script>', lambda m: '<script>\n(function () {\n"use strict";\n' + code + '\n})();\n</script>', html)
sortie = os.path.join(D, 'autonome', 'Fiche-de-debit-Classic.html')
os.makedirs(os.path.dirname(sortie), exist_ok=True)
open(sortie, 'w', encoding='utf-8').write(html)
print(sortie, round(len(html.encode()) / 1024), 'Ko')
