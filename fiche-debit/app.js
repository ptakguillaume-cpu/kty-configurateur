import { FICHE } from './donnees.js';
import { CATALOGUE } from './catalogue.js';
import {
  etatInitial, calculer, abreger, couleurJonc, libelleFinition,
  LG_COUVRE_JOINT, LARGEURS_CA_SIMPLE, LARGEURS_CA_DOUBLE, FINITIONS,
} from './calcul.js';
import { creerXlsx } from './xlsx.js';

const CLE = 'kty_fiche_debit_brouillon';
const NOM_FINITION = { '9005 MAT': '9005 MAT', '7016 FT': '7016 FT', 'BLANC 9016': 'BLANC 9016', 'ANODISÉ': 'ANODISÉ', RAL: 'RAL (à définir ou demandé)' };
const FINITION_CATALOGUE = { '9005 MAT': '9005 MAT', '7016 FT': 'RAL7016FT', 'BLANC 9016': 'BLANC 9016', 'ANODISÉ': 'ANODISÉ', RAL: 'RAL À DÉFINIR' };
const DESIGNATION = new Map(CATALOGUE.map(c => [c[0], c[1]]));
const IMAGES = {                                   // dessins de profils de la fiche (repris du XLS), par première ligne de famille
  G4: 'lisse', G6: 'montant', G11: 'couvre-joint', G18: 'parclose-simple', G21: 'parclose-double', G22: 'meneau', G27: 'angle-carre',
  G32: 'angle-depart-multiple', G37: 'depart-multiple-cj', G42: 'clip-lisse',
  D4: 'depart', D9: 'omega', D12: 'jonc', D14: 'angle-90', D17: 'montant-special', D22: 'capot', D27: 'angle-libre', D32: 'angle-doublage', D34: 'huisserie', D37: 'huisserie',
};
const IMAGE_SPAN = { D32: 2 };                      // un même dessin pour « Angle de doublage » et « Plat de doublage »
const SANS_IMAGE_PROPRE = new Set(['D33']);
const LIBELLE_LARGE = new Set(['D41', 'D42', 'D43', 'D44']);   // paumelles et serrure : libellé sur les 2 colonnes, sans dessin (comme le XLS)
const PRODUITS_VIDES_MIN = 10;                     // lignes vides affichées pour garder l'aspect de la feuille

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

// ---------- état et brouillon ----------
function fusion(brut) {
  const b = etatInitial(), o = brut.options || {};
  const deux = (base, src) => [0, 1].map(i => ({ ...base[i], ...((src || [])[i] || {}) }));
  return {
    ...b,
    entete: { ...b.entete, ...(brut.entete || {}) },
    qte: { ...(brut.qte || {}) },
    manuel: Array.isArray(brut.manuel) && brut.manuel.length === 5 ? brut.manuel : b.manuel,
    options: {
      ...b.options, ...o,
      doublage: deux(b.options.doublage, o.doublage), renfort: deux(b.options.renfort, o.renfort),
      caSimple: { ...b.options.caSimple, ...(o.caSimple || {}) }, caDouble: { ...b.options.caDouble, ...(o.caDouble || {}) },
    },
    accessoires: { ...(brut.accessoires || {}) },
    produits: Array.isArray(brut.produits) ? brut.produits.map(p => ({ ref: String(p.ref ?? ''), designation: String(p.designation ?? ''), qte: p.qte ?? '' })) : [],
  };
}
let etat;
try { const s = localStorage.getItem(CLE); etat = s ? fusion(JSON.parse(s)) : etatInitial(); } catch { etat = etatInitial(); }
const sauver = () => { try { localStorage.setItem(CLE, JSON.stringify(etat)); } catch { /* stockage indisponible : on continue */ } };

// ---------- liaison champ <-> état ----------
const synchros = [];
function lier(champ, lire, ecrire) {
  synchros.push(() => { champ.value = lire() ?? ''; });
  champ.addEventListener('input', () => { ecrire(champ.value); maj(); });
  return champ;
}
const remplir = () => synchros.forEach(f => f());

// ---------- tableaux de profils ----------
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
const AVEC_CERCLE = new Set(['G16', 'G18', 'G19', 'G21']);       // macro « cercle rouge » du XLS

