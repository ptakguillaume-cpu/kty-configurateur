// Bibliothèque des codes : permet de changer les codes sans toucher au programme.
//  - « Codes par ligne » : le code de chaque ligne de la fiche, pour chaque finition (et les accessoires) ;
//  - « Catalogue » : la liste des produits (référence, désignation, code EDI, finition) ;
//  - « Échanges » : enregistrer / ouvrir la bibliothèque, export et import par Excel.
// Les codes sont toujours des TEXTES exacts : 000959, 8001 et 7346 sont trois codes différents.
import { creerXlsx, lireXlsx } from './xlsx.js';

const CLE = 'kty_fiche_bibliotheque';
const FORMAT = 'kty-bibliotheque-codes';
export const FIN = ['9005 MAT', '7016 FT', 'BLANC 9016', 'ANODISÉ', 'RAL'];
export const FINITIONS_CATALOGUE = ['', '9005 MAT', 'RAL7016FT', 'BLANC 9016', 'ANODISÉ', 'RAL À DÉFINIR', 'BRUT'];

// Excel enlève les zéros de tête des nombres : « 959 » est lu comme « 000959 » quand ce code existe.
export function normaliserCode(saisie, existe) {
  const s = String(saisie ?? '').trim().replace(/\s+/g, '');
  if (!s) return { code: '', corrige: false };
  if (existe(s)) return { code: s, corrige: false };
  if (/^\d+$/.test(s) && s.length < 6 && existe(s.padStart(6, '0'))) return { code: s.padStart(6, '0'), corrige: true };
  return { code: s, corrige: false };
}

export function lireCsv(texte) {
  texte = texte.replace(/^﻿/, '');
  const premiere = texte.split(/\r?\n/)[0] || '';
  const sep = [';', '\t', ','].map(c => [c, premiere.split(c).length]).sort((a, b) => b[1] - a[1])[0][0];
  const lignes = []; let ligne = [], champ = '', guillemets = false;
  for (let i = 0; i < texte.length; i++) {
    const c = texte[i];
    if (guillemets) { if (c === '"') { if (texte[i + 1] === '"') { champ += '"'; i++; } else guillemets = false; } else champ += c; }
    else if (c === '"') guillemets = true;
    else if (c === sep) { ligne.push(champ); champ = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && texte[i + 1] === '\n') i++; ligne.push(champ); lignes.push(ligne); ligne = []; champ = ''; }
    else champ += c;
  }
  if (champ !== '' || ligne.length) { ligne.push(champ); lignes.push(ligne); }
  return lignes.filter(l => l.some(v => String(v).trim() !== ''));
}

