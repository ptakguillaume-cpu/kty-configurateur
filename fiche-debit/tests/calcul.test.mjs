// Test du moteur : comparaison avec le XLS recalculé par LibreOffice (formules d'origine = legacy),
// puis vérification des corrections validées.  Usage : node tests/calcul.test.mjs tests/cas_xls.json
import { readFileSync } from 'node:fs';
import { etatInitial, traversesCloison, calculer, abreger, ROLES_RDB1 } from '../calcul.js';
import assert from 'node:assert/strict';

const cas = JSON.parse(readFileSync(process.argv[2], 'utf8'));
let ko = 0;
const etatDepuis = c => {
  const e = etatInitial(), o = c.opt;
  e.qte = { ...c.qte };
  e.options.doublage[0] = { nb: o.R7, lg: o.S7 }; e.options.doublage[1] = { nb: '', lg: 2.5 };
  e.options.renfort[0] = { nb: o.T7, lg: o.U7 }; e.options.renfort[1] = { nb: '', lg: 5.75 };
  e.options.traverses = o.R10; e.options.caSimple = { nb: o.R13, largeur: o.S13 };
  e.options.caDouble = { nb: o.R15, largeur: o.T15 }; e.options.departsLisse = o.R44;
  return e;
};
cas.forEach((c, i) => {
  const r = calculer(etatDepuis(c), { legacy: true }), a = c.attendu;
  const got = { cj: r.cj, clips: r.clips, equerres: r.equerres, mousse: r.mousse, J41: r.J41, J42: r.J42 };
  // le XLS ne borne pas à 0 : on compare avant bornage pour les équerres et la mousse
  const attendu = { ...a };
  try {
    assert.deepEqual(got.cj, attendu.cj); assert.equal(got.clips, attendu.clips);
    assert.equal(got.J41, attendu.J41); assert.equal(got.J42, attendu.J42 === false ? 0 : attendu.J42);
    assert.equal(got.equerres, Math.max(attendu.equerres, 0)); assert.equal(got.mousse, Math.max(attendu.mousse, 0));
  } catch (e) { ko++; console.log('ÉCART cas', i, JSON.stringify({ got, attendu })); }
});
console.log(`${cas.length - ko}/${cas.length} cas identiques au XLS (formules d'origine)`);

// --- Corrections validées (mode normal) ---
const e = etatInitial(); e.qte = { G6: 10, D4: 2, D9: 1, D10: 1 };
const n = calculer(e), l = calculer(e, { legacy: true });
assert.equal(l.cj[0], 2 * 12 - 1 + 2, 'XLS : Oméga 2500 retiré, +2 constant');
assert.equal(n.cj[0], 2 * 12 - 1, 'corrigé : le +2 devient un ajout manuel');
assert.equal(n.cj[1], 0, 'point A : plus de retrait Oméga 3050 sur le 2,7 m'); assert.equal(l.cj[1], -1);
assert.equal(n.cj[3], 0, 'point B : plus de retrait Oméga 3050 sur le 3,25 m'); assert.equal(l.cj[3], -1);
e.manuel[0] = 2; assert.equal(calculer(e).cj[0], 2 * 12 - 1 + 2, 'ajout manuel D');
const e2 = etatInitial(); e2.qte = { D21: 3 }; e2.options.renfort[0] = { nb: 1, lg: 5.75 };
assert.equal(calculer(e2).cj[4], 2 * 3 + 2, 'point C : montants spéciaux testés sur 5,75'); assert.equal(calculer(e2, { legacy: true }).cj[4], 6);
const e3 = etatInitial(); e3.qte = { G6: 1 }; e3.options.doublage = [{ nb: 1, lg: 2.5 }, { nb: 1, lg: 2.5 }];
assert.equal(calculer(e3).cj[0], 2 - 2, 'point F : 2e ligne de doublage prise en compte'); assert.equal(calculer(e3, { legacy: true }).cj[0], 2 - 1 + 2);
const e4 = etatInitial(); e4.qte = { G6: 5, D4: 4 }; e4.options.departsLisse = 1; e4.options.traverses = 0;
assert.equal(calculer(e4).equerres, (5 + 4) * 2 - 2, 'point I : départs en lisse'); assert.equal(calculer(e4).mousse, 20 - 5);

