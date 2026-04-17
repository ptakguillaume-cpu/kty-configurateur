import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLOBAL_STATE } from './state.js';

export async function setupScene(container) {
    if (GLOBAL_STATE.currentScene.renderer) {
        cancelAnimationFrame(GLOBAL_STATE.currentScene.animationFrameId);
        container.innerHTML = '';
        GLOBAL_STATE.currentScene.renderer.dispose();
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
        GLOBAL_STATE.currentScene.animationFrameId = requestAnimationFrame(animate); 
        controls.update(); 
        renderer.render(scene, camera); 
    };
    animate();
    
    GLOBAL_STATE.currentScene.renderer = renderer; 
    GLOBAL_STATE.currentScene.scene = scene; 
    GLOBAL_STATE.currentScene.camera = camera;
    GLOBAL_STATE.currentScene.controls = controls;
    
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

function getLargeurPorteLocal() {
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

export async function dessinerSceneGlobale(murs, forme, H, configs) {
    const container = document.getElementById('apercuElevationContainer');
    if(!container) return;
    const {scene, controls} = await setupScene(container);
    
    const hasImposteModules = document.getElementById('imposteModules').checked;
    const hImposteVal = parseFloat(document.getElementById('hauteurImposte').value) || 2100;
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
                const lp = getLargeurPorteLocal(); const lb = lp+38; 
                const sens = m.sens || 'droite'; 
                const typP = document.getElementById('typePorte').value;
                const hP = document.getElementById('hauteurPorte').value;
                const isD = document.getElementById('doublePorte').checked;
                const centreOuverture = x + lp/2; const lRailEffective = lp + 38;
                const mp = createMesh(new THREE.BoxGeometry(38,H,38), mats.matProfil, g); mp.position.set(x + lb - 19, H/2, 0);
                
                let hOuv = 2100; let drawTraverse = false; let traverseYPos = 0;
                let hasImposteM = document.getElementById('imposteModules').checked;
                let hImpVal = parseFloat(document.getElementById('hauteurImposte').value) || 2100;

                if (hP === '2100') { hOuv = 2100; drawTraverse = true; traverseYPos = 2100; } 
                else if (hP === 'touteHauteur') {
                    let selectTTH = document.getElementById('typeTraverseTTH');
                    let typeTTH = selectTTH ? selectTTH.value : 'sansTraverse';
                    if (hasImposteM && H > hImpVal + 38) { hOuv = hImpVal; drawTraverse = true; traverseYPos = hImpVal; } 
                    else if (H > 3000) { hOuv = 3000; drawTraverse = true; traverseYPos = 3000; } 
                    else if (typeTTH === 'avecTraverse') { hOuv = H - 38; drawTraverse = true; traverseYPos = H - 38; } 
                    else { hOuv = H; drawTraverse = false; }
                }
                
                const yOuv = hOuv / 2; const startV = x;

                if (drawTraverse) { const mt = createMesh(new THREE.BoxGeometry(lRailEffective, 38, 38), mats.matProfil, g); mt.position.set(centreOuverture, traverseYPos + 19, 0); }
                const mrh = createMesh(new THREE.BoxGeometry(lRailEffective, 38, 38), mats.matProfil, g); mrh.position.set(centreOuverture, H - 19, 0);

                if (hP === 'touteHauteur' && drawTraverse && H > traverseYPos + 38) {
                    let hVide = H - traverseYPos - 38; let yVide = traverseYPos + 38 + (hVide / 2);
                    let typeImp = document.getElementById('typeImposte') ? document.getElementById('typeImposte').value : 'vitree';
                    let matVide = (typeImp === 'vitree') ? mats.matVitre : mats.matPlein;
                    let epVide = (typeImp === 'vitree') ? 6 : 12;
                    const impostePorte = createMesh(new THREE.BoxGeometry(lRailEffective, hVide, epVide), matVide, g); impostePorte.position.set(centreOuverture, yVide, 0);
                }

                if(isD) {
                    let l1 = lp/2, l2 = lp/2;
                    const txt = document.getElementById('huisserieDoublePorteSelect').options[document.getElementById('huisserieDoublePorteSelect').selectedIndex].text;
                    const ma = txt.match(/\((\d+)\+(\d+)\)/);
                    if(ma) { l1=parseFloat(ma[1]); l2=parseFloat(ma[2]); } else { l2 = lp - l1; }
                    dessinerPanneauPorte3D(g, startV+l1/2, yOuv, l1, hOuv, typP, mats, sens);
                    dessinerPanneauPorte3D(g, startV+l1+l2/2, yOuv, l2, hOuv, typP, mats, 'aucune');
                    if(typP==='cadreAlu') { const bat = createMesh(new THREE.BoxGeometry(4,hOuv,40), mats.matProfil, g); bat.position.set(startV+l1, yOuv, 0); }
                } else { 
                    dessinerPanneauPorte3D(g, startV+lp/2, yOuv, lp, hOuv, typP, mats, sens); 
                }

                if(hP==='2100' && H>2100 + 38) {
                     const typI = document.getElementById('typeImposte').value;
                     let splitImpostePorte = (hasImposteModules && hImposteVal > 2120 && H > hImposteVal + 38);
                     if(splitImpostePorte) {
                         const trSupp = createMesh(new THREE.BoxGeometry(lRailEffective, 38, 38), mats.matProfil, g); trSupp.position.set(centreOuverture, hImposteVal + 19, 0);
                         let h1 = hImposteVal - (2100+38); let y1 = (2100+38) + h1/2;
                         let h2 = H - (hImposteVal + 38) - 38; let y2 = (hImposteVal + 38) + h2/2;
                         const matI = (typI==='vitree')?mats.matVitre:mats.matPlein; const epI = (typI==='vitree')?6:12;
                         if(h1>0) { const mi1 = createMesh(new THREE.BoxGeometry(lp,h1,epI), matI, g); mi1.position.set(centreOuverture, y1, 0); }
                         if(h2>0) { const mi2 = createMesh(new THREE.BoxGeometry(lp,h2,12), mats.matPlein, g); mi2.position.set(centreOuverture, y2, 0); }
                     } else {
                         const hi = H-(2100+38); const matI = (typI==='vitree')?mats.matVitre:mats.matPlein; const epI = (typI==='vitree')?6:12;
                         const mi = createMesh(new THREE.BoxGeometry(lp,hi,epI), matI, g); mi.position.set(centreOuverture, (2100+38)+hi/2, 0);
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
                        if(hasImposteModules && yStart > hImposteVal + 10) { 
                            let typeImp = document.getElementById('typeImposte') ? document.getElementById('typeImposte').value : 'vitree';
                            isVitre = (typeImp === 'vitree'); 
                        }
                        const mat = isVitre ? mats.matVitre : mats.matPlein; const ep = isVitre ? 6 : 12;
                        const mesh = createMesh(new THREE.BoxGeometry(lp, hZone, ep), mat, g); mesh.position.set(cx, yCenter, 0);
                    }
                    yStart = yEnd + 38;
                });
                x += lb;
            }
        }); // Fin du dessin des modules pour ce mur

        // --- C'EST ICI QU'ON APPELLE LA FONCTION DES COTES ---
        // Largeur (en dessous du mur)
        drawDimension(g, 0, -100, 50, x, -100, 50, `${Math.round(x)} mm`, 0, -90);
        // Hauteur (uniquement sur le 1er mur)
        if (idx === 0) {
            drawDimension(g, -100, 0, 50, -100, H, 50, `${Math.round(H)} mm`, -200, 0);
        }
        
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
        GLOBAL_STATE.currentScene.camera.position.copy(c).add(dir.multiplyScalar(dist));
        controls.update();
    }
}

