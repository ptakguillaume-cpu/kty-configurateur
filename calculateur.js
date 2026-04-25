import { GLOBAL_STATE } from './state.js';
import { CONSTANTS } from './constants.js';
import { getLargeurPorte } from './uiManager.js';
import { dessinerSceneGlobale } from './engine3d.js';
import * as THREE from 'three';

// --- NOUVELLE FONCTION TECHNIQUE ISSUE DES FICHES ---
function getEntreMontants(largeurVantail, typePorte) {
    // Règle issue des fiches 11680.jpg et 11682.jpg
    // Pour les portes standards (828 ou 830), l'entre montants est de 880mm
    if (largeurVantail >= 820 && largeurVantail <= 840) {
        return 880;
    }
    // Pour les autres dimensions, on garde une logique de calcul sécurisée (+52mm)
    // ou on pourra affiner avec les autres lignes du tableau plus tard
    return largeurVantail + 52; 
}

export async function calculerInventaire() {
    let inv = {};
    const add = (n, q) => { if(q>0) inv[n] = (inv[n]||0) + q; };
    
    let htmlList = "";
    let chutesUtilisables = []; let besoinsTraverses = []; 
    let chutesCJUtilisables = []; let besoinsCJ = [];
    let totalPortes = 0;
    let totalMetrageJointsByType = {}; 
    let qteEquerresTraverse = 0;
    let totalBarresParcloses = 0;
    
    const forme = document.getElementById('formeCloison').value;
    const qteDepartsMurs = parseInt(document.getElementById('configDepart').value, 10);
    const typeGlob = document.getElementById('typeCloison').value;
    const H = parseFloat(document.getElementById('hauteur').value);
    const H_IMPOSTE = parseFloat(document.getElementById('hauteurImposte').value) || 2100;
    const hasImposteModules = document.getElementById('imposteModules').checked;
    const couleurRal = document.getElementById('couleurRal').value;
    
    const BARRES_DISPO = [2500, 2700, 3050, 3250, 5750];
    let longueurBarreRetenue = 5750; 
    for (let l of BARRES_DISPO) { if (l >= H) { longueurBarreRetenue = l; break; } }
    
    let hNom = `${longueurBarreRetenue}mm`;
    let nomMontant = `Montants (H. ${hNom})`;
    let nomMontantSpecial = `Montant Spécial (H. ${hNom})`;
    let nomDepart = `Départ (H. ${hNom})`;
    let nomCJ_Vertical = `Couvre joints (H. ${hNom})`;
    let nomCJ_Horizontal = "Couvre joints H.2500mm (horizontaux)"; 
    let nomTraverseBarre = "Montant (2500mm) traverses"; 
    
    let nbDeparts = qteDepartsMurs; 
    let nbAngles = (forme==='L') ? 1 : (forme==='U' ? 2 : 0);

    let murs = ['A']; 
    if(forme==='L') murs.push('B'); 
    if(forme==='U') { murs.push('B'); murs.push('C'); }

    // ==========================================
    // 2. LES "TIROIRS" D'INTELLIGENCE MÉTIER
    // ==========================================

    function calculerModules(m, v1, v2, useParcloseAvecJoint) {
        let nom = m.type === 'pleine' ? 'Module plein' : m.type === 'vitree' ? 'Module vitré' : 'Module allège';
        htmlList += `<li>${nom} (${m.largeur.toFixed(0)}mm)</li>`;
        add('Calles de lisse', m.type==='pleine'?2:(m.type==='vitree'?6:4));
        
        let barresPourCeModule = 0;
        if (m.type === 'vitree') {
            barresPourCeModule += 2;
            let morceauxParBarre = (m.largeur <= 590) ? 5 : (m.largeur <= 740) ? 4 : (m.largeur <= 990) ? 3 : 2;
            barresPourCeModule += (2 / morceauxParBarre);
        } else if (m.type === 'vitreeSurAllege') {
            barresPourCeModule += 2;
        }

        if ((m.type === 'vitree' || m.type === 'vitreeSurAllege') && !useParcloseAvecJoint) {
            let hV = H - (CONSTANTS.EPAISSEUR_PROFIL*2);
            if(m.type === 'vitreeSurAllege') { let ha = m.hAllege || 1100; hV = H - ha - CONSTANTS.EPAISSEUR_PROFIL; }
            let metrage = (hV * 2) + (m.largeur * 2);
            totalMetrageJointsByType[v1] = (totalMetrageJointsByType[v1] || 0) + metrage;
            if(v2 !== 'aucun') totalMetrageJointsByType[v2] = (totalMetrageJointsByType[v2] || 0) + metrage;
        }

        let nbTrav = (m.type === 'vitreeSurAllege') ? 1 : 0;
        if(hasImposteModules && H > H_IMPOSTE + 38) {
            nbTrav++;
            let typeImp = document.getElementById('typeImposte') ? document.getElementById('typeImposte').value : 'vitree';
            if (typeImp === 'vitree') {
                let hVide = H - H_IMPOSTE - 38;
                barresPourCeModule += (hVide > 1000) ? 2 : 1; 
            }
        }
        totalBarresParcloses += barresPourCeModule;
        if(nbTrav > 0) {
            qteEquerresTraverse += nbTrav * 2; 
            for(let k=0; k<nbTrav; k++) { besoinsTraverses.push(m.largeur); besoinsCJ.push(m.largeur); besoinsCJ.push(m.largeur); }  
        }
    }

    function calculerToutesLesPortes(nomParcloseDefaut) {
        if (totalPortes === 0) return;
        let lp = getLargeurPorte();
        let isD = document.getElementById('doublePorte').checked;
        let tp = document.getElementById('typePorte').value;
        let hp = document.getElementById('hauteurPorte').value;
        let vitragePorteVal = document.getElementById('typeVitragePorte').value;

        // On définit la hauteur réelle pour le libellé
        let hLabel = (hp === 'touteHauteur') ? Math.round(H) : hp;

        let nomH = isD ? `Huisserie Double (${lp}x${hLabel}mm)` : `Huisserie (${lp}x${hLabel}mm)`;
        nomH += (tp === 'cadreAlu') ? " (Cadre Alu)" : " (Pleine)";
        add(nomH, totalPortes);
        
        let nbPaumellesParVantail = (hp === 'touteHauteur' || (hp === '2100' && tp === 'cadreAlu' && vitragePorteVal === 'isolant')) ? 4 : 3;
        add(isD ? `Kit Paumelles (jeu de ${nbPaumellesParVantail*2})` : `Kit Paumelles (jeu de ${nbPaumellesParVantail})`, totalPortes);
        
        if(tp === 'cadreAlu') { 
            add('Béquilles', totalPortes);
            if(vitragePorteVal === 'isolant') { 
                let qteExtras = (isD ? 2 : 1) * totalPortes; 
                add('Plinthe automatique', qteExtras); add('Vitrage isolant', qteExtras); 
            }
            add(isD ? `Vantail Double Cadre Alu ${lp}x${hLabel}mm` : `Vantail Cadre Alu ${lp}x${hLabel}mm`, totalPortes);
        }

        if (hp === '2100') {
             for(let k=0; k < totalPortes; k++) { besoinsCJ.push(lp); besoinsCJ.push(lp); }
             if(hasImposteModules && H > H_IMPOSTE+38 && H_IMPOSTE > 2100) {
                 for(let k=0; k < totalPortes; k++) { besoinsTraverses.push(lp); besoinsCJ.push(lp); besoinsCJ.push(lp); }
                 qteEquerresTraverse += totalPortes * 2; 
             }
        } 
        else if (hp === 'touteHauteur' && H > 3000) {
             for(let k=0; k < totalPortes; k++) { besoinsTraverses.push(lp); besoinsCJ.push(2500); }
        }
    }

    // ==========================================
    // 3. LE CHEF D'ORCHESTRE (Exécution)
    // ==========================================

    if (typeGlob !== 'mixte') {
        GLOBAL_STATE.configMurs = { A:[], B:[], C:[] };
        murs.forEach(id => {
            let L = (id==='A') ? parseFloat(document.getElementById('longueur').value) : (id==='B') ? parseFloat(document.getElementById('longueurB').value) : parseFloat(document.getElementById('longueurC').value);
            let deduction = 0;
            if(id==='A') deduction += (forme !== 'droite') ? 90.5 + 38 : 38 * 2;
            if(id==='B') deduction += (forme === 'U') ? 90.5 * 2 : 90.5 + 38;
            if(id==='C') deduction += 90.5 + 38;

            let dispo = L - deduction;
            
            if(id==='A') {
                let qP = parseFloat(document.getElementById('qtePortes').value)||0;
                let lP = getLargeurPorte();
                let tP = document.getElementById('typePorte').value;
                for(let k=0; k<qP; k++) { 
                    let sensChoisi = document.getElementById('sensPorte_' + k) ? document.getElementById('sensPorte_' + k).value : 'droite';
                    GLOBAL_STATE.configMurs[id].push({type:'porte', sens: sensChoisi}); 
                    // --- CORRECTION ISSUE DES FICHES : On déduit l'entre montants réel ---
                    dispo -= getEntreMontants(lP, tP); 
                }
            }
            
            if(dispo > 5) {
                const L_MOD_AXE = 1216; 
                if (typeGlob === 'pleine') {
                    let nb = Math.floor(dispo / L_MOD_AXE);
                    let resteLargeur = dispo - (nb * L_MOD_AXE);
                    for(let k=0; k<nb; k++) GLOBAL_STATE.configMurs[id].push({type:typeGlob, largeur:1178});
                    if (resteLargeur > 10) GLOBAL_STATE.configMurs[id].push({type:typeGlob, largeur:resteLargeur-38});
                } else {
                    let nb = Math.ceil(dispo / L_MOD_AXE);
                    let wUnit = (dispo / nb) - 38;
                    for(let k=0; k<nb; k++) GLOBAL_STATE.configMurs[id].push({type:typeGlob, largeur:wUnit});
                }
            }
        });
    }

    let nbMontantsStandard = 0; let nbMontantsSpeciaux = 0;
    let v1 = document.getElementById('typeVitrage1').value;
    let v2 = document.getElementById('typeVitrage2').value;
    let isStandardRal = (['9016','7016','9005','anodise'].includes(couleurRal));
    let useParcloseAvecJoint = (isStandardRal && ['33.2','44.2'].includes(v1));
    let nomParcloseDefaut = ((v2 === 'aucun') ? 'Parclose SV' : 'Parclose DV') + (useParcloseAvecJoint ? ' (avec joint intégré)' : ' (sans joint)') + " (Barre 3000mm)";

    murs.forEach(id => {
        htmlList += `<li style="background:#f4f4f4; margin-top:5px; padding:2px 5px;"><strong>Cloison ${id} :</strong></li>`;
        let modules = GLOBAL_STATE.configMurs[id];
        
        modules.forEach((m, i) => {
            if(m.type==='porte') { 
                totalPortes++;
                let lp = getLargeurPorte();
                let hp = document.getElementById('hauteurPorte').value;
                let hLabel = (hp === 'touteHauteur') ? Math.round(H) : hp;
                htmlList += `<li>Huisserie (${lp}x${hLabel}mm) - ${m.sens==='gauche'?'PG':'PD'}</li>`; 
            } else {
                calculerModules(m, v1, v2, useParcloseAvecJoint);
            }
            // Calcul montants
            if (i < modules.length - 1) {
                if (forme !== 'droite' && ((id === 'A' && i === modules.length - 2) || (id === 'B' && i === 0))) nbMontantsSpeciaux++; 
                else nbMontantsStandard++;
            }
        });
    });

    calculerToutesLesPortes(nomParcloseDefaut);

    // --- FINITIONS & EQUERRES ---
    let nbCapots = 0;
    let posDep = document.querySelector('input[name="posDepartL"]:checked')?.value || 'A';
    if (qteDepartsMurs === 0 || (forme === 'L' && qteDepartsMurs === 1 && posDep === 'B')) { nbCapots++; nbMontantsStandard++; }
    if (qteDepartsMurs === 0 || (qteDepartsMurs === 1 && (forme === 'droite' || (forme === 'L' && posDep === 'A') || forme === 'U'))) { nbCapots++; nbMontantsStandard++; }

    add(nomMontant, (longueurBarreRetenue === 5750 && H <= 2875) ? Math.ceil(nbMontantsStandard / 2) : nbMontantsStandard);
    add(nomMontantSpecial, (longueurBarreRetenue === 5750 && H <= 2875) ? Math.ceil(nbMontantsSpeciaux / 2) : nbMontantsSpeciaux);
    add(nomDepart, nbDeparts);
    if(nbAngles>0) add(`Angle Carré (H. ${hNom})`, nbAngles);
    if(nbCapots>0) add('Capots de finition (pour Montant)', nbCapots);
    
    let totVert = nbMontantsStandard + nbMontantsSpeciaux + nbDeparts + nbAngles; 
    add(nomCJ_Vertical, totVert*2);
    add('Boîte de Clips couvre joints (100u)', Math.ceil(totVert*2*8/100));
    
    let Ltot = 0;
    murs.forEach(id => Ltot += parseFloat(document.getElementById('longueur'+(id==='A'?'':id)).value));
    add('Lisses (barre 3000mm)', Math.ceil(Ltot*2/3000));
    add('Équerres (total)', (nbDeparts * 4) + ((nbMontantsStandard + nbMontantsSpeciaux - nbCapots) * 2) + qteEquerresTraverse + (nbAngles * 4));

    if (totalBarresParcloses > 0) add(nomParcloseDefaut, Math.ceil(totalBarresParcloses));
    
    GLOBAL_STATE.derniereInventaire = inv;
    let keys = Object.keys(inv).sort();
    const buildTable = (title, filter) => {
        let sub = keys.filter(filter);
        if(sub.length === 0) return '';
        let t = `<h4>${title}</h4><table><thead><tr><th>Pièce</th><th>Quantité</th></tr></thead><tbody>`;
        sub.forEach(k => t += `<tr><td>${k}</td><td>${inv[k]} u.</td></tr>`);
        return t + `</tbody></table>`;
    };

    document.getElementById('tableauTotal').innerHTML = buildTable('1. Ossature', k => k.includes('Lisse') || k.includes('Départ') || k.includes('Montant') || k.includes('Angle') || k.includes('Capot') || k.includes('Équerre')) + buildTable('2. Vitrage & Parcloses', k => k.includes('Parclose') || k.includes('Joint')) + buildTable('3. Huisserie', k => k.includes('Huisserie') || k.includes('Vantail') || k.includes('Kit') || k.includes('Béquille'));
    document.getElementById('listePieces').innerHTML = htmlList;
    
    await dessinerSceneGlobale(murs, forme, H, GLOBAL_STATE.configMurs);
}
