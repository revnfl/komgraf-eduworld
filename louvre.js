import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

const TEXTURES = {
    sky: 'https://images.unsplash.com/photo-1513002749550-c59d786b8e6c?q=80&w=2574&auto=format&fit=crop',
    ground: 'https://images.unsplash.com/photo-1624326759828-55447fb59f8c?q=80&w=2670&auto=format&fit=crop',
    hdri: 'https://threejs.org/examples/textures/equirectangular/royal_esplanade_1k.hdr',
    waterNormal: 'https://threejs.org/examples/textures/water/Water_1_M_Normal.jpg'
};

const BUILDING_CONFIG = [
    {
        name: 'Richelieu Wing',
        description: 'Sayap utara yang membatasi Cour Napoléon. Awalnya dibangun untuk Kementerian Keuangan, kini menyimpan patung Prancis, seni dekoratif, dan barang antik Timur Dekat. Arsitekturnya menampilkan gaya Kekaisaran Kedua yang megah dengan atap mansard.',
        modelPath: 'models/louvre.glb', 
        position: { x: 0, y: 0, z: -90 },
        rotation: { x: 0, y: 0, z: 0 }, 
        placeholderSize: { w: 80, h: 40, d: 40 }, 
        scale: { x: 4, y: 4, z: 4 }, 
        repeat: 1,                         
        spacing: 85                     
    },
    {
        name: 'Denon Wing',
        description: 'Sayap selatan yang terletak di sepanjang Sungai Seine. Sayap ini adalah yang paling ramai dikunjungi karena menampung Mona Lisa, lukisan Italia dan Spanyol, serta patung Romawi kuno. Dinamai dari Dominique Vivant Denon, direktur pertama museum.',
        modelPath: 'models/louvre.glb', 
        position: { x: 0, y: 0, z: 90 },
        rotation: { x: 0, y: Math.PI, z: 0 },
        placeholderSize: { w: 80, h: 40, d: 40 },
        scale: { x: 4, y: 4, z: 4 },
        repeat:1,
        spacing: 85
    },
    {
        name: 'Sully Wing',
        description: 'Sayap timur yang mengelilingi Cour Carrée (Alun-alun Persegi). Ini adalah bagian tertua dari Louvre, berisi sejarah benteng abad pertengahan asli, barang antik Mesir (termasuk Sphinx Agung Tanis), dan barang antik Yunani.',
        modelPath: 'models/louvre.glb', 
        position: { x: -90, y: 0, z: 0 },
        rotation: { x: 0, y: -Math.PI / 2, z: 0 },
        placeholderSize: { w: 100, h: 40, d: 40 }, 
        scale: { x: 4, y: 4, z: 4 },
        repeat: 2,
        spacing: 85,
        doubleSide: true
    }
];


const PYRAMID_CONFIG = {
    radius: 22,
    height: 18,
    segments: 4,
    heightSegments: 1,
    wireframeDivisions: 10,
    description: 'Piramida Louvre adalah struktur kaca dan logam besar karya I.M. Pei.'
};

const SCENE_CONFIG = {
    planeSize: 500,
    cameraFov: 45,
    cameraZoom: 1
};

const animatedTextures = [];
const hotspots = []; 

function createSnow(count, range) {
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const velocities = [];

    for (let i = 0; i < count; i++) {
        positions.push(
            (Math.random() - 0.5) * range, 
            Math.random() * range * 0.6,   
            (Math.random() - 0.5) * range 
        );
        velocities.push(
            (Math.random() - 0.5) * 0.1,  
            (Math.random() * 0.2 + 0.1),  
            (Math.random() - 0.5) * 0.1   
        );
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE.Float32BufferAttribute(velocities, 3));

    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const context = canvas.getContext('2d');
    const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 32, 32);
    const texture = new THREE.CanvasTexture(canvas);

    const material = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.8,
        map: texture,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });

    return new THREE.Points(geometry, material);
}