// =========================================================================
// NOUVELLE FONCTION : DESSINER LES COTES (LIGNES ET TEXTE)
// =========================================================================
function drawDimension(parent, x1, y1, z1, x2, y2, z2, textMsg, textOffsetX, textOffsetY) {
    const points = [];
    points.push(new THREE.Vector3(x1, y1, z1));
    points.push(new THREE.Vector3(x2, y2, z2));
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({ color: 0x2563EB, linewidth: 2 }); 
    const line = new THREE.Line(geo, mat);
    parent.add(line);

    const tickSize = 30;
    if (x1 !== x2) { 
        const pT1 = [new THREE.Vector3(x1, y1-tickSize, z1), new THREE.Vector3(x1, y1+tickSize, z1)];
        parent.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pT1), mat));
        const pT2 = [new THREE.Vector3(x2, y2-tickSize, z2), new THREE.Vector3(x2, y2+tickSize, z2)];
        parent.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pT2), mat));
    } else { 
        const pT1 = [new THREE.Vector3(x1-tickSize, y1, z1), new THREE.Vector3(x1+tickSize, y1, z1)];
        parent.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pT1), mat));
        const pT2 = [new THREE.Vector3(x2-tickSize, y2, z2), new THREE.Vector3(x2+tickSize, y2, z2)];
        parent.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pT2), mat));
    }

    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = "#2563EB";
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, 512, 128);
    
    ctx.font = "bold 60px sans-serif";
    ctx.fillStyle = "#0F172A";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(textMsg, 256, 64);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, depthTest: false }); 
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(350, 85, 1); 
    
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    const midZ = (z1 + z2) / 2;
    sprite.position.set(midX + textOffsetX, midY + textOffsetY, midZ);
    sprite.renderOrder = 999; 
    
    parent.add(sprite);
}
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
        GLOBAL_STATE.currentScene.animationFrameId = requestAnimationFrame(animate); 
        controls.update(); 
        renderer.render(scene, camera); 
    };
    animate();
    
    GLOBAL_STATE.currentScene.renderer = renderer; 
    GLOBAL_STATE.currentScene.scene = scene; 
    GLOBAL_STATE.currentScene.camera = camera;
    GLOBAL_STATE.currentScene.controls = controls;
    
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

