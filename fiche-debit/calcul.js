// Moteur de calcul de la fiche de débit (aucune dépendance, utilisable dans le navigateur et dans node).
// Reprend les formules du XLS « Fiche de Débit Classic » avec les corrections validées (A, B, C, D, E, F, G, H, I).
// `legacy: true` rejoue les formules d'origine à l'identique (sert uniquement aux tests de comparaison).

export const LG_COUVRE_JOINT = [2.5, 2.7, 3.05, 3.25, 5.75];        // m, lignes couvre-joint plat 2500 … 5750
export const CLIPS_PAR_COUVRE_JOINT = [8, 9, 10, 11, 12];           // point G : validé tel quel
export const LARGEURS_CA_SIMPLE = [730, 830, 930];
export const LARGEURS_CA_DOUBLE = [1256, 1456, 1656, 1856];
export const FINITIONS = ['9005 MAT', '7016 FT', 'BLANC 9016', 'ANODISÉ', 'RAL'];

export function etatInitial() {
  return {
    version: 1,
    entete: { societe: '', chantier: '', niveau: '', finition: 'BLANC 9016', ral: '', mode: 'DEVIS', page: '', remarque: '' },
    qte: {},                                    // quantités saisies, clé = id de ligne (G6, D4…)
    manuel: [0, 0, 0, 0, 0],                    // point D : ajout manuel sur chaque couvre-joint plat
    options: {
      doublage: [{ nb: '', lg: 2.5 }, { nb: '', lg: 2.5 }],   // « D et M et MS de doublage »
      renfort: [{ nb: '', lg: 2.7 }, { nb: '', lg: 5.75 }],   // « M et MS renforcer »
      traverses: '',                                          // « Nb de montants pour traverse / DL » (vide, comme après « effacer »)
      caSimple: { nb: '', largeur: 930 },
      caDouble: { nb: '', largeur: 1856 },
      departsLisse: '',                                       // point I (R44)
    },
    accessoires: {},                            // quantités saisies des accessoires (A34, A35, A36, A39…A43)
    produits: [],                               // lignes ajoutées : { ref, designation, qte }
  };
}

const num = v => {
  if (v === '' || v === null || v === undefined) return 0;
  const x = Number(String(v).replace(',', '.'));
  return Number.isFinite(x) ? x : 0;
};
const arrondi = x => Math.round(x * 1e6) / 1e6;
const plafond = (x, pas) => (x <= 0 ? 0 : Math.ceil(arrondi(x) / pas) * pas);
const egal = (a, b) => Math.abs(num(a) - b) < 1e-9;