const copie = o => JSON.parse(JSON.stringify(o));
const sansAccent = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function creerBibliotheque({ FICHE, CATALOGUE, h, telecharger, surChangement }) {
  const lignesFiche = () => [...FICHE.gauche, ...FICHE.droite].filter(it => !it.vide);
  const origine = {
    format: FORMAT, version: 1, modifie: null,
    catalogue: CATALOGUE.map(c => c.slice()),
    codes: Object.fromEntries(lignesFiche().map(it => [it.id, { ...it.codes }])),
    accessoires: Object.fromEntries(FICHE.accessoires.map(a => [a.id, a.code])),
  };
  const valider = b => b && b.format === FORMAT && Array.isArray(b.catalogue) && b.codes && typeof b.codes === 'object';
  let bib;
  try { const s = localStorage.getItem(CLE); bib = s ? JSON.parse(s) : null; } catch { bib = null; }
  if (!valider(bib)) bib = copie(origine);
  bib.accessoires = { ...origine.accessoires, ...(bib.accessoires || {}) };

  let index = new Map();
  const reindexer = () => { index = new Map(bib.catalogue.map(c => [c[0], c])); };
  const existe = ref => index.has(ref);
  function appliquer() {
    reindexer();
    for (const it of lignesFiche()) if (bib.codes[it.id]) it.codes = Object.fromEntries(Object.entries(bib.codes[it.id]).filter(([f, c]) => FIN.includes(f) && c));
    for (const a of FICHE.accessoires) if (bib.accessoires[a.id]) a.code = bib.accessoires[a.id];
  }
  function sauver() {
    bib.modifie = new Date().toISOString();
    try { localStorage.setItem(CLE, JSON.stringify(bib)); } catch { /* stockage indisponible : la bibliothèque reste valable jusqu'à la fermeture */ }
    appliquer(); surChangement(bib); etatBarre();
  }
  appliquer();

  // ---------- fenêtre ----------
  let onglet = 'lignes', message = '', ouvert = false;
  const zone = h('div', { class: 'bib-zone' }), barre = h('p', { class: 'aide' }), msg = h('div', { class: 'bib-message', role: 'status' });
  const boutonsOnglets = {};
  const titres = { lignes: 'Codes par ligne', catalogue: 'Catalogue', echanges: 'Échanges' };
  const onglets = h('div', { class: 'bib-onglets' }, Object.entries(titres).map(([k, t]) => (boutonsOnglets[k] = h('button', { type: 'button', class: 'bouton', text: t, onclick: () => { onglet = k; rendre(); } }))));
  const fenetre = h('div', { class: 'fenetre hors-impression', hidden: true, role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Bibliothèque des codes' },
    h('div', { class: 'fenetre-contenu' },
      h('div', { class: 'fenetre-tete' }, h('h2', { text: 'Bibliothèque des codes' }), h('button', { type: 'button', class: 'bouton', text: 'Fermer', onclick: fermer })),
      barre, onglets, msg, zone));
  document.body.append(fenetre);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && ouvert) fermer(); });
  function ouvrir() { ouvert = true; fenetre.hidden = false; document.body.style.overflow = 'hidden'; rendre(); }
  function fermer() { ouvert = false; fenetre.hidden = true; document.body.style.overflow = ''; }
  function annoncer(t) { message = t; msg.textContent = t; msg.hidden = !t; }
  function etatBarre() {
    barre.textContent = bib.modifie
      ? `Bibliothèque modifiée le ${new Date(bib.modifie).toLocaleString('fr-FR')} : ${bib.catalogue.length} produits. Elle est gardée sur cet appareil ; pour la partager, utilisez « Échanges ».`
      : `Codes d'origine : ${bib.catalogue.length} produits. Chaque modification est enregistrée automatiquement sur cet appareil.`;
  }
  function rendre() {
    for (const [k, b] of Object.entries(boutonsOnglets)) b.classList.toggle('principal', k === onglet);
    etatBarre(); zone.replaceChildren(); msg.hidden = !message; msg.textContent = message;
    ({ lignes: rendreLignes, catalogue: rendreCatalogue, echanges: rendreEchanges })[onglet]();
  }

  // ---------- onglet « Codes par ligne » ----------
  function marquer(champ) {
    const v = champ.value.trim();
    champ.classList.toggle('inconnu', !!v && !existe(v));
    champ.title = v ? (existe(v) ? index.get(v)[1] : 'Code absent du catalogue : ajoutez-le dans l\'onglet Catalogue') : 'Pas de code pour cette finition (la ligne affichera « — »)';
  }
  function rendreLignes() {
    const filtre = h('input', { type: 'search', placeholder: 'Filtrer : famille, longueur ou code (ex. « montant », « 3050 », « 000959 »)…', 'aria-label': 'Filtrer les lignes' });
    const corps = h('tbody');
    const ligneDe = (it, cote) => {
      const nom = `${it.libelle || it.famille} ${it.codeFamille || ''}`.trim(), dim = it.longueur ? `${it.longueur}` : it.largeur ? `larg. ${it.largeur}` : (it.edi || '');
      const champs = FIN.map(f => {
        const c = h('input', { type: 'text', value: (bib.codes[it.id] || {})[f] || '', 'aria-label': `${nom} ${dim} ${f}`, autocomplete: 'off' });
        c.addEventListener('input', () => marquer(c));
        c.addEventListener('change', () => {
          const r = normaliserCode(c.value, existe); c.value = r.code;
          const cible = (bib.codes[it.id] ||= {}); if (r.code) cible[f] = r.code; else delete cible[f];
          sauver(); marquer(c); if (r.corrige) annoncer(`Code complété avec ses zéros : ${r.code}`);
        });
        marquer(c); return h('td', {}, c);
      });
      const tr = h('tr', { 'data-texte': sansAccent(`${cote} ${nom} ${dim} ${Object.values(bib.codes[it.id] || {}).join(' ')}`) }, h('td', { text: cote }), h('td', { text: nom }), h('td', { text: dim }), champs);
      return tr;
    };
    for (const it of FICHE.gauche.filter(i => !i.vide)) corps.append(ligneDe(it, 'Gauche'));
    for (const it of FICHE.droite.filter(i => !i.vide)) corps.append(ligneDe(it, 'Droite'));
    filtre.addEventListener('input', () => { const q = sansAccent(filtre.value).trim().split(/\s+/).filter(Boolean); for (const tr of corps.children) tr.hidden = !q.every(m => tr.dataset.texte.includes(m)); });
    const acc = h('tbody');
    for (const a of FICHE.accessoires) {
      const c = h('input', { type: 'text', value: bib.accessoires[a.id] || a.code, 'aria-label': 'Code ' + a.libelle, autocomplete: 'off' });
      c.addEventListener('input', () => marquer(c));
      c.addEventListener('change', () => { const r = normaliserCode(c.value, existe); if (!r.code) { c.value = bib.accessoires[a.id]; return; } c.value = r.code; bib.accessoires[a.id] = r.code; sauver(); marquer(c); });
      marquer(c); acc.append(h('tr', {}, h('td', { text: a.libelle }), h('td', {}, c), h('td', { text: a.edi })));
    }
    zone.append(
      h('p', { class: 'aide', text: 'Un code par finition. Une case vide = pas de code pour cette finition (la fiche affiche « — »). Un code en rouge n\'existe pas dans le catalogue : ajoutez-le d\'abord dans l\'onglet Catalogue.' }),
      filtre,
      h('div', { class: 'bib-defile' }, h('table', { class: 'bib-table' }, h('thead', {}, h('tr', {}, ['Côté', 'Famille', 'Longueur', ...FIN].map(t => h('th', { text: t })))), corps)),
      h('h3', { text: 'Accessoires (un seul code)' }),
      h('div', { class: 'bib-defile' }, h('table', { class: 'bib-table' }, h('thead', {}, h('tr', {}, ['Accessoire', 'Code', 'Code EDI'].map(t => h('th', { text: t })))), acc)));
  }

  // ---------- onglet « Catalogue » ----------
  const champ = (v, ph, w) => h('input', { type: 'text', value: v, placeholder: ph, 'aria-label': ph, autocomplete: 'off', style: w ? `width:${w}` : '' });
  const choixFinition = v => h('select', { 'aria-label': 'Finition' }, FINITIONS_CATALOGUE.map(f => h('option', { value: f, text: f || '(aucune)', selected: f === v })));
  function utilisations(ref) { return lignesFiche().filter(it => Object.values(bib.codes[it.id] || {}).includes(ref)).length + FICHE.accessoires.filter(a => bib.accessoires[a.id] === ref).length; }
  function rendreCatalogue() {
    const nRef = champ('', 'Référence (ex. 000959)', '150px'), nDes = champ('', 'Désignation', '320px'), nEdi = champ('', 'Code EDI', '110px'), nFin = choixFinition('');
    const ajout = h('form', { class: 'bib-ajout' },
      h('strong', { text: 'Ajouter un produit :' }), nRef, nDes, nEdi, nFin,
      h('button', { type: 'submit', class: 'bouton principal', text: 'Ajouter' }));
    ajout.addEventListener('submit', e => {
      e.preventDefault();
      const ref = nRef.value.trim().replace(/\s+/g, '');
      if (!ref || !nDes.value.trim()) { annoncer('Indiquez au moins la référence et la désignation.'); rendre(); return; }
      if (existe(ref)) { annoncer(`La référence ${ref} existe déjà : modifiez-la dans la liste.`); rendre(); return; }
      bib.catalogue.push([ref, nDes.value.trim(), nEdi.value.trim().replace(/\s+/g, ''), nFin.value, 0]); sauver(); annoncer(`Produit ajouté : ${ref}`); rendre();
    });
    const rech = h('input', { type: 'search', placeholder: 'Chercher un produit : référence, désignation ou code EDI…', 'aria-label': 'Chercher dans le catalogue' });
    const liste = h('div', { class: 'bib-defile' });
    const afficher = () => {
      liste.replaceChildren();
      const q = sansAccent(rech.value).trim().split(/\s+/).filter(Boolean);
      if (!q.length) { liste.append(h('p', { class: 'aide', text: `${bib.catalogue.length} produits. Tapez dans la zone de recherche pour les afficher.` })); return; }
      const trouves = bib.catalogue.filter(c => { const t = sansAccent(`${c[0]} ${c[1]} ${c[2]}`); return q.every(m => t.includes(m)); });
      const corps = h('tbody');
      for (const c of trouves.slice(0, 80)) {
        const des = champ(c[1], 'Désignation', '100%'), edi = champ(c[2], 'Code EDI', '100px'), fin = choixFinition(c[3]);
        const maj = () => { c[1] = des.value.trim(); c[2] = edi.value.trim().replace(/\s+/g, ''); c[3] = fin.value; sauver(); };
        des.addEventListener('change', maj); edi.addEventListener('change', maj); fin.addEventListener('change', maj);
        corps.append(h('tr', {}, h('td', { class: 'ref', text: c[0] + (c[4] ? ' (hors catalogue)' : '') }), h('td', {}, des), h('td', {}, edi), h('td', {}, fin),
          h('td', {}, h('button', { type: 'button', class: 'bouton', text: 'Supprimer', onclick: () => {
            const n = utilisations(c[0]);
            if (!confirm(n ? `Le code ${c[0]} est utilisé dans ${n} ligne(s) de la fiche. Le supprimer du catalogue ne l'enlève pas de ces lignes (elles passeront en rouge). Continuer ?` : `Supprimer ${c[0]} du catalogue ?`)) return;
            bib.catalogue.splice(bib.catalogue.indexOf(c), 1); sauver(); afficher();
          } }))));
      }
      liste.append(h('p', { class: 'aide', text: `${trouves.length} résultat(s)${trouves.length > 80 ? ' : seuls les 80 premiers sont affichés, précisez la recherche' : ''}.` }),
        h('table', { class: 'bib-table' }, h('thead', {}, h('tr', {}, ['Référence', 'Désignation', 'Code EDI', 'Finition', ''].map(t => h('th', { text: t })))), corps));
    };
    rech.addEventListener('input', afficher);
    zone.append(h('p', { class: 'aide', text: 'Le catalogue sert à la recherche de produit et aux info-bulles. La référence se saisit exactement : avec ses zéros (000959) ; elle ne se modifie pas, il faut ajouter la nouvelle et supprimer l\'ancienne.' }), ajout, rech, liste);
    afficher();
  }

  // ---------- onglet « Échanges » ----------
  const dateCourte = () => new Date().toISOString().slice(0, 10);
  function exporterLignes() {
    const lignes = [['Identifiant', 'Côté', 'Famille', 'Longueur / largeur', ...FIN].map(v => ({ v, gras: true }))];
    for (const [cote, liste] of [['Gauche', FICHE.gauche], ['Droite', FICHE.droite]]) for (const it of liste.filter(i => !i.vide)) {
      lignes.push([it.id, cote, `${it.libelle || it.famille} ${it.codeFamille || ''}`.trim(), it.longueur || it.largeur || it.edi || '', ...FIN.map(f => ({ v: (bib.codes[it.id] || {})[f] || '', texte: true }))]);
    }
    telecharger(creerXlsx({ nom: 'Codes par ligne', lignes, largeurs: [12, 9, 36, 18, 14, 14, 14, 14, 14] }), `Bibliotheque-codes-par-ligne ${dateCourte()}.xlsx`);
  }
  function exporterCatalogue() {
    const lignes = [['Référence', 'Désignation', 'Code EDI', 'Finition', 'Hors catalogue'].map(v => ({ v, gras: true }))];
    for (const c of bib.catalogue) lignes.push([{ v: c[0], texte: true }, c[1], c[2], c[3], c[4] ? 'oui' : '']);
    telecharger(creerXlsx({ nom: 'Catalogue', lignes, largeurs: [16, 70, 16, 18, 14] }), `Bibliotheque-catalogue ${dateCourte()}.xlsx`);
  }
  function exporterBibliotheque() { telecharger(new Blob([JSON.stringify(bib, null, 1)], { type: 'application/json' }), `Bibliotheque-codes ${dateCourte()}.json`); }

  function importerLignes(t) {
    const tete = t[0].map(x => sansAccent(x).trim()), col = Object.fromEntries(FIN.map(f => [f, tete.indexOf(sansAccent(f))])), iId = tete.indexOf('identifiant');
    const connus = new Set(lignesFiche().map(i => i.id)); let modif = 0, corriges = 0, inconnus = 0, ignores = 0;
    for (const r of t.slice(1)) {
      const id = String(r[iId] ?? '').trim(); if (!connus.has(id)) { if (id) ignores++; continue; }
      const cible = (bib.codes[id] ||= {});
      for (const f of FIN) {
        if (col[f] < 0) continue;
        const n = normaliserCode(r[col[f]], existe); if (n.corrige) corriges++; if (n.code && !existe(n.code)) inconnus++;
        if ((cible[f] || '') !== n.code) { modif++; if (n.code) cible[f] = n.code; else delete cible[f]; }
      }
    }
    sauver();
    return `Codes par ligne importés : ${modif} code(s) modifié(s)` + (corriges ? `, ${corriges} complété(s) avec leurs zéros` : '') + (inconnus ? `, ${inconnus} absent(s) du catalogue (en rouge)` : '') + (ignores ? `, ${ignores} ligne(s) ignorée(s) (identifiant inconnu)` : '') + '.';
  }
  function importerCatalogue(t) {
    const tete = t[0].map(x => sansAccent(x).trim()), i = n => tete.findIndex(x => x.startsWith(n));
    const iRef = i('reference'), iDes = i('designation'), iEdi = i('code edi') >= 0 ? i('code edi') : i('edi'), iFin = i('finition'), iHors = i('hors');
    let ajoutes = 0, modifies = 0, corriges = 0;
    for (const r of t.slice(1)) {
      let ref = String(r[iRef] ?? '').trim().replace(/\s+/g, ''); if (!ref) continue;
      if (!existe(ref) && /^\d+$/.test(ref) && ref.length < 6 && (existe(ref.padStart(6, '0')) || Number(ref) < 8000)) { ref = ref.padStart(6, '0'); corriges++; }
      const des = String(r[iDes] ?? '').trim(), edi = String(iEdi >= 0 ? r[iEdi] ?? '' : '').trim().replace(/\s+/g, ''), fin = String(iFin >= 0 ? r[iFin] ?? '' : '').trim();
      const hors = iHors >= 0 && /^(oui|1|true|x)$/i.test(String(r[iHors] ?? '').trim()) ? 1 : 0;
      const ligne = index.get(ref), finOk = FINITIONS_CATALOGUE.includes(fin) ? fin : (ligne ? ligne[3] : '');
      if (ligne) { if (ligne[1] !== (des || ligne[1]) || ligne[2].replace(/\s+/g, '') !== edi || ligne[3] !== finOk) { ligne[1] = des || ligne[1]; ligne[2] = edi; ligne[3] = finOk; modifies++; } }
      else if (des) { bib.catalogue.push([ref, des, edi, finOk, hors]); index.set(ref, bib.catalogue[bib.catalogue.length - 1]); ajoutes++; }
    }
    sauver();
    return `Catalogue importé : ${ajoutes} produit(s) ajouté(s), ${modifies} modifié(s)` + (corriges ? `, ${corriges} référence(s) complétée(s) avec leurs zéros` : '') + '. Les produits absents du fichier sont conservés.';
  }
  async function importer(fichier) {
    const nom = fichier.name.toLowerCase();
    try {
      if (nom.endsWith('.json')) {
        const d = JSON.parse(await fichier.text());
        if (!valider(d)) throw new Error('Ce fichier n\'est pas une bibliothèque de codes de cet outil.');
        if (!confirm('Remplacer toute la bibliothèque actuelle par celle de ce fichier ?')) return;
        bib = { ...copie(origine), ...d, accessoires: { ...origine.accessoires, ...(d.accessoires || {}) } };
        bib.catalogue = bib.catalogue.filter(c => Array.isArray(c) && c.length >= 4).map(c => [String(c[0]), String(c[1]), String(c[2] || ''), String(c[3] || ''), c[4] ? 1 : 0]);
        sauver(); annoncer(`Bibliothèque ouverte : ${fichier.name}`);
      } else {
        const t = nom.endsWith('.xlsx') ? await lireXlsx(await fichier.arrayBuffer()) : lireCsv(await fichier.text());
        const tete = (t[0] || []).map(x => sansAccent(x).trim());
        if (tete.includes('identifiant')) annoncer(importerLignes(t));
        else if (tete.some(x => x.startsWith('reference'))) annoncer(importerCatalogue(t));
        else throw new Error('Colonnes non reconnues : utilisez un fichier exporté depuis cet écran (« Identifiant » ou « Référence » en première colonne).');
      }
    } catch (e) { annoncer('Import impossible : ' + e.message); }
    rendre();
  }
  function rendreEchanges() {
    const fichier = h('input', { type: 'file', accept: '.json,.xlsx,.csv', hidden: true });
    fichier.addEventListener('change', () => { if (fichier.files[0]) importer(fichier.files[0]); fichier.value = ''; });
    zone.append(
      h('div', { class: 'bib-bloc' }, h('h3', { text: 'Enregistrer ou partager' }),
        h('p', { class: 'aide', text: 'Un fichier unique contenant tous les codes. Donnez-le aux autres postes (clé USB, mail, partage réseau) et ouvrez-le avec « Ouvrir une bibliothèque ».' }),
        h('div', { class: 'actions' }, h('button', { type: 'button', class: 'bouton principal', text: 'Enregistrer la bibliothèque', onclick: exporterBibliotheque }), h('button', { type: 'button', class: 'bouton', text: 'Ouvrir une bibliothèque…', onclick: () => fichier.click() }))),
      h('div', { class: 'bib-bloc' }, h('h3', { text: 'Modifier avec Excel' }),
        h('p', { class: 'aide', text: '1. Exportez. 2. Corrigez les codes dans Excel (ne changez pas la colonne « Identifiant » ni les titres). 3. Enregistrez en .xlsx et importez-le ici. Les codes sont écrits en texte : si Excel enlève des zéros, ils sont rétablis à l\'import quand le code existe.' }),
        h('div', { class: 'actions' },
          h('button', { type: 'button', class: 'bouton', text: 'Exporter les codes par ligne (Excel)', onclick: exporterLignes }),
          h('button', { type: 'button', class: 'bouton', text: 'Exporter le catalogue (Excel)', onclick: exporterCatalogue }),
          h('button', { type: 'button', class: 'bouton', text: 'Importer un fichier Excel ou CSV…', onclick: () => fichier.click() }))),
      h('div', { class: 'bib-bloc' }, h('h3', { text: 'Revenir au départ' }),
        h('p', { class: 'aide', text: 'Remet tous les codes tels qu\'ils étaient à la livraison de l\'outil. Vos modifications sont perdues : enregistrez la bibliothèque avant.' }),
        h('button', { type: 'button', class: 'bouton', text: 'Revenir aux codes d\'origine', onclick: () => {
          if (!confirm('Revenir aux codes d\'origine ? Toutes vos modifications de codes seront perdues.')) return;
          bib = copie(origine); try { localStorage.removeItem(CLE); } catch { /* ignoré */ }
          appliquer(); surChangement(bib); annoncer('Codes d\'origine rétablis.'); rendre();
        } })),
      fichier);
  }

  return { ouvrir, catalogue: () => bib.catalogue, estModifiee: () => !!bib.modifie };
}
