import { FICHE as FICHE_CLASSIC } from './donnees.js';
import { FICHE_RDB1 } from './donnees-rdb1.js';
import { CATALOGUE } from './catalogue.js';
import {
  etatInitial, calculer, ROLES_CLASSIC, ROLES_RDB1, abreger, couleurJonc, libelleFinition,
  LG_COUVRE_JOINT, LARGEURS_CA_SIMPLE, LARGEURS_CA_DOUBLE, FINITIONS, TYPES_CLOISON, traversesCloison,
} from './calcul.js';
import { creerXlsx } from './xlsx.js';
import { creerBibliotheque } from './bibliotheque.js';
import { instantane, comparer, clePdt, libelleType } from './revision.js';

const CLE_GAMME = 'kty_fiche_gamme';
const GAMMES = {
  classic: {
    id: 'classic', nom: 'Classic', fiche: FICHE_CLASSIC, cleBrouillon: 'kty_fiche_debit_brouillon', cleBib: 'kty_fiche_bibliotheque', calcul: true, roles: ROLES_CLASSIC, prefixeFichier: 'Fiche de Débit',
    images: {                                         // dessins de profils de la fiche (repris du XLS), par première ligne de famille
      G4: 'lisse', G6: 'montant', G11: 'couvre-joint', G18: 'parclose-simple', G21: 'parclose-double', G22: 'meneau', G27: 'angle-carre',
      G32: 'angle-depart-multiple', G37: 'depart-multiple-cj',
      D4: 'depart', D9: 'omega', D12: 'jonc', D14: 'angle-90', D17: 'montant-special', D22: 'capot', D27: 'angle-libre', D32: 'angle-doublage', D34: 'huisserie', D37: 'huisserie', D47: 'huisserie',
    },
    finsApres: ['D33', 'D42', 'D45', 'D46', 'D51', 'D52'],              // lignes qui suivent une ligne du même ensemble (Angle / Plat de doublage, jeux de paumelles) : trait fin au-dessus
    deplacementAnodise: { ids: ['D27', 'D28', 'D29', 'D30', 'D31'], avant: 'D32' },     // en anodisé, le bloc « Angle libre » passe en bas du tableau de gauche (les autres finitions ne changent pas)
    rectangles: { G16: 'pc1', G17: 'pc2', G18: 'pc3', G19: 'pc1', G20: 'pc2', G21: 'pc3' },   // blocs parclose : un seul rectangle (comme l'Excel d'origine)
    imageSpan: { D32: 2 },                            // un même dessin pour « Angle de doublage » et « Plat de doublage »
    sansImagePropre: ['D33'],
    libelleLarge: ['D41', 'D42', 'D45', 'D46', 'D51', 'D52'],       // jeux de paumelles : libellé sur les 2 colonnes, sans dessin (comme le XLS)
    cercle: ['G16', 'G18', 'G19', 'G21'],             // macro « cercle rouge » du XLS
  },
  rdb1: {
    id: 'rdb1', nom: 'RDB1', fiche: FICHE_RDB1, cleBrouillon: 'kty_fiche_debit_brouillon_rdb1', cleBib: 'kty_fiche_bibliotheque_rdb1', calcul: true, roles: ROLES_RDB1, prefixeFichier: 'Fiche de Débit RDB1',
    images: {
      G2: 'rdb1-lisse', G5: 'rdb1-montant', G10: 'rdb1-couvre-joint', G15: 'rdb1-parclose', G18: 'rdb1-meneau', G23: 'rdb1-angle90', G27: 'rdb1-angle-multiple',
      G31: 'depart-multiple-cj', G37: 'rdb1-capot-rdb1', G41: 'rdb1-clip-lisse',
      D2: 'rdb1-depart', D7: 'rdb1-omega', D12: 'rdb1-jonc', D14: 'rdb1-mousse', D17: 'rdb1-montant-special', D21: 'rdb1-capot-classic', D26: 'rdb1-angle-libre',
      D31: 'rdb1-doublage', D33: 'rdb1-huisserie-simple', D36: 'rdb1-huisserie-double',
    },
    imageSpan: { D31: 2 }, finsApres: ['D32', 'D41', 'D42', 'D43'], rectangles: {}, sansImagePropre: ['D32'], libelleLarge: ['D40', 'D41', 'D42', 'D43'], cercle: [],
  },
};
let gammeId = 'classic';
try { const h0 = (location.hash || '').replace('#', ''), s = GAMMES[h0] ? h0 : localStorage.getItem(CLE_GAMME); if (GAMMES[s]) gammeId = s; } catch { /* stockage indisponible : gamme Classic */ }
const GAMME = GAMMES[gammeId], FICHE = GAMME.fiche;
const CLE = GAMME.cleBrouillon, IMAGES = GAMME.images, IMAGE_SPAN = GAMME.imageSpan;
const FINS = new Set(GAMME.finsApres), RECTANGLES = GAMME.rectangles, SANS_IMAGE_PROPRE = new Set(GAMME.sansImagePropre), LIBELLE_LARGE = new Set(GAMME.libelleLarge), AVEC_CERCLE = new Set(GAMME.cercle);
const NOM_FINITION = { '9005 MAT': '9005 MAT', '7016 FT': '7016 FT', 'BLANC 9016': 'BLANC 9016', 'ANODISÉ': 'ANODISÉ', RAL: 'RAL (à définir ou demandé)' };
const FINITION_CATALOGUE = { '9005 MAT': '9005 MAT', '7016 FT': 'RAL7016FT', 'BLANC 9016': 'BLANC 9016', 'ANODISÉ': 'ANODISÉ', RAL: 'RAL À DÉFINIR' };
let DESIGNATION = new Map();                          // référence -> désignation (reconstruit depuis la bibliothèque)
const PRODUITS_VIDES_MIN = gammeId === 'classic' ? 15 : 18;   // lignes vides affichées pour garder l'aspect de la feuille (3 de moins en Classic : 3 clips de lisse de plus dans les accessoires)

// ---------- utilitaires ----------
function h(tag, props = {}, ...enfants) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') e.className = v;
    else if (k === 'text') e.textContent = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v === true) e.setAttribute(k, '');
    else if (v !== false && v != null) e.setAttribute(k, v);
  }
  for (const c of enfants.flat()) if (c != null) e.append(c.nodeType ? c : document.createTextNode(c));
  return e;
}
const $ = id => document.getElementById(id);
const nombre = v => { const x = Number(String(v ?? '').replace(',', '.')); return Number.isFinite(x) ? x : 0; };
const fmt = x => String(Math.round(x * 100) / 100).replace('.', ',');
const fmtLg = lg => lg.toFixed(2).replace('.', ',') + ' m';
const sansAccent = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
let INDEX = [];                                       // index de recherche des produits
function reconstruireCatalogue(liste) {
  DESIGNATION = new Map(liste.map(c => [c[0], c[1]]));
  INDEX = liste.map(c => ({ ref: c[0], des: c[1], edi: c[2], fin: c[3], hors: c[4], texte: sansAccent(`${c[0]} ${c[1]} ${c[2]}`), mots: sansAccent(`${c[0]} ${c[1]} ${c[2]}`).split(/[^a-z0-9]+/).filter(Boolean), des0: sansAccent(c[1]).split(/[^a-z0-9]+/).filter(Boolean).join(' ') }));
}
let pret = false;
const bibliotheque = creerBibliotheque({
  FICHE, CATALOGUE, h, telecharger, cle: GAMME.cleBib,
  surChangement: bib => { reconstruireCatalogue(bib.catalogue); if (pret) { maj(); chercher(); } },
});
reconstruireCatalogue(bibliotheque.catalogue());

