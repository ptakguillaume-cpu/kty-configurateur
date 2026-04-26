import { LEXIQUE } from './lexique.js';

// ==========================================
// DICTIONNAIRE DES PORTES ET HUISSERIES KTY
// ==========================================

export const CATALOGUE_PORTES = {
    // --- PORTES STANDARDS (H. 2100) ---
    "alu_828": { largeurVantail: 828, largeurEntreMontants: 880, hauteurVantailStandard: 2040, nomDevisVantail: LEXIQUE.V_ALU, nomDevisHuisserie: `${LEXIQUE.HUISSERIE_PASSAGE} 880` },
    "alu_928": { largeurVantail: 928, largeurEntreMontants: 980, hauteurVantailStandard: 2040, nomDevisVantail: LEXIQUE.V_ALU, nomDevisHuisserie: `${LEXIQUE.HUISSERIE_PASSAGE} 980` },
    "bois_830": { largeurVantail: 830, largeurEntreMontants: 880, hauteurVantailStandard: 2040, nomDevisVantail: LEXIQUE.V_BOIS, nomDevisHuisserie: `${LEXIQUE.HUISSERIE_PASSAGE} 880` },
    "bois_930": { largeurVantail: 930, largeurEntreMontants: 980, hauteurVantailStandard: 2040, nomDevisVantail: LEXIQUE.V_BOIS, nomDevisHuisserie: `${LEXIQUE.HUISSERIE_PASSAGE} 980` },
    "verre_827": { largeurVantail: 827, largeurEntreMontants: 880, hauteurVantailStandard: 2035, nomDevisVantail: LEXIQUE.V_VERRE, nomDevisHuisserie: `${LEXIQUE.HUISSERIE_PASSAGE} 880` },

    // --- PORTES TOUTE HAUTEUR (_tth) ---
    "alu_828_tth": { largeurVantail: 828, largeurEntreMontants: 880, nomDevisVantail: LEXIQUE.V_ALU_TTH, nomDevisHuisserie: `${LEXIQUE.HUISSERIE_PASSAGE_TTH} 880` },
    "alu_928_tth": { largeurVantail: 928, largeurEntreMontants: 980, nomDevisVantail: LEXIQUE.V_ALU_TTH, nomDevisHuisserie: `${LEXIQUE.HUISSERIE_PASSAGE_TTH} 980` },
    "bois_830_tth": { largeurVantail: 830, largeurEntreMontants: 880, nomDevisVantail: LEXIQUE.V_BOIS_TTH, nomDevisHuisserie: `${LEXIQUE.HUISSERIE_PASSAGE_TTH} 880` },
    "bois_930_tth": { largeurVantail: 930, largeurEntreMontants: 980, nomDevisVantail: LEXIQUE.V_BOIS_TTH, nomDevisHuisserie: `${LEXIQUE.HUISSERIE_PASSAGE_TTH} 980` }
};

// On ajoute le paramètre "isTTH" pour interroger la bonne ligne du dictionnaire
export function getDonneesPorte(largeurSaisie, typeSaisi, isCoulissante = false, isTTH = false) {
    if (isCoulissante) {
        let isBois = (typeSaisi === 'pleine');
        let passageLibre = largeurSaisie - 72; 
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

    // On rajoute "_tth" à la recherche si la porte est Toute Hauteur
    let cle = typeCle + largeurSaisie + (isTTH ? "_tth" : "");

    if (CATALOGUE_PORTES[cle]) return CATALOGUE_PORTES[cle];
    
    return {
        largeurVantail: largeurSaisie,
        largeurEntreMontants: largeurSaisie + 52,
        hauteurVantailStandard: 2040,
        nomDevisVantail: typeSaisi === 'cadreAlu' ? LEXIQUE.V_ALU_SM : LEXIQUE.V_SM,
        nomDevisHuisserie: `${LEXIQUE.HUISSERIE_PASSAGE} ${largeurSaisie + 52}`
    };
}
