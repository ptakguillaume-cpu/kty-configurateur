import { GLOBAL_STATE } from './state.js';
import { CONSTANTS } from './constants.js';
import { getLargeurPorte } from './uiManager.js';
import { dessinerSceneGlobale } from './engine3d.js';
import * as THREE from 'three'; 
import { getDonneesPorte } from './portes.js';
import { LEXIQUE } from './lexique.js'; // <-- NOUVEL IMPORT

export async function calculerInventaire() {
    let inv = {};
    const add = (n, q) => { if(q>0) inv[n] = (inv[n]||0) + q; };
    function ajouterAuStock(nom, quantite) { if (quantite > 0) { inv[nom] = (inv[nom] || 0) + quantite; } }
    
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
    
    let nbDeparts = qteDepartsMurs; 
    let nbAngles = (forme==='L') ? 1 : (forme==='U' ? 2 : 0);
    if (qteDepartsMurs === 0) nbDeparts = 0;

    let murs = ['A']; 
    if(forme==='L') murs.push('B'); 
    if(forme==='U') { murs.push('B'); murs.push('C'); }

    function calculerModules(m, v1, v2, useParcloseAvecJoint) {
        let nom = m.type === 'pleine' ? 'Module plein' : m.type === 'vitree' ? 'Module vitré' : 'Module allège';
        htmlList += `<li>${nom} (${m.largeur.toFixed(0)}mm)</li>`;
        add(LEXIQUE.CALLES_LISSE, m.type==='pleine'?2:(m.type==='vitree'?6:4));
        
        let barresPourCeModule = 0;
        if (m.type === 'vitree') {
            barresPourCeModule += 2; 
            let morceauxParBarre = (m.largeur <= 590) ? 5 : (m.largeur <= 740) ? 4 : (m.largeur <= 990) ? 3 : 2;
            barresPourCeModule += (2 / morceauxParBarre);
        } else if (m.type === 'vitreeSurAllege') { barresPourCeModule += 2; }

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
                if (!useParcloseAvecJoint) {
                    let metrageImp = (hVide * 2) + (m.largeur * 2);
                    totalMetrageJointsByType[v1] = (totalMetrageJointsByType[v1] || 0) + metrageImp;
                    if(v2 !== 'aucun') totalMetrageJointsByType[v2] = (totalMetrageJointsByType[v2] || 0) + metrageImp;
                }
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
        
        let elCoulissante = document.getElementById('isCoulissante');
        let isCoulissante = elCoulissante ? elCoulissante.checked : false;

        let donnees = getDonneesPorte(lp, tp, isCoulissante);
        let hVantail = (hp === 'touteHauteur') ? Math.round(H) : donnees.hauteurVantailStandard; 
        let hHuisserieLabel = (hp === 'touteHauteur') ? Math.round(H) : "2100"; 

        if (isCoulissante) {
            add(`Ouverture / ${donnees.nomDevisHuisserie} x ${hHuisserieLabel} mm`, totalPortes);
            add(`${donnees.nomDevisVantail} ${lp} x ${hVantail} mm`, totalPortes);
            add(LEXIQUE.KIT_RAIL(donnees.isBois ? 'bois' : 'alu'), totalPortes);
            
            // Les pièces de structure exactes
            add(LEXIQUE.CAPOT_COULISSANT, 3 * totalPortes);
            add(LEXIQUE.MONTANT_TRAVERSE, 1 * totalPortes);
            add(LEXIQUE.RENFORT_COULISSANT, 1 * totalPortes);
            
            // --- AJOUT DES 6 ÉQUERRES (2 traverse + 4 renfort) ---
            qteEquerresTraverse += 6 * totalPortes;
            // ------------------------------------------------------

            if(!donnees.isBois) { add(LEXIQUE.POIGNEE_CUVETTE, totalPortes); }
        } 
        else {
            let nomH = isD ? `${LEXIQUE.HUISSERIE_DOUBLE} ${donnees.largeurEntreMontants} x ${hHuisserieLabel} mm` : `${donnees.nomDevisHuisserie} x ${hHuisserieLabel} mm`;
            nomH += (tp === 'cadreAlu') ? " (Cadre Alu)" : " (Pleine)";
            add(nomH, totalPortes);
            
            let nbPaumellesParVantail = (hp === 'touteHauteur' || (hp === '2100' && tp === 'cadreAlu' && vitragePorteVal === 'isolant')) ? 4 : 3;
            add(LEXIQUE.KIT_PAUMELLES(isD ? nbPaumellesParVantail*2 : nbPaumellesParVantail), totalPortes);
            
            if(tp === 'cadreAlu' || tp === 'pleine') { 
                add(LEXIQUE.BEQUILLES, totalPortes);
                if(vitragePorteVal === 'isolant' && tp === 'cadreAlu') { 
                    let qteExtras = (isD ? 2 : 1) * totalPortes; 
                    add(LEXIQUE.PLINTHE, qteExtras); add(LEXIQUE.VITRAGE_ISOLANT, qteExtras); 
                }
                if(isD) { 
                     add(`Porte Double ${donnees.nomDevisVantail} ${lp} x ${hVantail} mm`, totalPortes); 
                } else { 
                     add(`${donnees.nomDevisVantail} ${lp} x ${hVantail} mm`, totalPortes); 
                }
            }
            if (hp === '2100') {
                 for(let k=0; k < totalPortes; k++) { besoinsCJ.push(lp); besoinsCJ.push(lp); }
                 if(hasImposteModules && H > H_IMPOSTE+38 && H_IMPOSTE > 2100) {
                     for(let k=0; k < totalPortes; k++) { besoinsTraverses.push(lp); besoinsCJ.push(lp); besoinsCJ.push(lp); }
                     qteEquerresTraverse += totalPortes * 2; 
                 }
                 if(H > 2100 + 38) { 
                     let typeImp = document.getElementById('typeImposte').value;
                     if(typeImp === 'vitree') { 
                         let nbParclosesBase = (H > 2600) ? 2 : 1;
                         let qteParcloseImposte = (isD ? (nbParclosesBase * 2) : nbParclosesBase) * totalPortes; 
                         add(nomParcloseDefaut, qteParcloseImposte);
                     }
                 }
            } 
            else if (hp === 'touteHauteur') {
                 let selectTTH = document.getElementById('typeTraverseTTH');
                 let typeTTH = selectTTH ? selectTTH.value : 'sansTraverse';
                 if (H > 3000 || typeTTH === 'avecTraverse') {
                     for(let k=0; k < totalPortes; k++) { besoinsTraverses.push(lp); besoinsCJ.push(2500); }
                 }
                 if (H > 3000) {
                     let typeImp = document.getElementById('typeImposte').value;
                     if(typeImp === 'vitree') { 
                         let qteParcloseImposte = (isD ? 4 : 2) * totalPortes; 
                         add(nomParcloseDefaut, qteParcloseImposte);
                     }
                 }
            }
        }
    }

    if (typeGlob !== 'mixte') {
        GLOBAL_STATE.configMurs = { A:[], B:[], C:[] };
        murs.forEach(id => {
            let L = (id==='A') ? parseFloat(document.getElementById('longueur').value) : (id==='B') ? parseFloat(document.getElementById('longueurB').value) : parseFloat(document.getElementById('longueurC').value);
            let deduction = 0;
            if(id==='A') { deduction += 38; deduction += (forme !== 'droite') ? 90.5 : 38; }
            if(id==='B') { deduction += 90.5; deduction += (forme === 'U') ? 90.5 : 38; }
            if(id==='C') { deduction += 90.5 + 38; }

            let dispo = L - deduction;
            
            if(id==='A') {
                let qP = parseFloat(document.getElementById('qtePortes').value)||0;
                let lP = getLargeurPorte();
                let tP = document.getElementById('typePorte').value;
                for(let k=0; k<qP; k++) { 
                    let elSens = document.getElementById('sensPorte_' + k);
                    GLOBAL_STATE.configMurs[id].push({type:'porte', sens: elSens ? elSens.value : 'droite'}); 
                    let elCoulissante = document.getElementById('isCoulissante');
                    dispo -= getDonneesPorte(lP, tP, elCoulissante ? elCoulissante.checked : false).largeurEntreMontants; 
                }
            }
            
            if(dispo > 5) {
                const L_MOD_AXE = 1216; 
                if (typeGlob === 'pleine') {
                    let nb = Math.floor(dispo / L_MOD_AXE);
                    let resteLargeur = dispo - (nb * L_MOD_AXE);
                    let largeurDernierPanneau = resteLargeur - 38;
                    if (largeurDernierPanneau < 100 && nb > 0) { nb--; largeurDernierPanneau += L_MOD_AXE; }
                    for(let k=0; k<nb; k++) GLOBAL_STATE.configMurs[id].push({type:typeGlob, largeur:1178});
                    if (largeurDernierPanneau > 10) { GLOBAL_STATE.configMurs[id].push({type:typeGlob, largeur:largeurDernierPanneau}); }
                } else {
                    let nb = Math.ceil(dispo / L_MOD_AXE);
                    if(nb < 1) nb = 1;
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
    let useParcloseAvecJoint = (isStandardRal && ['33.2','44.2'].includes(v1) && ['aucun','33.2','44.2'].includes(v2));
    let nomParcloseDefaut = ((v2 === 'aucun') ? 'Parclose SV' : 'Parclose DV') + (useParcloseAvecJoint ? ' (avec joint intégré)' : ' (sans joint)') + " (Barre 3000mm)";

    murs.forEach(id => {
        htmlList += `<li style="background:#f4f4f4; margin-top:5px;"><strong>Cloison ${id} :</strong></li>`;
        let modulesDuMur = GLOBAL_STATE.configMurs[id];
        let nbModules = modulesDuMur.length;
        
        if (nbModules > 0) {
            for (let i = 0; i < nbModules - 1; i++) {
                let isSpecial = false;
                if (forme !== 'droite') {
                    if (id === 'A' && i === nbModules - 2) isSpecial = true; 
                    if (id === 'B' && i === 0) isSpecial = true; 
                    if (id === 'C' && i === 0) isSpecial = true; 
                }
                if (isSpecial) nbMontantsSpeciaux++; else nbMontantsStandard++;
            }
        }

        modulesDuMur.forEach(m => {
            if(m.type==='porte') { 
                totalPortes++; 
                let hp = document.getElementById('hauteurPorte').value;
                let hLabel = (hp === 'touteHauteur') ? Math.round(H) : "2100";
                let elCoulissante = document.getElementById('isCoulissante');
                let isCoul = elCoulissante ? elCoulissante.checked : false;
                let donneesH = getDonneesPorte(getLargeurPorte(), document.getElementById('typePorte').value, isCoul);
                
                if (isCoul) {
                    htmlList += `<li>Passage libre coulissant ${donneesH.largeurEntreMontants}x${hLabel}mm</li>`;
                } else {
                    let sensTxt = (m.sens === 'gauche') ? 'PG' : 'PD';
                    htmlList += `<li>Huisserie passage ${donneesH.largeurEntreMontants}x${hLabel}mm - ${sensTxt}</li>`; 
                }
            } else {
                calculerModules(m, v1, v2, useParcloseAvecJoint); 
            }
        });
    });

    calculerToutesLesPortes(nomParcloseDefaut); 

    if (totalBarresParcloses > 0) add(nomParcloseDefaut, Math.ceil(totalBarresParcloses));

    let nbCapots = 0;
    let positionDepartUnique = document.querySelector('input[name="posDepartL"]:checked') ? document.querySelector('input[name="posDepartL"]:checked').value : 'A';
    if (qteDepartsMurs === 0 || (forme === 'L' && qteDepartsMurs === 1 && positionDepartUnique === 'B')) { nbCapots++; if (GLOBAL_STATE.configMurs['A'].length === 1) nbMontantsSpeciaux++; else nbMontantsStandard++; }
    if (qteDepartsMurs === 0 || (qteDepartsMurs === 1 && (forme === 'droite' || (forme === 'L' && positionDepartUnique === 'A') || forme === 'U'))) { nbCapots++; let murFinId = (forme === 'U') ? 'C' : (forme === 'L' ? 'B' : 'A'); if (GLOBAL_STATE.configMurs[murFinId].length === 1) nbMontantsSpeciaux++; else nbMontantsStandard++; }

    ajouterAuStock(LEXIQUE.MONTANT_STD(hNom), (longueurBarreRetenue === 5750 && H <= 2875) ? Math.ceil(nbMontantsStandard / 2) : nbMontantsStandard);
    ajouterAuStock(LEXIQUE.MONTANT_SPEC(hNom), (longueurBarreRetenue === 5750 && H <= 2875) ? Math.ceil(nbMontantsSpeciaux / 2) : nbMontantsSpeciaux);

    add(LEXIQUE.DEPART(hNom), nbDeparts);
    if(nbAngles>0) add(LEXIQUE.ANGLE(hNom), nbAngles);
    if(nbCapots>0) add(LEXIQUE.CAPOT_MONTANT, nbCapots);
    
    let totVert = nbMontantsStandard + nbMontantsSpeciaux + nbDeparts + nbAngles; 
    add(LEXIQUE.CJ_VERT(hNom), totVert*2);
    add(LEXIQUE.CLIPS_CJ, Math.ceil(totVert*2*8/100));
    
    let totalEclisses = 0; let Ltot = 0;
    murs.forEach(id => {
        let L = (id==='A') ? parseFloat(document.getElementById('longueur').value) : (id==='B') ? parseFloat(document.getElementById('longueurB').value) : parseFloat(document.getElementById('longueurC').value);
        Ltot += L;
        let nbBarres = Math.ceil(L / 3000);
        totalEclisses += ((nbBarres > 0) ? nbBarres - 1 : 0) * 2;
    });
    add(LEXIQUE.ECLISSES, totalEclisses);
    add(LEXIQUE.LISSES, Math.ceil(Ltot*2/3000));

    for (const [vitrage, metrageTotal] of Object.entries(totalMetrageJointsByType)) {
        if (metrageTotal > 0) {
            let epaisseurJoint = (vitrage === '44.2') ? '8mm' : (vitrage === '55.2') ? '10mm' : (vitrage === '66.2') ? '12mm' : '6mm';
            add(LEXIQUE.JOINT(epaisseurJoint, vitrage), Math.ceil(metrageTotal / 50000));
        }
    }
    
    let montantsIntermediaires = (nbMontantsStandard + nbMontantsSpeciaux) - nbCapots;
    let qteEq = (nbDeparts * 4) + (montantsIntermediaires * 2) + qteEquerresTraverse; 
    if (nbAngles > 0) { qteEq += nbAngles * 4; }
    add(LEXIQUE.EQUERRES, qteEq);

    let barresNeuvesUtilisees = 0; let nbChutesRecyclees = 0; let chutesDe2500_Montants = [];
    besoinsTraverses.sort((a, b) => b - a); chutesUtilisables.sort((a, b) => b - a);
    besoinsTraverses.forEach(largeurRequise => {
        let comble = false;
        for(let i=0; i < chutesUtilisables.length; i++) {
            if (chutesUtilisables[i] >= largeurRequise) { let reste = chutesUtilisables[i] - largeurRequise; chutesUtilisables.splice(i, 1); if (reste > 50) chutesUtilisables.push(reste); comble = true; nbChutesRecyclees++; break; }
        }
        if (!comble) { chutesDe2500_Montants.sort((a, b) => b - a); for(let i=0; i < chutesDe2500_Montants.length; i++) { if (chutesDe2500_Montants[i] >= largeurRequise) { chutesDe2500_Montants[i] -= largeurRequise; comble = true; break; } } }
        if (!comble) { barresNeuvesUtilisees++; let resteNeuve = 2500 - largeurRequise; if (resteNeuve > 50) chutesDe2500_Montants.push(resteNeuve); }
    });
    if (barresNeuvesUtilisees > 0) add(LEXIQUE.MONTANT_TRAVERSE, barresNeuvesUtilisees);
    if (nbChutesRecyclees > 0) add(LEXIQUE.CHUTES_TRAVERSES, nbChutesRecyclees);
    
    let finalBarresCJNeuves = 0; let finalNbChutesCJRecyclees = 0; let chutesDe2500 = []; 
    besoinsCJ.sort((a, b) => b - a); chutesCJUtilisables.sort((a, b) => b - a);
    besoinsCJ.forEach(largeurRequise => {
        let comble = false;
        for(let i=0; i < chutesCJUtilisables.length; i++) {
            if (chutesCJUtilisables[i] >= largeurRequise) { let reste = chutesCJUtilisables[i] - largeurRequise; chutesCJUtilisables.splice(i, 1); if (reste > 50) chutesCJUtilisables.push(reste); comble = true; finalNbChutesCJRecyclees++; break; }
        }
        if (!comble) { chutesDe2500.sort((a, b) => b - a); for(let i=0; i < chutesDe2500.length; i++) { if (chutesDe2500[i] >= largeurRequise) { chutesDe2500[i] -= largeurRequise; comble = true; break; } } }
        if (!comble) { finalBarresCJNeuves++; let resteNeuve = 2500 - largeurRequise; if(resteNeuve > 50) chutesDe2500.push(resteNeuve); }
    });
    if (finalBarresCJNeuves > 0) add(LEXIQUE.CJ_HORIZ, finalBarresCJNeuves);
    if (finalNbChutesCJRecyclees > 0) add(LEXIQUE.CHUTES_CJ, finalNbChutesCJRecyclees);

    GLOBAL_STATE.derniereInventaire = inv;

    let keys = Object.keys(inv).sort();
    
    // Rangement dans les tableaux
    let ossatureKeys = keys.filter(k => k.includes('Lisse') || k.includes('Départ') || k.includes('Montants') || k.includes('Montant') || k.includes('Angle') || k.includes('Chute') || k.includes('Capot') || k.includes('Équerre') || k.includes('éclisse') || k.includes('Clips') || k.includes('Calle'));
    let parcloseKeys = keys.filter(k => k.includes('Parclose') || k.includes('Joint') || k.includes('Vitrage'));
    let huisserieKeys = keys.filter(k => k.includes('Habillage') || k.includes('Ouverture') || k.includes('Huisserie') || k.includes('Porte') || k.includes('Vantail') || k.includes('Paumelles') || k.includes('Béquilles') || k.includes('Kit') || k.includes('Rail') || k.includes('Poignée') || k.includes('Plinthe'));
    let accessoiresKeys = keys.filter(k => !ossatureKeys.includes(k) && !parcloseKeys.includes(k) && !huisserieKeys.includes(k));

    const buildTable = (title, arr) => {
        if(arr.length === 0) return '';
        let t = `<h4>${title}</h4><table><thead><tr><th>Pièce</th><th>Quantité</th></tr></thead><tbody>`;
        arr.forEach(k => { if(inv[k] > 0) t += `<tr><td>${k}</td><td>${inv[k]} u.</td></tr>`; });
        return t + `</tbody></table>`;
    };

    let tbl = buildTable('1. Ossature', ossatureKeys) + buildTable('2. Vitrage & Parcloses', parcloseKeys) + buildTable('3. Accessoires', accessoiresKeys) + buildTable('4. Huisserie & Portes', huisserieKeys);
    
    document.getElementById('tableauTotal').innerHTML = tbl;
    
    const zoneDownload = document.getElementById('zoneTelechargEMENT');
    if (zoneDownload) { zoneDownload.classList.remove('hidden'); zoneDownload.style.display = 'block'; }
    
    document.getElementById('listePieces').innerHTML = htmlList;
    try { await dessinerSceneGlobale(murs, forme, H, GLOBAL_STATE.configMurs); } catch(e) { console.error("Erreur 3D:", e); }
}

export async function imprimerDevis() {
    const nom = document.getElementById('nomChantier').value || "Chantier sans nom";
    const ralSelect = document.getElementById('couleurRal');
    const ral = ralSelect.options[ralSelect.selectedIndex].text;
    const ralValue = ralSelect.value;
    const h = document.getElementById('hauteur').value;
    const lA = document.getElementById('longueur').value;
    const forme = document.getElementById('formeCloison').value;
    const dateDuJour = new Date().toLocaleDateString('fr-FR');
    
    let dimsSup = "";
    if(forme === 'L' || forme === 'U') dimsSup += `<li><strong>Mur B :</strong> ${document.getElementById('longueurB').value} mm</li>`;
    if(forme === 'U') dimsSup += `<li><strong>Mur C :</strong> ${document.getElementById('longueurC').value} mm</li>`;

    let imgData = '';
    const { currentScene } = GLOBAL_STATE;
    if (currentScene.camera && currentScene.scene && currentScene.renderer) {
        const canvas = document.querySelector('#apercuElevationContainer canvas');
        const originalSize = new THREE.Vector2();
        currentScene.renderer.getSize(originalSize);
        const originalAspect = currentScene.camera.aspect;

        const widthPrint = 2000;
        const heightPrint = 1200; 
        currentScene.renderer.setSize(widthPrint, heightPrint);
        currentScene.camera.aspect = widthPrint / heightPrint;
        currentScene.camera.updateProjectionMatrix();

        const root = currentScene.scene.children.find(c => c.type === 'Group'); 
        if(root) {
            const b = new THREE.Box3().setFromObject(root);
            if(!b.isEmpty()) {
                const c = b.getCenter(new THREE.Vector3());
                const sz = b.getSize(new THREE.Vector3());
                const maxDim = Math.max(sz.x, sz.y, sz.z);
                const dist = maxDim * 2.5; 
                currentScene.camera.position.copy(c).add(new THREE.Vector3(0.8, 0.6, 1.0).normalize().multiplyScalar(dist));
                currentScene.camera.lookAt(c);
                currentScene.controls.update();
            }
        }
        currentScene.renderer.render(currentScene.scene, currentScene.camera);
        imgData = canvas.toDataURL('image/jpeg', 0.9); 
        currentScene.renderer.setSize(originalSize.x, originalSize.y);
        currentScene.camera.aspect = originalAspect;
        currentScene.camera.updateProjectionMatrix();
        currentScene.renderer.render(currentScene.scene, currentScene.camera);
    }

    let tableauHTMLAvecCodes = '<table style="width:100%; border-collapse: collapse; font-size:10pt;"><thead><tr><th style="background:#007bff; color:white; padding:8px; text-align:left;">Référence</th><th style="background:#007bff; color:white; padding:8px; text-align:left;">Désignation</th><th style="background:#007bff; color:white; padding:8px; text-align:left;">Quantité</th></tr></thead><tbody>';
    
    if (GLOBAL_STATE.derniereInventaire) {
        const inv = GLOBAL_STATE.derniereInventaire;
        let keys = Object.keys(inv);
        const ordrePriorite = ["Lisse", "Départ", "Montant", "Angle", "Couvre joints", "Capot", "Équerre", "éclisse", "Clips", "Calle", "Joint", "Parclose", "Habillage", "Ouverture", "Huisserie", "Porte", "Vantail", "Rail", "Paumelle", "Béquille", "Poignée", "Plinthe"];

        function getScore(nomArticle) {
            for (let i = 0; i < ordrePriorite.length; i++) {
                if (nomArticle.toLowerCase().includes(ordrePriorite[i].toLowerCase())) return i;
            }
            return 999; 
        }

        keys.sort((a, b) => {
            const scoreA = getScore(a);
            const scoreB = getScore(b);
            if (scoreA === scoreB) return a.localeCompare(b);
            return scoreA - scoreB;
        });

        keys.forEach(k => {
            if (inv[k] > 0) {
                let codeProduit = "-";
                const entry = GLOBAL_STATE.CODES_ARTICLES ? GLOBAL_STATE.CODES_ARTICLES[k] : undefined;
                if (typeof entry === 'string') { codeProduit = entry; } 
                else if (typeof entry === 'object' && entry !== null) { codeProduit = entry[ralValue] || "A DEFINIR"; }

                tableauHTMLAvecCodes += `
                    <tr>
                        <td style="border-bottom:1px solid #ddd; padding:8px; font-family:monospace; font-weight:bold;">${codeProduit}</td>
                        <td style="border-bottom:1px solid #ddd; padding:8px;">${k}</td>
                        <td style="border-bottom:1px solid #ddd; padding:8px;">${inv[k]} u.</td>
                    </tr>
                `;
            }
        });
    }
    tableauHTMLAvecCodes += '</tbody></table>';
    
    let html = `
        <div class="print-header">
            <div class="print-logo"><img src="icon-512.png" alt="Logo KTY" style="height: 80px; width: auto;"></div>
            <div class="print-info"><strong>Date :</strong> ${dateDuJour}<br><strong>Projet :</strong> ${nom}<br><strong>Config :</strong> ${forme.toUpperCase()} / ${ral}</div>
        </div>
        <div class="client-box">
            <h3 style="margin-top:0; border:none; color:#333; padding-bottom:10px;">Configuration Retenue</h3>
            <ul style="list-style: none; padding: 0; display:grid; grid-template-columns: 1fr 1fr 1fr; gap:10px; font-size:0.95em; margin:0;">
                <li><strong>Hauteur :</strong> ${h} mm</li><li><strong>Couleur :</strong> ${ral}</li><li><strong>Mur A :</strong> ${lA} mm</li>${dimsSup}
            </ul>
        </div>
        <h3>Détail des Modules</h3><div style="font-size: 0.9em; margin-bottom: 30px; border:1px solid #eee; padding:10px;">${document.getElementById('listePieces').innerHTML}</div>
        <h3>Aperçu Technique</h3><div class="print-3d-view"><img src="${imgData}" alt="Vue 3D du projet" style="width:100%; max-height:600px; object-fit:contain;"></div>
        <h3>Inventaire Matériel Estimatif</h3>${tableauHTMLAvecCodes}
        <div class="print-footer" style="margin-top: 100px;">
            Document généré par le Configurateur KTY Solutions.<br>Merci de transmettre ce PDF à <strong>kty.chassieu@kty.fr</strong> pour validation technique.<br>KTY Solutions - Votre partenaire cloisonnement.
        </div>
    `;
    
    const z = document.getElementById('zoneImpression');
    if(z) { z.innerHTML = html; setTimeout(() => window.print(), 500); }
}
