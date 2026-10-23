// Écriture minimale d'un fichier .xlsx (zip sans compression), sans bibliothèque, utilisable hors connexion.
// Les codes produit sont écrits en TEXTE : les zéros de tête sont conservés.

const TABLE_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
const crc32 = oct => { let c = 0xffffffff; for (let i = 0; i < oct.length; i++) c = TABLE_CRC[(c ^ oct[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const enc = new TextEncoder();

function zip(fichiers) {
  const parts = [], centrale = []; let decalage = 0;
  const u16 = v => [v & 255, (v >> 8) & 255], u32 = v => [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255];
  for (const [nom, contenu] of fichiers) {
    const n = enc.encode(nom), d = typeof contenu === 'string' ? enc.encode(contenu) : contenu, crc = crc32(d);
    const entete = Uint8Array.from([...u32(0x04034b50), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(d.length), ...u32(d.length), ...u16(n.length), ...u16(0)]);
    parts.push(entete, n, d);
    centrale.push(Uint8Array.from([...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(d.length), ...u32(d.length), ...u16(n.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(decalage)]), n);
    decalage += entete.length + n.length + d.length;
  }
  const tailleCentrale = centrale.reduce((s, p) => s + p.length, 0);
  const fin = Uint8Array.from([...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(fichiers.length), ...u16(fichiers.length), ...u32(tailleCentrale), ...u32(decalage), ...u16(0)]);
  return new Blob([...parts, ...centrale, fin], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
const colonne = i => { let s = ''; for (i++; i > 0; i = Math.floor((i - 1) / 26)) s += String.fromCharCode(65 + ((i - 1) % 26)); return s; };

// feuille : { nom, lignes: [[cellule…]…], largeurs: [n…] }   cellule = valeur | { v, gras, texte }
export function creerXlsx(feuille) {
  const lignes = feuille.lignes.map((ligne, r) => {
    const cellules = ligne.map((c, i) => {
      if (c === null || c === undefined || c === '') return '';
      const o = typeof c === 'object' ? c : { v: c };
      const ref = colonne(i) + (r + 1), s = o.gras ? ' s="1"' : '';
      if (typeof o.v === 'number' && !o.texte) return `<c r="${ref}"${s}><v>${o.v}</v></c>`;
      return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${esc(o.v)}</t></is></c>`;
    }).join('');
    return `<row r="${r + 1}">${cellules}</row>`;
  }).join('');
  const cols = (feuille.largeurs || []).map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('');
  const X = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  return zip([
    ['[Content_Types].xml', X + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>'],
    ['_rels/.rels', X + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
    ['xl/workbook.xml', X + `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${esc(feuille.nom.slice(0, 31))}" sheetId="1" r:id="rId1"/></sheets></workbook>`],
    ['xl/_rels/workbook.xml.rels', X + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'],
    ['xl/styles.xml', X + '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs></styleSheet>'],
    ['xl/worksheets/sheet1.xml', X + `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols>${cols}</cols><sheetData>${lignes}</sheetData></worksheet>`],
  ]);
}