// ---------- état et brouillon ----------
function cloisonLue(c) {                          // accepte aussi l'ancien format (un seul type)
  if (!c || typeof c !== 'object') return { modules: {}, h2500: false };
  const modules = c.modules && typeof c.modules === 'object' ? { ...c.modules } : (c.type ? { [c.type]: c.modules } : {});
  return { modules, h2500: !!c.h2500 };
}
// Fiches Classic enregistrées avant le déplacement des clips de lisse (vers les accessoires) et le remplacement des paumelles clarit / serrure (vers la liste des produits)
const ANCIENNES_LIGNES = {
  D43: { designation: 'Jeu 2 paumelles clarit', codes: { '9005 MAT': '8156', '7016 FT': '007604', 'BLANC 9016': '000138', 'ANODISÉ': '000136', 'RAL': '000354' } },
  D44: { designation: 'Serrure clarit avec cylindre', codes: { '9005 MAT': '8282', 'BLANC 9016': '000771' } },
};
function migrerClassic(res) {
  for (const [g, a] of [['G42', 'A45'], ['G43', 'A46'], ['G44', 'A47']]) {
    if (res.qte[g] !== undefined) { if (nombre(res.qte[g]) && res.accessoires[a] === undefined) res.accessoires[a] = res.qte[g]; delete res.qte[g]; }
  }
  for (const [id, x] of Object.entries(ANCIENNES_LIGNES)) {
    if (res.qte[id] !== undefined) { if (nombre(res.qte[id])) res.produits.push({ ref: x.codes[res.entete.finition] || '', designation: x.designation, qte: res.qte[id] }); delete res.qte[id]; }
  }
  return res;
}
function fusion(brut) { const r = fusionBrute(brut); return gammeId === 'classic' ? migrerClassic(r) : r; }
function fusionBrute(brut) {
  const b = etatInitial(), o = brut.options || {};
  const deux = (base, src) => [0, 1].map(i => ({ ...base[i], ...((src || [])[i] || {}) }));
  return {
    ...b,
    entete: { ...b.entete, ...(brut.entete || {}) },
    qte: { ...(brut.qte || {}) },
    manuel: Array.isArray(brut.manuel) ? b.manuel.map((_, i) => nombre(brut.manuel[i])) : b.manuel,
    options: {
      ...b.options, ...o,
      doublage: deux(b.options.doublage, o.doublage), renfort: deux(b.options.renfort, o.renfort),
      caSimple: { ...b.options.caSimple, ...(o.caSimple || {}) }, caDouble: { ...b.options.caDouble, ...(o.caDouble || {}) },
    },
    cloison: cloisonLue(brut.cloison),
    accessoires: { ...(brut.accessoires || {}) },
    produits: Array.isArray(brut.produits) ? brut.produits.map(p => ({ ref: String(p.ref ?? ''), designation: String(p.designation ?? ''), qte: p.qte ?? '' })) : [],
    revision: brut.revision && typeof brut.revision === 'object' ? { numero: Number(brut.revision.numero) || 0, base: brut.revision.base || null, date: brut.revision.date || null } : b.revision,
  };
}
let etat;
try { const s = localStorage.getItem(CLE); etat = s ? fusion(JSON.parse(s)) : etatInitial(); } catch { etat = etatInitial(); }
const sauver = () => { try { localStorage.setItem(CLE, JSON.stringify(etat)); } catch { /* stockage indisponible : on continue */ } };

// ---------- liaison champ <-> état ----------
const synchros = [];
function lier(champ, lire, ecrire) {
  synchros.push(() => { champ.value = lire() ?? ''; });
  const numerique = /^(decimal|numeric)$/.test(champ.getAttribute('inputmode') || '');
  champ.addEventListener('input', () => {
    if (numerique && /[^0-9.,+\-]/.test(champ.value)) { champ.value = champ.value.replace(/[^0-9.,+\-]/g, ''); annoncer('Cette case n\'accepte que des chiffres.'); }   // pas de lettres dans une quantité
    ecrire(champ.value); maj();
  });
  return champ;
}
const remplir = () => synchros.forEach(f => f());

// ---------- tableaux de profils ----------
let champMontant = null;
const montantsAuto = () => nombre(etat.options.montantsTraverses);   // montants de 2500 des traverses, ajoutés automatiquement à la ligne Montant 2500
const lignes = {};                                // id -> { item, tr, codeTd, calc }
function groupes(items) {
  const g = [];
  for (const it of items) {
    const dernier = g[g.length - 1];
    if (dernier && dernier.famille === it.famille && dernier.codeFamille === it.codeFamille && it.ligne === dernier.items[dernier.items.length - 1].ligne + 1) dernier.items.push(it);
    else g.push({ famille: it.famille, codeFamille: it.codeFamille, items: [it] });
  }
  return g;
}

const groupesCond = [], tbodies = {};              // groupes dont des lignes ne s'affichent que pour certaines finitions
function construireProfils(cote, titre) {
  const tbody = h('tbody'); tbodies[cote] = tbody;
  for (const g of groupes(FICHE[cote])) {
    const lignesG = [];
    g.items.forEach((it, i) => {
      if (it.remplissage) return;                                       // (anciennes lignes de remplissage : les tableaux s'étirent maintenant pour remplir la page)
      const tr = h('tr', { 'data-id': it.id, class: ((i === 0 && !FINS.has(it.id) ? 'groupe ' : '') + (RECTANGLES[it.id] || '')).trim() });
      if (i === 0 && LIBELLE_LARGE.has(it.id)) {
        tr.append(h('td', { class: 'fam large' + (g.famille.length > 22 ? ' long' : ''), colspan: 2, rowspan: g.items.length, text: g.famille }));
      } else if (i === 0 && it.vide && it.titre) {
        if (it.titreLarge) { tr.append(h('td', { class: 'titre', colspan: 5, text: it.titre })); tbody.append(tr); return; }   // ex. « GAMME CLASSIC » sur toute la largeur
        tr.append(h('td', { class: 'titre', colspan: 2, text: it.titre }));          // ex. « Simple vitrage » (ligne 17 du XLS)
      } else if (i === 0) {
        if (!SANS_IMAGE_PROPRE.has(it.id)) {
          const img = h('td', { class: 'img', rowspan: IMAGE_SPAN[it.id] || g.items.length });
          if (IMAGES[it.id]) img.append(h('img', { src: `images/${IMAGES[it.id]}.png`, alt: '' }));
          if (it.imgTexte) img.append(h('span', { class: 'img-texte', text: it.imgTexte }));
          tr.append(img);
        }
        const fam = h('td', { class: 'fam', rowspan: g.items.length }, h('span', { class: AVEC_CERCLE.has(it.id) ? 'cercle' : '', text: g.famille }));
        if (g.codeFamille) fam.append(h('small', { text: g.codeFamille }));
        if (g.famille === 'Jonc') fam.append(h('small', { id: 'couleurJonc' }));
        tr.append(fam);
      }
      lignesG.push(tr);
      if (it.vide) { tr.append(h('td', { class: 'code', text: it.texteCode || '' }), h('td', { class: 'lg' }), h('td', { class: 'q' })); tbody.append(tr); return; }
      const codeTd = h('td', { class: 'code' });
      const lg = it.longueur ? String(it.longueur) : it.largeur ? String(it.largeur) : (it.texteLong || it.edi || '');
      const qTd = h('td', { class: 'q' });
      let calc = null;
      if (it.calcule) {
        calc = h('span', { class: 'calc' });
        qTd.append(calc);
        if (it.id.startsWith('G')) {      // ajout manuel (point D) sur chaque longueur de couvre-joint plat
          const k = GAMME.roles.couvreJoint.indexOf(it.id);
          if (k >= 0) qTd.append(lier(h('input', { class: 'manuel', type: 'text', inputmode: 'numeric', title: 'Ajout manuel (+ ou −)', 'aria-label': 'Ajout manuel ' + lg, autocomplete: 'off', placeholder: '±' }),
            () => (etat.manuel[k] || ''), v => { etat.manuel[k] = nombre(v); }));
        }
      } else {
        const montant = it.id === GAMME.roles.montants[0];            // ligne Montant 2500 : la case affiche le total, traverses comprises
        const saisie = lier(h('input', { type: 'text', inputmode: 'decimal', 'aria-label': `${it.libelle || it.famille} ${lg}`, autocomplete: 'off' }),
          () => { const a = montant ? montantsAuto() : 0; return a ? fmt(nombre(etat.qte[it.id]) + a) : etat.qte[it.id]; },
          v => {
            const a = montant ? montantsAuto() : 0;
            if (a) { const x = Math.max(0, nombre(v) - a); if (x) etat.qte[it.id] = String(x); else delete etat.qte[it.id]; }
            else if (v === '') delete etat.qte[it.id]; else etat.qte[it.id] = v;
          });
        qTd.append(saisie); if (montant) champMontant = saisie;
      }
      tr.append(codeTd, h('td', { class: lg.length > 6 ? 'lg long' : 'lg', text: lg }), qTd);
      tbody.append(tr);
      lignes[it.id] = { item: it, tr, codeTd, calc, qTd, saisie: it.id === GAMME.roles.montants[0] ? champMontant : null };
    });
    if (g.items.some(x => x.seulement)) groupesCond.push({ rows: lignesG, items: g.items, cells: [...lignesG[0].querySelectorAll(':scope > td.img, :scope > td.fam')] });
  }
  return h('table', { class: 'profils' },
    h('colgroup', {}, ['21%', '22%', '16%', '16%', '25%'].map(w => h('col', { style: `width:${w}` }))),
    h('thead', {}, h('tr', {}, h('th', { colspan: 2, text: titre }), h('th', { text: 'code KTY' }), h('th', { text: 'Longueur' }), h('th', { text: 'Quantité' }))), tbody);
}