function createPyramid(config) {
    const group = new THREE.Group();

    // OPTIMISASI: Ganti MeshPhysicalMaterial (berat) ke MeshStandardMaterial (ringan)
    const pyramidMaterial = new THREE.MeshStandardMaterial({
        color: 0xF5E6C4, 
        emissive: 0x000000, 
        metalness: 0.1, 
        roughness: 0.1,
        transparent: true, 
        opacity: 0.4, // Transparansi biasa, bukan glass transmission
        side: THREE.DoubleSide
    });

    const pyramidGeometry = new THREE.ConeGeometry(
        config.radius,
        config.height,
        config.segments,
        config.heightSegments
    );

    pyramidGeometry.translate(0, config.height / 2, 0);
    pyramidGeometry.rotateY(Math.PI / 4);

    const pyramidMesh = new THREE.Mesh(pyramidGeometry, pyramidMaterial);
    // Shadow dimatikan untuk performa
    group.add(pyramidMesh);

    const wireframePoints = [];
    const divisions = config.wireframeDivisions;

    function getPyramidPoint(sideIndex, u, v) {
        const rBase = config.radius;
        const height = config.height;
        const offset = Math.PI / 4;
        const angleStart = (sideIndex * Math.PI / 2) + offset;
        const angleEnd = ((sideIndex + 1) * Math.PI / 2) + offset;

        const v1 = new THREE.Vector3(rBase * Math.cos(angleStart), 0, rBase * Math.sin(angleStart));
        const v2 = new THREE.Vector3(rBase * Math.cos(angleEnd), 0, rBase * Math.sin(angleEnd));
        const apex = new THREE.Vector3(0, height, 0);
        
        const basePoint = new THREE.Vector3().lerpVectors(v1, v2, u);
        return new THREE.Vector3().lerpVectors(basePoint, apex, v);
    }

    for (let side = 0; side < 4; side++) {
        for (let i = 0; i < divisions; i++) {
            for (let j = 0; j < divisions; j++) {
                const u_curr = j / divisions;
                const v_curr = i / divisions;
                const u_next = (j + 1) / divisions;
                const v_next = (i + 1) / divisions;

                const pTL = getPyramidPoint(side, u_curr, v_next);
                const pTR = getPyramidPoint(side, u_next, v_next);
                const pBL = getPyramidPoint(side, u_curr, v_curr);
                const pBR = getPyramidPoint(side, u_next, v_curr);

                wireframePoints.push(pBL.x, pBL.y, pBL.z, pTR.x, pTR.y, pTR.z);
                wireframePoints.push(pBR.x, pBR.y, pBR.z, pTL.x, pTL.y, pTL.z);
            }
        }
    }

    const wireframeGeometry = new THREE.BufferGeometry();
    wireframeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(wireframePoints, 3));

    const wireframeMaterial = new THREE.LineBasicMaterial({
        color: 0x000000,
        linewidth: 2,
        opacity: 1.0,
        transparent: false
    });

    const wireframeLines = new THREE.LineSegments(wireframeGeometry, wireframeMaterial);
    group.add(wireframeLines);

    return group;
}

