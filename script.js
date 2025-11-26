import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// Variable globale pour les codes articles (chargée depuis le JSON)
let CODES_ARTICLES = {}; 
// Variables globales pour le calcul
let configMurs = { A: [], B: [], C: [] }; 
let compositionMixte = []; 
// Variables pour la 3D
let currentScene = { renderer: null, animationFrameId: null, scene: null, camera: null, controls: null };

const CONSTANTS = {
    EPAISSEUR_PROFIL: 38,
    LARGEUR_POTEAU_ANGLE: 90.5,
    L_MAX_MODULE: 1216,
    L_MIN_MODULE: 50
};

/* ============================================================================
 * 1. GESTIONNAIRE D'APPLICATION
 * ============================================================================ */

const AppManager = {
    currentStep: 1,
    
    init: async function() {
        // Chargement des références au démarrage
        await this.chargerReferencesExternes();
        
        this.chargerListeProjets();
        this.naviguer(1);
        
        window.addEventListener('resize', () => {
             if(currentScene.camera && currentScene.renderer) {
                 const c = document.getElementById('apercuElevationContainer');
                 if(c) {
                     currentScene.camera.aspect = c.clientWidth / c.clientHeight;
                     currentScene.camera.updateProjectionMatrix();
                     currentScene.renderer.setSize(c.clientWidth, c.clientHeight);
                 }
             }
        });
    },

    // --- CHARGEMENT DES DONNÉES (LOCALE OU FICHIER) ---
    chargerReferencesExternes: async function() {
        // 1. Priorité : Modifs manuelles locales (Admin)
        const localData = localStorage.getItem('kty_references_db');
        if (localData) {
            try {
                CODES_ARTICLES = JSON.parse(localData);
                console.log("✅ Références chargées (Locales).");
                return;
            } catch (e) { localStorage.removeItem('kty_references_db'); }
        }

        // 2. Sinon : Fichier data.json sur le serveur
        try {
            const reponse = await fetch('./data.json');
            if (!reponse.ok) throw new Error("Fichier data.json introuvable");
            
            const jsonBrut = await reponse.json();
            let codesConvertis = {};

            // Conversion Format CMS (Liste) -> Format App (Objet)
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
                CODES_ARTICLES = codesConvertis;
            } else {
                CODES_ARTICLES = jsonBrut; // Ancien format direct
            }
            console.log("✅ Références chargées (Serveur).");
        } catch (erreur) {
            console.error("Erreur chargement références :", erreur);
            CODES_ARTICLES = {}; // Vide par sécurité
        }
    },

    // --- MENU ADMIN SÉCURISÉ (AVEC MOT DE PASSE) ---
    ouvrirAdmin: function() {
        const password = "1234"; 
        const saisie = prompt("🔒 Accès réservé Administrateur.\nVeuillez entrer le mot de passe :");

        if (saisie === password) {
            const modal = document.getElementById('adminModal');
            const editor = document.getElementById('jsonEditor');
            editor.value = JSON.stringify(CODES_ARTICLES, null, 4);
            modal.classList.remove('hidden');
            modal.style.display = 'flex';
        } else if (saisie !== null) {
            window.afficherNotification("⛔ Mot de passe incorrect !");
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
            CODES_ARTICLES = newRefs;
            localStorage.setItem('kty_references_db', JSON.stringify(newRefs));
            window.afficherNotification("✅ Références mises à jour !");
            this.fermerAdmin();
            if (this.currentStep === 3) window.calculerInventaire();
        } catch (e) {
            alert("Erreur de syntaxe JSON !\n" + e.message);
        }
    },

    resetReferences: async function() {
        if(confirm("Effacer les modifications manuelles et recharger le fichier d'origine ?")) {
            localStorage.removeItem('kty_references_db');
            await this.chargerReferencesExternes();
            document.getElementById('jsonEditor').value = JSON.stringify(CODES_ARTICLES, null, 4);
            window.afficherNotification("♻️ Références remises à zéro.");
            if (this.currentStep === 3) window.calculerInventaire();
            this.fermerAdmin();
        }
    },

    // --- NAVIGATION ---
    naviguer: function(step) {
        document.querySelectorAll('.wizard-step').forEach(el => el.classList.remove('active-step'));
        document.querySelectorAll('.step').forEach(el => el.classList.remove('active'));
        
        const targetStep = document.getElementById('step-' + step);
        const targetInd = document.getElementById('ind-step-' + step);
        
        if(targetStep) targetStep.classList.add('active-step');
        if(targetInd) targetInd.classList.add('active');
        
        this.currentStep = step;
        
        if(step === 3 || step === 2) {
            window.adapterFormulaire(); 
        }

        if(step === 3) {
            setTimeout(() => window.calculerInventaire(), 100);
        }
    },

    nouveauProjet: function() {
        document.getElementById('nomChantier').value = "";
        document.getElementById('longueur').value = "3000";
        document.getElementById('longueurB').value = "2000";
        document.getElementById('longueurC').value = "2000";
        document.getElementById('formeCloison').value = "droite";
        document.getElementById('typeCloison').value = "pleine";
        
        configMurs = { A: [], B: [], C: [] }; 
        compositionMixte = [];
        
        window.adapterFormulaire();
        this.naviguer(2);
    },

    validerEtape2: function() {
        const nom = document.getElementById('nomChantier').value;
        if(!nom) { 
            window.demanderConfirmation("Le chantier n'a pas de nom. Continuer quand même ?", 'bleu', () => {
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
                murs: configMurs,
                mixte: compositionMixte
            }
        };

        let projets = JSON.parse(localStorage.getItem('kty_projets') || "[]");
        projets.push(data);
        localStorage.setItem('kty_projets', JSON.stringify(projets));
        
        window.afficherNotification("✅ Projet sauvegardé avec succès !");
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
                <div onclick="app.chargerProjet(${p.id})" style="flex-grow:1;">
                    <strong>${p.nom}</strong>
                    <span>${p.date} - ${p.config.forme}</span>
                </div>
                <button class="btn-delete" onclick="app.supprimerProjet(${p.id})">🗑️</button>
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
        if(p.config.murs) { configMurs = p.config.murs; } 
        else { configMurs = { A: [], B: [], C: [] }; }
        if(p.config.mixte) { compositionMixte = p.config.mixte; }
        else { compositionMixte = []; }
        window.changerForme(); 
        window.adapterFormulaire();
        this.naviguer(3); 
    },

    supprimerProjet: function(id) {
        window.demanderConfirmation("Voulez-vous vraiment supprimer ce projet ?", 'rouge', () => {
            let projets = JSON.parse(localStorage.getItem('kty_projets') || "[]");
            projets = projets.filter(x => x.id !== id);
            localStorage.setItem('kty_projets', JSON.stringify(projets));
            this.chargerListeProjets();
            window.afficherNotification("🗑️ Projet supprimé");
        });
    }
};

