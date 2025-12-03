import { GLOBAL_STATE } from './state.js';
import { toggleDisplay } from './utils.js';
import { CONSTANTS } from './constants.js';

// --- 1. FONCTIONS UTILITAIRES UI ---

export function getLargeurPorte() {
    let total = 0;
    const el = document.getElementById('doublePorte');
    // SÉCURITÉ : Si l'élément n'existe pas, on retourne une valeur par défaut
    if(!el) return 828; 
    
    let dble = el.checked;
    if (dble) {
        let val = document.getElementById('huisserieDoublePorteSelect').value;
        total = (val === 'surMesure') ? parseFloat(document.getElementById('largeurDoublePorteSurMesure').value)||0 : parseFloat(val);
    } else { 
        const typeP = document.getElementById('typePorte').value;
        let idSelect = (typeP === 'pleine') ? 'selectSimplePleine' : 'selectSimpleAlu';
        let val = document.getElementById(idSelect).value;
        total = (val === 'surMesure') ? parseFloat(document.getElementById('largeurPorteSurMesure').value)||0 : parseFloat(val);
    }
    return total;
}

export function getMurActif() {
    const radios = document.getElementsByName('murActif');
    for (let r of radios) { if (r.checked) return r.value; }
    return 'A';
}

export function genererInterfaceSensPortes() {
    const elQte = document.getElementById('qtePortes');
    if(!elQte) return; // Sécurité

    const qte = parseInt(elQte.value) || 0;
    const container = document.getElementById('containerSensPortes');
    if(!container) return;

    let anciennesValeurs = [];
    container.querySelectorAll('select').forEach(sel => anciennesValeurs.push(sel.value));

    container.innerHTML = '<label class="mb-5" style="display:block; font-weight:bold;">Sens d\'ouverture des portes :</label>';
    
    if (qte > 0) {
        for(let i = 0; i < qte; i++) {
            const val = anciennesValeurs[i] || 'droite'; 
            const div = document.createElement('div');
            div.className = "grid-2-col mt-5 align-center";
            div.style.borderBottom = "1px solid #eee";
            div.style.paddingBottom = "5px";
            div.innerHTML = `
                <span style="font-size:0.9em;">Porte n°${i+1} :</span>
                <select id="sensPorte_${i}" onchange="calculerInventaire()" style="margin-bottom:0;">
                    <option value="droite" ${val==='droite'?'selected':''}>Poussant Droit</option>
                    <option value="gauche" ${val==='gauche'?'selected':''}>Poussant Gauche</option>
                </select>
            `;
            container.appendChild(div);
        }
    } else {
        container.innerHTML += '<em style="color:#999; font-size:0.9em;">Aucune porte sélectionnée.</em>';
    }
}

// --- 2. GESTION DU MODE MIXTE ---