function createPool(width, length, tipOffset = 0) {
    const group = new THREE.Group();

    const xLeft = -width / 2;
    const zLeft = 0;
    
    const xRight = width / 2;
    const zRight = 0;
    
    const xTip = tipOffset; 
    const zTip = length;

    const poolShape = new THREE.Shape();
    poolShape.moveTo(xLeft, zLeft);
    poolShape.lineTo(xRight, zRight);
    poolShape.lineTo(xTip, zTip);
    poolShape.lineTo(xLeft, zLeft);

    const extrudeSettings = {
        steps: 1,
        depth: 1.5,
        bevelEnabled: false
    };

    const poolGeometry = new THREE.ExtrudeGeometry(poolShape, extrudeSettings);
    
    poolGeometry.rotateX(Math.PI / 2); 
    poolGeometry.translate(0, 0.75, 0);

    const textureLoader = new THREE.TextureLoader();
    const waterNormal = textureLoader.load(TEXTURES.waterNormal);
    waterNormal.wrapS = waterNormal.wrapT = THREE.RepeatWrapping;
    waterNormal.repeat.set(4, 8);
    
    animatedTextures.push(waterNormal);

    // OPTIMISASI: Ganti MeshPhysicalMaterial ke MeshStandardMaterial
    const waterMaterial = new THREE.MeshStandardMaterial({
        color: 0x8899a6,       
        metalness: 0.6,      
        roughness: 0.1,       
        opacity: 0.7,
        transparent: true,
        normalMap: waterNormal,
        normalScale: new THREE.Vector2(0.2, 0.2), 
        side: THREE.DoubleSide
    });

    const poolMesh = new THREE.Mesh(poolGeometry, waterMaterial);
    // Shadow dimatikan
    group.add(poolMesh);

    const edgesGeometry = new THREE.EdgesGeometry(poolGeometry);
    const edgesMaterial = new THREE.LineBasicMaterial({
        color: 0x000000,
        linewidth: 4
    });
    
    const frame = new THREE.LineSegments(edgesGeometry, edgesMaterial);
    group.add(frame);

    return group;
}