window.app = AppManager;

/* ============================================================================
 * 2. MOTEUR 3D
 * ============================================================================ */

async function setupScene(container) {
    if (currentScene.renderer) {
        cancelAnimationFrame(currentScene.animationFrameId);
        container.innerHTML = '';
        currentScene.renderer.dispose();
    }
    const w = container.clientWidth, h = container.clientHeight;
    const scene = new THREE.Scene(); 
    scene.background = new THREE.Color(0xF1F1F1); 
    
    const camera = new THREE.PerspectiveCamera(45, w/h, 10, 50000);
    camera.position.set(2000, 2500, 4000);
    
    const renderer = new THREE.WebGLRenderer({antialias:true, preserveDrawingBuffer:true, alpha: true});
    renderer.setSize(w, h);
    renderer.setPixelRatio(window.devicePixelRatio); 
    renderer.shadowMap.enabled = true; 
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; 
    renderer.toneMapping = THREE.ACESFilmicToneMapping; 
    renderer.toneMappingExposure = 1.0;
    
    container.appendChild(renderer.domElement);
    
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(1500, 4000, 2000);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    const d = 4000;
    dirLight.shadow.camera.left = -d; dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d; dirLight.shadow.camera.bottom = -d;
    dirLight.shadow.bias = -0.0005;
    scene.add(dirLight);
    
    const floorGeo = new THREE.PlaneGeometry(60000, 60000);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.8, metalness: 0.1, side: THREE.DoubleSide });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1; 
    floor.receiveShadow = true; 
    scene.add(floor);

    const gridHelper = new THREE.GridHelper(60000, 100, 0x888888, 0xbbbbbb);
    gridHelper.position.y = 1; 
    gridHelper.material.opacity = 0.5; 
    gridHelper.material.transparent = true;
    scene.add(gridHelper);
    
    const planeGeo = new THREE.PlaneGeometry(60000, 60000);
    const planeMat = new THREE.ShadowMaterial({ opacity: 0.15, color: 0x000000 });
    const plane = new THREE.Mesh(planeGeo, planeMat);
    plane.rotation.x = -Math.PI / 2;
    plane.receiveShadow = true;
    scene.add(plane);
    
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.05;
    
    const forme = document.getElementById('formeCloison').value;
    if (forme === 'L' || forme === 'U') {
        controls.autoRotate = true;
        controls.autoRotateSpeed = 1.0;
    }
    
    const animate = () => { 
        currentScene.animationFrameId = requestAnimationFrame(animate); 
        controls.update(); 
        renderer.render(scene, camera); 
    };
    animate();
    
    currentScene.renderer = renderer; 
    currentScene.scene = scene; 
    currentScene.camera = camera;
    currentScene.controls = controls;
    
    return {scene, controls};
}