// Fonction utilitaire déplacée ici car dépendante de DOM + 3D
function getLargeurPorteLocal() {
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

export async function dessinerSceneGlobale(murs, forme, H, configs) {
    const container = document.getElementById('apercuElevationContainer');
    if(!container) return;
    const {scene, controls} = await setupScene(container);
    
    const hasImposteModules = document.getElementById('imposteModules').checked;
    const hImposteVal = parseFloat(document.getElementById('hauteurImposte').value) || 2100;
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
                const lp = getLargeurPorteLocal(); const lb = lp+38; 
                const sens = m.sens || 'droite'; 
                const typP = document.getElementById('typePorte').value;
                const hP = document.getElementById('hauteurPorte').value;
                const isD = document.getElementById('doublePorte').checked;
                const centreOuverture = x + lp/2; const lRailEffective = lp + 38;
                const mp = createMesh(new THREE.BoxGeometry(38,H,38), mats.matProfil, g); mp.position.set(x + lb - 19, H/2, 0);
                                  // --- NOUVELLE LOGIQUE 3D POUR LA HAUTEUR DE LA PORTE ET LA TRAVERSE ---
           // --- NOUVELLE LOGIQUE 3D POUR LA HAUTEUR DE LA PORTE ET LA TRAVERSE ---
                let hOuv = 2100;
                let drawTraverse = false;
                let traverseYPos = 0;

                let hasImposteM = document.getElementById('imposteModules').checked;
                let hImpVal = parseFloat(document.getElementById('hauteurImposte').value) || 2100;

                if (hP === '2100') {
                    hOuv = 2100;
                    drawTraverse = true;
                    traverseYPos = 2100;
                } else if (hP === 'touteHauteur') {
                    let selectTTH = document.getElementById('typeTraverseTTH');
                    let typeTTH = selectTTH ? selectTTH.value : 'sansTraverse';
                    
                    // RÈGLE : Une TTH est indépendante de l'imposte de la cloison.
                    if (H > 3000) {
                        hOuv = 3000; // S'arrête toujours à 3000mm max
                        drawTraverse = true;
                        traverseYPos = 3000;
                    } else if (typeTTH === 'avecTraverse') {
                        hOuv = H - 38;
                        drawTraverse = true;
                        traverseYPos = H - 38;
                    } else {
                        hOuv = H - 38; // SANS traverse : la porte glisse pile sous la lisse du plafond
                        drawTraverse = false;
                    }
                }
                
                const yOuv = hOuv / 2;
                const startV = x;

                // 1. Dessin de la traverse au-dessus de la porte
                if (drawTraverse) { 
                    const mt = createMesh(new THREE.BoxGeometry(lRailEffective, 38, 38), mats.matProfil, g); 
                    mt.position.set(centreOuverture, traverseYPos + 19, 0); 
                }

                // 2. Dessin de la lisse haute du plafond
                const mrh = createMesh(new THREE.BoxGeometry(lRailEffective, 38, 38), mats.matProfil, g); 
                mrh.position.set(centreOuverture, H - 19, 0);

                // 3. Dessin du panneau pour boucher le "trou" au-dessus (UNIQUEMENT TTH)
                if (hP === 'touteHauteur' && drawTraverse && H > traverseYPos + 38) {
                    let hVide = H - traverseYPos - 38;
                    let yVide = traverseYPos + 38 + (hVide / 2);
                    
                    let typeImp = document.getElementById('typeImposte') ? document.getElementById('typeImposte').value : 'vitree';
                    let matVide = (typeImp === 'vitree') ? mats.matVitre : mats.matPlein;
                    let epVide = (typeImp === 'vitree') ? 6 : 12;
                    
                    const impostePorte = createMesh(new THREE.BoxGeometry(lRailEffective, hVide, epVide), matVide, g);
                    impostePorte.position.set(centreOuverture, yVide, 0);
                }
                // -------------------------------------------------------------------------
 // Les variables hOuv et yOuv sont maintenant prêtes pour le reste du dessin !
                // -------------------------------------------------------------------------
                if(isD) {
                    let l1 = lp/2, l2 = lp/2;
                    const txt = document.getElementById('huisserieDoublePorteSelect').options[document.getElementById('huisserieDoublePorteSelect').selectedIndex].text;
                    const ma = txt.match(/\((\d+)\+(\d+)\)/);
                    if(ma) { l1=parseFloat(ma[1]); l2=parseFloat(ma[2]); } else { l2 = lp - l1; }
                    dessinerPanneauPorte3D(g, startV+l1/2, yOuv, l1, hOuv, typP, mats, sens);
                    dessinerPanneauPorte3D(g, startV+l1+l2/2, yOuv, l2, hOuv, typP, mats, 'aucune');
                    if(typP==='cadreAlu') { const bat = createMesh(new THREE.BoxGeometry(4,hOuv,40), mats.matProfil, g); bat.position.set(startV+l1, yOuv, 0); }
                } else { 
                    dessinerPanneauPorte3D(g, startV+lp/2, yOuv, lp, hOuv, typP, mats, sens); 
                }

                if(hP==='2100' && H>2100 + 38) {
                     const typI = document.getElementById('typeImposte').value;
                     let splitImpostePorte = (hasImposteModules && hImposteVal > 2120 && H > hImposteVal + 38);
                    if(splitImpostePorte) {
                         // 1. La traverse filante
                         const trSupp = createMesh(new THREE.BoxGeometry(lRailEffective, 38, 38), mats.matProfil, g); 
                         trSupp.position.set(centreOuverture, hImposteVal + 19, 0);
                         
                         let h1 = hImposteVal - (2100+38); let y1 = (2100+38) + h1/2;
                         let h2 = H - (hImposteVal + 38) - 38; let y2 = (hImposteVal + 38) + h2/2;
                         
                         // 2. MATÉRIAU DU BAS (S'aligne avec le style du mur : Plein ou Vitré)
                         const typMur = document.getElementById('typeCloison').value;
                         const matBas = (typMur==='pleine') ? mats.matPlein : mats.matVitre;
                         const epBas = (typMur==='pleine') ? 12 : 6;
                         
                         // 3. MATÉRIAU DU HAUT (Prend le réglage de l'imposte : généralement Vitré)
                         const matHaut = (typI==='vitree') ? mats.matVitre : mats.matPlein; 
                         const epHaut = (typI==='vitree') ? 6 : 12;

                         // Dessin dans le bon ordre !
                         if(h1>0) { const mi1 = createMesh(new THREE.BoxGeometry(lp,h1,epBas), matBas, g); mi1.position.set(centreOuverture, y1, 0); }
                         if(h2>0) { const mi2 = createMesh(new THREE.BoxGeometry(lp,h2,epHaut), matHaut, g); mi2.position.set(centreOuverture, y2, 0); }
                     } else {
                         const hi = H-(2100+38); const matI = (typI==='vitree')?mats.matVitre:mats.matPlein; const epI = (typI==='vitree')?6:12;
                         const mi = createMesh(new THREE.BoxGeometry(lp,hi,epI), matI, g); mi.position.set(centreOuverture, (2100+38)+hi/2, 0);
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
                        
                        // Cas 1 : La partie basse du vitré sur allège est pleine
                        if(m.type === 'vitreeSurAllege') { 
                            let hA = m.hAllege || 1100; 
                            if(yEnd <= hA + 5) isVitre = false; 
                        }
                        
                        // Cas 2 : On dessine la zone de l'imposte (tout en haut)
                        if(hasImposteModules && yStart > hImposteVal + 10) { 
                            // Le panneau prend le matériau choisi pour l'imposte, peu importe le module en dessous !
                            let typeImp = document.getElementById('typeImposte') ? document.getElementById('typeImposte').value : 'vitree';
                            isVitre = (typeImp === 'vitree'); 
                        }

                        const mat = isVitre ? mats.matVitre : mats.matPlein; 
                        const ep = isVitre ? 6 : 12;
                        
                        const mesh = createMesh(new THREE.BoxGeometry(lp, hZone, ep), mat, g); 
                        mesh.position.set(cx, yCenter, 0);
                    }
                    yStart = yEnd + 38;
                });
                x += lb;
            }
        });                x += lb;
            }
        }); // Fin du conf.forEach (les modules)

        // ====================================================
        // NOUVEAU : DESSIN DES COTES (LARGEUR ET HAUTEUR)
        // ====================================================
        // 1. Cote de Largeur (Placée en dessous du mur, légèrement en avant)
        drawDimension(g, 0, -100, 50, x, -100, 50, `${Math.round(x)} mm`, 0, -90);
        
        // 2. Cote de Hauteur (Placée sur le côté gauche du 1er mur uniquement)
        if (idx === 0) {
            drawDimension(g, -100, 0, 50, -100, H, 50, `${Math.round(H)} mm`, -200, 0);
        }
        // ====================================================

        fwd(x); // Avance la "plume" 3D
        if(idx < murs.length-1) {

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
        GLOBAL_STATE.currentScene.camera.position.copy(c).add(dir.multiplyScalar(dist));
        controls.update();
        // --- FONCTION UTILITAIRE POUR DESSINER LES COTES (MESURES) EN 3D ---
function drawDimension(parent, x1, y1, z1, x2, y2, z2, textMsg, textOffsetX, textOffsetY) {
    // 1. La ligne de cote
    const points = [];
    points.push(new THREE.Vector3(x1, y1, z1));
    points.push(new THREE.Vector3(x2, y2, z2));
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({ color: 0x2563EB, linewidth: 2 }); // Bleu KTY
    const line = new THREE.Line(geo, mat);
    parent.add(line);

    // 2. Les petits taquets aux extrémités
    const tickSize = 30;
    if (x1 !== x2) { // Ligne horizontale
        const pT1 = [new THREE.Vector3(x1, y1-tickSize, z1), new THREE.Vector3(x1, y1+tickSize, z1)];
        parent.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pT1), mat));
        const pT2 = [new THREE.Vector3(x2, y2-tickSize, z2), new THREE.Vector3(x2, y2+tickSize, z2)];
        parent.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pT2), mat));
    } else { // Ligne verticale
        const pT1 = [new THREE.Vector3(x1-tickSize, y1, z1), new THREE.Vector3(x1+tickSize, y1, z1)];
        parent.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pT1), mat));
        const pT2 = [new THREE.Vector3(x2-tickSize, y2, z2), new THREE.Vector3(x2+tickSize, y2, z2)];
        parent.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pT2), mat));
    }

    // 3. Le texte (Sprite Canvas)
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    
    // Fond blanc avec bordure pour la lisibilité
    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = "#2563EB";
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, 512, 128);
    
    // Texte
    ctx.font = "bold 60px sans-serif";
    ctx.fillStyle = "#0F172A";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(textMsg, 256, 64);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, depthTest: false }); // depthTest=false pour passer à travers les objets
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(350, 85, 1); // Taille de l'étiquette dans la scène
    
    // 4. Positionnement du texte
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    const midZ = (z1 + z2) / 2;
    sprite.position.set(midX + textOffsetX, midY + textOffsetY, midZ);
    sprite.renderOrder = 999; // Au premier plan
    
    parent.add(sprite);
}

    }

}





