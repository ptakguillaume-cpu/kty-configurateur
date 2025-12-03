import { GLOBAL_STATE } from './state.js';
import { CONSTANTS } from './constants.js';
import { getLargeurPorte } from './uiManager.js';
import { dessinerSceneGlobale } from './engine3d.js';
import * as THREE from 'three';

// C'est ici que la fonction est exportée pour être vue par app.js
export async function calculerInventaire() {
    let inv = {};
    const add = (n, q) => { if(q>0) inv[n] = (inv[n]||0) + q; };
    function ajouterAuStock(nom, quantite) { if (quantite > 0) { inv[nom] = (inv[nom] || 0) + quantite; } }
    
    let htmlList = "";
    
    // LISTES POUR ALGO DE DECOUPE
    let besoinsCoupesVerticales = []; 
    let besoinsCoupesHorizontales = []; 
    
    let totalPortes = 0;
    let totalMetrageJointsByType = {}; 
    let qteEquerresTraverse = 0;
    
    const forme = document.getElementById('formeCloison').value;
    const qteDepartsMurs = parseInt(document.getElementById('configDepart').value, 10);
    const typeGlob = document.getElementById('typeCloison').value;
    const H = parseFloat(document.getElementById('hauteur').value);
    const H_IMPOSTE = parseFloat(document.getElementById('hauteurImposte').value) || 2100;
    const hasImposteModules = document.getElementById('imposteModules').checked;
    const couleurRal = document.getElementById('couleurRal').value;
    const isPorteTH = (document.getElementById('hauteurPorte').value === 'touteHauteur');
    
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
    let nbAngles = 0;
    if(forme==='L') { nbAngles=1; }
    if(forme==='U') { nbAngles=2; }
    if (qteDepartsMurs === 0) { nbDeparts = 0; }

    let murs = ['A']; if(forme==='L') murs.push('B'); if(forme==='U') { murs.push('B'); murs.push('C'); }

    // Remplissage auto si non mixte
    if (typeGlob !== 'mixte') {
        GLOBAL_STATE.configMurs = { A:[], B:[], C:[] };
        murs.forEach(id => {
            let L = 0;
            if(id==='A') L=parseFloat(document.getElementById('longueur').value);
            if(id==='B') L=parseFloat(document.getElementById('longueurB').value);
            if(id==='C') L=parseFloat(document.getElementById('longueurC').value);
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

    let nbMontantsStandard = 0;
    let nbMontantsSpeciaux = 0;
    let v1 = document.getElementById('typeVitrage1').value;
    let v2 = document.getElementById('typeVitrage2').value;
    let isStandardRal = (['9016','7016','9005','anodise'].includes(couleurRal));
    let isStandardGlass1 = (['33.2','44.2'].includes(v1));
    let isStandardGlass2 = (['aucun','33.2','44.2'].includes(v2));
    let useParcloseAvecJoint = (isStandardRal && isStandardGlass1 && isStandardGlass2);
    let baseNomParclose = (v2 === 'aucun') ? 'Parclose SV' : 'Parclose DV';
    let suffixeParclose = useParcloseAvecJoint ? ' (avec joint intégré)' : ' (sans joint)';
    let nomParcloseDefaut = baseNomParclose + suffixeParclose;

    murs.forEach(id => {
        htmlList += `<li style="background:#f4f4f4; margin-top:5px;"><strong>Cloison ${id} :</strong></li>`;
        let modulesDuMur = GLOBAL_STATE.configMurs[id];
        let nbModules = modulesDuMur.length;
        
        if (nbModules > 0) {
            for (let i = 0; i < nbModules - 1; i++) {
                let isSpecial = false;
                if (forme !== 'droite') {
                    if (id === 'A' && i === nbModules - 2) {
                        let lastMod = modulesDuMur[nbModules-1];
                        if(lastMod.type === 'porte' && isPorteTH && H <= 3000) isSpecial = false;
                        else isSpecial = true;
                    } 
                    else if (id === 'B' && i === 0) {
                        let firstMod = modulesDuMur[0];
                        if(firstMod.type === 'porte' && isPorteTH && H <= 3000) isSpecial = false;
                        else isSpecial = true; 
                    }
                    else if (id === 'C' && i === 0) {
                        let firstMod = modulesDuMur[0];
                        if(firstMod.type === 'porte' && isPorteTH && H <= 3000) isSpecial = false;
                        else isSpecial = true; 
                    }
                }
                
                if (isSpecial) {
                    nbMontantsSpeciaux++;
                } else {
                    nbMontantsStandard++;
                    besoinsCoupesVerticales.push(H);
                }
            }
        }

        modulesDuMur.forEach(m => {
            if(m.type==='porte') { 
                let sensTxt = (m.sens === 'gauche') ? 'PG' : 'PD';
                totalPortes++; 
                htmlList += `<li>Huisserie (${getLargeurPorte()}mm) - ${sensTxt}</li>`; 
            } else {
                let nom = m.type === 'pleine' ? 'Module plein' : m.type === 'vitree' ? 'Module vitré' : 'Module allège';
                htmlList += `<li>${nom} (${m.largeur.toFixed(0)}mm)</li>`;
                
                if (m.type === 'pleine') {
                    add('Calles de lisse', 2);
                } else if (m.type === 'vitree') {
                    add('Calles de lisse', 6);
                    let isDouble = (document.getElementById('typeVitrage2').value !== 'aucun');
                    add('Cales de vitrage', isDouble ? 4 : 2);
                } else if (m.type === 'vitreeSurAllege') {
                    add('Calles de lisse', 4);
                }

                if(m.type === 'vitree' || m.type === 'vitreeSurAllege') {
                    let qteParclose = (m.type === 'vitree') ? 3 : 2;
                    add(nomParcloseDefaut, qteParclose);
                    if (!useParcloseAvecJoint) {
                        let hV = H - (CONSTANTS.EPAISSEUR_PROFIL*2);
                        if(m.type==='vitreeSurAllege') { let ha = m.hAllege || 0; hV = H - ha - CONSTANTS.EPAISSEUR_PROFIL; }
                        let metrage = (hV * 2) + (m.largeur * 2);
                        totalMetrageJointsByType[v1] = (totalMetrageJointsByType[v1] || 0) + metrage;
                        if(v2 !== 'aucun') { totalMetrageJointsByType[v2] = (totalMetrageJointsByType[v2] || 0) + metrage; }
                    }
                }
                let nbTrav = 0;
                if(m.type==='vitreeSurAllege') nbTrav++;
                if(hasImposteModules && H > H_IMPOSTE+38) nbTrav++;
                if(nbTrav > 0) {
                    qteEquerresTraverse += nbTrav * 2; 
                    for(let k=0; k<nbTrav; k++) { 
                        besoinsCoupesHorizontales.push(m.largeur); 
                    }
                }
            }
        });
    });

    let nbCapots = 0;
    let positionDepartUnique = 'A';
    let radioPos = document.querySelector('input[name="posDepartL"]:checked');
    if(radioPos) positionDepartUnique = radioPos.value;
    let debutEstLibre = false;
    if (qteDepartsMurs === 0) { debutEstLibre = true; } 
    else if (forme === 'L' && qteDepartsMurs === 1 && positionDepartUnique === 'B') { debutEstLibre = true; }
    if (debutEstLibre) {
        nbCapots++;
        if (GLOBAL_STATE.configMurs['A'].length === 1) nbMontantsSpeciaux++; else nbMontantsStandard++;
        besoinsCoupesVerticales.push(H); 
    }
    let finEstLibre = false;
    let murFinId = (forme === 'U') ? 'C' : (forme === 'L' ? 'B' : 'A');
    if (qteDepartsMurs === 0) { finEstLibre = true; } 
    else if (qteDepartsMurs === 1) {
        if (forme === 'droite') finEstLibre = true;
        if (forme === 'L' && positionDepartUnique === 'A') finEstLibre = true;
        if (forme === 'U') finEstLibre = true; 
    }
    if (finEstLibre) {
        nbCapots++;
        if (GLOBAL_STATE.configMurs[murFinId].length === 1) nbMontantsSpeciaux++; else nbMontantsStandard++;
        besoinsCoupesVerticales.push(H);
    }

    let qteBarresSpeciales = nbMontantsSpeciaux;
    ajouterAuStock(nomMontantSpecial, qteBarresSpeciales);

    add(nomDepart, nbDeparts);
    if(nbDeparts > 0) {
        let metrageJoint = nbDeparts * H * 2;
        let qteRouleaux = Math.ceil(metrageJoint / 5000);
        add('Joint de départ', qteRouleaux);
    }

    if(nbAngles>0) add(`Angle Carré (H. ${hNom})`, nbAngles);
    if(nbCapots>0) add('Capots de finition (pour Montant)', nbCapots);
    
    let totVert = nbMontantsStandard + nbMontantsSpeciaux + nbDeparts + nbAngles; 
    let cjVertCount = totVert * 2;
    
    if(isPorteTH) {
        let nbPortesTH = 0;
        ['A','B','C'].forEach(m => GLOBAL_STATE.configMurs[m].forEach(mod => { if(mod.type==='porte') nbPortesTH++; }));
        cjVertCount -= (nbPortesTH * 4); 
        if(cjVertCount < 0) cjVertCount = 0;
    }

    add(nomCJ_Vertical, cjVertCount);
    add('Boîte de Clips couvre joints (100u)', Math.ceil(cjVertCount*8/100));
    
    let totalEclisses = 0;
    murs.forEach(id => {
        let L = 0;
        if(id==='A') L=parseFloat(document.getElementById('longueur').value);
        if(id==='B') L=parseFloat(document.getElementById('longueurB').value);
        if(id==='C') L=parseFloat(document.getElementById('longueurC').value);
        let nbBarres = Math.ceil(L / 3000);
        let nbRaccords = (nbBarres > 0) ? nbBarres - 1 : 0;
        totalEclisses += (nbRaccords * 2);
    });
    add('Clips de raccordement (éclisses)', totalEclisses);
    
    let Ltot = murs.reduce((total, id) => { 
        let L = 0;
        if(id==='A')L=parseFloat(document.getElementById('longueur').value);
        if(id==='B')L=parseFloat(document.getElementById('longueurB').value);
        if(id==='C')L=parseFloat(document.getElementById('longueurC').value);
        return total + L;
    }, 0);
    add('Lisses (barre 3000mm)', Math.ceil(Ltot*2/3000));

    if (totalPortes > 0) {
        let lp = getLargeurPorte();
        let isD = document.getElementById('doublePorte').checked;
        let nomH = isD ? `Huisserie Double (${lp}mm)` : `Huisserie (${lp}mm)`;
        let tp = document.getElementById('typePorte').value;
        if(tp==='cadreAlu') nomH += " (Cadre Alu)"; else nomH += " (Pleine)";
        add(nomH, totalPortes);
        let hp = document.getElementById('hauteurPorte').value;
        let vitragePorteVal = document.getElementById('typeVitragePorte').value;
        let nbPaumellesParVantail = 3; 
        if (hp === 'touteHauteur') { nbPaumellesParVantail = 4; } 
        else if (hp === '2100' && tp === 'cadreAlu' && vitragePorteVal === 'isolant') { nbPaumellesParVantail = 4; }
        let nomKit = "";
        let qteKits = 0;
        if (isD) {
            nomKit = (nbPaumellesParVantail === 4) ? 'Kit Paumelles (jeu de 8)' : 'Kit Paumelles (jeu de 6)';
            qteKits = totalPortes; 
        } else {
            nomKit = (nbPaumellesParVantail === 4) ? 'Kit Paumelles (jeu de 4)' : 'Kit Paumelles (jeu de 3)';
            qteKits = totalPortes; 
        }
        add(nomKit, qteKits);
        if(tp==='cadreAlu') { 
            add('Béquilles', totalPortes);
            if(vitragePorteVal === 'isolant') { let qteExtras = (isD ? 2 : 1) * totalPortes; add('Plinthe automatique', qteExtras); add('Vitrage isolant', qteExtras); }
            if(isD) { 
                 let txt = document.getElementById('huisserieDoublePorteSelect').options[document.getElementById('huisserieDoublePorteSelect').selectedIndex].text;
                 let match = txt.match(/\((\d+)\+(\d+)\)/);
                 if(match) { add(`Vantail Cadre Alu ${match[1]}mm`, totalPortes); add(`Semi-fixe Cadre Alu ${match[2]}mm`, totalPortes); } 
                 else { add(`Porte Double Cadre Alu ${lp}mm`, totalPortes); }
            } else { add(`Porte Cadre Alu ${lp}mm`, totalPortes); }
        }
        if(document.getElementById('hauteurPorte').value==='2100') {
             let nbBarresCJ_Porte = isD ? 2 : 1;
             add(nomCJ_Horizontal, nbBarresCJ_Porte * totalPortes);

             if(hasImposteModules && H > H_IMPOSTE+38 && H_IMPOSTE > 2100) {
                 for(let k=0; k < totalPortes; k++) { 
                     besoinsCoupesHorizontales.push(lp); 
                 }
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
    }

    for (const [vitrage, metrageTotal] of Object.entries(totalMetrageJointsByType)) {
        if (metrageTotal > 0) {
            let epaisseurJoint = '6mm'; if (vitrage === '44.2') epaisseurJoint = '8mm'; if (vitrage === '55.2') epaisseurJoint = '10mm'; if (vitrage === '66.2') epaisseurJoint = '12mm';
            let nbRouleaux = Math.ceil(metrageTotal / 50000);
            add(`Rouleau Joint ${epaisseurJoint} (50m) pour ${vitrage}`, nbRouleaux);
        }
    }
    let qteEq = ((2 + (nbMontantsStandard + nbMontantsSpeciaux)) * 2) + qteEquerresTraverse; 
    if(nbAngles>0) { qteEq += nbAngles * 4; }
    add('Équerres (total)', qteEq);

    // ALGORITHME DE COUPE
    function optimiserCoupes(besoins, longueurBarreRef) {
        besoins.sort((a, b) => b - a);
        let stockChutes = [];
        let barresNeuves = 0;
        
        besoins.forEach(coupe => {
            stockChutes.sort((a,b) => a - b);
            let index = -1;
            for(let i=0; i<stockChutes.length; i++) {
                if(stockChutes[i] >= coupe) { index = i; break; }
            }
            if(index !== -1) {
                let reste = stockChutes[index] - coupe;
                stockChutes.splice(index, 1);
                if(reste > 50) stockChutes.push(reste);
            } else {
                barresNeuves++;
                let reste = longueurBarreRef - coupe;
                if(reste > 50) stockChutes.push(reste);
            }
        });
        return { barres: barresNeuves, chutes: stockChutes }; 
    }

    let resVert = optimiserCoupes(besoinsCoupesVerticales, longueurBarreRetenue);
    let qteBarresVerticalesTotal = resVert.barres;
    
    let nbRecuperationChute = 0;
    let chutesRestantesVert = resVert.chutes; 
    
    besoinsCoupesHorizontales.sort((a, b) => b - a);
    let besoinsHorizRestants = [];

    besoinsCoupesHorizontales.forEach(coupe => {
        chutesRestantesVert.sort((a,b) => a - b);
        let index = -1;
        for(let i=0; i<chutesRestantesVert.length; i++) {
            if(chutesRestantesVert[i] >= coupe) { index = i; break; }
        }
        if(index !== -1) {
            let reste = chutesRestantesVert[index] - coupe;
            chutesRestantesVert.splice(index, 1);
            if(reste > 50) chutesRestantesVert.push(reste);
            nbRecuperationChute++;
        } else {
            besoinsHorizRestants.push(coupe);
        }
    });

    let resHoriz = optimiserCoupes(besoinsHorizRestants, 2500);
    let qteBarresTraversesTotal = resHoriz.barres;

    if (longueurBarreRetenue === 2500) {
        add(nomMontant, qteBarresVerticalesTotal + qteBarresTraversesTotal);
    } else {
        if(qteBarresVerticalesTotal > 0) add(nomMontant, qteBarresVerticalesTotal);
        if(qteBarresTraversesTotal > 0) add(nomTraverseBarre, qteBarresTraversesTotal);
    }
    if(nbRecuperationChute > 0) { add("Chutes de montant réutilisées (Traverses)", nbRecuperationChute); }

    GLOBAL_STATE.derniereInventaire = inv;

    let keys = Object.keys(inv).sort();
    
    let ossatureKeys = keys.filter(k => (
        k.includes('Lisse') || 
        (k.includes('Départ') && !k.includes('Joint')) || 
        k.includes('Montants') || 
        k.includes('Montant') || 
        k.includes('Angle') || 
        k.includes('Profilés') || 
        k.includes('Chute')
    ));
    
    let parcloseKeys = keys.filter(k => (
        k.includes('Parclose') || 
        (k.includes('Joint') && !k.includes('départ')) || 
        k.includes('Vitrage')
    ));
    
    let huisserieKeys = keys.filter(k => k.includes('Huisserie') || k.includes('Porte') || k.includes('Vantail') || k.includes('Semi-fixe') || k.includes('Paumelles') || k.includes('Béquilles') || k.includes('Kit') || k.includes('Plinthe'));
    
    let accessoiresKeys = keys.filter(k => !ossatureKeys.includes(k) && !parcloseKeys.includes(k) && !huisserieKeys.includes(k));

    let tbl = `<h4>1. Ossature</h4><table><thead><tr><th>Pièce</th><th>Quantité</th></tr></thead><tbody>`;
    ossatureKeys.forEach(k => { if(inv[k] > 0) tbl += `<tr><td>${k}</td><td>${inv[k]} u.</td></tr>`; });
    tbl += `</tbody></table>`;
    
    if (parcloseKeys.length > 0) {
        tbl += `<h4>2. Vitrage & Parcloses</h4><table><thead><tr><th>Pièce</th><th>Quantité</th></tr></thead><tbody>`;
        parcloseKeys.forEach(k => { if(inv[k] > 0) tbl += `<tr><td>${k}</td><td>${inv[k]} u.</td></tr>`; });
        tbl += `</tbody></table>`;
    }

    tbl += `<h4>3. Accessoires</h4><table><thead><tr><th>Pièce</th><th>Quantité</th></tr></thead><tbody>`;
    accessoiresKeys.forEach(k => { if(inv[k] > 0) tbl += `<tr><td>${k}</td><td>${inv[k]} u.</td></tr>`; });
    tbl += `</tbody></table>`;
    
    if (huisserieKeys.length > 0) {
        tbl += `<h4>4. Huisserie</h4><table><thead><tr><th>Pièce</th><th>Quantité</th></tr></thead><tbody>`;
        huisserieKeys.forEach(k => { if(inv[k] > 0) tbl += `<tr><td>${k}</td><td>${inv[k]} u.</td></tr>`; });
        tbl += `</tbody></table>`;
    }
    
    document.getElementById('tableauTotal').innerHTML = tbl;
    
    const zoneDownload = document.getElementById('zoneTelechargEMENT');
    if (zoneDownload) {
        zoneDownload.classList.remove('hidden'); 
        zoneDownload.style.display = 'block';
    }
    
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
        const ordrePriorite = ["Lisse", "Départ", "Montant", "Angle", "Couvre joints", "Capot", "Équerre", "éclisse", "Clips", "Cales", "Joint", "Parclose", "Huisserie", "Porte", "Vantail", "Paumelle", "Béquille", "Plinthe"];

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
