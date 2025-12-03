import { AppManager } from './app.js';
import { 
    adapterFormulaire, 
    changerForme, 
    getLargeurPorte, 
    getMurActif, 
    genererInterfaceSensPortes, 
    ajouterModuleMixte, 
    retirerModuleMixte, 
    mettreAJourListeMixte, 
    remplirAutomatiquement, 
    adapterFormulaireMixte,
    remplirMixteEgal,
    ajouterModuleStandardMixte,
    // NOUVELLE FONCTION IMPORTÉE ICI :
    deplacerModule
} from './uiManager.js';
import { afficherNotification, demanderConfirmation } from './utils.js';
import { calculerInventaire, imprimerDevis } from './calculateur.js';

// --- INITIALISATION ---
window.app = AppManager;

// Fonctions UI existantes
window.adapterFormulaire = adapterFormulaire;
window.changerForme = changerForme;
window.getLargeurPorte = getLargeurPorte;
window.getMurActif = getMurActif;
window.genererInterfaceSensPortes = genererInterfaceSensPortes;
window.ajouterModuleMixte = ajouterModuleMixte;
window.retirerModuleMixte = retirerModuleMixte;
window.mettreAJourListeMixte = mettreAJourListeMixte;
window.remplirAutomatiquement = remplirAutomatiquement;
window.adapterFormulaireMixte = adapterFormulaireMixte;

// Fonctions de suggestions
window.remplirMixteEgal = remplirMixteEgal;
window.ajouterModuleStandardMixte = ajouterModuleStandardMixte;

// NOUVEAU : On attache la fonction de déplacement
window.deplacerModule = deplacerModule;

// Utils
window.afficherNotification = afficherNotification;
window.demanderConfirmation = demanderConfirmation;

// Calculs
window.calculerInventaire = calculerInventaire;
window.imprimerDevis = imprimerDevis;

// Démarrage de l'application
document.addEventListener('DOMContentLoaded', () => {
    AppManager.init();
});