// ---------- panneau de droite : en-tête, liste des produits, accessoires ----------
let lignesProduits = [];
const lignesAcc = {};
let rowLaquage;

function champEntete(libelle, champ) { return [h('label', { text: libelle }), champ]; }
function construirePanneau() {
  const e = () => etat.entete;
  const selectFin = lier(h('select', { class: 'ecran-seulement', 'aria-label': 'Finition' }, FINITIONS.map(f => h('option', { value: f, text: NOM_FINITION[f] }))),
    () => e().finition, v => { e().finition = v; });
  const ral = lier(h('input', { type: 'text', class: 'ecran-seulement', placeholder: 'RAL demandé (ex. RAL 5003)', 'aria-label': 'RAL demandé', autocomplete: 'off', id: 'champRal' }), () => e().ral, v => { e().ral = v; });
  const bouton = mode => h('button', { type: 'button', 'aria-pressed': 'false', 'data-mode': mode, text: mode, onclick: () => { e().mode = mode; maj(); } });
  const devis = h('div', { class: 'devis' }, bouton('DEVIS'), h('span', { text: 'OU' }), bouton('COMMANDE'));
  const tete = h('div', { class: 'entete-panneau' },
    h('div', { class: 'gamme' }, h('b', { text: 'KTY' }), h('span', { text: `GAMME ${GAMME.nom.toUpperCase()}   FAX : 04 78 67 02 73` }), lier(h('input', { type: 'text', 'aria-label': 'Page', placeholder: 'Page', style: 'width:60px' }), () => e().page, v => { e().page = v; })),
    champEntete('Société :', lier(h('input', { type: 'text', autocomplete: 'off' }), () => e().societe, v => { e().societe = v; })),
    champEntete('Réf chantier :', lier(h('input', { type: 'text', autocomplete: 'off' }), () => e().chantier, v => { e().chantier = v; })),
    champEntete('Niveau :', lier(h('input', { type: 'text', autocomplete: 'off', placeholder: 'ex. R+1' }), () => e().niveau, v => { e().niveau = v; })),
    champEntete('FINITION :', h('div', {}, selectFin, ral, h('div', { class: 'print-seulement', id: 'finTxt' }))),
    devis,
  );

  const corpsProduits = h('tbody', { id: 'produits' });
  const corpsFantomes = h('tbody', { id: 'fantomes' });            // produits retirés depuis la version figée
  const produits = h('table', { class: 'liste' },
    h('colgroup', {}, h('col', { class: 'c1' }), h('col', { class: 'c2' }), h('col', { class: 'c3' }), h('col', { class: 'c4' }), h('col', { style: 'width:28px', class: 'sup' })),
    h('thead', {}, h('tr', {}, h('th', { text: 'CODE' }), h('th', { colspan: 2, text: 'Désignation' }), h('th', { text: 'Qts' }), h('th', { class: 'sup' }))),
    corpsProduits, corpsFantomes);

  // Accessoires : dessins à gauche (clip / éclisse / équerre, joints), comme dans le XLS
  const IMG_ACC = { A36: { lignes: 9, img: 'accessoires' }, A45: { lignes: 3, img: 'clip-lisse' } };      // éclisse, clip, équerre, joints, cale, mousse : un seul dessin comme dans le XLS
  const SANS_IMAGE = new Set(['A34', 'A35']);
  const corpsAcc = h('tbody');
  rowLaquage = h('tr', { class: 'acc', hidden: true },
    h('td', { colspan: 2, text: 'Forfait laquage' }), h('td', { class: 'code-p', text: '500', title: 'Code interne du forfait laquage' }), h('td', { text: 'OUI' }), h('td', { class: 'n' }, h('div', { class: 'auto', text: '1' })), h('td', { class: 'sup' }));
  corpsAcc.append(rowLaquage);
  for (const a of FICHE.accessoires) {
    const cellule = a.auto
      ? h('div', { class: 'auto' })
      : lier(h('input', { type: 'text', inputmode: 'decimal', 'aria-label': a.libelle, autocomplete: 'off' }), () => etat.accessoires[a.id], v => { if (v === '') delete etat.accessoires[a.id]; else etat.accessoires[a.id] = v; });
    const bloc = IMG_ACC[a.id];
    const cellules = [];
    if (bloc) cellules.push(h('td', { class: 'img', rowspan: bloc.lignes }, bloc.img ? h('img', { src: `images/${bloc.img}.png`, alt: '' }) : null));
    const repere = /^Joint 6 mm/.test(a.libelle) ? 'orange' : /^Joint 8 mm/.test(a.libelle) ? 'vert' : '';      // repères de couleur des joints (10 et 12 mm : aucun)
    cellules.push(h('td', { colspan: SANS_IMAGE.has(a.id) ? 2 : 1, class: repere ? 'repere-' + repere : '', text: a.libelle, title: DESIGNATION.get(a.code) || '' }));
    const codeTd = h('td', { class: 'code-p', text: a.code });
    const nTd = h('td', { class: 'n' }, cellule);
    cellules.push(codeTd, h('td', { text: a.edi }), nTd, h('td', { class: 'sup' }));
    const tr = h('tr', { class: 'acc' }, cellules);
    corpsAcc.append(tr);
    lignesAcc[a.id] = { a, tr, cellule, codeTd, nTd };
  }
  const accessoires = h('table', { class: 'liste acc-table' },
    h('colgroup', {}, h('col', { class: 'a1' }), h('col', { class: 'a2' }), h('col', { class: 'a3' }), h('col', { class: 'a4' }), h('col', { class: 'a5' }), h('col', { style: 'width:28px', class: 'sup' })),
    corpsAcc);
  return h('div', { class: 'panneau' }, tete, produits, accessoires);
}

function rendreProduits() {
  const corps = $('produits'); corps.replaceChildren(); lignesProduits = [];
  etat.produits.forEach((p, i) => {
    const tr = h('tr', {},
      h('td', {}, h('input', { type: 'text', class: 'code-p', value: p.ref, 'aria-label': 'Code', autocomplete: 'off', oninput: ev => { p.ref = ev.target.value; maj(); } })),
      h('td', { colspan: 2 }, h('input', { type: 'text', value: p.designation, 'aria-label': 'Désignation', autocomplete: 'off', oninput: ev => { p.designation = ev.target.value; maj(); } })),
      h('td', { class: 'n' }, h('input', { type: 'text', inputmode: 'decimal', value: p.qte, 'aria-label': 'Quantité', autocomplete: 'off', oninput: ev => { p.qte = ev.target.value; maj(); } })),
      h('td', { class: 'sup' }, h('button', { type: 'button', class: 'retirer', title: 'Retirer cette ligne', 'aria-label': 'Retirer', text: '×', onclick: () => { etat.produits.splice(i, 1); rendreProduits(); maj(); } })));
    corps.append(tr); lignesProduits.push({ p, tr });
  });
  for (let i = etat.produits.length; i < PRODUITS_VIDES_MIN; i++) corps.append(h('tr', { class: 'vide-produit' }, h('td'), h('td', { colspan: 2 }), h('td', { class: 'n' }), h('td', { class: 'sup' })));
}

// ---------- mise à jour ----------
let message = '', minuteur;
function annoncer(texte) { message = texte; clearTimeout(minuteur); minuteur = setTimeout(() => { message = ''; maj(); }, 3500); maj(); }

