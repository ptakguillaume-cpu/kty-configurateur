// ==========================================
// LEXIQUE : TOUS LES TEXTES DU DEVIS
// ==========================================

export const LEXIQUE = {
    // --- 1. OSSATURE ---
    LISSES: "Lisses (barre 3000mm)",
    CALLES_LISSE: "Calles de lisse",
    MONTANT_STD: (h) => `Montants (H. ${h})`,
    MONTANT_SPEC: (h) => `Montant Spécial (H. ${h})`,
    MONTANT_TRAVERSE: "Montant (2500mm) traverses",
    DEPART: (h) => `Départ (H. ${h})`,
    ANGLE: (h) => `Angle Carré (H. ${h})`,
    CAPOT_MONTANT: "Capots de finition (pour Montant)",
    ECLISSES: "Clips de raccordement (éclisses)",
    EQUERRES: "Équerres de fixation (total)",

    // --- 2. COUVRE-JOINTS ---
    CJ_VERT: (h) => `Couvre joints (H. ${h})`,
    CJ_HORIZ: "Couvre joints H.2500mm (horizontaux)",
    CLIPS_CJ: "Boîte de Clips couvre joints (100u)",

    // --- 3. RECYCLAGE DES CHUTES ---
    CHUTES_TRAVERSES: "Chutes de montant réutilisées (Traverses)",
    CHUTES_CJ: "Chutes de CJ réutilisées",

    // --- 4. PORTES ET ACCESSOIRES ---
    HUISSERIE_PASSAGE: "Huisserie passage",
    HABILLAGE_PASSAGE: "Habillage passage libre",
    CAPOT_COULISSANT: "Capots de finition (pour habillage passage)",
    RENFORT_COULISSANT: "Montant Spécial (renfort rail coulissant)",
    KIT_RAIL: (mat) => `Kit Rail Coulissant + Accessoires (pour porte ${mat})`,
    POIGNEE_CUVETTE: "Poignée Cuvette Alu",
    KIT_PAUMELLES: (n) => `Kit Paumelles (jeu de ${n})`,
    BEQUILLES: "Béquilles",
    PLINTHE: "Plinthe automatique",
    VITRAGE_ISOLANT: "Vitrage isolant",

    // --- 5. NOMS DES PORTES (VANTAUX) ---
    V_ALU: "Vantail Cadre Alu",
    V_BOIS: "Vantail Bois (À FOURNIR PAR VOS SOINS)",
    V_VERRE: "Vantail Verre Clarit",
    V_BOIS_COULISSANT: "Vantail Bois Coulissant (À FOURNIR PAR VOS SOINS)",
    V_ALU_COULISSANT: "Vantail Cadre Alu Coulissant",
    V_ALU_SM: "Vantail Cadre Alu Sur-Mesure",
    V_SM: "Vantail Sur-Mesure",

    // --- 6. JOINTS ET VITRAGES ---
    JOINT: (ep, vitrage) => `Rouleau Joint ${ep} (50m) pour ${vitrage}`
};