assert.equal(abreger('Couvre-joint plat lg 2550mm - 9005 MAT'), 'Couvre-joint plat lg 2550mm');
assert.equal(abreger('Vantail serrure DV,dim 2036x828,poussant gauche - RAL7016FT'), 'Vantail serrure DV 2036x828 PG');
assert.equal(abreger('Huisserie Classic AB,type A,dim fdf 2050x1456mm,anodisé'), 'Huis. Clas. type A fdf 2050x1456mm');
assert.equal(abreger('Jeu 3 paumelles aluminium pour huis.fdf 2050mm - RAL'), 'Jeu 3 pau. alu pour huis.fdf 2050mm');
console.log('Corrections validées : OK');
// --- RDB1 : mêmes règles, lignes rattachées par leur place sur la fiche ---
const r1 = etatInitial(); r1.qte = { G5: 10, D2: 2, D9: 1, G18: 3, G27: 1, G31: 2, D17: 4, G23: 1, D33: 2, D36: 1 };
const c1 = calculer(r1, { roles: ROLES_RDB1 });
assert.equal(c1.cj[0], 2 * (10 + 2) + 2 + 2 * 1 - 0 + 0, 'couvre-joint 2,5 m RDB1 : montants + départs, + huisseries (simples + 2 × doubles)');
assert.equal(c1.cj[2], 2 * (0 + 3 + 0 + 2 + 0 + 4) - 1, 'couvre-joint 3,05 m RDB1 : meneau, départ multiple, montant spécial, moins Oméga');
// angle multiple 00PVA (G27) : ni couvre-joint ni équerre
assert.equal(c1.equerres, (10 + 0 + 2 + 2 + 0 + 4) * 2 + 3 * 6 + 1 * 4, 'équerres RDB1 : angle 90° 15P2D compte comme l\'angle carré (×4)');
assert.equal(c1.qte.G10, c1.cj[0]); assert.equal(c1.qte.G12, c1.cj[2], 'couvre-joint plat RDB1 = lignes G10 à G14');
assert.equal(c1.qte.D40, 2, 'jeu 3 paumelles = huisseries simples'); assert.equal(c1.qte.D41, 1, 'jeu 6 paumelles = huisseries doubles');
assert.equal(c1.mousse, 10, 'mousse : 2 départs de 2,5 m, 2 côtés, arrondi à 5 m');
// --- Traverses selon le type de cloison (plusieurs types possibles sur une même fiche) ---
const tr = (modules, h2500 = false) => traversesCloison({ modules, h2500 });
assert.equal(tr({ PTH: 5, VTH: 5 }).traverses, 0, 'PTH et VTH simples : pas de traverse');
assert.equal(tr({ 'PTH imposte': 3 }).traverses, 3); assert.equal(tr({ VSA: 3 }).traverses, 3); assert.equal(tr({ 'VSA imposte': 3 }).traverses, 6, 'VSA avec imposte : 2 traverses par module (allège + imposte)');
assert.equal(tr({ 'PTH imposte': 3 }).montants, 2, '3 traverses = 2 montants de 2500'); assert.equal(tr({ 'PTH imposte': 3 }).equerres, 2, '3 traverses : 6 équerres, dont 4 déjà comptées avec les 2 montants');
assert.equal(tr({ 'VSA imposte': 3 }).equerres, 6); assert.equal(tr({ 'PTH imposte': 3 }, true).equerres, 6, 'cloison de 2500 : toutes les équerres des traverses');
assert.deepEqual([tr({ 'PTH imposte': 2, 'VSA imposte': 1, VTH: 4 }).traverses, tr({ 'PTH imposte': 2, 'VSA imposte': 1 }).montants, tr({ 'PTH imposte': 2, 'VSA imposte': 1 }).equerres], [4, 2, 4], 'plusieurs types : les traverses s\'additionnent');
assert.equal(tr({}).option, 0); assert.equal(tr({ VSA: '' }).option, 0); assert.equal(traversesCloison(undefined).option, 0);
{ const e = etatInitial(); e.qte = { G7: 2 }; const sans = calculer(e).equerres; e.options.traverses = String(tr({ 'PTH imposte': 3 }).option); assert.equal(calculer(e).equerres, sans + 2, 'l\'outil ajoute 2 équerres'); }
console.log('Traverses selon le type de cloison : OK');
const vide = calculer(etatInitial());
assert.deepEqual([vide.clips, vide.equerres, vide.mousse, vide.J41, vide.J42, ...vide.cj], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 'une fiche vide ne doit rien calculer');
assert.deepEqual(vide.alertes, []);
console.log('Fiche vide : tout à zéro : OK');
if (ko) process.exit(1);