function createHotspot(position, title, description, scene) {
    const geo = new THREE.SphereGeometry(1.5, 8, 8); // Kurangi segmen sphere hotspot
    const mat = new THREE.MeshBasicMaterial({ 
        color: 0xff0000, 
        transparent: true, 
        opacity: 0.5,
        depthTest: false 
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(position);
    
    mesh.userData = {
        isHotspot: true,
        title: title,
        description: description
    };
    
    scene.add(mesh);
    hotspots.push(mesh);
    return mesh;
}

class MinMaxGUIHelper {
    constructor(obj, minProp, maxProp, minDif) {
    this.obj = obj;
    this.minProp = minProp;
    this.maxProp = maxProp;
    this.minDif = minDif;
    }
    get min() { return this.obj[this.minProp]; }
    set min(v) {
    this.obj[this.minProp] = v;
    this.obj[this.maxProp] = Math.max(this.obj[this.maxProp], v + this.minDif);
    }
    get max() { return this.obj[this.maxProp]; }
    set max(v) {
    this.obj[this.maxProp] = v;
    this.min = this.min;
    }
}

function main() {
    const canvas = document.querySelector('#c');
    const view1Elem = document.querySelector('#view1');
    const view2Elem = document.querySelector('#view2');
    
    // OPTIMISASI PERFORMA EKSTRIM:
    // 1. Antialias OFF
    // 2. Pixel Ratio dipaksa 1 (resolusi standar)
    const renderer = new THREE.WebGLRenderer({ antialias: false, canvas, alpha: true });
    renderer.setPixelRatio(1); 

    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    
    // MATIKAN SHADOW MAP SECARA GLOBAL UNTUK PERFORMA
    renderer.shadowMap.enabled = false; 

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xddeeff, 0.002);

    const fov = SCENE_CONFIG.cameraFov;
    const aspect = 2;
    const near = 0.1;
    const far = 1000;
    const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera.position.set(0, 40, 150);
    camera.zoom = SCENE_CONFIG.cameraZoom;
    camera.updateProjectionMatrix();

    const cameraHelper = new THREE.CameraHelper(camera);
    scene.add(cameraHelper);

    const camera2 = new THREE.PerspectiveCamera(60, 2, 0.1, 1000);
    camera2.position.set(150, 150, 150);
    camera2.lookAt(0, 0, 0);

    const controls = new OrbitControls(camera, view1Elem);
    controls.target.set(0, 0, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.update();

    const controls2 = new OrbitControls(camera2, view2Elem);
    controls2.target.set(0, 0, 0);
    controls2.enableDamping = true;
    controls2.dampingFactor = 0.05;
    controls2.update();

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let activeHotspot = null;

    let popup = document.getElementById('info-popup');
    if (!popup) {
        popup = document.createElement('div');
        popup.id = 'info-popup';
        popup.style.cssText = `
            position: absolute;
            display: none;
            background: rgba(255, 255, 255, 0.95);
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            max-width: 300px;
            z-index: 1000;
            font-family: 'Helvetica Neue', Arial, sans-serif;
            pointer-events: auto;
        `;
        popup.innerHTML = `
            <button id="close-popup" style="position:absolute; top:5px; right:10px; border:none; background:none; font-size:16px; cursor:pointer;">&times;</button>
            <h3 id="popup-title" style="margin-top:0; color:#333; border-bottom:1px solid #ddd; padding-bottom:10px;">Title</h3>
            <p id="popup-desc" style="color:#666; line-height:1.5; font-size:14px;">Description goes here.</p>
        `;
        document.body.appendChild(popup);

        document.getElementById('close-popup').onclick = () => {
            popup.style.display = 'none';
            activeHotspot = null;
        };
    }

    function onClick(event) {
        const rect = canvas.getBoundingClientRect();
        const view2Rect = view2Elem.getBoundingClientRect();
        
        let clickedCamera = camera;
        
        if (event.clientX > view2Rect.left) {
            clickedCamera = camera2;
        }

        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, clickedCamera);
        
        const intersects = raycaster.intersectObjects(hotspots, false);

        if (intersects.length > 0) {
            const hit = intersects[0].object;
            activeHotspot = hit;
            
            document.getElementById('popup-title').textContent = hit.userData.title;
            document.getElementById('popup-desc').textContent = hit.userData.description;
            
            popup.style.display = 'block';
            
            let posX = event.clientX + 15;
            let posY = event.clientY + 15;
            
            if (posX + 300 > window.innerWidth) posX = event.clientX - 315;
            if (posY + 200 > window.innerHeight) posY = event.clientY - 200;

            popup.style.left = `${posX}px`;
            popup.style.top = `${posY}px`;
        }
    }

    window.addEventListener('click', onClick);


    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    // SHADOW DIMATIKAN
    dirLight.castShadow = false; 
    
    dirLight.position.set(50, 100, 50);
    scene.add(dirLight);
    scene.add(dirLight.target);

    // Helper dimatikan biar bersih
    // const dirLightHelper = new THREE.DirectionalLightHelper(dirLight);
    // scene.add(dirLightHelper);

    const ambLight = new THREE.AmbientLight(0xffffff, 0.6); // Terangkan ambient karena shadow mati
    scene.add(ambLight);

    const interiorLight = new THREE.PointLight(0xffaa00, 50, 100);
    interiorLight.position.set(0, 5, 0);
    scene.add(interiorLight);

    const clock = new THREE.Clock();
    
    // SETUP LOADERS
    const gltfLoader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    gltfLoader.setDRACOLoader(dracoLoader);

    new RGBELoader()
        .load(TEXTURES.hdri, function (texture) {
            texture.mapping = THREE.EquirectangularReflectionMapping;
            scene.environment = texture;
        });

    const skyTexture = new THREE.TextureLoader().load(TEXTURES.sky);
    skyTexture.colorSpace = THREE.SRGBColorSpace;
    scene.background = skyTexture;

    const timeState = { minutes: 710 }; 

    function getFormattedTime(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = Math.floor(minutes % 60);
        return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    }

    function createBackgroundOverlay() {
        let backgroundOverlay = document.getElementById('bg-overlay');
        if (!backgroundOverlay) {
            backgroundOverlay = document.createElement('div');
            backgroundOverlay.id = 'bg-overlay';
            backgroundOverlay.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0, 0, 0, 0); pointer-events: none; z-index: 500;
            `;
            document.body.appendChild(backgroundOverlay);
        }
        return backgroundOverlay;
    }

    function updateBackgroundBrightness(brightness) {
        const overlay = createBackgroundOverlay();
        const opacity = 1 - brightness; 
        
        if (opacity > 0.7) {
            overlay.style.background = `rgba(20, 40, 40, ${opacity * 0.8})`;
        } else if (opacity > 0.4) {
            overlay.style.background = `rgba(40, 40, 20, ${opacity * 0.4})`;
        } else {
            overlay.style.background = `rgba(0, 0, 0, ${opacity * 0.3})`;
        }
    }

    function updateLightingForTime(minutes) {
        const timeNorm = (minutes % 1440) / 1440;
        const sunAngle = timeNorm * Math.PI * 2 - Math.PI;
        const sunHeight = Math.max(0, Math.sin(timeNorm * Math.PI) * 150);
        const sunHorizontal = Math.cos(sunAngle) * 200;
        
        dirLight.position.set(sunHorizontal, sunHeight + 40, Math.sin(sunAngle) * 200);
        dirLight.target.position.set(0, 0, 0);
        
        const daylight = Math.max(0.1, sunHeight / 150);
        dirLight.intensity = daylight * 2.0;
        
        if (timeNorm < 0.25) {
            dirLight.color.setHSL(0.6, 1, 0.3);
        } else if (timeNorm < 0.35) {
            dirLight.color.setHSL(0.08, 1, 0.5);
        } else if (timeNorm < 0.5) {
            dirLight.color.setHSL(0.12, 1, 0.6);
        } else if (timeNorm < 0.65) {
            dirLight.color.setHSL(0.12, 0.8, 0.7);
        } else if (timeNorm < 0.75) {
            dirLight.color.setHSL(0.08, 1, 0.5);
        } else if (timeNorm < 0.85) {
            dirLight.color.setHSL(0.05, 1, 0.4);
        } else {
            dirLight.color.setHSL(0.6, 1, 0.3);
        }
        
        ambLight.intensity = Math.max(0.4, daylight * 0.6); // Ambient lebih terang
        interiorLight.intensity = (1 - daylight) * 100;
        
        updateBackgroundBrightness(daylight);

        dirLight.target.updateMatrixWorld();
        // dirLightHelper.update();
    }

    let timeDisplay = document.getElementById('time-display');
    if (!timeDisplay) {
        timeDisplay = document.createElement('div');
        timeDisplay.id = 'time-display';
        timeDisplay.style.cssText = `
            position: absolute; top: 70px; left: 10px; background: rgba(0,0,0,0.7);
            color: #fff; padding: 10px 15px; border-radius: 5px; font-family: monospace;
            font-size: 18px; font-weight: bold; pointer-events: none; z-index: 999;
        `;
        document.body.appendChild(timeDisplay);
    }

    function updateTimeDisplay() {
        timeDisplay.textContent = `Time: ${getFormattedTime(timeState.minutes)}`;
    }

    const gui = new GUI();
    const camFolder = gui.addFolder('Camera');
    camFolder.add(camera, 'fov', 1, 180).onChange(() => { camera.updateProjectionMatrix(); cameraHelper.update(); });
    const minMaxGUIHelper = new MinMaxGUIHelper(camera, 'near', 'far', 0.1);
    camFolder.add(minMaxGUIHelper, 'min', 0.1, 50, 0.1).name('Near').onChange(() => { camera.updateProjectionMatrix(); cameraHelper.update(); });
    camFolder.add(minMaxGUIHelper, 'max', 100, 2000, 10).name('Far').onChange(() => { camera.updateProjectionMatrix(); cameraHelper.update(); });
    
    gui.add(timeState, 'minutes', 0, 1439, 1).name('Time of Day').onChange((value) => {
        updateLightingForTime(value);
        updateTimeDisplay();
    });

    const loader = new THREE.TextureLoader();
    const landTexture = loader.load(TEXTURES.ground);
    landTexture.wrapS = THREE.RepeatWrapping;
    landTexture.wrapT = THREE.RepeatWrapping;
    landTexture.colorSpace = THREE.SRGBColorSpace;
    const repeats = SCENE_CONFIG.planeSize / 5;
    landTexture.repeat.set(repeats, repeats);

    const planeGeo = new THREE.PlaneGeometry(SCENE_CONFIG.planeSize, SCENE_CONFIG.planeSize);
    
    // UBAH WARNA TANAH JADI PUTIH (0xffffff) UNTUK EFEK SALJU
    const planeMat = new THREE.MeshStandardMaterial({ 
        map: landTexture,
        roughness: 0.9,
        metalness: 0.0,
        color: 0xffffff // Putih Salju
    });
    const planeMesh = new THREE.Mesh(planeGeo, planeMat);
    planeMesh.rotation.x = Math.PI * -0.5;
    // Shadow receive dimatikan
    scene.add(planeMesh);

    const mainPyramid = createPyramid(PYRAMID_CONFIG);
    scene.add(mainPyramid);

    // HOTSPOT PIRAMIDA BESAR
    createHotspot(
        new THREE.Vector3(0, 15, 0), 
        "Piramida Besar (The Great Pyramid)",
        "Pintu masuk utama Louvre yang ikonik. Selesai dibangun tahun 1989, tingginya mencapai 21 meter.",
        scene
    );

    // UBAH JUMLAH SALJU DI SINI (1500 Partikel)
    const snowCount = 1500;
    const snowRange = 500;
    const snowSystem = createSnow(snowCount, snowRange);
    scene.add(snowSystem);

    const offset = PYRAMID_CONFIG.radius * Math.cos(Math.PI / 4);
    const poolWidth = offset * 2;
    const baseOffset = PYRAMID_CONFIG.radius * Math.cos(Math.PI / 4);
    const gap = 2;
    const finalOffset = baseOffset + gap;
    const poolLength = 15; 

    const poolFront = createPool(poolWidth, poolLength);
    poolFront.position.set(0, 0, finalOffset); 
    poolFront.rotation.y = 0;
    scene.add(poolFront);

    const poolFront2 = createPool(poolWidth, poolLength);
    poolFront2.rotation.y = Math.PI; 
    poolFront2.position.set((poolWidth / 2) + gap, 0, finalOffset + poolLength);
    scene.add(poolFront2);
    
    const poolBack = createPool(poolWidth, poolLength);
    poolBack.rotation.y = Math.PI; 
    poolBack.position.set(0, 0, -finalOffset); 
    scene.add(poolBack);

    const poolBack2 = createPool(poolWidth, poolLength);
    poolBack2.rotation.y = 0; 
    poolBack2.position.set(((poolWidth / 2) + gap), 0, -(finalOffset + poolLength));
    scene.add(poolBack2);

    const poolLeft = createPool(poolWidth, 15); 
    poolLeft.rotation.y = -Math.PI / 2; 
    poolLeft.position.set(-finalOffset, 0, 0); 
    scene.add(poolLeft);
    
    const jarakTambahan = 2; 
    const totalJarak = PYRAMID_CONFIG.radius + jarakTambahan;

    const poolCornerBackRight = createPool(46, 25); 
    const angle = -Math.PI / 4; 
    poolCornerBackRight.rotation.y = angle;
    poolCornerBackRight.position.set(totalJarak * Math.sin(angle), 0, totalJarak * Math.cos(angle));
    scene.add(poolCornerBackRight);

    const poolCornerBackLeft = createPool(46, 25); 
    const angleBL = -Math.PI * 0.75; 
    poolCornerBackLeft.rotation.y = angleBL;
    poolCornerBackLeft.position.set(totalJarak * Math.sin(angleBL), 0, totalJarak * Math.cos(angleBL));
    scene.add(poolCornerBackLeft);

    const smallConfig = {...PYRAMID_CONFIG, radius: 6, height: 5, wireframeDivisions: 4};
    const smallPyrDist = 45; 

    const small1 = createPyramid(smallConfig);
    small1.position.set(-smallPyrDist, 0, -smallPyrDist + 45);
    scene.add(small1);

    // HOTSPOT PIRAMIDA KECIL 1
    createHotspot(
        new THREE.Vector3(-smallPyrDist, 10, -smallPyrDist + 45), 
        "Piramida Kecil 1",
        "Salah satu dari tiga piramida kecil yang mengelilingi piramida utama, memberikan cahaya ke area bawah tanah.",
        scene
    );

    const small2 = createPyramid(smallConfig);
    small2.position.set(smallPyrDist - 45, 0, -smallPyrDist);
    scene.add(small2);

    // HOTSPOT PIRAMIDA KECIL 2
    createHotspot(
        new THREE.Vector3(smallPyrDist - 45, 10, -smallPyrDist), 
        "Piramida Kecil 2",
        "Piramida kecil ini berfungsi sebagai ventilasi dan skylight untuk lobi Napoleon Hall di bawahnya.",
        scene
    );

    const small3 = createPyramid(smallConfig);
    small3.position.set(-smallPyrDist + 45, 0, smallPyrDist);
    scene.add(small3);

    // HOTSPOT PIRAMIDA KECIL 3
    createHotspot(
        new THREE.Vector3(-smallPyrDist + 45, 10, smallPyrDist), 
        "Piramida Kecil 3",
        "Arsitek I.M. Pei merancang piramida-piramida ini untuk menciptakan kontras geometri modern dengan istana klasik.",
        scene
    );

    BUILDING_CONFIG.forEach(config => {
        const repeatCount = config.repeat || 1;
        const spacing = config.spacing || 0;
        const scale = config.scale || { x: 1, y: 1, z: 1 };

        const getOffsetPosition = (basePos, index, total, space, rotation) => {
            const offset = (index - (total - 1) / 2) * space;
            const offsetVec = new THREE.Vector3(offset, 0, 0);
            offsetVec.applyEuler(new THREE.Euler(rotation.x, rotation.y, rotation.z));
            return new THREE.Vector3(
                basePos.x + offsetVec.x,
                basePos.y + offsetVec.y,
                basePos.z + offsetVec.z
            );
        };

        const centerIndex = (repeatCount - 1) / 2;
        const centerPos = getOffsetPosition(config.position, centerIndex, repeatCount, spacing, config.rotation);
        const hotspotPos = centerPos.clone();
        hotspotPos.y += 35;
        createHotspot(hotspotPos, config.name, config.description, scene);

        // --- FUNGSI BARU: MEMBUAT KOTAK PENGGANTI (PLACEHOLDER) ---
        const createPlaceholder = () => {
            for (let i = 0; i < repeatCount; i++) {
                const finalPos = getOffsetPosition(config.position, i, repeatCount, spacing, config.rotation);
                const geo = new THREE.BoxGeometry(
                    config.placeholderSize.w,
                    config.placeholderSize.h,
                    config.placeholderSize.d
                );
                const mat = new THREE.MeshStandardMaterial({ color: 0x808080 }); // Kotak abu-abu
                const mesh = new THREE.Mesh(geo, mat);

                mesh.position.set(
                    finalPos.x,
                    finalPos.y + (config.placeholderSize.h * scale.y / 2),
                    finalPos.z
                );
                mesh.rotation.set(config.rotation.x, config.rotation.y, config.rotation.z);
                mesh.scale.set(scale.x, scale.y, scale.z);

                // Shadow mati
                scene.add(mesh);
            }
        };

        if (config.modelPath) {
            gltfLoader.load(config.modelPath, (gltf) => {
                const baseModel = gltf.scene;
                // Sembunyikan pesan loading jika model berhasil diload
                document.getElementById('loading').style.opacity = 0;

                for (let i = 0; i < repeatCount; i++) {
                    const finalPos = getOffsetPosition(config.position, i, repeatCount, spacing, config.rotation);
                    
                    const model = baseModel.clone();
                    model.position.copy(finalPos);
                    model.rotation.set(config.rotation.x, config.rotation.y, config.rotation.z);
                    model.scale.set(scale.x, scale.y, scale.z);

                    model.traverse((child) => {
                        if (child.isMesh) {
                            // SHADOW MATI UNTUK PERFORMA
                            child.castShadow = false;
                            child.receiveShadow = false; 

                            // Fungsi helper untuk memaksa update sisi material
                            const setDoubleSide = (mat) => {
                                mat.side = THREE.DoubleSide;
                                mat.needsUpdate = true; // FORCE UPDATE
                            };

                            if (Array.isArray(child.material)) {
                                child.material.forEach(setDoubleSide);
                            } else if (child.material) {
                                setDoubleSide(child.material);
                            }
                        }
                    });
                    scene.add(model);
                }
            }, 
            // onProgress callback
            (xhr) => {
                console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
            },
            // onError callback
            (error) => {
                console.error('Error loading model:', error);
                console.warn('Gagal memuat GLB, menggunakan placeholder.');
                // Panggil fungsi placeholder saat error terjadi
                createPlaceholder();
            });

        } else {
            // Jika tidak ada modelPath, gunakan placeholder
            createPlaceholder();
        }
    });

    updateLightingForTime(timeState.minutes);
    updateTimeDisplay();

    function resizeRendererToDisplaySize(renderer) {
        const canvas = renderer.domElement;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        const needResize = canvas.width !== width || canvas.height !== height;
        if (needResize) renderer.setSize(width, height, false);
        return needResize;
    }

    function setScissorForElement(elem) {
        const canvasRect = canvas.getBoundingClientRect();
        const elemRect = elem.getBoundingClientRect();
        const right = Math.min(elemRect.right, canvasRect.right) - canvasRect.left;
        const left = Math.max(0, elemRect.left - canvasRect.left);
        const bottom = Math.min(elemRect.bottom, canvasRect.bottom) - canvasRect.top;
        const top = Math.max(0, elemRect.top - canvasRect.top);
        const width = Math.min(canvasRect.width, right - left);
        const height = Math.min(canvasRect.height, bottom - top);
        const positiveYUpBottom = canvasRect.height - bottom;
        renderer.setScissor(left, positiveYUpBottom, width, height);
        renderer.setViewport(left, positiveYUpBottom, width, height);
        return width / height;
    }

    function render() {
        resizeRendererToDisplaySize(renderer);
        renderer.setScissorTest(true);

        const elapsedTime = clock.getElapsedTime();
        
        const floatOffset = Math.sin(elapsedTime * 2) * 0.5;
        hotspots.forEach(hotspot => {
            hotspot.position.y += Math.sin(elapsedTime * 3) * 0.02; 
            hotspot.rotation.y += 0.01;
        });

        if (snowSystem) {
            const positions = snowSystem.geometry.attributes.position.array;
            const velocities = snowSystem.geometry.attributes.velocity.array;

            for(let i = 0; i < positions.length; i += 3) {
                positions[i+1] -= velocities[i+1];
                positions[i] -= velocities[i];
                positions[i+2] -= velocities[i+2];

                if (positions[i+1] < 0) {
                    positions[i+1] = snowRange * 0.6;
                    positions[i] = (Math.random() - 0.5) * snowRange;
                    positions[i+2] = (Math.random() - 0.5) * snowRange;
                }
            }
            snowSystem.geometry.attributes.position.needsUpdate = true;
        }

        animatedTextures.forEach(texture => {
            texture.offset.x = elapsedTime * 0.05;
            texture.offset.y = elapsedTime * 0.05;
        });

        {
            const aspect = setScissorForElement(view1Elem);
            camera.aspect = aspect;
            camera.updateProjectionMatrix();
            cameraHelper.visible = false;
            // Helper shadow dimatikan
            renderer.render(scene, camera);
        }

        {
            const aspect = setScissorForElement(view2Elem);
            camera2.aspect = aspect;
            camera2.updateProjectionMatrix();
            cameraHelper.visible = true;
            // Helper shadow dimatikan
            renderer.render(scene, camera2);
        }

        requestAnimationFrame(render);
    }
    
    requestAnimationFrame(render);
}


main();
