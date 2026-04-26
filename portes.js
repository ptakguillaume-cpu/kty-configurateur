// ==========================================
// DICTIONNAIRE DES PORTES ET HUISSERIES KTY
// ==========================================

export const CATALOGUE_PORTES = {
    "alu_828": { largeurVantail: 828, largeurEntreMontants: 880, hauteurVantailStandard: 2040, nomDevisVantail: "Vantail Cadre Alu", nomDevisHuisserie: "Huisserie passage 880" },
    "alu_928": { largeurVantail: 928, largeurEntreMontants: 980, hauteurVantailStandard: 2040, nomDevisVantail: "Vantail Cadre Alu", nomDevisHuisserie: "Huisserie passage 980" },
    "bois_830": { largeurVantail: 830, largeurEntreMontants: 880, hauteurVantailStandard: 2040, nomDevisVantail: "Vantail Bois", nomDevisHuisserie: "Huisserie passage 880" },
    "bois_930": { largeurVantail: 930, largeurEntreMontants: 980, hauteurVantailStandard: 2040, nomDevisVantail: "Vantail Bois", nomDevisHuisserie: "Huisserie passage 980" },
    "verre_827": { largeurVantail: 827, largeurEntreMontants: 880, hauteurVantailStandard: 2035, nomDevisVantail: "Vantail Verre Clarit", nomDevisHuisserie: "Huisserie passage 880" }
};

export function getDonneesPorte(largeurSaisie, typeSaisi, isCoulissante = false) {
    // RÈGLES POUR PORTE COULISSANTE
    if (isCoulissante) {
        let isBois = (typeSaisi === 'pleine');
        let passageLibre = largeurSaisie - 71; 
        return {
            largeurVantail: largeurSaisie,
            largeurEntreMontants: passageLibre, 
            hauteurVantailStandard: 2040,
            nomDevisVantail: isBois ? "Vantail Bois Coulissant (À FOURNIR PAR VOS SOINS)" : "Vantail Cadre Alu Coulissant",
            nomDevisHuisserie: `Habillage passage libre ${passageLibre}`,
            isCoulissante: true,
            isBois: isBois
        };
    }

    // RÈGLES CLASSIQUES
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
        nomDevisVantail: typeSaisi === 'cadreAlu' ? "Vantail Cadre Alu Sur-Mesure" : "Vantail Sur-Mesure",
        nomDevisHuisserie: `Huisserie passage ${largeurSaisie + 52}`
    };
}