const calculerFiche = () => calculer(etat, { roles: GAMME.roles });      // mêmes règles de calcul pour toutes les gammes
function valeursAccessoires(r) {
  return Object.fromEntries(FICHE.accessoires.map(a => [a.id, a.auto === 'clip' ? r.clips : a.auto === 'equerre' ? r.equerres : a.auto === 'mousse' ? r.mousse : nombre(etat.accessoires[a.id])]));
}
const instantaneCourant = r => instantane(r.qte, valeursAccessoires(r), etat.produits);

// ---------- suivi des modifications (version figée) ----------
const dateFr = iso => (iso ? new Date(iso).toLocaleDateString('fr-FR') : '');
function marquer(td, ch) {                                // colore une case selon son changement : ajouté / modifié / retiré
  if (!td) return;
  td.classList.remove('chg-ajout', 'chg-modif', 'chg-retrait');
  td.querySelectorAll(':scope > .avant').forEach(x => x.remove());
  td.title = '';
  if (!ch) return;
  td.classList.add('chg-' + ch.type);
  td.append(h('span', { class: 'avant', text: ch.type === 'ajout' ? 'ajouté' : `avant ${fmt(ch.avant)}` }));
  td.title = ch.type === 'ajout' ? 'Ajouté depuis la version figée' : `${libelleType[ch.type]} : avant ${fmt(ch.avant)}, maintenant ${fmt(ch.apres)}`;
}
function majRevision(r) {
  const rev = etat.revision, diff = rev.base ? comparer(rev.base, instantaneCourant(r)) : null;
  for (const L of Object.values(lignes)) marquer(L.qTd, diff?.lignes[L.item.id]);
  for (const { a, nTd } of Object.values(lignesAcc)) marquer(nTd, diff?.acc[a.id]);
  for (const { p, tr } of lignesProduits) marquer(tr.querySelector('td.n'), diff?.produits[clePdt(p)]);
  $('fantomes').replaceChildren(...(diff ? diff.retires.map(x => h('tr', { class: 'fantome' },
    h('td', { text: x.ref }), h('td', { colspan: 2, text: `${x.designation || ''} (retiré)` }),
    h('td', { class: 'n chg-retrait' }, h('span', { class: 'avant', text: `avant ${fmt(x.avant)}` })), h('td', { class: 'sup' }))) : []));
  const b = $('revision'); b.hidden = !rev.base;
  $('btnFiger').textContent = rev.base ? 'Valider les modifications' : 'Figer cette version';
  $('btnSuivi').hidden = !rev.base;
  if (!rev.base) return;
  const modif = diff.nb > 0;
  b.classList.toggle('hors-impression', !modif); b.classList.toggle('modifiee', modif);
  document.body.classList.toggle('avec-suivi', modif);
  b.querySelector('strong').textContent = modif
    ? `MODIFICATION n°${rev.numero + 1} — par rapport à la version n°${rev.numero} du ${dateFr(rev.date)} (${diff.nb} changement${diff.nb > 1 ? 's' : ''})`
    : `Version n°${rev.numero} figée le ${dateFr(rev.date)}. Toute modification apparaîtra en couleur.`;
  b.querySelector('.legende').hidden = !modif;
}
function figer() {
  const rev = etat.revision, courant = instantaneCourant(calculerFiche());
  if (rev.base) {
    const d = comparer(rev.base, courant);
    if (!d.nb) { annoncer('Aucune modification depuis la version figée.'); return; }
    if (!confirm(`Valider les ${d.nb} modification(s) et figer la version n°${rev.numero + 1} ?\nLes couleurs repartiront de cette nouvelle version.`)) return;
    rev.numero++;
  }
  rev.base = courant; rev.date = new Date().toISOString(); maj();
  annoncer(rev.numero ? `Version n°${rev.numero} figée.` : 'Version figée : les prochaines modifications apparaîtront en couleur.');
}
function arreterSuivi() {
  if (!confirm('Arrêter le suivi des modifications ? Les couleurs disparaissent et la version figée est oubliée.')) return;
  etat.revision = { numero: 0, base: null, date: null }; maj();
}
function construireRevision() {                           // bandeau imprimé en haut de la fiche quand elle a été modifiée
  return h('div', { class: 'revision', id: 'revision', hidden: true }, h('strong'),
    h('span', { class: 'legende' }, h('i', { class: 'chg-ajout', text: 'ajouté' }), h('i', { class: 'chg-modif', text: 'modifié (avant X)' }), h('i', { class: 'chg-retrait', text: 'retiré (avant X)' })));
}