function construireProfils(cote, titre) {
  const tbody = h('tbody');
  for (const g of groupes(FICHE[cote])) {
    g.items.forEach((it, i) => {
      const tr = h('tr', { 'data-id': it.id, class: i === 0 ? 'groupe' : '' });
      if (i === 0 && LIBELLE_LARGE.has(it.id)) {
        tr.append(h('td', { class: 'fam large' + (g.famille.length > 22 ? ' long' : ''), colspan: 2, rowspan: g.items.length, text: g.famille }));
      } else if (i === 0 && it.vide && it.titre) {
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
      if (it.vide) { tr.append(h('td', { class: 'code' }), h('td', { class: 'lg' }), h('td', { class: 'q' })); tbody.append(tr); return; }
      const codeTd = h('td', { class: 'code' });
      const lg = it.longueur ? String(it.longueur) : it.largeur ? String(it.largeur) : (it.edi || '');
      const qTd = h('td', { class: 'q' });
      let calc = null;
      if (it.calcule) {
        calc = h('span', { class: 'calc' });
        qTd.append(calc);
        if (it.id.startsWith('G')) {
          const k = it.ligne - 11;
          qTd.append(lier(h('input', { class: 'manuel', type: 'text', inputmode: 'numeric', title: 'Ajout manuel (+ ou −)', 'aria-label': 'Ajout manuel ' + lg, autocomplete: 'off', placeholder: '±' }),
            () => (etat.manuel[k] || ''), v => { etat.manuel[k] = nombre(v); }));
        }
      } else {
        qTd.append(lier(h('input', { type: 'text', inputmode: 'decimal', 'aria-label': `${it.libelle || it.famille} ${lg}`, autocomplete: 'off' }),
          () => etat.qte[it.id], v => { if (v === '') delete etat.qte[it.id]; else etat.qte[it.id] = v; }));
      }
      tr.append(codeTd, h('td', { class: 'lg', text: lg }), qTd);
      tbody.append(tr);
      lignes[it.id] = { item: it, tr, codeTd, calc };
    });
  }
  return h('table', { class: 'profils' },
    h('colgroup', {}, ['17%', '22%', '17%', '17%', '27%'].map(w => h('col', { style: `width:${w}` }))),
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
    h('div', { class: 'gamme' }, h('b', { text: 'KTY' }), h('span', { text: 'GAMME CLASSIC   FAX : 04 78 67 02 73' }), lier(h('input', { type: 'text', 'aria-label': 'Page', placeholder: 'Page', style: 'width:60px' }), () => e().page, v => { e().page = v; })),
    champEntete('Société :', lier(h('input', { type: 'text', autocomplete: 'off' }), () => e().societe, v => { e().societe = v; })),
    champEntete('Réf chantier :', lier(h('input', { type: 'text', autocomplete: 'off' }), () => e().chantier, v => { e().chantier = v; })),
    champEntete('Niveau :', lier(h('input', { type: 'text', autocomplete: 'off', placeholder: 'ex. R+1' }), () => e().niveau, v => { e().niveau = v; })),
    champEntete('FINITION :', h('div', {}, selectFin, ral, h('div', { class: 'print-seulement', id: 'finTxt' }))),
    devis,
  );

  const corpsProduits = h('tbody', { id: 'produits' });
  const produits = h('table', { class: 'liste' },
    h('colgroup', {}, h('col', { class: 'c1' }), h('col', { class: 'c2' }), h('col', { class: 'c3' }), h('col', { class: 'c4' }), h('col', { style: 'width:28px', class: 'sup' })),
    h('thead', {}, h('tr', {}, h('th', { text: 'CODE' }), h('th', { colspan: 2, text: 'Désignation' }), h('th', { text: 'Qts' }), h('th', { class: 'sup' }))),
    corpsProduits);

  // Accessoires : dessins à gauche (clip / éclisse / équerre, joints), comme dans le XLS
  const IMG_ACC = { A36: { lignes: 9, img: 'accessoires' } };      // éclisse, clip, équerre, joints, cale, mousse : un seul dessin comme dans le XLS
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
    cellules.push(h('td', { colspan: SANS_IMAGE.has(a.id) ? 2 : 1, text: a.libelle, title: DESIGNATION.get(a.code) || '' }));
    cellules.push(h('td', { class: 'code-p', text: a.code }), h('td', { text: a.edi }), h('td', { class: 'n' }, cellule), h('td', { class: 'sup' }));
    const tr = h('tr', { class: 'acc' }, cellules);
    corpsAcc.append(tr);
    lignesAcc[a.id] = { a, tr, cellule };
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
  for (let i = etat.produits.length; i < PRODUITS_VIDES_MIN; i++) corps.append(h('tr', {}, h('td', { colspan: 5, class: 'vide' })));
}

// ---------- mise à jour ----------
let message = '', minuteur;
function annoncer(texte) { message = texte; clearTimeout(minuteur); minuteur = setTimeout(() => { message = ''; maj(); }, 3500); maj(); }

function maj() {
  const r = calculer(etat);
  const e = etat.entete, fin = e.finition, alertes = [...r.alertes.map(t => ({ t }))];
  const nomFin = libelleFinition(e);
  for (const [id, L] of Object.entries(lignes)) {
    const code = L.item.codes[fin];
    L.codeTd.textContent = code ?? '—';
    L.codeTd.classList.toggle('absent', !code);
    L.codeTd.title = code ? (DESIGNATION.get(code) || '') : `Pas de code en ${nomFin} pour cette ligne`;
    const q = r.qte[id] || 0;
    if (L.calc) L.calc.textContent = fmt(q);
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
  for (const { a, tr, cellule } of Object.values(lignesAcc)) {
    let q;
    if (a.auto === 'clip') q = r.clips; else if (a.auto === 'equerre') q = r.equerres; else if (a.auto === 'mousse') q = r.mousse;
    else q = nombre(etat.accessoires[a.id]);
    if (a.auto) cellule.textContent = q ? fmt(q) : '0';
    tr.classList.toggle('rempli', q > 0);
  }
  for (const { p, tr } of lignesProduits) tr.classList.toggle('rempli', nombre(p.qte) !== 0);
  if (fin === 'RAL' && !e.ral) alertes.push({ t: 'Finition RAL : indiquez le RAL demandé dans l\'en-tête (sinon « RAL À DÉFINIR » est imprimé).', info: true });
  if (!e.societe || !e.chantier) alertes.push({ t: 'Société et référence chantier non renseignées (elles servent au nom du fichier).', info: true });
  if (message) alertes.push({ t: message, info: true });
  const zone = $('alertes');
  zone.replaceChildren();
  if (alertes.length) zone.append(h('ul', {}, alertes.map(a => h('li', { class: a.info ? 'info' : '', text: a.t }))));
  sauver();
}

// ---------- options de calcul ----------
function optNbLg(titre, aide, tableau, i) {
  const nb = lier(h('input', { type: 'text', inputmode: 'numeric', 'aria-label': titre + ' : nombre', autocomplete: 'off' }), () => etat.options[tableau][i].nb, v => { etat.options[tableau][i].nb = v; });
  const lg = lier(h('select', { 'aria-label': titre + ' : longueur' }, LG_COUVRE_JOINT.map(x => h('option', { value: String(x), text: fmtLg(x) }))), () => String(etat.options[tableau][i].lg), v => { etat.options[tableau][i].lg = parseFloat(v); });
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
function construireOptions() {
  $('options').append(
    optNbLg('Montants D, M, MS de doublage — ligne 1', 'Retire 1 couvre-joint plat par montant, sur la longueur choisie.', 'doublage', 0),
    optNbLg('Montants D, M, MS de doublage — ligne 2', 'Même règle, pour une 2e longueur.', 'doublage', 1),
    optNbLg('Montants M et MS renforcés — ligne 1', 'Ajoute 2 couvre-joints plats par montant, et 2 équerres.', 'renfort', 0),
    optNbLg('Montants M et MS renforcés — ligne 2', 'Même règle, pour une 2e longueur.', 'renfort', 1),
    optSimple('Nb de montants pour traverse / DL', 'Ajoute 2 équerres par montant.', 'traverses'),
    optSimple('Départs en lisse', 'Retire 2 équerres et 5 m de mousse départ par départ en lisse.', 'departsLisse'),
    optNbLarg('Portes CA simples', 'Retire ces portes des jeux de paumelles bois (3) quand la largeur correspond à l\'huisserie simple.', 'caSimple', LARGEURS_CA_SIMPLE),
    optNbLarg('Portes CA double vantail', 'Retire ces portes des jeux de paumelles bois (6) quand la largeur correspond à l\'huisserie double.', 'caDouble', LARGEURS_CA_DOUBLE),
  );
}

// ---------- recherche de produit ----------
const INDEX = CATALOGUE.map(c => ({ ref: c[0], des: c[1], edi: c[2], fin: c[3], hors: c[4], texte: sansAccent(`${c[0]} ${c[1]} ${c[2]}`) }));
function chercher() {
  const q = sansAccent($('recherche').value).trim(), zone = $('resultats');
  zone.replaceChildren();
  if (q.length < 2) return;
  const mots = q.split(/\s+/);
  const finOk = !$('rechercheFinition').checked ? null : FINITION_CATALOGUE[etat.entete.finition];
  const trouves = INDEX.filter(c => mots.every(m => c.texte.includes(m)) && (!finOk || c.fin === finOk || c.fin === '' || c.fin === 'BRUT'));
  if (!trouves.length) { zone.append(h('li', { text: 'Aucun produit trouvé.' })); return; }
  for (const c of trouves.slice(0, 40)) {
    zone.append(h('li', {}, h('b', { text: c.ref }), h('span', { text: c.des + (c.hors ? ' (hors catalogue)' : '') }), h('span', { class: 'edi', text: c.edi }),
      h('button', { type: 'button', class: 'bouton', text: 'Ajouter', onclick: () => { etat.produits.push({ ref: c.ref, designation: abreger(c.des), qte: '1' }); rendreProduits(); annoncer(`Ajouté : ${c.ref}`); } })));
  }
  if (trouves.length > 40) zone.append(h('li', { class: 'edi', text: `… ${trouves.length - 40} autres résultats : précisez la recherche.` }));
}

// ---------- fichiers : enregistrer, ouvrir, Excel, imprimer ----------
const nomFichier = () => `Fiche de Débit ${etat.entete.chantier} ${etat.entete.niveau}`.replace(/\s+/g, ' ').trim().replace(/[\\/:*?"<>|]/g, '-');
function telecharger(blob, nom) {
  const a = h('a', { href: URL.createObjectURL(blob), download: nom });
  document.body.append(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}
function exporterExcel() {
  const r = calculer(etat), e = etat.entete, L = [];
  L.push([{ v: 'KTY — Fiche de débit gamme Classic', gras: true }]);
  [['Société', e.societe], ['Réf chantier', e.chantier], ['Niveau', e.niveau], ['Finition', libelleFinition(e)], ['Devis ou commande', e.mode], ['Page', e.page], ['INFO', e.remarque]]
    .forEach(([k, v]) => L.push([{ v: k, gras: true }, v]));
  L.push([]);
  L.push(['PROFILS', 'Code KTY', 'Longueur', 'Quantité', '', '', 'Code KTY', 'Longueur / largeur', 'Quantité'].map(v => (v ? { v, gras: true } : v)));
  const parLigne = cote => Object.fromEntries(FICHE[cote].map(i => [i.ligne, i]));
  const g = parLigne('gauche'), d = parLigne('droite');
  const cell = (it, id) => {
    if (!it) return ['', '', '', ''];
    const q = r.qte[id + it.ligne] || 0, code = it.codes[e.finition];
    return [`${it.libelle || it.famille} ${it.codeFamille}`.trim(), { v: code || '—', texte: true }, it.longueur || (it.largeur ? 'larg. ' + it.largeur : it.edi || ''), q || ''];
  };
  for (let n = 4; n <= 44; n++) {
    if (!g[n] && !d[n]) continue;
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
  telecharger(creerXlsx({ nom: 'Fiche de débit', lignes: L, largeurs: [34, 14, 16, 10, 3, 34, 14, 18, 10] }), nomFichier() + '.xlsx');
}
function enregistrer() {
  const contenu = JSON.stringify({ format: 'kty-fiche-debit', version: 1, enregistre: new Date().toISOString(), etat }, null, 1);
  telecharger(new Blob([contenu], { type: 'application/json' }), nomFichier() + '.json');
}
function ouvrir(fichier) {
  const lecteur = new FileReader();
  lecteur.onload = () => {
    try {
      const d = JSON.parse(String(lecteur.result));
      if (d.format !== 'kty-fiche-debit' || !d.etat) throw new Error('format');
      etat = fusion(d.etat); remplir(); rendreProduits(); chercher(); maj();
      annoncer(`Fiche ouverte : ${fichier.name}`);
    } catch { alert('Ce fichier n\'est pas une fiche de débit enregistrée par cet outil.'); }
  };
  lecteur.readAsText(fichier);
}
function nouvelle() {
  if (!confirm('Vous allez effacer la fiche.\nVeuillez confirmer cette action.')) return;
  etat = etatInitial(); remplir(); rendreProduits(); chercher(); maj();
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
fiche.append(construireInfo(), h('div', { class: 'corps' }, construireProfils('gauche', 'PROFILS'), construireProfils('droite', ''), construirePanneau()));
construireOptions();
rendreProduits();
remplir();
maj();

$('btnNouvelle').addEventListener('click', nouvelle);
$('btnOuvrir').addEventListener('click', () => $('fichierOuvrir').click());
$('fichierOuvrir').addEventListener('change', ev => { if (ev.target.files[0]) ouvrir(ev.target.files[0]); ev.target.value = ''; });
$('btnEnregistrer').addEventListener('click', enregistrer);
$('btnExcel').addEventListener('click', exporterExcel);
$('btnImprimer').addEventListener('click', imprimer);
$('recherche').addEventListener('input', chercher);
$('rechercheFinition').addEventListener('change', chercher);
$('btnLigneLibre').addEventListener('click', () => {
  etat.produits.push({ ref: '', designation: '', qte: '1' }); rendreProduits(); maj();
  const champs = document.querySelectorAll('#produits input.code-p'); champs[champs.length - 1]?.focus();
});
document.querySelector('.entete-panneau')?.addEventListener('change', chercher);

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('../sw.js').catch(() => {});