export function mettreAJourListeMixte() {
    const mur = getMurActif();
    const ul = document.getElementById('compositionModules');
    if(!ul) return;
    ul.innerHTML = "";
    let utilise = 0; const lp = getLargeurPorte();
    
    GLOBAL_STATE.configMurs[mur].forEach((m, i) => {
        let txt = m.type; let w = 0;
        if(m.type==='porte') { 
            let s = (m.sens === 'gauche') ? 'PG' : 'PD';
            txt=`PORTE (${lp}mm) - ${s}`; 
            w=lp+CONSTANTS.EPAISSEUR_PROFIL; 
        } 
        else { 
            w=m.largeur+CONSTANTS.EPAISSEUR_PROFIL; 
            txt=`${m.type} (${m.largeur.toFixed(1)}mm)`; 
        }
        utilise += w;
        ul.innerHTML += `<li>${i+1}. ${txt} <button onclick="retirerModuleMixte(${i})" style="width:auto; padding:2px 5px; background:red; margin-left:10px;">X</button></li>`;
    });
    
    let L = 0;
    if(mur==='A') L = parseFloat(document.getElementById('longueur').value)||0;
    if(mur==='B') L = parseFloat(document.getElementById('longueurB').value)||0;
    if(mur==='C') L = parseFloat(document.getElementById('longueurC').value)||0;
    
    const forme = document.getElementById('formeCloison').value;
    let deduction = 0;
    if(mur==='A') { deduction += 38; if(forme!=='droite') deduction += 90.5; else deduction += 38; }
    if(mur==='B') { deduction += 90.5; if(forme==='U') deduction += 90.5; else deduction += 38; }
    if(mur==='C') { deduction += 90.5 + 38; }
    
    const reste = (L - deduction) - utilise;
    
    const divSuggestions = document.getElementById('mixteSuggestions');
    const elType = document.getElementById('mixteTypeModule');
    const selectedType = elType ? elType.value : 'pleine';
    const btnAjouter = document.getElementById('btnAjouterMixte');
    
    if(btnAjouter) {
        if(reste <= 1) {
            btnAjouter.disabled = true;
            btnAjouter.style.backgroundColor = "#ccc";
            btnAjouter.title = "Le mur est plein";
        } else {
            btnAjouter.disabled = false;
            btnAjouter.style.backgroundColor = ""; 
            btnAjouter.title = "";
        }
    }

    if(divSuggestions && reste > 5 && selectedType !== 'porte') {
        divSuggestions.classList.remove('hidden');
        divSuggestions.style.display = 'block';
        
        let msg = `<strong>Espace restant : ${reste.toFixed(0)} mm</strong><br>`;
        const L_MOD_STD = 1178; 
        
        if (selectedType === 'vitree' || selectedType === 'vitreeSurAllege') {
            let nbModules = Math.ceil(reste / 1216);
            if (nbModules < 1) nbModules = 1;
            let largeurUnitaire = (reste / nbModules) - 38;
            if(largeurUnitaire < 50) { 
                nbModules--; 
                if(nbModules > 0) largeurUnitaire = (reste / nbModules) - 38;
            }
            if(nbModules > 0 && largeurUnitaire > 50) {
                msg += `<span style="color:#0056b3; font-size:0.9em;">Suggestion : Répartition esthétique (${nbModules} modules égaux).</span><br>`;
                msg += `<button onclick="remplirMixteEgal('${selectedType}', ${largeurUnitaire}, ${nbModules})" style="width:auto; padding:5px 10px; font-size:0.8em; margin-top:5px; background:#007bff; color:white; border:none; border-radius:4px; cursor:pointer;">Remplir avec ${nbModules}x ${largeurUnitaire.toFixed(0)}mm</button>`;
            }
        } 
        else {
            if (reste >= L_MOD_STD + 38) {
                let nb = Math.floor(reste / (L_MOD_STD + 38));
                msg += `<span style="color:#555; font-size:0.9em;">Tu peux poser ${nb} module(s) standard(s).</span><br>`;
                msg += `<button onclick="ajouterModuleStandardMixte(${L_MOD_STD})" style="width:auto; padding:5px 10px; font-size:0.8em; margin-top:5px; background:#17a2b8; color:white; border:none; border-radius:4px; cursor:pointer;">+ Ajouter Standard (${L_MOD_STD}mm)</button> `;
            }
            let wFill = reste - 38;
            if(wFill > 50) {
                 msg += `<button onclick="ajouterModuleStandardMixte(${wFill})" style="width:auto; padding:5px 10px; font-size:0.8em; margin-top:5px; background:#28a745; color:white; border:none; border-radius:4px; cursor:pointer;">+ Combler le reste (${wFill.toFixed(0)}mm)</button>`;
            }
        }
        divSuggestions.innerHTML = msg;
    } else if(divSuggestions) {
        divSuggestions.classList.add('hidden');
    }

    const elResume = document.getElementById('mixteResumeLargeur');
    if(elResume) elResume.innerHTML = `Mur ${mur} : Reste à combler : ${reste.toFixed(0)} mm`;
}

export function remplirMixteEgal(type, width, count) {
    const mur = getMurActif();
    let ha = parseFloat(document.getElementById('mixteHauteurAllege').value)||0;
    for(let k=0; k<count; k++) {
        GLOBAL_STATE.configMurs[mur].push({type: type, largeur: width, hAllege: ha});
    }
    mettreAJourListeMixte();
}

export function ajouterModuleStandardMixte(w) {
    document.getElementById('mixteLargeurModule').value = w;
    ajouterModuleMixte();
}

export function adapterFormulaireMixte() {
    const type = document.getElementById('mixteTypeModule').value;
    if(type === 'porte') {
        toggleDisplay('mixteLargeurContainer', false);
        toggleDisplay('mixteAllegeContainer', false);
        toggleDisplay('mixteSensContainer', true); 
    } else {
        toggleDisplay('mixteLargeurContainer', true);
        toggleDisplay('mixteAllegeContainer', (type === 'vitreeSurAllege'));
        toggleDisplay('mixteSensContainer', false);
    }
    mettreAJourListeMixte();
}

