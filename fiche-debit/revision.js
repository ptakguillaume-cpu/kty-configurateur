// Suivi des modifications : on « fige » une version de la fiche, puis chaque changement est repéré en couleur
// (ajouté = vert, modifié = orange, retiré = rouge). Comparaison sur les quantités FINALES (saisies et calculées).

const n = v => { const x = Number(String(v ?? '').replace(',', '.')); return Number.isFinite(x) ? Math.round(x * 1e6) / 1e6 : 0; };
export const clePdt = p => String(p.ref || p.designation || '').trim().toLowerCase();
const typeDe = (avant, apres) => (avant === apres ? null : avant === 0 ? 'ajout' : apres === 0 ? 'retrait' : 'modif');

// Photographie des quantités : lignes (id -> quantité), accessoires (id -> quantité), produits ajoutés.
export function instantane(lignes, acc, produits) {
  return {
    lignes: Object.fromEntries(Object.entries(lignes).map(([k, v]) => [k, n(v)]).filter(([, v]) => v !== 0)),
    acc: Object.fromEntries(Object.entries(acc).map(([k, v]) => [k, n(v)]).filter(([, v]) => v !== 0)),
    produits: produits.map(p => ({ ref: String(p.ref || ''), designation: String(p.designation || ''), qte: n(p.qte) })).filter(p => clePdt(p)),
  };
}

export function comparer(base, courant) {
  const res = { lignes: {}, acc: {}, produits: {}, retires: [], nb: 0 };
  const cmp = (A, B, sortie) => {
    for (const id of new Set([...Object.keys(A || {}), ...Object.keys(B || {})])) {
      const a = n(A?.[id]), b = n(B?.[id]), t = typeDe(a, b);
      if (t) { sortie[id] = { type: t, avant: a, apres: b }; res.nb++; }
    }
  };
  cmp(base.lignes, courant.lignes, res.lignes);
  cmp(base.acc, courant.acc, res.acc);
  const somme = liste => { const m = new Map(); for (const p of liste || []) { const k = clePdt(p); if (k) m.set(k, { ...(m.get(k) || { ref: p.ref, designation: p.designation }), qte: (m.get(k)?.qte || 0) + n(p.qte) }); } return m; };
  const A = somme(base.produits), B = somme(courant.produits);
  for (const [k, b] of B) { const a = A.get(k)?.qte || 0, t = typeDe(a, b.qte); if (t) { res.produits[k] = { type: t, avant: a, apres: b.qte }; res.nb++; } }
  for (const [k, a] of A) if (!B.has(k) && a.qte !== 0) { res.retires.push({ cle: k, ref: a.ref, designation: a.designation, avant: a.qte }); res.nb++; }
  return res;
}

export const libelleType = { ajout: 'ajouté', modif: 'modifié', retrait: 'retiré' };
