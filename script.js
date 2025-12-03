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
    adapterFormulaireMixte 
} from './uiManager.js';
import { afficherNotification, demanderConfirmation } from './utils.js';
import { calculerInventaire, imprimerDevis } from './calculateur.js';
import { dessinerSceneGlobale } from './engine3d.js';

// --- INITIALISATION ---
// On rattache les fonctions aux événements globaux (pour que le HTML onclick="" fonctionne)
window.app = AppManager;
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
window.afficherNotification = afficherNotification;
window.demanderConfirmation = demanderConfirmation;
window.calculerInventaire = calculerInventaire;
window.imprimerDevis = imprimerDevis;
// dessinerSceneGlobale n'est pas appelé directement par le HTML, mais par le JS

// Démarrage de l'application
document.addEventListener('DOMContentLoaded', () => {
    AppManager.init();
});