import { GLOBAL_STATE } from './state.js';
import { afficherNotification, demanderConfirmation } from './utils.js';
import { calculerInventaire } from './calculateur.js';
import { adapterFormulaire, changerForme } from './uiManager.js';

export const AppManager = {
    currentStep: 1,
    
    init: async function() {
        await this.chargerReferencesExternes();
        this.chargerListeProjets();
        this.naviguer(1);
        
        window.addEventListener('resize', () => {
             if(GLOBAL_STATE.currentScene.camera && GLOBAL_STATE.currentScene.renderer) {
                 const c = document.getElementById('apercuElevationContainer');
                 if(c) {
                     GLOBAL_STATE.currentScene.camera.aspect = c.clientWidth / c.clientHeight;
                     GLOBAL_STATE.currentScene.camera.updateProjectionMatrix();
                     GLOBAL_STATE.currentScene.renderer.setSize(c.clientWidth, c.clientHeight);
                 }
             }
        });
    },

    chargerReferencesExternes: async function() {
        const localData = localStorage.getItem('kty_references_db');
        if (localData) {
            try {
                GLOBAL_STATE.CODES_ARTICLES = JSON.parse(localData);
                console.log("✅ Références chargées (Locales).");
                return;
            } catch (e) { localStorage.removeItem('kty_references_db'); }
        }

        try {
            const reponse = await fetch('./data.json');
            if (!reponse.ok) throw new Error("Fichier data.json introuvable");
            
            const jsonBrut = await reponse.json();
            let codesConvertis = {};

            if (jsonBrut.produits && Array.isArray(jsonBrut.produits)) {
                jsonBrut.produits.forEach(item => {
                    if (item.type === 'unique') {
                        codesConvertis[item.nom] = item.ref_unique;
                    } else {
                        codesConvertis[item.nom] = {
                            "9016": item.ref_9016 || "-",
                            "7016": item.ref_7016 || "-",
                            "9005": item.ref_9005 || "-",
                            "anodise": item.ref_anodise || "-",
                            "autre": item.ref_autre || "-"
                        };
                    }
                });
                GLOBAL_STATE.CODES_ARTICLES = codesConvertis;
            } else {
                GLOBAL_STATE.CODES_ARTICLES = jsonBrut; 
            }
            console.log("✅ Références chargées (Serveur).");
        } catch (erreur) {
            console.error("Erreur chargement références :", erreur);
            GLOBAL_STATE.CODES_ARTICLES = {}; 
        }
    },

    ouvrirAdmin: function() {
        const password = "1234"; 
        const saisie = prompt("🔒 Accès réservé Administrateur.\nVeuillez entrer le mot de passe :");

        if (saisie === password) {
            const modal = document.getElementById('adminModal');
            const editor = document.getElementById('jsonEditor');
            editor.value = JSON.stringify(GLOBAL_STATE.CODES_ARTICLES, null, 4);
            modal.classList.remove('hidden');
            modal.style.display = 'flex';
        } else if (saisie !== null) {
            afficherNotification("⛔ Mot de passe incorrect !");
        }
    },

    fermerAdmin: function() {
        const modal = document.getElementById('adminModal');
        modal.classList.add('hidden');
        modal.style.display = 'none';
    },

    sauvegarderReferences: function() {
        const editor = document.getElementById('jsonEditor');
        try {
            const newRefs = JSON.parse(editor.value);
            GLOBAL_STATE.CODES_ARTICLES = newRefs;
            localStorage.setItem('kty_references_db', JSON.stringify(newRefs));
            afficherNotification("✅ Références mises à jour !");
            this.fermerAdmin();
            if (this.currentStep === 3) calculerInventaire();
        } catch (e) {
            alert("Erreur de syntaxe JSON !\n" + e.message);
        }
    },

    resetReferences: async function() {
        if(confirm("Effacer les modifications manuelles et recharger le fichier d'origine ?")) {
            localStorage.removeItem('kty_references_db');
            await this.chargerReferencesExternes();
            document.getElementById('jsonEditor').value = JSON.stringify(GLOBAL_STATE.CODES_ARTICLES, null, 4);
            afficherNotification("♻️ Références remises à zéro.");
            if (this.currentStep === 3) calculerInventaire();
            this.fermerAdmin();
        }
    },

    naviguer: function(step) {
        document.querySelectorAll('.wizard-step').forEach(el => el.classList.remove('active-step'));
        document.querySelectorAll('.step').forEach(el => el.classList.remove('active'));
        
        const targetStep = document.getElementById('step-' + step);
        const targetInd = document.getElementById('ind-step-' + step);
        
        if(targetStep) targetStep.classList.add('active-step');
        if(targetInd) targetInd.classList.add('active');
        
        this.currentStep = step;
        
        if(step === 3 || step === 2) {
            adapterFormulaire(); 
        }

        if(step === 3) {
            setTimeout(() => calculerInventaire(), 100);
        }
    },

    nouveauProjet: function() {
        document.getElementById('nomChantier').value = "";
        document.getElementById('longueur').value = "3000";
        document.getElementById('longueurB').value = "2000";
        document.getElementById('longueurC').value = "2000";
        document.getElementById('formeCloison').value = "droite";
        document.getElementById('typeCloison').value = "pleine";
        
        GLOBAL_STATE.configMurs = { A: [], B: [], C: [] }; 
        GLOBAL_STATE.compositionMixte = [];
        
        adapterFormulaire();
        this.naviguer(2);
    },

    validerEtape2: function() {
        const nom = document.getElementById('nomChantier').value;
        if(!nom) { 
            demanderConfirmation("Le chantier n'a pas de nom. Continuer quand même ?", 'bleu', () => {
                this.naviguer(3);
            });
            return;
        }
        this.naviguer(3);
    },

    sauvegarderProjet: function() {
        const nom = document.getElementById('nomChantier').value || "Sans titre";
        const data = {
            id: Date.now(),
            date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString(),
            nom: nom,
            config: {
                forme: document.getElementById('formeCloison').value,
                type: document.getElementById('typeCloison').value,
                hauteur: document.getElementById('hauteur').value,
                ral: document.getElementById('couleurRal').value,
                lA: document.getElementById('longueur').value,
                lB: document.getElementById('longueurB').value,
                lC: document.getElementById('longueurC').value,
                qtePortes: document.getElementById('qtePortes').value,
                murs: GLOBAL_STATE.configMurs,
                mixte: GLOBAL_STATE.compositionMixte
            }
        };

        let projets = JSON.parse(localStorage.getItem('kty_projets') || "[]");
        projets.push(data);
        localStorage.setItem('kty_projets', JSON.stringify(projets));
        
        afficherNotification("✅ Projet sauvegardé avec succès !");
        this.chargerListeProjets(); 
    },

    chargerListeProjets: function() {
        const container = document.getElementById('listeSauvegardes');
        if(!container) return;
        const projets = JSON.parse(localStorage.getItem('kty_projets') || "[]");
        if(projets.length === 0) {
            container.innerHTML = '<p style="color:#888; font-style:italic;">Aucun projet sauvegardé.</p>';
            return;
        }
        container.innerHTML = '';
        projets.sort((a,b) => b.id - a.id).forEach(p => {
            const div = document.createElement('div');
            div.className = 'saved-project-item';
            div.innerHTML = `
                <div onclick="app.chargerProjet(${p.id})" style="flex-grow:1; cursor:pointer;">
                    <strong>${p.nom}</strong>
                    <span>${p.date} - ${p.config.forme}</span>
                </div>
                <button class="btn-action" title="Partager / Exporter" onclick="app.exporterProjet(${p.id})" style="background:none; border:none; cursor:pointer; font-size:1.2em; margin-right:10px;">📤</button>
                <button class="btn-delete" title="Supprimer" onclick="app.supprimerProjet(${p.id})">🗑️</button>
            `;
            container.appendChild(div);
        });
    },

    chargerProjet: function(id) {
        const projets = JSON.parse(localStorage.getItem('kty_projets') || "[]");
        const p = projets.find(x => x.id === id);
        if(!p) return;
        document.getElementById('nomChantier').value = p.nom;
        document.getElementById('formeCloison').value = p.config.forme;
        document.getElementById('typeCloison').value = p.config.type;
        document.getElementById('hauteur').value = p.config.hauteur;
        document.getElementById('couleurRal').value = p.config.ral;
        document.getElementById('longueur').value = p.config.lA;
        document.getElementById('longueurB').value = p.config.lB;
        document.getElementById('longueurC').value = p.config.lC;
        document.getElementById('qtePortes').value = p.config.qtePortes;
        if(p.config.murs) { GLOBAL_STATE.configMurs = p.config.murs; } 
        else { GLOBAL_STATE.configMurs = { A: [], B: [], C: [] }; }
        if(p.config.mixte) { GLOBAL_STATE.compositionMixte = p.config.mixte; }
        else { GLOBAL_STATE.compositionMixte = []; }
        changerForme(); 
        adapterFormulaire();
        this.naviguer(3); 
    },

    supprimerProjet: function(id) {
        demanderConfirmation("Voulez-vous vraiment supprimer ce projet ?", 'rouge', () => {
            let projets = JSON.parse(localStorage.getItem('kty_projets') || "[]");
            projets = projets.filter(x => x.id !== id);
            localStorage.setItem('kty_projets', JSON.stringify(projets));
            this.chargerListeProjets();
            afficherNotification("🗑️ Projet supprimé");
        });
    },

    // --- IMPORT / EXPORT (NOUVEAU) ---
    exporterProjet: function(id) {
        const projets = JSON.parse(localStorage.getItem('kty_projets') || "[]");
        const projet = projets.find(p => p.id === id);
        
        if (!projet) {
            afficherNotification("Erreur : Projet introuvable.");
            return;
        }

        const dataStr = JSON.stringify(projet, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        const safeName = projet.nom.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        a.download = `KTY_${safeName}_${projet.id}.json`;
        document.body.appendChild(a);
        a.click();
        
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        afficherNotification("✅ Projet exporté !");
    },

    importerProjet: function(inputElement) {
        const file = inputElement.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const jsonContent = e.target.result;
                const importedProject = JSON.parse(jsonContent);

                if (!importedProject.config || !importedProject.nom) {
                    throw new Error("Format de fichier invalide.");
                }

                importedProject.id = Date.now();
                importedProject.nom = "[IMPORT] " + importedProject.nom;
                importedProject.date = new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString();

                let projets = JSON.parse(localStorage.getItem('kty_projets') || "[]");
                projets.push(importedProject);
                localStorage.setItem('kty_projets', JSON.stringify(projets));

                afficherNotification("✅ Projet importé avec succès !");
                AppManager.chargerListeProjets();
                
            } catch (err) {
                console.error(err);
                alert("Erreur lors de l'importation : Fichier invalide.");
            }
            inputElement.value = '';
        };
        reader.readAsText(file);
    }
};