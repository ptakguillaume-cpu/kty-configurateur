import { GLOBAL_STATE } from './state.js';
import { CONSTANTS } from './constants.js';
import { getLargeurPorte } from './uiManager.js';
import { dessinerSceneGlobale } from './engine3d.js';
import * as THREE from 'three'; // Nécessaire pour l'impression (capture 3D)

export async function calculerInventaire() {
    // ==========================================
    // 1. INITIALISATION & VARIABLES GLOBALES
    // ==========================================
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
    
    // Récupération des valeurs du formulaire
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
    let nomCJ_Horizontal = "Couvre joints H.2500mm (horizontaux)"; 
    let nomCJ_Vertical = `Couvre joints (H. ${hNom})`;
    let nomTraverseBarre = "Montant (2500mm) traverses"; 
    
    let nbDeparts = qteDepartsMurs; 
    let nbAngles = (forme==='L') ? 1 : (forme==='U' ? 2 : 0);
    if (qteDepartsMurs === 0) nbDeparts = 0;

    let murs = ['A']; 
    if(forme==='L') murs.push('B'); 
    if(forme==='U') { murs.push('B'); murs.push('C'); }

    // ==========================================
    // 2. LES "TIROIRS" D'INTELLIGENCE MÉTIER
    // ==========================================

    // Tiroir A : Calcul du remplissage (Plein, Vitré, Allège)
    function calculerModules(m, v1, v2, useParcloseAvecJoint) {
        let nom = m.type === 'pleine' ? 'Module plein' : m.type === 'vitree' ? 'Module vitré' : 'Module allège';
        htmlList += `<li>${nom} (${m.largeur.toFixed(0)}mm)</li>`;
        add('Calles de lisse', m.type==='pleine'?2:(m.type==='vitree'?6:4));
        
        let barresPourCeModule = 0;

        // Parcloses du module de base
        if (m.type === 'vitree') {
            barresPourCeModule += 2; // Verticaux
            let morceauxParBarre = (m.largeur <= 590) ? 5 : (m.largeur <= 740) ? 4 : (m.largeur <= 990) ? 3 : 2;
            barresPourCeModule += (2 / morceauxParBarre);
        } else if (m.type === 'vitreeSurAllege') {
            barresPourCeModule += 2;
        }

        // Joints du module de base
        if ((m.type === 'vitree' || m.type === 'vitreeSurAllege') && !useParcloseAvecJoint) {
            let hV = H - (CONSTANTS.EPAISSEUR_PROFIL*2);
            if(m.type === 'vitreeSurAllege') { let ha = m.hAllege || 1100; hV = H - ha - CONSTANTS.EPAISSEUR_PROFIL; }
            let metrage = (hV * 2) + (m.largeur * 2);
            totalMetrageJointsByType[v1] = (totalMetrageJointsByType[v1] || 0) + metrage;
            if(v2 !== 'aucun') totalMetrageJointsByType[v2] = (totalMetrageJointsByType[v2] || 0) + metrage;
        }

        // Imposte & Traverses
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
            for(let k=0; k<nbTrav; k++) { 
                besoinsTraverses.push(m.largeur); 
                besoinsCJ.push(m.largeur); besoinsCJ.push(m.largeur); 
            }  
        }
    }

    // Tiroir B : Calcul des Portes
    function calculerToutesLesPortes(nomParcloseDefaut) {
        if (totalPortes === 0) return;

        let lp = getLargeurPorte();
        let isD = document.getElementById('doublePorte').checked;
        let tp = document.getElementById('typePorte').value;
        let hp = document.getElementById('hauteurPorte').value;
        let vitragePorteVal = document.getElementById('typeVitragePorte').value;

        // 1. Quincaillerie & Huisserie de base
        let nomH = isD ? `Huisserie Double (${lp}mm)` : `Huisserie (${lp}mm)`;
        nomH += (tp === 'cadreAlu') ? " (Cadre Alu)" : " (Pleine)";
        add(nomH, totalPortes);
        
        let nbPaumellesParVantail = (hp === 'touteHauteur' || (hp === '2100' && tp === 'cadreAlu' && vitragePorteVal === 'isolant')) ? 4 : 3;
        let nomKit = isD ? `Kit Paumelles (jeu de ${nbPaumellesParVantail*2})` : `Kit Paumelles (jeu de ${nbPaumellesParVantail})`;
        add(nomKit, totalPortes);
        
        if(tp === 'cadreAlu') { 
            add('Béquilles', totalPortes);
            if(vitragePorteVal === 'isolant') { 
                let qteExtras = (isD ? 2 : 1) * totalPortes; 
                add('Plinthe automatique', qteExtras); add('Vitrage isolant', qteExtras); 
            }
            if(isD) { 
                 let txt = document.getElementById('huisserieDoublePorteSelect').options[document.getElementById('huisserieDoublePorteSelect').selectedIndex].text;
                 let match = txt.match(/\((\d+)\+(\d+)\)/);
                 if(match) { add(`Vantail Cadre Alu ${match[1]}mm`, totalPortes); add(`Semi-fixe Cadre Alu ${match[2]}mm`, totalPortes); } 
                 else { add(`Porte Double Cadre Alu ${lp}mm`, totalPortes); }
            } else { add(`Porte Cadre Alu ${lp}mm`, totalPortes); }
        }

        // 2. Gestion de l'encadrement (Standard, TTH ou... Coulissant plus tard !)
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
             
             if (H > 3000) {
                 for(let k=0; k < totalPortes; k++) { besoinsTraverses.push(lp); besoinsCJ.push(2500); }
                 let typeImp = document.getElementById('typeImposte').value;
                 if(typeImp === 'vitree') { 
                     let nbParclosesBase = 2; 
                     let qteParcloseImposte = (isD ? (nbParclosesBase * 2) : nbParclosesBase) * totalPortes; 
                     add(nomParcloseDefaut, qteParcloseImposte);
                 }
             } 
             else if (typeTTH === 'avecTraverse') {
                 for(let k=0; k < totalPortes; k++) { besoinsTraverses.push(lp); besoinsCJ.push(2500); }
             }
        }
        else if (hp === 'coulissante') {
             // 🚀 LA PLACE EST PRÊTE POUR TA FUTURE PORTE COULISSANTE ICI !
             console.log("Calcul porte coulissante à venir...");
        }
    }


    // ==========================================
    // 3. LE CHEF D'ORCHESTRE (Exécution)
    // ==========================================

    // Génération du plan des murs (si ce n'est pas déjà fait)
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
                for(let k=0; k<qP; k++) { 
                    let elSens = document.getElementById('sensPorte_' + k);
                    let sensChoisi = elSens ? elSens.value : 'droite';
                    GLOBAL_STATE.configMurs[id].push({type:'porte', sens: sensChoisi}); 
                    dispo -= (lP+CONSTANTS.EPAISSEUR_PROFIL); 
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
    let isStandardGlass1 = (['33.2','44.2'].includes(v1));
    let isStandardGlass2 = (['aucun','33.2','44.2'].includes(v2));
    let useParcloseAvecJoint = (isStandardRal && isStandardGlass1 && isStandardGlass2);
    let nomParcloseDefaut = ((v2 === 'aucun') ? 'Parclose SV' : 'Parclose DV') + (useParcloseAvecJoint ? ' (avec joint intégré)' : ' (sans joint)') + " (Barre 3000mm)";

    // Analyse mur par mur
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
                let sensTxt = (m.sens === 'gauche') ? 'PG' : 'PD';
                totalPortes++; 
                htmlList += `<li>Huisserie (${getLargeurPorte()}mm) - ${sensTxt}</li>`; 
            } else {
                calculerModules(m, v1, v2, useParcloseAvecJoint); // <--- Appel de notre "Tiroir A"
            }
        });
    });

    calculerToutesLesPortes(nomParcloseDefaut); // <--- Appel de notre "Tiroir B"

    // ==========================================
    // 4. CALCUL DE L'OSSATURE GLOBALE & OPTIMISATIONS
    // ==========================================
    
    if (totalBarresParcloses > 0) add(nomParcloseDefaut, Math.ceil(totalBarresParcloses));

    let nbCapots = 0;
    let positionDepartUnique = document.querySelector('input[name="posDepartL"]:checked') ? document.querySelector('input[name="posDepartL"]:checked').value : 'A';

    let debutEstLibre = (qteDepartsMurs === 0) || (forme === 'L' && qteDepartsMurs === 1 && positionDepartUnique === 'B');
    if (debutEstLibre) { nbCapots++; if (GLOBAL_STATE.configMurs['A'].length === 1) nbMontantsSpeciaux++; else nbMontantsStandard++; }

    let finEstLibre = (qteDepartsMurs === 0) || (qteDepartsMurs === 1 && (forme === 'droite' || (forme === 'L' && positionDepartUnique === 'A') || forme === 'U'));
    if (finEstLibre) { nbCapots++; let murFinId = (forme === 'U') ? 'C' : (forme === 'L' ? 'B' : 'A'); if (GLOBAL_STATE.configMurs[murFinId].length === 1) nbMontantsSpeciaux++; else nbMontantsStandard++; }

    ajouterAuStock(nomMontant, (longueurBarreRetenue === 5750 && H <= 2875) ? Math.ceil(nbMontantsStandard / 2) : nbMontantsStandard);
    ajouterAuStock(nomMontantSpecial, (longueurBarreRetenue === 5750 && H <= 2875) ? Math.ceil(nbMontantsSpeciaux / 2) : nbMontantsSpeciaux);

    add(nomDepart, nbDeparts);
    if(nbAngles>0) add(`Angle Carré (H. ${hNom})`, nbAngles);
    if(nbCapots>0) add('Capots de finition (pour Montant)', nbCapots);
    
    let totVert = nbMontantsStandard + nbMontantsSpeciaux + nbDeparts + nbAngles; 
    add(nomCJ_Vertical, totVert*2);
    add('Boîte de Clips couvre joints (100u)', Math.ceil(totVert*2*8/100));
    
    let totalEclisses = 0; let Ltot = 0;
    murs.forEach(id => {
        let L = (id==='A') ? parseFloat(document.getElementById('longueur').value) : (id==='B') ? parseFloat(document.getElementById('longueurB').value) : parseFloat(document.getElementById('longueurC').value);
        Ltot += L;
        let nbBarres = Math.ceil(L / 3000);
        totalEclisses += ((nbBarres > 0) ? nbBarres - 1 : 0) * 2;
    });
    add('Clips de raccordement (éclisses)', totalEclisses);
    add('Lisses (barre 3000mm)', Math.ceil(Ltot*2/3000));

    for (const [vitrage, metrageTotal] of Object.entries(totalMetrageJointsByType)) {
        if (metrageTotal > 0) {
            let epaisseurJoint = (vitrage === '44.2') ? '8mm' : (vitrage === '55.2') ? '10mm' : (vitrage === '66.2') ? '12mm' : '6mm';
            add(`Rouleau Joint ${epaisseurJoint} (50m) pour ${vitrage}`, Math.ceil(metrageTotal / 50000));
        }
    }
    
                // --- CALCUL EXACT DES ÉQUERRES ---
    // Règle universelle : 2 équerres pour CHAQUE élément vertical (Départ ou Montant)
    let qteEq = (nbDeparts * 2) + ((nbMontantsStandard + nbMontantsSpeciaux) * 2) + qteEquerresTraverse; 
    
    // On ajoute les angles (4 équerres par angle)
    if (nbAngles > 0) { 
        qteEq += nbAngles * 4; 
    }
    // ---------------------------------

    // Optimisation des traverses
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
    if (barresNeuvesUtilisees > 0) add(nomTraverseBarre, barresNeuvesUtilisees);
    if (nbChutesRecyclees > 0) add("Chutes de montant réutilisées (Traverses)", nbChutesRecyclees);
    
    // Optimisation des Couvre-joints Horizontaux
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
    if (finalBarresCJNeuves > 0) add(nomCJ_Horizontal, finalBarresCJNeuves);
    if (finalNbChutesCJRecyclees > 0) add("Chutes de CJ réutilisées", finalNbChutesCJRecyclees);

    // ==========================================
    // 5. AFFICHAGE DES RÉSULTATS
    // ==========================================
    GLOBAL_STATE.derniereInventaire = inv;

    let keys = Object.keys(inv).sort();
    let ossatureKeys = keys.filter(k => k.includes('Lisse') || k.includes('Départ') || k.includes('Montants') || k.includes('Montant') || k.includes('Angle') || k.includes('Profilés') || k.includes('Chute') || k.includes('Capot') || k.includes('Équerre') || k.includes('éclisse') || k.includes('Clips') || k.includes('Calle'));
    let parcloseKeys = keys.filter(k => k.includes('Parclose') || k.includes('Joint') || k.includes('Vitrage'));
    let huisserieKeys = keys.filter(k => k.includes('Huisserie') || k.includes('Porte') || k.includes('Vantail') || k.includes('Semi-fixe') || k.includes('Paumelles') || k.includes('Béquilles') || k.includes('Kit') || k.includes('Plinthe'));
    let accessoiresKeys = keys.filter(k => !ossatureKeys.includes(k) && !parcloseKeys.includes(k) && !huisserieKeys.includes(k));

    const buildTable = (title, arr) => {
        if(arr.length === 0) return '';
        let t = `<h4>${title}</h4><table><thead><tr><th>Pièce</th><th>Quantité</th></tr></thead><tbody>`;
        arr.forEach(k => { if(inv[k] > 0) t += `<tr><td>${k}</td><td>${inv[k]} u.</td></tr>`; });
        return t + `</tbody></table>`;
    };

    let tbl = buildTable('1. Ossature', ossatureKeys) + buildTable('2. Vitrage & Parcloses', parcloseKeys) + buildTable('3. Accessoires', accessoiresKeys) + buildTable('4. Huisserie', huisserieKeys);
    
    document.getElementById('tableauTotal').innerHTML = tbl;
    
    const zoneDownload = document.getElementById('zoneTelechargEMENT');
    if (zoneDownload) { zoneDownload.classList.remove('hidden'); zoneDownload.style.display = 'block'; }
    
    document.getElementById('listePieces').innerHTML = htmlList;
    try { await dessinerSceneGlobale(murs, forme, H, GLOBAL_STATE.configMurs); } catch(e) { console.error("Erreur 3D:", e); }
}

