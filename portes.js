// ==========================================
// DICTIONNAIRE DES PORTES ET HUISSERIES KTY
// ==========================================

export const CATALOGUE_PORTES = {
    // --- PORTES CADRE ALU ---
    "alu_828": {
        largeurVantail: 828,
        largeurEntreMontants: 880,
        hauteurVantailStandard: 2040, 
        hauteurFondFeuillure: 2049.5,
        nomDevisVantail: "Vantail Cadre Alu",
        nomDevisHuisserie: "Huisserie passage 880"
    },
    "alu_928": {
        largeurVantail: 928,
        largeurEntreMontants: 980,
        hauteurVantailStandard: 2040,
        hauteurFondFeuillure: 2049.5,
        nomDevisVantail: "Vantail Cadre Alu",
        nomDevisHuisserie: "Huisserie passage 980"
    },

    // --- PORTES BOIS ---
    "bois_830": {
        largeurVantail: 830,
        largeurEntreMontants: 880,
        hauteurVantailStandard: 2040,
        hauteurFondFeuillure: 2049.5,
        nomDevisVantail: "Vantail Bois",
        nomDevisHuisserie: "Huisserie passage 880"
    },
    "bois_930": {
        largeurVantail: 930,
        largeurEntreMontants: 980,
        hauteurVantailStandard: 2040,
        hauteurFondFeuillure: 2049.5,
        nomDevisVantail: "Vantail Bois",
        nomDevisHuisserie: "Huisserie passage 980"
    },
    
    // --- PORTES CLARIT (VERRE) ---
    "verre_827": {
        largeurVantail: 827,
        largeurEntreMontants: 880,
        hauteurVantailStandard: 2035, // Jeu différent selon fiche
        hauteurFondFeuillure: 2049.5,
        nomDevisVantail: "Vantail Verre Clarit",
        nomDevisHuisserie: "Huisserie passage 880"
    }
};

// Fonction qui cherche la bonne dimension dans le catalogue
export function getDonneesPorte(largeurSaisie, typeSaisi) {
    let typeCle = "";
    if (typeSaisi === 'cadreAlu') typeCle = "alu_";
    else if (typeSaisi === 'pleine') typeCle = "bois_"; 
    else if (typeSaisi === 'clarit') typeCle = "verre_"; 
    else typeCle = "alu_"; 

    let cle = typeCle + largeurSaisie;

    if (CATALOGUE_PORTES[cle]) {
        return CATALOGUE_PORTES[cle];
    }
    
    // Si sur-mesure ou non trouvé, on calcule une valeur de sécurité
    return {
        largeurVantail: largeurSaisie,
        largeurEntreMontants: largeurSaisie + 52,
        hauteurVantailStandard: 2040,
        nomDevisVantail: typeSaisi === 'cadreAlu' ? "Vantail Cadre Alu Sur-Mesure" : "Vantail Sur-Mesure",
        nomDevisHuisserie: `Huisserie passage ${largeurSaisie + 52}`
    };
}