function dessinerPanneauPorte3D(groupe, cx, cy, l, h, typeP, mats, sens) {
    let epSurf = (typeP==='cadreAlu') ? 38 : 12;
    const addMesh = (geo, mat) => {
        const m = new THREE.Mesh(geo, mat);
        m.castShadow = true; m.receiveShadow = true;
        if(mat.transparent) m.castShadow = false;
        groupe.add(m);
        return m;
    };
    if (typeP === 'cadreAlu') {
        const epCadre = 80;
        const lV = l - (2 * epCadre); const hV = h - (2 * epCadre);
        const gm = new THREE.BoxGeometry(epCadre, h, epSurf);
        const mG = addMesh(gm, mats.matProfil); mG.position.set(cx - l/2 + epCadre/2, cy, 0);
        const mD = addMesh(gm, mats.matProfil); mD.position.set(cx + l/2 - epCadre/2, cy, 0);
        const gt = new THREE.BoxGeometry(lV, epCadre, epSurf);
        const mTH = addMesh(gt, mats.matProfil); mTH.position.set(cx, cy + h/2 - epCadre/2, 0);
        const mTB = addMesh(gt, mats.matProfil); mTB.position.set(cx, cy - h/2 + epCadre/2, 0);
        if(lV>0 && hV>0) { const mv = addMesh(new THREE.BoxGeometry(lV, hV, 6), mats.matVitre); mv.position.set(cx, cy, 0); }
    } else {
        const mp = addMesh(new THREE.BoxGeometry(l, h, 40), mats.matPortePleine); mp.position.set(cx, cy, 0);
    }
    if(sens !== 'aucune') {
        const YP = 1050; const realYP = cy - h/2 + YP; 
        if(realYP > cy-h/2 && realYP < cy+h/2) {
            const xP = (sens==='gauche') ? (cx - l/2 + 60) : (cx + l/2 - 60);
            const man = addMesh(new THREE.CylinderGeometry(8,8,120,16), mats.matPoignee);
            man.rotation.z = Math.PI/2; man.position.set(xP, realYP, epSurf/2 + 20);
        }
    }
}