export async function imprimerDevis() {
    // Le code d'impression reste exactement le même, aucune logique à changer ici !
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
                const dir = new THREE.Vector3(0.8, 0.6, 1.0).normalize(); 
                currentScene.camera.position.copy(c).add(dir.multiplyScalar(dist));
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
        const ordrePriorite = ["Lisse", "Départ", "Montant", "Angle", "Couvre joints", "Capot", "Équerre", "éclisse", "Clips", "Calle", "Joint", "Parclose", "Huisserie", "Porte", "Vantail", "Paumelle", "Béquille", "Plinthe"];

        function getScore(nomArticle) {
            for (let i = 0; i < ordrePriorite.length; i++) {
                if (nomArticle.toLowerCase().includes(ordrePriorite[i].toLowerCase())) {
                    return i;
                }
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
                const entry = GLOBAL_STATE.CODES_ARTICLES[k];
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
            <div class="print-logo">
                <img src="icon-512.png" alt="Logo KTY" style="height: 80px; width: auto;">
            </div>
            <div class="print-info">
                <strong>Date :</strong> ${dateDuJour}<br>
                <strong>Projet :</strong> ${nom}<br>
                <strong>Config :</strong> ${forme.toUpperCase()} / ${ral}
            </div>
        </div>

        <div class="client-box">
            <h3 style="margin-top:0; border:none; color:#333; padding-bottom:10px;">Configuration Retenue</h3>
            <ul style="list-style: none; padding: 0; display:grid; grid-template-columns: 1fr 1fr 1fr; gap:10px; font-size:0.95em; margin:0;">
                <li><strong>Hauteur :</strong> ${h} mm</li>
                <li><strong>Couleur :</strong> ${ral}</li>
                <li><strong>Mur A :</strong> ${lA} mm</li>
                ${dimsSup}
            </ul>
        </div>

        <h3>Détail des Modules</h3>
        <div style="font-size: 0.9em; margin-bottom: 30px; border:1px solid #eee; padding:10px;">
            ${document.getElementById('listePieces').innerHTML}
        </div>

        <h3>Aperçu Technique</h3>
        <div class="print-3d-view">
            <img src="${imgData}" alt="Vue 3D du projet" style="width:100%; max-height:600px; object-fit:contain;">
        </div>

        <h3>Inventaire Matériel Estimatif</h3>
        ${tableauHTMLAvecCodes}

        <div class="print-footer" style="margin-top: 100px;">
            Document généré par le Configurateur KTY Solutions.<br>
            Merci de transmettre ce PDF à <strong>kty.chassieu@kty.fr</strong> pour validation technique.<br>
            KTY Solutions - Votre partenaire cloisonnement.
        </div>
    `;
    
    const z = document.getElementById('zoneImpression');
    z.innerHTML = html;
    
    setTimeout(() => window.print(), 500);
}
