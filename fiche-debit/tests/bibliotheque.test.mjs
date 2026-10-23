// Tests de l'import de la bibliothèque : codes, CSV, lecture d'un vrai classeur Excel. Usage : node tests/bibliotheque.test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normaliserCode, lireCsv } from '../bibliotheque.js';
import { creerXlsx, lireXlsx } from '../xlsx.js';

const existe = new Set(['000959', '8001', '7346', '007346', '000040']);
const e = r => existe.has(r);
assert.deepEqual(normaliserCode('959', e), { code: '000959', corrige: true }, 'Excel a enlevé les zéros');
assert.deepEqual(normaliserCode(' 000959 ', e), { code: '000959', corrige: false });
assert.deepEqual(normaliserCode('7346', e), { code: '7346', corrige: false }, '7346 est un code à part entière, pas 007346');
assert.deepEqual(normaliserCode('8001', e), { code: '8001', corrige: false });
assert.deepEqual(normaliserCode('', e), { code: '', corrige: false });
assert.deepEqual(normaliserCode('123456', e), { code: '123456', corrige: false }, 'code inconnu conservé tel quel');
assert.deepEqual(normaliserCode('000 959', e).code, '000959', 'espaces retirés');

assert.deepEqual(lireCsv('﻿Référence;Désignation\r\n000959;"Lisse ; 3000"\r\n8001;"Angle ""x"""\r\n'), [['Référence', 'Désignation'], ['000959', 'Lisse ; 3000'], ['8001', 'Angle "x"']]);
assert.deepEqual(lireCsv('a,b\n1,2\n\n3,4'), [['a', 'b'], ['1', '2'], ['3', '4']], 'séparateur virgule et lignes vides');

// classeur produit par cet outil (texte, zéros conservés)
const blob = creerXlsx({ nom: 'T', lignes: [['Référence', 'Désignation'], [{ v: '000959', texte: true }, 'Lisse & <3000>'], [{ v: '7346', texte: true }, 'ok']], largeurs: [10, 20] });
const t1 = await lireXlsx(await blob.arrayBuffer());
assert.deepEqual(t1, [['Référence', 'Désignation'], ['000959', 'Lisse & <3000>'], ['7346', 'ok']]);

// vrai classeur Excel (compressé, chaînes partagées, nombres)
const t2 = await lireXlsx(readFileSync(new URL('./fixture_excel.xlsx', import.meta.url)).buffer.slice(0));
assert.equal(t2[0][0], 'Identifiant'); assert.equal(t2[1][0], 'G4'); assert.equal(t2[1][6], '959', 'nombre lu tel quel');
assert.equal(t2[1][7], '000961', 'texte avec zéros conservé'); assert.equal(t2[2][4], ''); assert.equal(t2[3][0], 'ZZ9');
assert.equal(normaliserCode(t2[1][6], e).code, '000959');
console.log('Bibliothèque : import OK (codes, CSV, Excel)');