export function calculer(etat, { legacy = false } = {}) {
  const q = id => num(etat.qte[id]);
  const o = etat.options;
  const somme = (prefixe, de, a) => { let s = 0; for (let r = de; r <= a; r++) s += q(prefixe + r); return s; };

  // --- Couvre-joint plat (G11…G15) ---
  const huisSimples = somme('D', 34, 36);
  const huisDV = somme('D', 37, 40);
  const omega = [q('D9'), 0, q('D10'), 0, q('D11')];            // lignes 2,5 / 3,05 / 5,75 uniquement (points A, B)
  const omegaOrigine = [q('D9'), q('D10'), q('D10'), q('D10'), q('D11')]; // XLS : E12 et E14 retirent J10 à tort
  const doublage = legacy ? o.doublage.slice(0, 1) : o.doublage;
  const renfort = legacy ? o.renfort.slice(0, 1) : o.renfort;
  const nbRenfort = renfort.reduce((s, l) => s + num(l.nb), 0);
  const U9 = nbRenfort * 2;

  const cj = LG_COUVRE_JOINT.map((lg, k) => {
    let t = 2 * (q('G' + (6 + k)) + q('G' + (22 + k)) + q('G' + (32 + k)) + q('G' + (37 + k)) + q('D' + (4 + k)) + q('D' + (17 + k)));
    for (const l of doublage) if (egal(l.lg, lg)) t -= num(l.nb);
    for (const l of renfort) {
      // XLS : la ligne 5,75 testait « 3,25 » (point C)
      const cible = legacy && k === 4 ? 3.25 : lg;
      if (egal(l.lg, cible)) t += num(l.nb) * 2;
    }
    t -= legacy ? omegaOrigine[k] : omega[k];
    if (k === 0) t += huisSimples + huisDV * 2 + (legacy ? 2 : 0);
    if (!legacy) t += num(etat.manuel[k]);
    return t;
  });

  // --- Clips : boîtes de 100 ---
  const clipsBruts = cj.reduce((s, v, k) => s + v * CLIPS_PAR_COUVRE_JOINT[k], 0);
  const clips = plafond(clipsBruts, 100);

  // --- Équerres ---
  const departsLisse = num(o.departsLisse);
  const baseEquerres = somme('G', 6, 10) + somme('G', 32, 41) + somme('D', 4, 8) + somme('D', 14, 21);
  const equerres = baseEquerres * 2 + num(o.traverses) * 2 + somme('G', 22, 26) * 6 + somme('G', 27, 31) * 4 + U9 - departsLisse * 2;

  // --- Mousse de départ (mètres, arrondis à 5 m par longueur) ---
  const mousseParLg = LG_COUVRE_JOINT.map((lg, k) => plafond(lg * 2 * q('D' + (4 + k)), 5));
  const mousse = mousseParLg.reduce((s, v) => s + v, 0) - 5 * departsLisse;

  // --- Jeux de paumelles ---
  const retraitSimple = LARGEURS_CA_SIMPLE.includes(num(o.caSimple.largeur)) ? num(o.caSimple.nb) : 0;
  const retraitDouble = LARGEURS_CA_DOUBLE.includes(num(o.caDouble.largeur)) ? num(o.caDouble.nb) : 0;
  const J41 = huisSimples - retraitSimple;
  const J42 = huisDV - retraitDouble;

  // --- Quantités finales par ligne ---
  const qte = {};
  for (const id of Object.keys(etat.qte)) if (num(etat.qte[id])) qte[id] = num(etat.qte[id]);
  cj.forEach((v, k) => { qte['G' + (11 + k)] = v; });
  qte.D41 = J41; qte.D42 = J42;

  const alertes = [];
  cj.forEach((v, k) => { if (v < 0) alertes.push(`Couvre-joint plat ${LG_COUVRE_JOINT[k]} m : quantité négative (${v}). Vérifiez les options de doublage et les Oméga.`); });
  if (J41 < 0) alertes.push(`Jeux de paumelles bois (3) : quantité négative (${J41}).`);
  if (J42 < 0) alertes.push(`Jeux de paumelles bois (6) : quantité négative (${J42}).`);
  if (equerres < 0) alertes.push(`Équerres : quantité négative (${equerres}).`);
  if (mousse < 0) alertes.push(`Mousse départ : quantité négative (${mousse}).`);

  return {
    qte, cj, clips, clipsBruts, equerres: Math.max(equerres, 0), mousse: Math.max(mousse, 0),
    mousseParLg, U9, J41, J42, alertes,
  };
}

// Abréviation des désignations pour la liste CODE / Désignation / Qts (reprend la macro AjouterProduit).
// Différence voulue : la finition est retirée seulement en fin de texte (le XLS coupait au premier « - »,
// ce qui tronquait « Couvre-joint » en « Couvre »), et les virgules deviennent des espaces (texte net, dimensions conservées).
const FINITION_FIN = /\s*[-,]\s*(?:-\s*)?(?:9005\s*MAT|RAL\s*7016\s*FT|7016\s*FT|blanc(?:\s*9016)?|anodis[ée]e?|brut|laqu[ée]e?\s*RAL|RAL(?:\s*à\s*définir)?)\s*$/i;
const ABREVIATIONS = [
  ['Couvercle', 'Couv.'], ['Goulotte', 'Goul.'], ['électrique', 'élec.'], ['huisserie', 'Huis.'], ['paumelles', 'pau.'],
  ['aluminium', 'alu'], ['toute hauteur', 'TH'], ['Classic', 'Clas.'], ['Traverse', 'Trav.'], ['panneau', 'Px.'],
  ['Aluminium', 'alu'], ['poussant gauche', 'PG'], ['poussant droit', 'PD'], ['traverse', 'Trav.'],
  ['Panneau platre', 'Px.'], ['Huisserie', 'Huis.'], ['largeur', 'lg'], ['hauteur', 'ht'], ['maxi', 'max'],
];
export function abreger(texte) {
  let t = String(texte || '').trim();
  for (let i = 0; i < 3; i++) t = t.replace(FINITION_FIN, '');
  for (const [a, b] of ABREVIATIONS) t = t.split(a).join(b);
  t = t.replace(/\bdim\b\.?/g, '').replace(/\bAB\b/g, '');
  return t.replace(/\s*,\s*/g, ' ').replace(/\s+/g, ' ').trim();   // virgules remplacées par des espaces : texte net
}

// Libellé du jonc selon la finition (cellule G12 du XLS). Point J : « RAL à définir » au lieu d'un code.
export function couleurJonc(finition, ral) {
  return { '7016 FT': '7016FT', 'BLANC 9016': 'BLANC 9016', 'ANODISÉ': 'GRIS 7035', '9005 MAT': 'NOIR' }[finition] || (ral || 'RAL à définir');
}

// Libellé de finition affiché sur la fiche (M10).
export function libelleFinition(entete) {
  return entete.finition === 'RAL' ? (entete.ral || 'RAL À DÉFINIR') : entete.finition;
}
