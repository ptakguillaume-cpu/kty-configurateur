import { GLOBAL_STATE } from './state.js';
import { CONSTANTS } from './constants.js';
import { getLargeurPorte } from './uiManager.js';
import { dessinerSceneGlobale } from './engine3d.js';
import * as THREE from 'three'; // Nécessaire pour l'impression (capture 3D)

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

    // --- NOUVEAU : Compteur global pour les barres de parcloses (indépendantes) ---
    let totalBarresParcloses = 0;
    // ------------------------------------------------------------------------------
    
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
    let nbAngles = 0;
    if(forme==='L') { nbAngles=1; }
    if(forme==='U') { nbAngles=2; }
    if (qteDepartsMurs === 0) { nbDeparts = 0; }

    let murs = ['A']; if(forme==='L') murs.push('B'); if(forme==='U') { murs.push('B'); murs.push('C'); }

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
    
    // On ajoute explicitement la mention "Barre 3000mm" pour clarifier le résultat
    let nomParcloseDefaut = baseNomParclose + suffixeParclose + " (Barre 3000mm)";

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
            } 
            else {
                let nom = m.type === 'pleine' ? 'Module plein' : m.type === 'vitree' ? 'Module vitré' : 'Module allège';
                htmlList += `<li>${nom} (${m.largeur.toFixed(0)}mm)</li>`;
                add('Calles de lisse', m.type==='pleine'?2:(m.type==='vitree'?6:4));
                
                if(m.type === 'vitree' || m.type === 'vitreeSurAllege') {
                    
                    // --- NOUVEAU CALCUL DES PARCLOSES (Modules Indépendants, Barres 3000mm) ---
                    // 1. Les Verticaux (H ~ 2600mm)
                    // Chaque montant consomme une barre entière (chute de 400mm inutilisable pour un autre montant)
                    totalBarresParcloses += 2;

                    // 2. Les Horizontaux (Traverses)
                    const L = m.largeur;
                    let morceauxParBarre = 2; // Par défaut, pour les grands modules (> 990mm)

                    // Application des marges de sécurité (Trait de scie + Nettoyage)
                    if (L <= 590) morceauxParBarre = 5;
                    else if (L <= 740) morceauxParBarre = 4;
                    else if (L <= 990) morceauxParBarre = 3;

                    // On ajoute la fraction de barre nécessaire pour ces 2 traverses (haut et bas)
                    // L'arrondi final se fera à la fin de la fonction globale.
                    totalBarresParcloses += (2 / morceauxParBarre);
                    // -------------------------------------------------------------------------

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
                    for(let k=0; k<nbTrav; k++) { besoinsTraverses.push(m.largeur); besoinsCJ.push(m.largeur); besoinsCJ.push(m.largeur); }
                }
            }
        });
    });

    // --- APPLICATION DE L'ARRONDI POUR LES PARCLOSES ---
    if (totalBarresParcloses > 0) {
        add(nomParcloseDefaut, Math.ceil(totalBarresParcloses));
    }
    // ---------------------------------------------------

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
    }

    let qteBarresStandards = 0;
    if (longueurBarreRetenue === 5750 && H <= 2875) { qteBarresStandards = Math.ceil(nbMontantsStandard / 2); } 
    else { qteBarresStandards = nbMontantsStandard; }
    ajouterAuStock(nomMontant, qteBarresStandards);
    
    let qteBarresSpeciales = 0;
    if (longueurBarreRetenue === 5750 && H <= 2875) { qteBarresSpeciales = Math.ceil(nbMontantsSpeciaux / 2); } 
    else { qteBarresSpeciales = nbMontantsSpeciaux; }
    ajouterAuStock(nomMontantSpecial, qteBarresSpeciales);

    add(nomDepart, nbDeparts);
    if(nbAngles>0) add(`Angle Carré (H. ${hNom})`, nbAngles);
    if(nbCapots>0) add('Capots de finition (pour Montant)', nbCapots);
    
    let totVert = nbMontantsStandard + nbMontantsSpeciaux + nbDeparts + nbAngles; 
    add(nomCJ_Vertical, totVert*2);
    add('Boîte de Clips couvre joints (100u)', Math.ceil(totVert*2*8/100));
    
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
             for(let k=0; k < totalPortes; k++) { besoinsCJ.push(lp); besoinsCJ.push(lp); }
             if(hasImposteModules && H > H_IMPOSTE+38 && H_IMPOSTE > 2100) {
                 for(let k=0; k < totalPortes; k++) { besoinsTraverses.push(lp); besoinsCJ.push(lp); besoinsCJ.push(lp); }
                 qteEquerresTraverse += totalPortes * 2; 
             }
             if(H > 2100 + 38) { 
                 let typeImp = document.getElementById('typeImposte').value;
                 if(typeImp === 'vitree') { 
                     // IMPORTANT: Les parcloses d'impostes utilisent la même logique (ici on ajoute simplement la quantité calculée précédemment)
                     let nbParclosesBase = (H > 2600) ? 2 : 1;
                     let qteParcloseImposte = (isD ? (nbParclosesBase * 2) : nbParclosesBase) * totalPortes; 
                     add(nomParcloseDefaut, qteParcloseImposte);
                 }
             }
        }
    }        // --- NOUVEAU BLOC INTELLIGENT POUR LES PORTES TTH (Corrigé selon tes règles) ---
        else if(document.getElementById('hauteurPorte').value==='touteHauteur') {
             
             let typeTTH = document.getElementById('typeTraverseTTH') ? document.getElementById('typeTraverseTTH').value : 'sansTraverse';
             
             // CAS 1 : Plafond > 3000mm. 
             // (L'huisserie max est à 3000, donc on ferme avec une traverse à 3000 + imposte au-dessus)
             if (H > 3000) {
                 for(let k=0; k < totalPortes; k++) { 
                     besoinsTraverses.push(lp); // La traverse
                     besoinsCJ.push(2500); // Ajoute exactement 1 barre de CJ de 2500mm
                 }
                 // ZÉRO équerre ajoutée !
                 
                 // Gestion de l'imposte vitrée éventuelle au-dessus des 3000mm
                 let typeImp = document.getElementById('typeImposte').value;
                 if(typeImp === 'vitree') { 
                     let nbParclosesBase = 2; 
                     let qteParcloseImposte = (isD ? (nbParclosesBase * 2) : nbParclosesBase) * totalPortes; 
                     add(nomParcloseDefaut, qteParcloseImposte);
                 }
             } 
             // CAS 2 : Plafond <= 3000mm ET Huisserie AVEC traverse
             else if (typeTTH === 'avecTraverse') {
                 for(let k=0; k < totalPortes; k++) { 
                     besoinsTraverses.push(lp); // La traverse
                     besoinsCJ.push(2500); // Ajoute exactement 1 barre de CJ de 2500mm
                 }
                 // ZÉRO équerre ajoutée !
             }
             
             // CAS 3 : Plafond <= 3000mm ET SANS traverse
             // On ne fait rien. Les montants verticaux suffisent et vont jusqu'au plafond.
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

    let barresNeuvesUtilisees = 0; let nbChutesRecyclees = 0; let chutesDe2500_Montants = [];
    besoinsTraverses.sort((a, b) => b - a); chutesUtilisables.sort((a, b) => b - a);
    besoinsTraverses.forEach(largeurRequise => {
        let comble = false;
        for(let i=0; i < chutesUtilisables.length; i++) {
            if (chutesUtilisables[i] >= largeurRequise) {
                let reste = chutesUtilisables[i] - largeurRequise;
                chutesUtilisables.splice(i, 1);
                if (reste > 50) { chutesUtilisables.push(reste); chutesUtilisables.sort((a, b) => b - a); }
                comble = true; nbChutesRecyclees++; break;
            }
        }
        if (!comble) {
            chutesDe2500_Montants.sort((a, b) => b - a);
            for(let i=0; i < chutesDe2500_Montants.length; i++) {
                    if (chutesDe2500_Montants[i] >= largeurRequise) { chutesDe2500_Montants[i] -= largeurRequise; comble = true; break; }
            }
        }
        if (!comble) { barresNeuvesUtilisees++; let resteNeuve = 2500 - largeurRequise; if (resteNeuve > 50) chutesDe2500_Montants.push(resteNeuve); }
    });
    if (barresNeuvesUtilisees > 0) { add(nomTraverseBarre, barresNeuvesUtilisees); }
    if (nbChutesRecyclees > 0) { add("Chutes de montant réutilisées (Traverses)", nbChutesRecyclees); }
    
    let finalBarresCJNeuves = 0; let finalNbChutesCJRecyclees = 0; let chutesDe2500 = []; 
    besoinsCJ.sort((a, b) => b - a); chutesCJUtilisables.sort((a, b) => b - a);
    besoinsCJ.forEach(largeurRequise => {
        let comble = false;
        for(let i=0; i < chutesCJUtilisables.length; i++) {
            if (chutesCJUtilisables[i] >= largeurRequise) {
                let reste = chutesCJUtilisables[i] - largeurRequise;
                chutesCJUtilisables.splice(i, 1); 
                if (reste > 50) { chutesCJUtilisables.push(reste); chutesCJUtilisables.sort((a, b) => b - a); }
                comble = true; finalNbChutesCJRecyclees++; break;
            }
        }
        if (!comble) {
            chutesDe2500.sort((a, b) => b - a);
            for(let i=0; i < chutesDe2500.length; i++) {
                if (chutesDe2500[i] >= largeurRequise) { chutesDe2500[i] -= largeurRequise; comble = true; break; }
            }
        }
        if (!comble) { finalBarresCJNeuves++; let resteNeuve = 2500 - largeurRequise; if(resteNeuve > 50) chutesDe2500.push(resteNeuve); }
    });
    if (finalBarresCJNeuves > 0) { add(nomCJ_Horizontal, finalBarresCJNeuves); }
    if (finalNbChutesCJRecyclees > 0) { add("Chutes de CJ réutilisées", finalNbChutesCJRecyclees); }

    GLOBAL_STATE.derniereInventaire = inv;

    let keys = Object.keys(inv).sort();
    
    let ossatureKeys = keys.filter(k => k.includes('Lisse') || k.includes('Départ') || k.includes('Montants') || k.includes('Montant') || k.includes('Angle') || k.includes('Profilés') || k.includes('Chute'));
    let parcloseKeys = keys.filter(k => k.includes('Parclose') || k.includes('Joint') || k.includes('Vitrage'));
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