export function ajouterModuleMixte() {
    const mur = getMurActif();
    const type = document.getElementById('mixteTypeModule').value;
    const lp = getLargeurPorte(); 
    let L = 0;
    if(mur==='A') L = parseFloat(document.getElementById('longueur').value)||0;
    if(mur==='B') L = parseFloat(document.getElementById('longueurB').value)||0;
    if(mur==='C') L = parseFloat(document.getElementById('longueurC').value)||0;
    
    const forme = document.getElementById('formeCloison').value;
    let deduction = 0;
    if(mur==='A') { deduction += 38; if(forme!=='droite') deduction += 90.5; else deduction += 38; }
    if(mur==='B') { deduction += 90.5; if(forme==='U') deduction += 90.5; else deduction += 38; }
    if(mur==='C') { deduction += 90.5 + 38; }

    let utilise = 0;
    GLOBAL_STATE.configMurs[mur].forEach(m => { 
        utilise += (m.type==='porte') ? (getLargeurPorte()+CONSTANTS.EPAISSEUR_PROFIL) : (m.largeur+CONSTANTS.EPAISSEUR_PROFIL); 
    });
    
    let largeurAjout = 0; let nouvModule = {};
    if(type === 'porte') {
        if(parseFloat(document.getElementById('qtePortes').value) < 1) { alert("Mettez au moins 1 porte dans la config globale"); return; }
        largeurAjout = lp + CONSTANTS.EPAISSEUR_PROFIL; 
        
        // SÉCURITÉ : Vérifier si l'élément existe avant de lire sa valeur
        let elSens = document.getElementById('mixteSensPorte');
        let s = elSens ? elSens.value : 'droite';
        nouvModule = { type: 'porte', sens: s };
        
    } else {
        let w = parseFloat(document.getElementById('mixteLargeurModule').value)||0;
        if(w < CONSTANTS.L_MIN_MODULE) { alert(`Largeur min ${CONSTANTS.L_MIN_MODULE}mm`); return; }
        largeurAjout = w + CONSTANTS.EPAISSEUR_PROFIL;
        let ha = parseFloat(document.getElementById('mixteHauteurAllege').value)||0;
        nouvModule = { type: type, largeur: w, hAllege: ha };
    }
    if (utilise + largeurAjout > L - deduction + 1) { alert(`Dépassement ! Reste : ${(L-deduction-utilise).toFixed(0)}mm`); return; }
    GLOBAL_STATE.configMurs[mur].push(nouvModule);
    mettreAJourListeMixte();
}

export function retirerModuleMixte(idx) { 
    const mur = getMurActif(); 
    GLOBAL_STATE.configMurs[mur].splice(idx, 1); 
    mettreAJourListeMixte(); 
}

export function remplirAutomatiquement() {
    const mur = getMurActif();
    const type = document.getElementById('mixteTypeModule').value;
    if(type==='porte') return;
    
    let L = 0;
    if(mur==='A') L = parseFloat(document.getElementById('longueur').value)||0;
    if(mur==='B') L = parseFloat(document.getElementById('longueurB').value)||0;
    if(mur==='C') L = parseFloat(document.getElementById('longueurC').value)||0;
    
    const forme = document.getElementById('formeCloison').value;
    let deduction = 0;
    if(mur==='A') { deduction += 38; if(forme!=='droite') deduction += 90.5; else deduction += 38; }
    if(mur==='B') { deduction += 90.5; if(forme==='U') deduction += 90.5; else deduction += 38; }
    if(mur==='C') { deduction += 90.5 + 38; }
    
    let utilise = 0; const lp = getLargeurPorte();
    GLOBAL_STATE.configMurs[mur].forEach(m => utilise += (m.type==='porte' ? lp+CONSTANTS.EPAISSEUR_PROFIL : m.largeur+CONSTANTS.EPAISSEUR_PROFIL));
    
    let reste = (L - deduction) - utilise;
    if(reste < CONSTANTS.L_MIN_MODULE) return;
    const L_MOD_AXE = 1216; 
    
    if (type === 'pleine') {
        let nb = Math.floor(reste / L_MOD_AXE);
        let resteFinal = reste - (nb * L_MOD_AXE) - 38;
        if (resteFinal < 50 && nb > 0) { nb--; resteFinal += L_MOD_AXE; }
        let ha = parseFloat(document.getElementById('mixteHauteurAllege').value)||0;
        for(let k=0; k<nb; k++) GLOBAL_STATE.configMurs[mur].push({type: type, largeur: 1178, hAllege: ha});
        if (resteFinal >= 10) GLOBAL_STATE.configMurs[mur].push({type: type, largeur: resteFinal, hAllege: ha});
    } else {
        let nb = Math.ceil(reste / L_MOD_AXE);
        if(nb < 1) nb = 1;
        let wUnit = (reste / nb) - 38;
        if (wUnit < 50) { nb--; if(nb < 1) nb = 1; wUnit = (reste / nb) - 38; }
        let ha = parseFloat(document.getElementById('mixteHauteurAllege').value)||0;
        for(let k=0; k<nb; k++) { GLOBAL_STATE.configMurs[mur].push({type: type, largeur: wUnit, hAllege: ha}); }
    }
    mettreAJourListeMixte();
}