async function dessinerSceneGlobale(murs, forme, H, configs) {
    const container = document.getElementById('apercuElevationContainer');
    if(!container) return;
    const {scene, controls} = await setupScene(container);
    
    const hasImposteModules = document.getElementById('imposteModules').checked;
    const hImposteVal = parseFloat(document.getElementById('hauteurImposte').value) || 2040;
    const ral = document.getElementById('couleurRal').value;
    
    let cHex = 0xffffff; let metalness = 0.1; let roughness = 0.5;
    if(ral==='7016') { cHex=0x373a3c; metalness=0.3; roughness=0.4; }
    if(ral==='9005') { cHex=0x111111; metalness=0.2; roughness=0.5; }
    if(ral==='anodise') { cHex=0xc0c0c0; metalness=0.7; roughness=0.2; }
    if(ral==='9016') { cHex=0xffffff; metalness=0.1; roughness=0.3; }
    
    const mats = {
        matProfil: new THREE.MeshStandardMaterial({ color: cHex, metalness: metalness, roughness: roughness, side: THREE.DoubleSide }),
        matVitre: new THREE.MeshPhysicalMaterial({ color: 0x88ccff, metalness: 0.0, roughness: 0.0, clearcoat: 1.0, clearcoatRoughness: 0.0, transparent: true, opacity: 0.3, side: THREE.DoubleSide, envMapIntensity: 1.5 }),
        matPlein: new THREE.MeshStandardMaterial({ color: 0xfdfdfd, roughness: 0.9, metalness: 0.0 }),
        matPortePleine: new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.6 }),
        matPoignee: new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.9, roughness: 0.1 })
    };

    const root = new THREE.Group(); scene.add(root);
    let curPos = new THREE.Vector3(0,0,0); let curDir = new THREE.Vector3(1,0,0);
    const fwd = (d) => curPos.add(curDir.clone().multiplyScalar(d));
    const rot = () => { let ox=curDir.x, oz=curDir.z; curDir.x=oz; curDir.z=-ox; };
    const createMesh = (geo, mat, parent) => {
        const m = new THREE.Mesh(geo, mat);
        m.castShadow = true; m.receiveShadow = true;
        if(mat === mats.matVitre) m.castShadow = false; 
        parent.add(m); return m;
    };

    murs.forEach((mid, idx) => {
        const conf = configs[mid]; const g = new THREE.Group(); g.position.copy(curPos);
        let ang = Math.atan2(curDir.z, curDir.x); g.rotation.y = -ang;
        if(curDir.z<0 && curDir.x===0) g.rotation.y = Math.PI/2;
        root.add(g);
        let x = 0;
        if(idx===0) { const md = createMesh(new THREE.BoxGeometry(38,H,38), mats.matProfil, g); md.position.set(19,H/2,0); x += 38; }

        conf.forEach(m => {
            if(m.type === 'porte') {
                const lp = getLargeurPorte(); const lb = lp+38; 
                const sens = document.getElementById('sensPoussant').value;
                const typP = document.getElementById('typePorte').value;
                const hP = document.getElementById('hauteurPorte').value;
                const isD = document.getElementById('doublePorte').checked;
                const centreOuverture = x + lp/2; const lRailEffective = lp + 38;
                const mp = createMesh(new THREE.BoxGeometry(38,H,38), mats.matProfil, g); mp.position.set(x + lb - 19, H/2, 0);
                if(hP==='2040') { const mt = createMesh(new THREE.BoxGeometry(lRailEffective,38,38), mats.matProfil, g); mt.position.set(centreOuverture, 2040+19, 0); }
                const mrh = createMesh(new THREE.BoxGeometry(lRailEffective,38,38), mats.matProfil, g); mrh.position.set(centreOuverture, H-19, 0);
                const startV = x; const hOuv = (hP==='touteHauteur') ? H-38 : 2040; const yOuv = (hP==='touteHauteur') ? H/2 : 1020;
                if(isD) {
                    let l1 = lp/2, l2 = lp/2;
                    const txt = document.getElementById('huisserieDoublePorteSelect').options[document.getElementById('huisserieDoublePorteSelect').selectedIndex].text;
                    const ma = txt.match(/\((\d+)\+(\d+)\)/);
                    if(ma) { l1=parseFloat(ma[1]); l2=parseFloat(ma[2]); } else { l2 = lp - l1; }
                    dessinerPanneauPorte3D(g, startV+l1/2, yOuv, l1, hOuv, typP, mats, sens);
                    dessinerPanneauPorte3D(g, startV+l1+l2/2, yOuv, l2, hOuv, typP, mats, 'aucune');
                    if(typP==='cadreAlu') { const bat = createMesh(new THREE.BoxGeometry(4,hOuv,40), mats.matProfil, g); bat.position.set(startV+l1, yOuv, 0); }
                } else { dessinerPanneauPorte3D(g, startV+lp/2, yOuv, lp, hOuv, typP, mats, sens); }
                if(hP==='2040' && H>2078) {
                     const typI = document.getElementById('typeImposte').value;
                     let splitImpostePorte = (hasImposteModules && hImposteVal > 2060 && H > hImposteVal + 38);
                     if(splitImpostePorte) {
                         const trSupp = createMesh(new THREE.BoxGeometry(lRailEffective, 38, 38), mats.matProfil, g); trSupp.position.set(centreOuverture, hImposteVal + 19, 0);
                         let h1 = hImposteVal - 2078; let y1 = 2078 + h1/2;
                         let h2 = H - (hImposteVal + 38) - 38; let y2 = (hImposteVal + 38) + h2/2;
                         const matI = (typI==='vitree')?mats.matVitre:mats.matPlein; const epI = (typI==='vitree')?6:12;
                         if(h1>0) { const mi1 = createMesh(new THREE.BoxGeometry(lp,h1,epI), matI, g); mi1.position.set(centreOuverture, y1, 0); }
                         if(h2>0) { const mi2 = createMesh(new THREE.BoxGeometry(lp,h2,12), mats.matPlein, g); mi2.position.set(centreOuverture, y2, 0); }
                     } else {
                         const hi = H-2078; const matI = (typI==='vitree')?mats.matVitre:mats.matPlein; const epI = (typI==='vitree')?6:12;
                         const mi = createMesh(new THREE.BoxGeometry(lp,hi,epI), matI, g); mi.position.set(centreOuverture, 2078+hi/2, 0);
                     }
                }
                x += lb;
            } else {
                const lp = m.largeur; const lb = lp+38; const cx = x+lp/2;
                const mp = createMesh(new THREE.BoxGeometry(38,H,38), mats.matProfil, g); mp.position.set(x+lb-19, H/2, 0);
                const mlb = createMesh(new THREE.BoxGeometry(lb, 38, 38), mats.matProfil, g); mlb.position.set(cx-19+19, 19, 0);
                const mlh = createMesh(new THREE.BoxGeometry(lb, 38, 38), mats.matProfil, g); mlh.position.set(cx-19+19, H-19, 0);
                let cuts = [];
                if(m.type === 'vitreeSurAllege') { cuts.push({y: (m.hAllege||1100) + 19, type: 'allege'}); }
                if(hasImposteModules && H > hImposteVal + 38) { if(!cuts.some(c => Math.abs(c.y - (hImposteVal+19)) < 10)) { cuts.push({y: hImposteVal + 19, type: 'imposte'}); } }
                cuts.sort((a,b) => a.y - b.y);
                cuts.forEach(c => { const tr = createMesh(new THREE.BoxGeometry(lb, 38, 38), mats.matProfil, g); tr.position.set(cx-19+19, c.y, 0); });
                let yStart = 38; let limits = cuts.map(c => c.y - 19); limits.push(H - 38);
                limits.forEach((yEnd, i) => {
                    let hZone = yEnd - yStart;
                    if(hZone > 1) { 
                        let yCenter = yStart + hZone/2;
                        let isVitre = (m.type.includes('vitree'));
                        if(m.type === 'vitreeSurAllege') { let hA = m.hAllege || 1100; if(yEnd <= hA + 5) isVitre = false; }
                        if(hasImposteModules && yStart > hImposteVal + 10) { isVitre = false; }
                        const mat = isVitre ? mats.matVitre : mats.matPlein; const ep = isVitre ? 6 : 12;
                        const mesh = createMesh(new THREE.BoxGeometry(lp, hZone, ep), mat, g); mesh.position.set(cx, yCenter, 0);
                    }
                    yStart = yEnd + 38;
                });
                x += lb;
            }
        });
        fwd(x);
        if(idx < murs.length-1) {
            const ang = createMesh(new THREE.BoxGeometry(90.5,H,90.5), mats.matProfil, root); 
            ang.position.copy(curPos).add(curDir.clone().multiplyScalar(45.25)); ang.position.y = H/2; 
            fwd(45.25); rot(); fwd(45.25);
        }
    });

    const b = new THREE.Box3().setFromObject(root); 
    if(!b.isEmpty()) {
        const c = b.getCenter(new THREE.Vector3()); const sz = b.getSize(new THREE.Vector3());
        const maxDim = Math.max(sz.x, sz.y, sz.z); controls.target.copy(c); 
        const dist = maxDim * 1.5; const dir = new THREE.Vector3(0.8, 0.6, 1.0).normalize(); 
        currentScene.camera.position.copy(c).add(dir.multiplyScalar(dist));
        controls.update();
    }
}