// Lignes « anodisé seulement » (n'existent plus dans les autres finitions) et lignes de remplissage : les deux tableaux gardent la même hauteur
function majLignesConditionnelles() {
  const fin = etat.entete.finition, dep = GAMME.deplacementAnodise;
  if (dep && lignes[dep.avant]) {                                           // déplace les lignes (avec leurs cases de saisie) d'un tableau à l'autre
    const rows = dep.ids.map(id => lignes[id].tr);
    if (fin === 'ANODISÉ') { const ancre = tbodies.gauche.querySelector('tr.remplissage'); rows.forEach(tr => tbodies.gauche.insertBefore(tr, ancre)); }
    else rows.forEach(tr => tbodies.droite.insertBefore(tr, lignes[dep.avant].tr));
  }
  for (const L of Object.values(lignes)) if (L.item.seulement) L.tr.hidden = !L.item.seulement.includes(fin);
  for (const G of groupesCond) {
    const visibles = G.rows.filter(tr => !tr.hidden);
    G.rows.forEach(tr => tr.classList.remove('groupe'));
    if (!visibles.length) continue;
    visibles[0].prepend(...G.cells); G.cells.forEach(c => { c.rowSpan = visibles.length; }); visibles[0].classList.add('groupe');
  }
  const reel = cote => tbodies[cote] ? [...tbodies[cote].children].filter(tr => !tr.classList.contains('remplissage') && !tr.hidden).length : 0;
  const L = reel('gauche'), M = reel('droite'), T = Math.max(GAMME.id === 'classic' ? 41 : 0, L, M);
  for (const [cote, n] of [['gauche', T - L], ['droite', T - M]]) [...(tbodies[cote]?.querySelectorAll('tr.remplissage') || [])].forEach((tr, i) => { tr.hidden = i >= n; });
  document.body.classList.toggle('grille-dense', GAMME.id === 'classic' && T > 41);          // plus de lignes : un peu plus serrées pour tenir sur une page
}
function maj() {
  majLignesConditionnelles();
  const r = calculerFiche();
  const e = etat.entete, fin = e.finition, alertes = [...r.alertes.map(t => ({ t }))];
  const nomFin = libelleFinition(e);
  for (const [id, L] of Object.entries(lignes)) {
    const code = L.item.codes[fin];
    L.codeTd.textContent = code ?? '—';
    L.codeTd.classList.toggle('absent', !code);
    L.codeTd.title = code ? (DESIGNATION.get(code) || '') : `Pas de code en ${nomFin} pour cette ligne`;
    const q = r.qte[id] || 0;
    if (L.saisie) {                                          // ligne Montant 2500 : info « dont N pour traverses » au survol
      const a = montantsAuto();
      L.saisie.title = a ? `dont ${a} pour les traverses (ajoutés automatiquement)` : '';
      if (document.activeElement !== L.saisie) L.saisie.value = a ? fmt(nombre(etat.qte[id]) + a) : (etat.qte[id] ?? '');
    }
    if (L.calc) { L.calc.textContent = fmt(q); L.calc.classList.toggle('zero', !q); }
    L.tr.classList.toggle('rempli', q !== 0);
    if (q > 0 && !code) {
      const dispo = Object.keys(L.item.codes).map(f => NOM_FINITION[f] === 'RAL (à définir ou demandé)' ? 'RAL' : f);
      const nom = `« ${L.item.libelle || L.item.famille} ${L.item.longueur || L.item.largeur || ''} »`;
      alertes.push({ t: dispo.length ? `${nom} n'existe plus qu'en ${dispo.join(', ')} : pas de code en ${nomFin}.` : `Pas de code pour ${nom} : ajoutez-le avec « + Ligne libre ».` });
    }
  }
  $('couleurJonc').textContent = couleurJonc(fin, e.ral);
  $('finTxt').textContent = nomFin;
  $('champRal').hidden = fin !== 'RAL';
  document.querySelectorAll('.devis button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === e.mode)));
  rowLaquage.hidden = fin !== 'RAL';
  const videsProduits = [...document.querySelectorAll('tr.vide-produit')];       // la ligne « Forfait laquage » (RAL) prend la place d'une ligne vide : la fiche reste sur une page
  videsProduits.forEach((tr, i) => { tr.hidden = fin === 'RAL' && i >= videsProduits.length - 2; });
  const accVals = valeursAccessoires(r);
  for (const { a, tr, cellule, codeTd } of Object.values(lignesAcc)) {
    codeTd.textContent = a.code;
    const q = accVals[a.id];
    if (a.auto) { cellule.textContent = q ? fmt(q) : '0'; cellule.classList.toggle('zero', !q); }
    tr.classList.toggle('rempli', q > 0);
  }
  for (const { p, tr } of lignesProduits) tr.classList.toggle('rempli', nombre(p.qte) !== 0);
  majRevision(r); majTraverses();
  if (fin === 'RAL' && !e.ral) alertes.push({ t: 'Finition RAL : indiquez le RAL demandé dans l\'en-tête (sinon « RAL À DÉFINIR » est imprimé).', info: true });
  if (message) alertes.push({ t: message, info: true });
  const zone = $('alertes');
  zone.replaceChildren();
  if (alertes.length) zone.append(h('ul', {}, alertes.map(a => h('li', { class: a.info ? 'info' : '', text: a.t }))));
  sauver();
}

// ---------- options de calcul ----------
function optNbLg(titre, aide, tableau, i) {
  const nb = lier(h('input', { type: 'text', inputmode: 'numeric', 'aria-label': titre + ' : nombre', autocomplete: 'off' }), () => etat.options[tableau][i].nb, v => { etat.options[tableau][i].nb = v; });
  const lg = lier(h('select', { 'aria-label': titre + ' : longueur' }, LG_COUVRE_JOINT.slice(0, GAMME.roles.couvreJoint.length).map(x => h('option', { value: String(x), text: fmtLg(x) }))), () => String(etat.options[tableau][i].lg), v => { etat.options[tableau][i].lg = parseFloat(v); });
  return h('div', { class: 'option' }, h('span', { class: 'titre', text: titre }), h('div', { class: 'ligne' }, nb, lg), h('p', { class: 'aide', text: aide }));
}
function optNbLarg(titre, aide, cle, largeurs) {
  const nb = lier(h('input', { type: 'text', inputmode: 'numeric', 'aria-label': titre + ' : nombre', autocomplete: 'off' }), () => etat.options[cle].nb, v => { etat.options[cle].nb = v; });
  const lg = lier(h('select', { 'aria-label': titre + ' : largeur' }, largeurs.map(x => h('option', { value: String(x), text: x + ' mm' }))), () => String(etat.options[cle].largeur), v => { etat.options[cle].largeur = parseInt(v, 10); });
  return h('div', { class: 'option' }, h('span', { class: 'titre', text: titre }), h('div', { class: 'ligne' }, nb, lg), h('p', { class: 'aide', text: aide }));
}
function optSimple(titre, aide, cle) {
  const c = lier(h('input', { type: 'text', inputmode: 'numeric', 'aria-label': titre, autocomplete: 'off' }), () => etat.options[cle], v => { etat.options[cle] = v; });
  return h('div', { class: 'option' }, h('span', { class: 'titre', text: titre }), h('div', { class: 'ligne' }, c), h('p', { class: 'aide', text: aide }));
}
// Traverses : le type de cloison (fenêtre ci-dessous) remplit cette case ; on peut toujours la corriger à la main
function optTraverses() {
  const o = optSimple('Traverses : montants de 2500 à compléter en équerres', 'Ajoute 2 équerres par montant. Rempli automatiquement par le type de cloison, corrigeable à la main.', 'traverses');
  o.append(h('p', { class: 'aide', id: 'resumeTraverses' }), h('button', { type: 'button', class: 'bouton', text: 'Type de cloison…', onclick: () => ouvrirCloison() }));
  return o;
}
const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;
const detailCloison = c => c.lignes.map(l => `${l.type.nom} × ${l.modules}`).join(', ');
function majTraverses() {
  const el = $('resumeTraverses'); if (!el) return;
  const c = traversesCloison(etat.cloison);
  el.textContent = !c.lignes.length ? 'Type de cloison non renseigné.'
    : !c.traverses ? `${detailCloison(c)} : pas de traverse.`
    : `${detailCloison(c)} : ${pluriel(c.traverses, 'traverse')} (${pluriel(c.montants, 'montant')} de 2500${etat.cloison.h2500 ? ', comptés à part' : ', ajoutés à la ligne Montant 2500'}) → +${c.equerres} équerres.`;
}
// Petit formulaire « type de cloison » : proposé à chaque nouvelle fiche, ou depuis les options
// Portes (Classic) : nombre de jeux de paumelles tapé dans le formulaire ; ils remplissent les lignes Jeu 3 alu / Jeu 4 alu TH, et le Jeu 4 bois TH (absent du tableau) va dans la liste des produits
const CODES_BOIS_TH = { '9005 MAT': '8164', '7016 FT': '007613', 'BLANC 9016': '000481', 'ANODISÉ': '000901', 'RAL': '000486' };
const produitBoisTH = () => etat.produits.find(p => Object.values(CODES_BOIS_TH).includes(p.ref));
function ouvrirCloison() {
  const c0 = etat.cloison;
  const avecPortes = GAMME.id === 'classic';
  const PORTES = [
    { id: 'D45', nom: 'Portes alu SV (simple vitrage)', aide: 'Jeu 3 paumelles alu', lire: () => etat.qte.D45 },
    { id: 'D46', nom: 'Portes alu isolant (et CA toute hauteur)', aide: 'Jeu 4 paumelles alu TH', lire: () => etat.qte.D46 },
    { id: 'boisTH', nom: 'Portes bois toute hauteur', aide: 'Jeu 4 paumelles bois TH, ajouté à la liste des produits', lire: () => produitBoisTH()?.qte },
  ];
  const champsPortes = Object.fromEntries(PORTES.map(p => [p.id, h('input', { type: 'text', inputmode: 'numeric', 'aria-label': `Jeux de paumelles : ${p.nom}`, autocomplete: 'off', placeholder: '0', value: p.lire() || '' })]));
  const lignesPortes = PORTES.map(p => h('label', { class: 'ligne-cloison' }, h('span', { class: 'nom', text: p.nom }), champsPortes[p.id], h('span', { class: 'aide', text: p.aide })));
  const champs = Object.fromEntries(TYPES_CLOISON.map(t => [t.id, h('input', { type: 'text', inputmode: 'numeric', 'aria-label': `Nombre de modules ${t.nom}`, autocomplete: 'off', placeholder: '0', value: c0.modules[t.id] || '' })]));
  const h2500 = h('input', { type: 'checkbox', id: 'cloison2500' }); h2500.checked = !!c0.h2500;
  const lignes = TYPES_CLOISON.map(t => h('label', { class: 'ligne-cloison' }, h('span', { class: 'nom', text: t.nom }), champs[t.id], h('span', { class: 'aide', text: t.par ? (t.par === 1 ? '1 traverse par module' : '2 traverses par module (allège + imposte)') : 'pas de traverse' })));
  const resume = h('p', { class: 'bib-message' });
  const fermer = () => { f.remove(); document.body.style.overflow = ''; };
  const lire = () => ({ modules: Object.fromEntries(TYPES_CLOISON.map(t => [t.id, champs[t.id].value.replace(/[^0-9]/g, '')]).filter(([, v]) => v)), h2500: h2500.checked });
  const rafraichir = () => {
    for (const i of [...Object.values(champs), ...Object.values(champsPortes)]) i.value = i.value.replace(/[^0-9]/g, '');
    const c = lire(), r = traversesCloison(c);
    resume.textContent = !r.lignes.length ? 'Indiquez le nombre de modules de chaque type de cloison de la fiche.' : !r.traverses ? 'Pas de traverse : rien à ajouter.'
      : `${pluriel(r.traverses, 'traverse')}, ${pluriel(r.montants, 'montant')} de 2500 : l'outil ajoute ${r.equerres} équerres.`;
  };
  const valider = () => {
    etat.cloison = lire();
    const r = traversesCloison(etat.cloison);
    if (r.lignes.length) { etat.options.traverses = String(r.option || ''); etat.options.montantsTraverses = etat.cloison.h2500 ? '' : String(r.montants || ''); }
    if (avecPortes) {                                                  // seules les cases remplies sont écrites
      for (const id of ['D45', 'D46']) { const v = champsPortes[id].value.replace(/[^0-9]/g, ''); if (v) etat.qte[id] = v; }
      const v = champsPortes.boisTH.value.replace(/[^0-9]/g, '');
      if (v) { const p = produitBoisTH(); const ref = CODES_BOIS_TH[etat.entete.finition] || ''; if (p) { p.qte = v; p.ref = ref || p.ref; } else ajouterProduit({ ref, designation: 'Jeu 4 pau. porte bois toute hauteur', qte: v }); rendreProduits(); }
    }
    fermer(); remplir(); maj();
  };
  [...Object.values(champs), ...Object.values(champsPortes), h2500].forEach(e => e.addEventListener('input', rafraichir));
  Object.values(champs).forEach(i => i.addEventListener('keydown', ev => { if (ev.key === 'Enter') { ev.preventDefault(); valider(); } }));
  const f = h('div', { class: 'fenetre cloison hors-impression', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Type de cloison', onkeydown: ev => { if (ev.key === 'Escape') fermer(); } },
    h('div', { class: 'fenetre-contenu', style: 'max-width:560px' },
      h('div', { class: 'fenetre-tete' }, h('h2', { text: 'Types de cloison et portes' })),
      h('p', { class: 'aide', text: 'Indiquez le nombre de modules de chaque type présent sur la fiche (plusieurs types possibles). Les équerres des traverses sont calculées pour vous. Vous pouvez passer cette étape.' }),
      lignes,
      h('label', { class: 'case' }, h2500, ' Cloison de 2500 de haut'),
      h('p', { class: 'aide', text: 'Sinon, les montants de 2500 des traverses sont ajoutés automatiquement à la ligne Montant 2500 : ne les saisissez plus vous-même. Si la cloison fait 2500 de haut, ils sont comptés à part : cochez la case, l\'outil ajoute alors toutes les équerres des traverses.' }),
      avecPortes ? [h('h3', { text: 'Portes : nombre de jeux de paumelles' }),
        h('p', { class: 'aide', text: 'Les jeux de paumelles alu sont retirés du Jeu 3 paumelles bois (calculé avec les huisseries). Remplace l\'option « Portes CA » : remplissez bien cette partie en début de fiche.' }), ...lignesPortes] : null,
      resume,
      h('div', { class: 'actions', style: 'margin-top:14px' }, h('button', { type: 'button', class: 'bouton principal', text: 'Valider', onclick: valider }), h('button', { type: 'button', class: 'bouton', text: 'Passer', onclick: fermer }))));
  document.body.append(f); document.body.style.overflow = 'hidden'; rafraichir(); Object.values(champs)[1].focus();
}
function construireOptions() {
  $('options').append(
    optNbLg('Montants D, M, MS de doublage — ligne 1', 'Retire 1 couvre-joint plat par montant, sur la longueur choisie.', 'doublage', 0),
    optNbLg('Montants D, M, MS de doublage — ligne 2', 'Même règle, pour une 2e longueur.', 'doublage', 1),
    optNbLg('Montants M et MS renforcés — ligne 1', 'Ajoute 2 couvre-joints plats par montant, et 2 équerres.', 'renfort', 0),
    optNbLg('Montants M et MS renforcés — ligne 2', 'Même règle, pour une 2e longueur.', 'renfort', 1),
    optTraverses(),
    optSimple('Montants de 2500 pour les traverses', 'Ajoutés automatiquement à la ligne Montant 2500 : ne les saisissez plus vous-même. Modifiable.', 'montantsTraverses'),
    optSimple('Départs en lisse', 'Retire 2 équerres et 5 m de mousse départ par départ en lisse.', 'departsLisse'),
    optNbLarg('Portes CA simples', 'Retire ces portes des jeux de paumelles bois (3) quand la largeur correspond à l\'huisserie simple. Inutile si les portes alu sont indiquées dans le formulaire « Types de cloison et portes ».', 'caSimple', LARGEURS_CA_SIMPLE),
    optNbLarg('Portes CA double vantail', 'Retire ces portes des jeux de paumelles bois (6) quand la largeur correspond à l\'huisserie double.', 'caDouble', LARGEURS_CA_DOUBLE),
  );
}

// ---------- recherche de produit ----------
function chercher() {
  const q = sansAccent($('recherche').value).trim(), zone = $('resultats');
  zone.replaceChildren();
  if (q.length < 2) return;
  const mots = q.split(/[^a-z0-9]+/).filter(Boolean);
  if (!mots.length) return;
  // « jeu 4 » : chaque mot cherché doit commencer un mot de la désignation (un petit nombre = nombre exact, pas « 2400 » ni « 2050 »)
  const correspond = (c, m) => /^\d+$/.test(m) ? (m.length <= 2 ? c.mots.includes(m) : c.mots.some(x => x.startsWith(m)) || c.texte.includes(m)) : c.mots.some(x => x.startsWith(m));
  const phrase = mots.join(' ');
  const finOk = !$('rechercheFinition').checked ? null : FINITION_CATALOGUE[etat.entete.finition];
  const trouves = INDEX.filter(c => mots.every(m => correspond(c, m)) && (!finOk || c.fin === finOk || c.fin === '' || c.fin === 'BRUT'))
    .map(c => [c.des0.startsWith(phrase) ? 0 : c.des0.includes(phrase) ? 1 : 2, c]).sort((a, b) => a[0] - b[0] || a[1].des.length - b[1].des.length).map(x => x[1]);   // les désignations qui commencent par la recherche d'abord
  if (!trouves.length) { zone.append(h('li', { text: 'Aucun produit trouvé.' })); return; }
  for (const c of trouves.slice(0, 40)) {
    zone.append(h('li', {}, h('b', { text: c.ref }), h('span', { text: c.des + (c.hors ? ' (hors catalogue)' : '') }), h('span', { class: 'edi', text: c.edi }),
      h('button', { type: 'button', class: 'bouton', text: 'Ajouter', onclick: () => { ajouterProduit({ ref: c.ref, designation: abreger(c.des), qte: '1' }); rendreProduits(); annoncer(`Ajouté : ${c.ref}`); } })));
  }
  if (trouves.length > 40) zone.append(h('li', { class: 'edi', text: `… ${trouves.length - 40} autres résultats : précisez la recherche.` }));
}

// Liste CODE / Désignation organisée par blocs de porte : huisserie, puis paumelles, puis vantail, puis le reste (béquille…).
// Une huisserie ouvre un nouveau bloc (la toute première se place en tête de liste) ; les autres produits rejoignent le dernier bloc, à leur place. Les lignes déjà là ne bougent pas.
const rangProduit = d => /paum|^jeu\b/i.test(d) ? 1 : /^huis/i.test(d) ? 0 : /^vantail/i.test(d) ? 2 : 3;      // d'après le début de la désignation (« Jeu 3 pau. … sur Huis. bois » est bien une paumelle)
function ajouterProduit(p) {
  const r = rangProduit(p.designation), L = etat.produits;
  if (r === 0) { if (L.some(x => rangProduit(x.designation) === 0)) L.push(p); else L.unshift(p); return; }
  let debut = -1;
  L.forEach((x, i) => { if (rangProduit(x.designation) === 0) debut = i; });
  let pos = debut + 1;
  for (let i = debut + 1; i < L.length; i++) if (rangProduit(L[i].designation) <= r) pos = i + 1;
  L.splice(pos, 0, p);
}

// ---------- huisseries à ajouter à la liste (Classic) : double alu carré type B (4 largeurs) et TH carré SV sans traverse (sur mesure) ----------
const FIN5 = ['9005 MAT', '7016 FT', 'BLANC 9016', 'ANODISÉ', 'RAL'];
const codes5 = c => Object.fromEntries(FIN5.map((f, i) => [f, c[i]]));
const PAUMELLES_DOUBLES = {                                          // jeux de 6 ou 8 paumelles ajoutés avec une huisserie double
  alu6: { des: 'Jeu 6 pau. porte alu pour huis. fdf 2050mm', codes: codes5(['8167', '007616', '000790', '000431', '000791']) },
  aluIso: { nom: 'Alu isolant', des: 'Jeu 8 pau. porte alu pour huis. fdf 2050mm', codes: codes5(['8171', '007620', '001134', '001133', '001135']) },
  aluTH: { nom: 'Alu toute hauteur', des: 'Jeu 8 pau. porte alu toute hauteur', codes: codes5(['8172', '007621', '000713', '000698', '000724']) },
  boisTH: { nom: 'Bois toute hauteur', des: 'Jeu 8 pau. porte bois toute hauteur', codes: codes5(['', '007622', '000121', '000620', '000629']) },
};
const HUISSERIES_RAPIDES = [
  ...[['1270', ['8122', '007566', '007266', '007267', '007268']], ['1470', ['8123', '007567', '007269', '007270', '007271']], ['1670', ['8124', '007568', '007272', '007273', '007274']], ['1870', ['8125', '007561', '007275', '007276', '007277']]]
    .map(([l, c]) => ({ paum: 'alu6', nom: `Huisserie double alu carré type B, fdf 2050 x ${l}`, des: `Huis. carré AB type B fdf 2050x${l}`, codes: Object.fromEntries(FIN5.map((f, i) => [f, c[i]])) })),
  { nom: 'Huisserie TH carré, SV avec traverse (sur mesure)', des: 'Huis. carré AB SV avec traverse TH fdf x mm (dim. à préciser)', codes: Object.fromEntries(FIN5.map((f, i) => [f, ['8126', '007569', '005284', '007285', '007286'][i]])) },
  { nom: 'Huisserie TH carré, SV sans traverse (sur mesure)', des: 'Huis. carré AB SV sans traverse TH fdf x mm (dim. à préciser)', codes: Object.fromEntries(FIN5.map((f, i) => [f, ['8127', '007570', '007278', '007279', '007280'][i]])) },
  { paum: 'choix', nom: 'Huisserie double TH carré, DV avec traverse (sur mesure)', des: 'Huis. carré AB DV avec traverse TH fdf x mm (dim. à préciser)', codes: Object.fromEntries(FIN5.map((f, i) => [f, ['8128', '007571', '007287', '007288', '007289'][i]])) },
  { paum: 'choix', nom: 'Huisserie double TH carré, DV sans traverse (sur mesure)', des: 'Huis. carré AB DV sans traverse TH fdf x mm (dim. à préciser)', codes: Object.fromEntries(FIN5.map((f, i) => [f, ['8129', '007572', '007281', '007282', '005283'][i]])) },
];
function ouvrirHuisseries() {
  const info = h('p', { class: 'bib-message', text: `Cliquez sur une huisserie pour l'ajouter à la liste (finition de la fiche : ${libelleFinition(etat.entete)}).` });
  const portes = h('select', { 'aria-label': 'Portes des huisseries doubles TH' }, h('option', { value: '', text: '— choisir —' }),
    ['aluIso', 'aluTH', 'boisTH'].map(k => h('option', { value: k, text: PAUMELLES_DOUBLES[k].nom })));
  const fermer = () => { f.remove(); document.body.style.overflow = ''; };
  const boutons = HUISSERIES_RAPIDES.map(x => h('button', { type: 'button', class: 'bouton', style: 'display:block;width:100%;text-align:left;margin:6px 0', text: x.nom, onclick: () => {
    const fin = etat.entete.finition, ref = x.codes[fin] || '';
    const pk = x.paum === 'choix' ? portes.value : x.paum;
    if (x.paum === 'choix' && !pk) { info.textContent = 'Choisissez d\'abord le type de portes (liste « Portes des huisseries doubles TH »).'; portes.focus(); return; }
    ajouterProduit({ ref, designation: x.des, qte: '1' });
    let txt = ref ? `Ajouté : ${ref} — ${x.des}.` : `Ajouté sans code (pas de référence pour cette finition) : ${x.des}.`;
    if (pk) { const pa = PAUMELLES_DOUBLES[pk], pr = pa.codes[fin] || ''; ajouterProduit({ ref: pr, designation: pa.des, qte: '1' }); txt += pr ? ` + ${pr} — ${pa.des}.` : ` + ${pa.des} (pas de code pour cette finition).`; }
    rendreProduits(); info.textContent = txt + ' Vous pouvez en ajouter d\'autres.';
  } }));
  const f = h('div', { class: 'fenetre cloison hors-impression', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Huisseries', onkeydown: ev => { if (ev.key === 'Escape') fermer(); } },
    h('div', { class: 'fenetre-contenu', style: 'max-width:600px' },
      h('div', { class: 'fenetre-tete' }, h('h2', { text: 'Huisseries à ajouter' })),
      h('p', { class: 'aide', text: 'Chaque huisserie ouvre un nouveau bloc dans la liste CODE / Désignation / Qts. Les huisseries doubles ajoutent aussi leur jeu de paumelles (6 ou 8). Pour les huisseries sur mesure, précisez la dimension dans la désignation.' }),
      h('label', {}, 'Portes des huisseries doubles TH ', portes),
      boutons, info,
      h('div', { class: 'actions', style: 'margin-top:14px' }, h('button', { type: 'button', class: 'bouton principal', text: 'Terminé', onclick: fermer }))));
  document.body.append(f); document.body.style.overflow = 'hidden'; portes.focus();
}

// ---------- fichiers : enregistrer, ouvrir, Excel, imprimer ----------
const nomFichier = () => `${GAMME.prefixeFichier} ${etat.entete.chantier} ${etat.entete.niveau}`.replace(/\s+/g, ' ').trim().replace(/[\\/:*?"<>|]/g, '-');
const TYPES_FICHIER = { json: ['Fiche KTY (.json)', 'application/json'], xlsx: ['Classeur Excel (.xlsx)', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'] };
async function telecharger(blob, nom) {
  const ext = nom.split('.').pop().toLowerCase();
  if (window.showSaveFilePicker && TYPES_FICHIER[ext]) {            // Chrome / Edge : vraie fenêtre « Enregistrer sous » (dossier et nom au choix)
    try {
      const f = await window.showSaveFilePicker({ suggestedName: nom, types: [{ description: TYPES_FICHIER[ext][0], accept: { [TYPES_FICHIER[ext][1]]: ['.' + ext] } }] });
      const w = await f.createWritable(); await w.write(blob); await w.close();
      annoncer(`Fichier enregistré : ${f.name}`); return;
    } catch (err) { if (err && err.name === 'AbortError') return; }  // annulé : rien à faire ; autre erreur : téléchargement classique
  }
  const a = h('a', { href: URL.createObjectURL(blob), download: nom });          // Firefox, Safari : dossier Téléchargements
  document.body.append(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}
function exporterExcel() {
  rappelIdentite();
  const r = calculerFiche(), e = etat.entete, L = [];
  L.push([{ v: `KTY — Fiche de débit gamme ${GAMME.nom}`, gras: true }]);
  [['Société', e.societe], ['Réf chantier', e.chantier], ['Niveau', e.niveau], ['Finition', libelleFinition(e)], ['Types de cloison', detailCloison(traversesCloison(etat.cloison))], ['Devis ou commande', e.mode], ['Page', e.page], ['INFO', e.remarque]]
    .forEach(([k, v]) => L.push([{ v: k, gras: true }, v]));
  L.push([]);
  L.push(['PROFILS', 'Code KTY', 'Longueur', 'Quantité', '', '', 'Code KTY', 'Longueur / largeur', 'Quantité'].map(v => (v ? { v, gras: true } : v)));
  const parLigne = cote => Object.fromEntries(FICHE[cote].map(i => [i.ligne, i]));
  const g = parLigne('gauche'), d = parLigne('droite');
  const cell = (it, id) => {
    if (!it || it.vide || (it.seulement && !it.seulement.includes(e.finition))) return ['', '', '', ''];
    const q = r.qte[it.id] || 0, code = it.codes[e.finition];
    return [`${it.libelle || it.famille} ${it.codeFamille}`.trim(), { v: code || '—', texte: true }, it.longueur || (it.largeur ? 'larg. ' + it.largeur : it.texteLong || it.edi || ''), q || ''];
  };
  for (const n of [...new Set([...FICHE.gauche, ...FICHE.droite].map(i => i.ligne))].sort((p, q) => p - q)) {
    if ((!g[n] || g[n].vide) && (!d[n] || d[n].vide)) continue;
    const a = cell(g[n], 'G'), b = cell(d[n], 'D');
    L.push([a[0], a[1], a[2], a[3], '', b[0], b[1], b[2], b[3]]);
  }
  L.push([]); L.push([{ v: 'CODE', gras: true }, { v: 'Désignation', gras: true }, { v: 'EDI', gras: true }, { v: 'Qts', gras: true }]);
  etat.produits.forEach(p => L.push([{ v: p.ref, texte: true }, p.designation, '', nombre(p.qte) || '']));
  if (e.finition === 'RAL') L.push([{ v: '500', texte: true }, 'Forfait laquage', 'OUI', 1]);
  for (const a of FICHE.accessoires) {
    const q = a.auto === 'clip' ? r.clips : a.auto === 'equerre' ? r.equerres : a.auto === 'mousse' ? r.mousse : nombre(etat.accessoires[a.id]);
    L.push([{ v: a.code, texte: true }, a.libelle, a.edi, q || '']);
  }
  if (etat.revision.base) {
    const diff = comparer(etat.revision.base, instantaneCourant(r));
    L.push([]); L.push([{ v: `MODIFICATION n°${etat.revision.numero + 1} par rapport à la version n°${etat.revision.numero} du ${dateFr(etat.revision.date)}`, gras: true }]);
    if (!diff.nb) L.push(['Aucune modification.']);
    else {
      L.push(['Ligne', 'Code', 'Changement', 'Avant', 'Maintenant'].map(v => ({ v, gras: true })));
      const items = Object.fromEntries([...FICHE.gauche, ...FICHE.droite].map(i => [i.id, i]));
      for (const [id, ch] of Object.entries(diff.lignes)) {
        const it = items[id]; L.push([`${it.libelle || it.famille} ${it.longueur || it.largeur || ''}`.trim(), { v: it.codes[e.finition] || '—', texte: true }, libelleType[ch.type], ch.avant, ch.apres]);
      }
      for (const [id, ch] of Object.entries(diff.acc)) { const a = FICHE.accessoires.find(x => x.id === id); L.push([a.libelle, { v: a.code, texte: true }, libelleType[ch.type], ch.avant, ch.apres]); }
      for (const [k, ch] of Object.entries(diff.produits)) { const p = etat.produits.find(x => clePdt(x) === k); L.push([p.designation, { v: p.ref, texte: true }, libelleType[ch.type], ch.avant, ch.apres]); }
      for (const x of diff.retires) L.push([x.designation, { v: x.ref, texte: true }, libelleType.retrait, x.avant, 0]);
    }
  }
  telecharger(creerXlsx({ nom: 'Fiche de débit', lignes: L, largeurs: [34, 14, 16, 10, 3, 34, 14, 18, 10] }), nomFichier() + '.xlsx');
}
function rappelIdentite() { if (!etat.entete.societe || !etat.entete.chantier) annoncer('Pensez à renseigner Société et Réf chantier : elles servent au nom du fichier.'); }
function enregistrer() {
  rappelIdentite();
  const contenu = JSON.stringify({ format: 'kty-fiche-debit', version: 1, gamme: gammeId, enregistre: new Date().toISOString(), etat }, null, 1);
  telecharger(new Blob([contenu], { type: 'application/json' }), nomFichier() + '.json');
}
function ouvrir(fichier) {
  const lecteur = new FileReader();
  lecteur.onload = () => {
    try {
      const d = JSON.parse(String(lecteur.result));
      if (d.format !== 'kty-fiche-debit' || !d.etat) throw new Error('format');
      if ((d.gamme || 'classic') !== gammeId) { alert(`Cette fiche est une fiche de la gamme ${GAMMES[d.gamme || 'classic']?.nom || d.gamme}. Choisissez d'abord cette gamme en haut de la page, puis rouvrez le fichier.`); return; }
      etat = fusion(d.etat); remplir(); rendreProduits(); chercher(); maj();
      annoncer(`Fiche ouverte : ${fichier.name}`);
    } catch { alert('Ce fichier n\'est pas une fiche de débit enregistrée par cet outil.'); }
  };
  lecteur.readAsText(fichier);
}
function nouvelle() {
  if (!confirm('Vous allez effacer la fiche.\nVeuillez confirmer cette action.')) return;
  etat = etatInitial(); remplir(); rendreProduits(); chercher(); maj();
  ouvrirCloison();
}
function imprimer() {
  const titre = document.title; document.title = nomFichier();
  window.print();
  document.title = titre;
}

// ---------- démarrage ----------
const fiche = $('fiche');
function construireInfo() {                       // cadre « INFO : » en haut de la fiche (cellules F1:M2 du XLS)
  return h('div', { class: 'info' }, h('label', { text: 'INFO :' }),
    lier(h('textarea', { rows: 2, 'aria-label': 'Info', placeholder: 'Information libre pour la fabrication…' }), () => etat.entete.remarque, v => { etat.entete.remarque = v; }));
}
fiche.append(construireRevision(), construireInfo(), h('div', { class: 'corps' }, construireProfils('gauche', 'PROFILS'), construireProfils('droite', ''), construirePanneau()));
construireOptions();
rendreProduits();
remplir();
maj();
pret = true;

$('btnNouvelle').addEventListener('click', nouvelle);
const choixGamme = $('gamme');
choixGamme.value = gammeId;
choixGamme.addEventListener('change', () => {
  sauver(); try { localStorage.setItem(CLE_GAMME, choixGamme.value); } catch { /* ignoré */ }
  history.replaceState(null, '', location.pathname + location.search); location.reload();
});
document.querySelector('.barre h1 span').textContent = `gamme ${GAMME.nom}`;
document.title = `Fiche de débit ${GAMME.nom}`;
$('btnOuvrir').addEventListener('click', () => $('fichierOuvrir').click());
$('fichierOuvrir').addEventListener('change', ev => { if (ev.target.files[0]) ouvrir(ev.target.files[0]); ev.target.value = ''; });
$('btnEnregistrer').addEventListener('click', enregistrer);
$('btnExcel').addEventListener('click', exporterExcel);
$('btnImprimer').addEventListener('click', imprimer);
$('btnBibliotheque').addEventListener('click', () => bibliotheque.ouvrir());
$('btnFiger').addEventListener('click', figer);
$('btnSuivi').addEventListener('click', arreterSuivi);
$('recherche').addEventListener('input', chercher);
$('rechercheFinition').addEventListener('change', chercher);
$('btnHuisseries').hidden = GAMME.id !== 'classic';
$('btnHuisseries').addEventListener('click', ouvrirHuisseries);
$('btnLigneLibre').addEventListener('click', () => {
  etat.produits.push({ ref: '', designation: '', qte: '1' }); rendreProduits(); maj();
  const champs = document.querySelectorAll('#produits input.code-p'); champs[champs.length - 1]?.focus();
});
document.querySelector('.entete-panneau')?.addEventListener('change', chercher);

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('../sw.js').catch(() => {});

// Entrée = case de quantité suivante (Maj + Entrée = précédente), comme dans un tableau Excel
document.addEventListener('keydown', ev => {
  if (ev.key !== 'Enter' || ev.isComposing || !ev.target.matches?.('#fiche input[inputmode="decimal"], #fiche input[inputmode="numeric"]') || ev.target.classList.contains('manuel')) return;
  const cases = [...document.querySelectorAll('#fiche input[inputmode="decimal"], #fiche input[inputmode="numeric"]')].filter(i => !i.classList.contains('manuel') && i.offsetParent);
  const suivante = cases[cases.indexOf(ev.target) + (ev.shiftKey ? -1 : 1)];
  ev.preventDefault();
  if (suivante) { suivante.focus(); suivante.select?.(); suivante.scrollIntoView({ block: 'nearest' }); }
});