// --- 3. GESTION FORMULAIRE PRINCIPAL ---

export function adapterFormulaire() {
    const forme = document.getElementById('formeCloison').value;
    const configDepart = document.getElementById('configDepart').value;
    if (forme === 'L' && configDepart === '1') { toggleDisplay('divPosDepartL', true); } else { toggleDisplay('divPosDepartL', false); }

    // SÉCURITÉ : Vérifier si doublePorte existe
    const elDoublePorte = document.getElementById('doublePorte');
    const isDbleCheck = elDoublePorte ? elDoublePorte.checked : false;

    if (isDbleCheck) {
        const valDouble = document.getElementById('huisserieDoublePorteSelect').value;
        const typePorteSelect = document.getElementById('typePorte');
        if (valDouble.includes('_pleine')) { typePorteSelect.value = 'pleine'; } 
        else if (valDouble.includes('_alu')) { typePorteSelect.value = 'cadreAlu'; }
    }

    const type = document.getElementById('typeCloison').value;
    toggleDisplay('dimsMurB', (forme === 'L' || forme === 'U'));
    toggleDisplay('dimsMurC', (forme === 'U'));
    const isMixte = (type === 'mixte');
    toggleDisplay('selecteurMurActif', (isMixte && (forme !== 'droite')), 'flex'); 
    toggleDisplay('radioMurB', (forme === 'L' || forme === 'U'));
    toggleDisplay('radioMurC', (forme === 'U'));
    toggleDisplay('optionsVitrage', (type.includes('vitree') || isMixte));
    toggleDisplay('optionsAllege', (type === 'vitreeSurAllege' && !isMixte));
    toggleDisplay('optionsMixte', isMixte);
    
    const qteP = parseFloat(document.getElementById('qtePortes').value)||0;
    toggleDisplay('detailsPorte', (qteP > 0));
    
    genererInterfaceSensPortes();

    // SÉCURITÉ : Réutiliser la variable vérifiée
    const isDble = isDbleCheck;
    
    const typePorte = document.getElementById('typePorte').value;
    if (!isDble) {
        toggleDisplay('optionsSimplePortePleine', (typePorte === 'pleine'));
        toggleDisplay('optionsSimplePorteAlu', (typePorte !== 'pleine'));
        toggleDisplay('optionsDoublePorte', false);
    } else {
        toggleDisplay('optionsSimplePortePleine', false);
        toggleDisplay('optionsSimplePorteAlu', false);
        toggleDisplay('optionsDoublePorte', true);
    }
    toggleDisplay('divVitragePorte', (typePorte === 'cadreAlu'));
    let valSimple = 'standard';
    if (!isDble) {
        let idSelect = (typePorte === 'pleine') ? 'selectSimplePleine' : 'selectSimpleAlu';
        let el = document.getElementById(idSelect);
        if(el) valSimple = el.value;
    }
    toggleDisplay('largeurPorteSurMesure', (!isDble && valSimple === 'surMesure'));
    const ldp = document.getElementById('huisserieDoublePorteSelect').value;
    toggleDisplay('largeurDoublePorteSurMesure', (isDble && ldp === 'surMesure'));
    const hp = document.getElementById('hauteurPorte').value;
    
    toggleDisplay('optionsImposte', (hp === '2100'));
    
    // --- C'EST ICI QUE ÇA PLANTAIT ---
    // SÉCURITÉ : On vérifie si la case existe avant de lire .checked
    const elImposte = document.getElementById('imposteModules');
    const imp = elImposte ? elImposte.checked : false; // Si n'existe pas, on considère faux
    
    toggleDisplay('optionsImposteModules', imp);
    
    if(isMixte) { mettreAJourListeMixte(); adapterFormulaireMixte(); }
}

export function changerForme() {
    const f = document.getElementById('formeCloison').value;
    if(f === 'L' || f === 'U') { document.getElementById('typeCloison').value = 'mixte'; }
    adapterFormulaire();
}
