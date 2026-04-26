// ==========================================
// CONFIGURATION DE L'OSSATURE ET DES PROFILÉS
// ==========================================

export const OSSATURE_CONFIG = {
    // 📏 LONGUEURS DISPONIBLES EN STOCK (en mm)
    // Modifie cette liste si ton fournisseur propose d'autres longueurs !
    LONGUEURS_MONTANTS: [2500, 2700, 3050, 3250, 5750],
    
    // Longueur standard d'une barre de lisse haute/basse
    LONGUEUR_LISSE: 3000, 
    
    // Longueur standard d'un couvre-joint horizontal (pour chutes traverses)
    LONGUEUR_CJ_HORIZ: 2500,

    // 📐 DIMENSIONS TECHNIQUES DES PROFILÉS
    EPAISSEUR_PROFIL: 38,
    LARGEUR_ANGLE: 90.5 // Largeur du poteau d'angle carré
};

// Fonction intelligente qui cherche la meilleure barre à commander selon la hauteur
export function getBarreOptimale(hauteurProjet) {
    // On parcourt tes longueurs disponibles du plus petit au plus grand
    for (let longueur of OSSATURE_CONFIG.LONGUEURS_MONTANTS) {
        if (longueur >= hauteurProjet) {
            return longueur; // On a trouvé la barre parfaite !
        }
    }
    // Si le plafond est gigantesque, on prend la plus grande barre de ton stock
    return OSSATURE_CONFIG.LONGUEURS_MONTANTS[OSSATURE_CONFIG.LONGUEURS_MONTANTS.length - 1];
}
