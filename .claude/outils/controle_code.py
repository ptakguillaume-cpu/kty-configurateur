#!/usr/bin/env python3
"""Contrôle mécanique d'un projet : syntaxe, doublons, boutons orphelins. Sortie volontairement courte.
Usage : python3 .claude/outils/controle_code.py [dossier]   (code retour 1 s'il y a un problème)"""
import ast, json, os, re, shutil, subprocess, sys, tempfile
from collections import defaultdict

RACINE = sys.argv[1] if len(sys.argv) > 1 else "."
SKIP = {"node_modules", ".git", ".claude", "dist", "build", "__pycache__", "vendor"}
SCRIPT = re.compile(r"<script\b([^>]*)>(.*?)</script>", re.S | re.I)
FUNC = re.compile(r"^function\s+([A-Za-z_$][\w$]*)\s*\(", re.M)       # colonne 0 = niveau global
DEF = re.compile(r"(?:function|const|let|var)\s+([A-Za-z_$][\w$]*)")
WIN = re.compile(r"(?:window|globalThis|self)\.([A-Za-z_$][\w$]*)\s*=")
HANDLER = re.compile(r'\bon(?:click|change|input|submit|keydown|keyup|blur|focus|dblclick)\s*=\s*["\']\s*([A-Za-z_$][\w$]*)\s*\(', re.I)
ID = re.compile(r'\sid\s*=\s*["\']([^"\']+)["\']', re.I)
problemes, nb_fichiers = [], 0


def ligne(texte, pos):
    return texte.count("\n", 0, pos) + 1


def node_ok(code, module=False):
    if not shutil.which("node"):
        return None
    with tempfile.NamedTemporaryFile("w", suffix=".mjs" if module else ".js", delete=False, encoding="utf-8") as t:
        t.write(code)
    try:
        r = subprocess.run(["node", "--check", t.name], capture_output=True, text=True, timeout=60)
        if r.returncode == 0:
            return None
        l = r.stderr.strip().splitlines()
        e = [x for x in l if "Error" in x] or l or ["erreur"]
        return e[0][:120]
    finally:
        os.unlink(t.name)


fichiers = {}
for rep, dossiers, noms in os.walk(RACINE):
    dossiers[:] = [d for d in dossiers if d not in SKIP]
    for n in noms:
        if os.path.splitext(n)[1].lower() in {".py", ".js", ".mjs", ".html", ".htm", ".json"} and not n.endswith(".min.js"):
            chemin = os.path.join(rep, n)
            try:
                fichiers[chemin] = open(chemin, encoding="utf-8").read()
            except (UnicodeDecodeError, OSError):
                problemes.append(f"⚠️ {chemin} — illisible (encodage)")

if not shutil.which("node"):
    problemes.append("⚠️ node introuvable : syntaxe JS NON contrôlée")

fonctions = defaultdict(list)        # nom -> [(fichier, ligne)]
js_classique, js_module = [], []     # codes JS (pour boutons) : script classique / module
for f, c in fichiers.items():
    ext = os.path.splitext(f)[1].lower()
    blocs = []                       # (code, ligne_debut, module?)
    if ext == ".py":
        try:
            ast.parse(c)
        except SyntaxError as e:
            problemes.append(f"❌ {f}:{e.lineno} — erreur Python : {e.msg}")
    elif ext == ".json":
        try:
            json.loads(c)
        except json.JSONDecodeError as e:
            problemes.append(f"❌ {f}:{e.lineno} — JSON invalide : {e.msg}")
    elif ext in (".js", ".mjs"):
        blocs.append((c, 1, ext == ".mjs" or bool(re.search(r"^(import|export)\s", c, re.M))))
    else:
        for m in SCRIPT.finditer(c):
            a, code = m.group(1), m.group(2)
            if "src=" in a.lower() or not code.strip() or re.search(r"json|importmap", a, re.I):
                continue
            blocs.append((code, ligne(c, m.start(2)), "module" in a.lower()))
        html = SCRIPT.sub("", c)
        vus = defaultdict(int)
        for m in ID.finditer(html):
            vus[m.group(1)] += 1
        problemes += [f'❌ {f} — id HTML "{k}" présent {v} fois' for k, v in vus.items() if v > 1]
    nb_fichiers += 1
    for code, debut, mod in blocs:
        err = node_ok(code, mod)
        if err:
            problemes.append(f"❌ {f}:{debut} — erreur JS : {err}")
        for m in FUNC.finditer(code):
            fonctions[m.group(1)].append((f, debut + ligne(code, m.start()) - 1))
        (js_module if mod else js_classique).append(code)

for nom, lieux in fonctions.items():
    if len(lieux) > 1:
        ou = ", ".join(f"{f}:{l}" for f, l in lieux[:4])
        problemes.append(f"❌ fonction {nom}() définie {len(lieux)} fois ({ou}) — la dernière écrase les autres")

tout = "\n".join(js_classique + js_module)
defs_classique = set(DEF.findall("\n".join(js_classique)))
defs = set(DEF.findall(tout))
wins = set(WIN.findall(tout))
assign = "Object.assign(window" in tout
for f, c in fichiers.items():
    if f.lower().endswith((".html", ".htm")):
        for m in HANDLER.finditer(c):
            nom = m.group(1)
            if nom in {"alert", "confirm", "print", "prompt", "event"}:
                continue
            if nom not in defs:
                problemes.append(f"❌ {f}:{ligne(c, m.start())} — bouton appelle {nom}() introuvable dans le projet")
            elif nom not in defs_classique and nom not in wins and not assign:
                problemes.append(f"⚠️ {f}:{ligne(c, m.start())} — {nom}() sans window.{nom} alors que le projet utilise des modules")

if problemes:
    print(f"{len(problemes)} problème(s) sur {nb_fichiers} fichiers :")
    print("\n".join(problemes[:40]) + (f"\n… {len(problemes) - 40} de plus" if len(problemes) > 40 else ""))
    sys.exit(1)
print(f"OK : {nb_fichiers} fichiers contrôlés, 0 problème")