/* ============================================================================
 * 4. LOGIQUE MÉTIER & UI
 * ============================================================================ */

window.getMurActif = function() {
    const radios = document.getElementsByName('murActif');
    for (let r of radios) { if (r.checked) return r.value; }
    return 'A';
}

window.getLargeurPorte = function() {
    let total = 0;
    const el = document.getElementById('doublePorte');
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

window.changerForme = function() {
    const f = document.getElementById('formeCloison').value;
    if(f === 'L' || f === 'U') { document.getElementById('typeCloison').value = 'mixte'; }
    window.adapterFormulaire();
}

function toggleDisplay(elementId, show, displayType = 'block') {
    const el = document.getElementById(elementId);
    if (!el) return;
    if (show) { el.classList.remove('hidden'); el.style.display = displayType; } 
    else { el.classList.add('hidden'); el.style.display = 'none'; }
}

window.adapterFormulaire = function() {
    const forme = document.getElementById('formeCloison').value;
    const configDepart = document.getElementById('configDepart').value;
    if (forme === 'L' && configDepart === '1') { toggleDisplay('divPosDepartL', true); } else { toggleDisplay('divPosDepartL', false); }

    const isDbleCheck = document.getElementById('doublePorte').checked;
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
    const isDble = document.getElementById('doublePorte').checked;
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
    toggleDisplay('optionsImposte', (hp === '2040'));
    const imp = document.getElementById('imposteModules').checked;
    toggleDisplay('optionsImposteModules', imp);
    
    if(isMixte) { window.mettreAJourListeMixte(); window.adapterFormulaireMixte(); }
}

window.adapterFormulaireMixte = function() {
    const type = document.getElementById('mixteTypeModule').value;
    if(type === 'porte') {
        toggleDisplay('mixteLargeurContainer', false);
        toggleDisplay('mixteAllegeContainer', false);
    } else {
        toggleDisplay('mixteLargeurContainer', true);
        toggleDisplay('mixteAllegeContainer', (type === 'vitreeSurAllege'));
    }
}

window.ajouterModuleMixte = function() {
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
    configMurs[mur].forEach(m => { 
        utilise += (m.type==='porte') ? (getLargeurPorte()+CONSTANTS.EPAISSEUR_PROFIL) : (m.largeur+CONSTANTS.EPAISSEUR_PROFIL); 
    });
    
    let largeurAjout = 0; let nouvModule = {};
    if(type === 'porte') {
        if(parseFloat(document.getElementById('qtePortes').value) < 1) { alert("Mettez au moins 1 porte dans la config globale"); return; }
        largeurAjout = lp + CONSTANTS.EPAISSEUR_PROFIL; nouvModule = { type: 'porte' };
    } else {
        let w = parseFloat(document.getElementById('mixteLargeurModule').value)||0;
        if(w < CONSTANTS.L_MIN_MODULE) { alert(`Largeur min ${CONSTANTS.L_MIN_MODULE}mm`); return; }
        largeurAjout = w + CONSTANTS.EPAISSEUR_PROFIL;
        let ha = parseFloat(document.getElementById('mixteHauteurAllege').value)||0;
        nouvModule = { type: type, largeur: w, hAllege: ha };
    }
    if (utilise + largeurAjout > L - deduction + 1) { alert(`Dépassement ! Reste : ${(L-deduction-utilise).toFixed(0)}mm`); return; }
    configMurs[mur].push(nouvModule);
    window.mettreAJourListeMixte();
}

window.retirerModuleMixte = function(idx) { 
    const mur = getMurActif(); configMurs[mur].splice(idx, 1); window.mettreAJourListeMixte(); 
}

window.mettreAJourListeMixte = function() {
    const mur = getMurActif();
    const ul = document.getElementById('compositionModules');
    ul.innerHTML = "";
    let utilise = 0; const lp = getLargeurPorte();
    configMurs[mur].forEach((m, i) => {
        let txt = m.type; let w = 0;
        if(m.type==='porte') { txt=`PORTE (${lp}mm)`; w=lp+CONSTANTS.EPAISSEUR_PROFIL; }
        else { w=m.largeur+CONSTANTS.EPAISSEUR_PROFIL; txt=`${m.type} (${m.largeur}mm)`; }
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
    document.getElementById('mixteResumeLargeur').innerHTML = `Mur ${mur} : Reste à combler : ${reste.toFixed(0)} mm`;
}

window.remplirAutomatiquement = function() {
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
    configMurs[mur].forEach(m => utilise += (m.type==='porte' ? lp+CONSTANTS.EPAISSEUR_PROFIL : m.largeur+CONSTANTS.EPAISSEUR_PROFIL));
    let reste = (L - deduction) - utilise;
    if(reste < CONSTANTS.L_MIN_MODULE) return;
    const L_MOD_AXE = 1216; 
    
    if (type === 'pleine') {
        let nb = Math.floor(reste / L_MOD_AXE);
        let resteFinal = reste - (nb * L_MOD_AXE) - 38;
        if (resteFinal < 50 && nb > 0) { nb--; resteFinal += L_MOD_AXE; }
        let ha = parseFloat(document.getElementById('mixteHauteurAllege').value)||0;
        for(let k=0; k<nb; k++) configMurs[mur].push({type: type, largeur: 1178, hAllege: ha});
        if (resteFinal >= 10) configMurs[mur].push({type: type, largeur: resteFinal, hAllege: ha});
    } else {
        let nb = Math.ceil(reste / L_MOD_AXE);
        if(nb < 1) nb = 1;
        let wUnit = (reste / nb) - 38;
        if (wUnit < 50) { nb--; if(nb < 1) nb = 1; wUnit = (reste / nb) - 38; }
        let ha = parseFloat(document.getElementById('mixteHauteurAllege').value)||0;
        for(let k=0; k<nb; k++) { configMurs[mur].push({type: type, largeur: wUnit, hAllege: ha}); }
    }
    window.mettreAJourListeMixte();
}

/* ============================================================================
 * 5. CALCULATEUR D'INVENTAIRE
 * ============================================================================ */
window.calculerInventaire = async function() {
    let inv = {};
    const add = (n, q) => { if(q>0) inv[n] = (inv[n]||0) + q; };
    function ajouterAuStock(nom, quantite) { if (quantite > 0) { inv[nom] = (inv[nom] || 0) + quantite; } }
    
    let htmlList = "";
    let chutesUtilisables = []; let besoinsTraverses = []; 
    let chutesCJUtilisables = []; let besoinsCJ = [];
    let totalPortes = 0;
    let totalMetrageJointsByType = {}; 
    let qteEquerresTraverse = 0;
    
    const forme = document.getElementById('formeCloison').value;
    const qteDepartsMurs = parseInt(document.getElementById('configDepart').value, 10);
    const typeGlob = document.getElementById('typeCloison').value;
    const H = parseFloat(document.getElementById('hauteur').value);
    const H_IMPOSTE = parseFloat(document.getElementById('hauteurImposte').value) || 2040;
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
        configMurs = { A:[], B:[], C:[] };
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
                for(let k=0; k<qP; k++) { configMurs[id].push({type:'porte'}); dispo -= (lP+CONSTANTS.EPAISSEUR_PROFIL); }
            }
            
            if(dispo > 5) {
                const L_MOD_AXE = 1216; 
                if (typeGlob === 'pleine') {
                    let nb = Math.floor(dispo / L_MOD_AXE);
                    let resteLargeur = dispo - (nb * L_MOD_AXE);
                    let largeurDernierPanneau = resteLargeur - 38;
                    if (largeurDernierPanneau < 100 && nb > 0) { nb--; largeurDernierPanneau += L_MOD_AXE; }
                    for(let k=0; k<nb; k++) configMurs[id].push({type:typeGlob, largeur:1178});
                    if (largeurDernierPanneau > 10) { configMurs[id].push({type:typeGlob, largeur:largeurDernierPanneau}); }
                } else {
                    let nb = Math.ceil(dispo / L_MOD_AXE);
                    if(nb < 1) nb = 1;
                    let wUnit = (dispo / nb) - 38;
                    for(let k=0; k<nb; k++) configMurs[id].push({type:typeGlob, largeur:wUnit});
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
        let modulesDuMur = configMurs[id];
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
            if(m.type==='porte') { totalPortes++; htmlList += `<li>Huisserie (${getLargeurPorte()}mm)</li>`; } 
            else {
                let nom = m.type === 'pleine' ? 'Module plein' : m.type === 'vitree' ? 'Module vitré' : 'Module allège';
                htmlList += `<li>${nom} (${m.largeur.toFixed(0)}mm)</li>`;
                add('Calles de lisse', m.type==='pleine'?2:(m.type==='vitree'?6:4));
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
                    for(let k=0; k<nbTrav; k++) { besoinsTraverses.push(m.largeur); besoinsCJ.push(m.largeur); besoinsCJ.push(m.largeur); }
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
        if (configMurs['A'].length === 1) nbMontantsSpeciaux++; else nbMontantsStandard++;
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
        if (configMurs[murFinId].length === 1) nbMontantsSpeciaux++; else nbMontantsStandard++;
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
        else if (hp === '2040' && tp === 'cadreAlu' && vitragePorteVal === 'isolant') { nbPaumellesParVantail = 4; }
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
        if(document.getElementById('hauteurPorte').value==='2040') {
             for(let k=0; k < totalPortes; k++) { besoinsCJ.push(lp); besoinsCJ.push(lp); }
             if(hasImposteModules && H > H_IMPOSTE+38 && H_IMPOSTE > 2040) {
                 for(let k=0; k < totalPortes; k++) { besoinsTraverses.push(lp); besoinsCJ.push(lp); besoinsCJ.push(lp); }
                 qteEquerresTraverse += totalPortes * 2; 
             }
             if(H > 2078) {
                 let typeImp = document.getElementById('typeImposte').value;
                 if(typeImp === 'vitree') { 
                     let qteParcloseImposte = isD ? 2 : 1; 
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

    window.derniereInventaire = inv;

    let keys = Object.keys(inv).sort();
    
    // TRI PAR CATEGORIE POUR L'AFFICHAGE WEB
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
    try { await dessinerSceneGlobale(murs, forme, H, configMurs); } catch(e) { console.error("Erreur 3D:", e); }
}

/* ============================================================================
 * 6. IMPRESSION PDF (AVEC ORDRE ET TRI)
 * ============================================================================ */
window.imprimerDevis = async function() {
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

    // Capture 3D
    let imgData = '';
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

    // --- CONSTRUCTION TABLEAU PDF AVEC TRI PERSONNALISÉ ---
    let tableauHTMLAvecCodes = '<table style="width:100%; border-collapse: collapse; font-size:10pt;"><thead><tr><th style="background:#007bff; color:white; padding:8px; text-align:left;">Référence</th><th style="background:#007bff; color:white; padding:8px; text-align:left;">Désignation</th><th style="background:#007bff; color:white; padding:8px; text-align:left;">Quantité</th></tr></thead><tbody>';
    
    if (window.derniereInventaire) {
        const inv = window.derniereInventaire;
        let keys = Object.keys(inv);

        // Ordre de priorité pour le PDF
        const ordrePriorite = [
            "Lisse",           // 1
            "Départ",          // 2
            "Montant",         // 3
            "Angle",           // 4
            "Couvre joints",   // 5
            "Capot",           // 6
            "Équerre",         // 7
            "éclisse",         // 8
            "Clips",           // 9
            "Calle",           // 10
            "Joint",           // 11
            "Parclose",        // 12
            "Huisserie",       // 13
            "Porte",           // 14
            "Vantail",         // 15
            "Paumelle",        // 16
            "Béquille",        // 17
            "Plinthe"          // 18
        ];

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
                const entry = CODES_ARTICLES[k];
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

document.addEventListener('DOMContentLoaded', () => {
    AppManager.init();
});

window.afficherNotification = function(message) {
    let toast = document.createElement("div");
    toast.className = "toast-notification";
    toast.innerText = message;
    document.body.appendChild(toast);
    setTimeout(() => { toast.classList.add("show"); }, 100);
    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => { document.body.removeChild(toast); }, 500);
    }, 3000);
}

window.demanderConfirmation = function(message, couleurBouton, callbackOui) {
    let overlay = document.createElement('div');
    overlay.className = 'custom-modal-overlay';
    let classeBtn = (couleurBouton === 'rouge') ? 'btn-danger-modal' : 'btn-yes';
    overlay.innerHTML = `
        <div class="custom-modal">
            <p>${message}</p>
            <div class="modal-buttons">
                <button id="modal-btn-no" class="btn-modal btn-no">Annuler</button>
                <button id="modal-btn-yes" class="btn-modal ${classeBtn}">Confirmer</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    document.getElementById('modal-btn-yes').onclick = function() { document.body.removeChild(overlay); callbackOui(); };
    document.getElementById('modal-btn-no').onclick = function() { document.body.removeChild(overlay); };
}

