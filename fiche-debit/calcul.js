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
    revision: { numero: 0, base: null, date: null },   // suivi des modifications : version figée (voir revision.js)
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

const plage = (p, a, b) => Array.from({ length: b - a + 1 }, (_, i) => p + (a + i));

// Rôle de chaque ligne de la fiche dans les calculs. Les listes à 5 emplacements correspondent aux longueurs
// 2,5 / 2,7 / 3,05 / 3,25 / 5,75 m (null = pas de ligne pour cette longueur sur la fiche).
export const ROLES_CLASSIC = {
  montants: plage('G', 6, 10), meneaux: plage('G', 22, 26), angleDepartMultiple: plage('G', 32, 36), departMultipleCJ: plage('G', 37, 41),
  departs: plage('D', 4, 8), montantsSpeciaux: plage('D', 17, 21), omega: ['D9', null, 'D10', null, 'D11'], omegaOrigine: ['D9', 'D10', 'D10', 'D10', 'D11'],
  huisSimples: plage('D', 34, 36), huisDV: plage('D', 37, 40), angle90: plage('D', 14, 16), angleCarre: plage('G', 27, 31),
  couvreJoint: plage('G', 11, 15), paumelles: ['D41', 'D42'],
};
// RDB1 : mêmes règles que la Classic, chaque ligne étant rattachée à son équivalent selon sa place sur la fiche
// (montant 15MON = montant, angle 90° 15P2D = angle carré, angle multiple 00PVA = angle départ multiple, départ multiple RDB1 = départ multiple à couvre-joint…).
export const ROLES_RDB1 = {
  montants: ['G5', 'G6', 'G7', null, 'G9'], meneaux: [null, null, 'G18', null, 'G20'], angleDepartMultiple: [null, null, null, null, null],
  departMultipleCJ: [null, null, 'G31', null, 'G33'], departs: ['D2', 'D3', 'D4', null, 'D6'], montantsSpeciaux: [null, null, 'D17', null, 'D19'],
  omega: ['D7', null, 'D9', null, 'D11'], omegaOrigine: ['D7', null, 'D9', null, 'D11'], huisSimples: ['D33', 'D34', 'D35'], huisDV: ['D36', 'D37', 'D38', 'D39'],
  angle90: [], angleCarre: ['G23', 'G25'], couvreJoint: plage('G', 10, 14), paumelles: ['D40', 'D41'],
};

export function calculer(etat, { legacy = false, roles = ROLES_CLASSIC } = {}) {
  const q = id => (id ? num(etat.qte[id]) : 0);
  const o = etat.options;
  const somme = ids => ids.reduce((s, id) => s + q(id), 0);

  // --- Couvre-joint plat ---
  const huisSimples = somme(roles.huisSimples);
  const huisDV = somme(roles.huisDV);
  const omega = roles.omega.map(q);                              // lignes 2,5 / 3,05 / 5,75 uniquement (points A, B)
  const omegaOrigine = roles.omegaOrigine.map(q);                // XLS : E12 et E14 retirent J10 à tort
  const doublage = legacy ? o.doublage.slice(0, 1) : o.doublage;
  const renfort = legacy ? o.renfort.slice(0, 1) : o.renfort;
  const nbRenfort = renfort.reduce((s, l) => s + num(l.nb), 0);
  const U9 = nbRenfort * 2;

  const cj = LG_COUVRE_JOINT.map((lg, k) => {
    let t = 2 * (q(roles.montants[k]) + q(roles.meneaux[k]) + q(roles.angleDepartMultiple[k]) + q(roles.departMultipleCJ[k]) + q(roles.departs[k]) + q(roles.montantsSpeciaux[k]));
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
  const baseEquerres = somme(roles.montants) + somme(roles.angleDepartMultiple) + somme(roles.departMultipleCJ) + somme(roles.departs) + somme(roles.angle90) + somme(roles.montantsSpeciaux);
  const equerres = baseEquerres * 2 + num(o.traverses) * 2 + somme(roles.meneaux) * 6 + somme(roles.angleCarre) * 4 + U9 - departsLisse * 2;

  // --- Mousse de départ (mètres, arrondis à 5 m par longueur) ---
  const mousseParLg = LG_COUVRE_JOINT.map((lg, k) => plafond(lg * 2 * q(roles.departs[k]), 5));
  const mousse = mousseParLg.reduce((s, v) => s + v, 0) - 5 * departsLisse;

  // --- Jeux de paumelles ---
  const retraitSimple = LARGEURS_CA_SIMPLE.includes(num(o.caSimple.largeur)) ? num(o.caSimple.nb) : 0;
  const retraitDouble = LARGEURS_CA_DOUBLE.includes(num(o.caDouble.largeur)) ? num(o.caDouble.nb) : 0;
  const J41 = huisSimples - retraitSimple;
  const J42 = huisDV - retraitDouble;

  // --- Quantités finales par ligne ---
  const qte = {};
  for (const id of Object.keys(etat.qte)) if (num(etat.qte[id])) qte[id] = num(etat.qte[id]);
  roles.couvreJoint.forEach((id, k) => { qte[id] = cj[k]; });
  qte[roles.paumelles[0]] = J41; qte[roles.paumelles[1]] = J42;

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
