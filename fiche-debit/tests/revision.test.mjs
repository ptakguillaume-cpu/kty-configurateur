// Test du suivi des modifications. Usage : node tests/revision.test.mjs
import assert from 'node:assert/strict';
import { instantane, comparer, clePdt } from '../revision.js';

const base = instantane({ G6: 17, G7: 0, D4: 7, G11: 60 }, { A37: 500, A38: 76 }, [{ ref: '000415', designation: 'Goulotte', qte: '2' }, { ref: 'Z-DIV', designation: 'Option', qte: 1 }]);
assert.deepEqual(base.lignes, { G6: 17, D4: 7, G11: 60 }, 'les zéros ne sont pas enregistrés');

// rien n'a changé
assert.equal(comparer(base, instantane({ G6: 17, D4: 7, G11: 60 }, { A37: 500, A38: 76 }, [{ ref: '000415', qte: 2 }, { ref: 'z-div', qte: '1' }])).nb, 0, 'même fiche (casse et texte/nombre indifférents)');

const cur = instantane({ G6: 20, D4: 0, G8: 3, G11: 60 }, { A37: 600, A38: 76 }, [{ ref: '000415', qte: 5 }, { ref: '000999', designation: 'Nouveau', qte: 1 }]);
const d = comparer(base, cur);
assert.deepEqual(d.lignes.G6, { type: 'modif', avant: 17, apres: 20 });
assert.deepEqual(d.lignes.D4, { type: 'retrait', avant: 7, apres: 0 });
assert.deepEqual(d.lignes.G8, { type: 'ajout', avant: 0, apres: 3 });
assert.equal(d.lignes.G11, undefined, 'ligne inchangée');
assert.deepEqual(d.acc.A37, { type: 'modif', avant: 500, apres: 600 });
assert.deepEqual(d.produits['000415'], { type: 'modif', avant: 2, apres: 5 });
assert.deepEqual(d.produits['000999'], { type: 'ajout', avant: 0, apres: 1 });
assert.equal(d.retires.length, 1); assert.equal(d.retires[0].ref, 'Z-DIV'); assert.equal(d.retires[0].avant, 1, 'produit retiré de la liste');
assert.equal(d.nb, 3 + 1 + 3 + 0, 'G6, D4, G8 + A37 + 000415, 000999 + Z-DIV retiré');
assert.equal(clePdt({ ref: ' ABC ' }), 'abc');
console.log('Suivi des modifications : OK');
