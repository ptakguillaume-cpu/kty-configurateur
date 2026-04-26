import { LEXIQUE } from './lexique.js';

// ==========================================
// DICTIONNAIRE DES PORTES ET HUISSERIES KTY
// ==========================================

export const CATALOGUE_PORTES = {
    "alu_828": { largeurVantail: 828, largeurEntreMontants: 880, hauteurVantailStandard: 2040, nomDevisVantail: LEXIQUE.V_ALU, nomDevisHuisserie: `${LEXIQUE.HUISSERIE_PASSAGE} 880` },
    "alu_928": { largeurVantail: 928, largeurEntreMontants: 980, hauteurVantailStandard: 2040, nomDevisVantail: LEXIQUE.V_ALU, nomDevisHuisserie: `${LEXIQUE.HUISSERIE_PASSAGE} 980` },
    "bois_830": { largeurVantail: 830, largeurEntreMontants: 880, hauteurVantailStandard: 2040, nomDevisVantail: LEXIQUE.V_BOIS, nomDevisHuisserie: `${LEXIQUE.HUISSERIE_PASSAGE} 880` },
    "bois_930": { largeurVantail: 930, largeurEntreMontants: 980, hauteurVantailStandard: 2040, nomDevisVantail: LEXIQUE.V_BOIS, nomDevisHuisserie: `${LEXIQUE.HUISSERIE_PASSAGE} 980` },
    "verre_827": { largeurVantail: 827, largeurEntreMontants: 880, hauteurVantailStandard: 2035, nomDevisVantail: LEXIQUE.V_VERRE, nomDevisHuisserie: `${LEXIQUE.HUISSERIE_PASSAGE} 880` }
};

export function getDonneesPorte(largeurSaisie, typeSaisi, isCoulissante = false) {
    if (isCoulissante) {
        let isBois = (typeSaisi === 'pleine');
        let passageLibre = largeurSaisie - 71; 
        return {
            largeurVantail: largeurSaisie,
            largeurEntreMontants: passageLibre, 
            hauteurVantailStandard: 2040,
            nomDevisVantail: isBois ? LEXIQUE.V_BOIS_COULISSANT : LEXIQUE.V_ALU_COULISSANT,
            nomDevisHuisserie: `${LEXIQUE.HABILLAGE_PASSAGE} ${passageLibre}`,
            isCoulissante: true,
            isBois: isBois
        };
    }

    let typeCle = "";
    if (typeSaisi === 'cadreAlu') typeCle = "alu_";
    else if (typeSaisi === 'pleine') typeCle = "bois_"; 
    else if (typeSaisi === 'clarit') typeCle = "verre_"; 
    else typeCle = "alu_"; 

    let cle = typeCle + largeurSaisie;
    if (CATALOGUE_PORTES[cle]) return CATALOGUE_PORTES[cle];
    
    return {
        largeurVantail: largeurSaisie,
        largeurEntreMontants: largeurSaisie + 52,
        hauteurVantailStandard: 2040,
        nomDevisVantail: typeSaisi === 'cadreAlu' ? LEXIQUE.V_ALU_SM : LEXIQUE.V_SM,
        nomDevisHuisserie: `${LEXIQUE.HUISSERIE_PASSAGE} ${largeurSaisie + 52}`
    };
}
