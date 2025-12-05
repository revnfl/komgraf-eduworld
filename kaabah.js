import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

function main() {
  const canvas = document.querySelector('#c');
  const popup = document.getElementById('popup');

  const view1Elem = document.querySelector('#view1');
  const view2Elem = document.querySelector('#view2');
  const renderer = new THREE.WebGLRenderer({ antialias: true, canvas });

  const fov = 75;
  const aspect = 2;
  const near = 0.1;
  const far = 500;
  const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  camera.position.set(60, 40, 50);

  const scene = new THREE.Scene();

  // Initial zoom
  camera.zoom = 1.5;
  camera.updateProjectionMatrix();

  // === Sand Storm Particles ===
  const sandCount = 2500;
  const sandGeometry = new THREE.BufferGeometry();
  const sandPositions = new Float32Array(sandCount * 3);
  const sandSpeeds = new Float32Array(sandCount);
  const sandBaseHeights = new Float32Array(sandCount);

  // Arah angin 
  const windDir = new THREE.Vector2(1.0, 0.25);
  windDir.normalize();

  for (let i = 0; i < sandCount; i++) {
    const i3 = i * 3;

    sandPositions[i3 + 0] = (Math.random() - 0.5) * 450;   // x
    sandBaseHeights[i] = Math.random() * 0.6 + 0.15;
    sandPositions[i3 + 1] = sandBaseHeights[i];            // y
    sandPositions[i3 + 2] = (Math.random() - 0.5) * 450;   // z

    sandSpeeds[i] = 0.05 + Math.random() * 0.08;
  }

  sandGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(sandPositions, 3)
  );

  const sandMaterial = new THREE.PointsMaterial({
    size: 0.06,                 // butiran kecil
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.35,
    color: 0xcfa87a,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const sandStorm = new THREE.Points(sandGeometry, sandMaterial);
  scene.add(sandStorm);

  // === Animasi pasir ===
  function animateSand() {
    const positions = sandGeometry.attributes.position.array;
    const time = performance.now() * 0.001;

    for (let i = 0; i < sandCount; i++) {
      const i3 = i * 3;

      positions[i3 + 0] += windDir.x * sandSpeeds[i];
      positions[i3 + 2] += windDir.y * sandSpeeds[i];

      positions[i3 + 1] =
        sandBaseHeights[i] + Math.sin(time * 1.5 + i) * 0.05;

      const x = positions[i3 + 0];
      const z = positions[i3 + 2];

      const limit = 260;
      if (x > limit || x < -limit || z > limit || z < -limit) {
        const spawnOffset = -limit;

        positions[i3 + 0] = -windDir.x * spawnOffset + (Math.random() - 0.5) * 40;
        positions[i3 + 2] = -windDir.y * spawnOffset + (Math.random() - 0.5) * 40;

        sandBaseHeights[i] = Math.random() * 0.6 + 0.15;
        positions[i3 + 1] = sandBaseHeights[i];
        sandSpeeds[i] = 0.05 + Math.random() * 0.08;
      }
    }

    sandGeometry.attributes.position.needsUpdate = true;
  }

  // === Space background ===
  const skyTexture = new THREE.TextureLoader().load('textures/blue-sky.jpg');
  skyTexture.colorSpace = THREE.SRGBColorSpace;
  scene.background = skyTexture;

  // === Lights ===
  const dirLight = new THREE.DirectionalLight(0xffffff, 1);
  dirLight.position.set(70, 45, 0);
  dirLight.target.position.set(-5, 0, 0);
  dirLight.castShadow = true;
  dirLight.shadow.bias = -0.001;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  dirLight.shadow.camera.left = -100;
  dirLight.shadow.camera.right = 100;
  dirLight.shadow.camera.top = 100;
  dirLight.shadow.camera.bottom = -100;
  dirLight.shadow.camera.near = 0.1;
  dirLight.shadow.camera.far = 200;

  scene.add(dirLight);
  scene.add(dirLight.target);

  const dirLightHelper = new THREE.DirectionalLightHelper(dirLight);
  scene.add(dirLightHelper);

  const ambLight = new THREE.AmbientLight(0xffffff, 0.3);
  scene.add(ambLight);

  const cameraHelper = new THREE.CameraHelper(camera);
  scene.add(cameraHelper);

  // === GUI Helpers ===
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

  class ColorGUIHelper {
    constructor(object, prop) {
      this.object = object;
      this.prop = prop;
    }
    get value() { return `#${this.object[this.prop].getHexString()}`; }
    set value(hexString) { this.object[this.prop].set(hexString); }
  }

  function makeXYZGUI(gui, vector3, name, onChangeFn) {
    const folder = gui.addFolder(name);
    folder.add(vector3, 'x', -10, 100).onChange(onChangeFn);
    folder.add(vector3, 'y', 0, 100).onChange(onChangeFn);
    folder.add(vector3, 'z', -10, 100).onChange(onChangeFn);
    folder.open();
  }

  function updateLight() {
    dirLight.target.updateMatrixWorld();
    dirLightHelper.update();
  }

  function updateCamera() {
    camera.updateProjectionMatrix();
    cameraHelper.update();
  }

  // === Time-based Lighting System ===
  const timeState = { minutes: 710 }; // 0-1440 (0:00 - 23:59)

  function getFormattedTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  }

  function updateLightingForTime(minutes) {
    // Normalize time to 0-1 range (0 = midnight, 0.5 = noon, 1 = next midnight)
    const timeNorm = (minutes % 1440) / 1440;

    // Sun angle: -180° at midnight, 0° at 6 AM, 90° at noon, 180° at 6 PM
    const sunAngle = timeNorm * Math.PI * 2 - Math.PI;

    // Sun height: 0 at midnight/6am/6pm, max at noon
    const sunHeight = Math.max(0, Math.sin(timeNorm * Math.PI) * 50);

    // Horizontal position based on time
    const sunHorizontal = Math.cos(sunAngle) * 70;

    // Update light position (simulate sun movement)
    dirLight.position.set(sunHorizontal, sunHeight + 20, Math.sin(sunAngle) * 70);

    // Update light target (always look at center of scene)
    dirLight.target.position.set(0, 0, 0);

    // Update intensity based on sun height (0 at night, 1 at day)
    const daylight = Math.max(0.1, sunHeight / 50);
    dirLight.intensity = daylight;

    // Update light color based on time of day
    if (timeNorm < 0.25) {
      // Night (0:00 - 6:00): dark blue
      dirLight.color.setHSL(0.6, 1, 0.3);
    } else if (timeNorm < 0.35) {
      // Early morning (6:00 - 8:24): warm orange
      dirLight.color.setHSL(0.08, 1, 0.5);
    } else if (timeNorm < 0.5) {
      // Morning to noon (8:24 - 12:00): bright yellow
      dirLight.color.setHSL(0.12, 1, 0.6);
    } else if (timeNorm < 0.65) {
      // Noon to afternoon (12:00 - 15:36): white/bright yellow
      dirLight.color.setHSL(0.12, 0.8, 0.7);
    } else if (timeNorm < 0.75) {
      // Late afternoon (15:36 - 18:00): warm orange
      dirLight.color.setHSL(0.08, 1, 0.5);
    } else if (timeNorm < 0.85) {
      // Sunset (18:00 - 20:24): deep orange/red
      dirLight.color.setHSL(0.05, 1, 0.4);
    } else {
      // Night (20:24 - 24:00): dark blue
      dirLight.color.setHSL(0.6, 1, 0.3);
    }

    // Update ambient light based on time
    ambLight.intensity = Math.max(0.1, daylight * 0.3);

    // === Update background brightness based on time ===
    // Calculate background brightness: 0 = very dark (night), 1 = full brightness (noon)
    let bgBrightness = daylight;

    // Apply brightness overlay to canvas
    updateBackgroundBrightness(bgBrightness);

    updateLight();
  }

  // === Background brightness control ===
  let backgroundOverlay = null;

  function createBackgroundOverlay() {
    if (!backgroundOverlay) {
      backgroundOverlay = document.createElement('div');
      backgroundOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0);
        pointer-events: none;
        z-index: 500;
      `;
      document.body.appendChild(backgroundOverlay);
    }
    return backgroundOverlay;
  }

  function updateBackgroundBrightness(brightness) {
    // brightness: 0 = full darkness (night), 1 = full brightness (day)
    // We want overlay opacity to be high (dark) at night and low (transparent) at day
    const overlay = createBackgroundOverlay();
    const opacity = 1 - brightness; // Invert so high brightness = low opacity

    // Add slight color tint for time of day
    if (opacity > 0.7) {
      // Night time - dark blue tint
      overlay.style.background = `rgba(20, 40, 40, ${opacity * 0.8})`;
    } else if (opacity > 0.4) {
      // Early morning/evening - warm tint
      overlay.style.background = `rgba(40, 40, 20, ${opacity * 0.4})`;
    } else {
      // Day time - minimal overlay
      overlay.style.background = `rgba(0, 0, 0, ${opacity * 0.3})`;
    }
  }

  // === GUI ===
  const gui = new GUI();
  gui.add(camera, 'fov', 1, 180).onChange(updateCamera).name('Field of View');
  const minMaxGUIHelper = new MinMaxGUIHelper(camera, 'near', 'far', 0.01);
  gui.add(minMaxGUIHelper, 'min', 0.01, 100, 0.1).name('Near Value').onChange(updateCamera);
  gui.add(minMaxGUIHelper, 'max', 0.1, 10000, 0.1).name('Far Value').onChange(updateCamera);
  // Time slider
  gui.add(timeState, 'minutes', 0, 1439, 1)
    .name('Time of Day')
    .onChange((value) => {
      updateLightingForTime(value);
      updateTimeDisplay();
    });

  // Add time display label
  const timeDisplay = document.createElement('div');
  timeDisplay.style.cssText = `
    position: absolute;
    top: 70px;
    left: 10px;
    background: rgba(0,0,0,0.7);
    color: #fff;
    padding: 10px 15px;
    border-radius: 5px;
    font-family: monospace;
    font-size: 18px;
    font-weight: bold;
    pointer-events: none;
    z-index: 999;
  `;
  document.body.appendChild(timeDisplay);  // Update time display
  function updateTimeDisplay() {
    timeDisplay.textContent = `Time: ${getFormattedTime(timeState.minutes)}`;
  }

  // Initialize lighting and display
  updateLightingForTime(timeState.minutes);
  updateTimeDisplay();

  // === Controls ===
  const controls = new OrbitControls(camera, view1Elem);
  controls.target.set(0, 5, 0);
  controls.minPolarAngle = 0;
  controls.maxPolarAngle = Math.PI / 2;
  controls.update();

  const camera2 = new THREE.PerspectiveCamera(60, 2, 0.1, 500);
  camera2.position.set(40, 10, 30);
  camera2.lookAt(0, 5, 0);

  const controls2 = new OrbitControls(camera2, view2Elem);
  controls2.target.set(0, 5, 0);
  controls2.update();

  // === Geometry ===
  const planeSize = 1000;
  const loader = new THREE.TextureLoader();
  const texture = loader.load('textures/white-marble.jpg');
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  const repeats = planeSize / 2;
  texture.repeat.set(repeats, repeats);

  const planeGeo = new THREE.PlaneGeometry(planeSize, planeSize);
  const planeMat = new THREE.MeshPhongMaterial({ map: texture, side: THREE.DoubleSide });
  const planeMesh = new THREE.Mesh(planeGeo, planeMat);
  planeMesh.rotation.x = Math.PI * -0.5;
  planeMesh.receiveShadow = true;
  scene.add(planeMesh);

  // const cubeSize = 15;
  // const cubeGeo = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
  // const cubeMat = new THREE.MeshPhongMaterial({ color: '#8AC' });
  // const cubeMesh = new THREE.Mesh(cubeGeo, cubeMat);
  // cubeMesh.position.set(0, cubeSize / 2, 0);
  // scene.add(cubeMesh);

  // === GLB Loader ===
  const hotspots = [];
  const gltfLoader = new GLTFLoader();

  gltfLoader.load(
    'models/kaabah.glb',
    (gltf) => {
      const model = gltf.scene;
      model.scale.set(2, 2, 2);
      scene.add(model);

      const greenPlane = model.getObjectByName("Plane002_Material004_0");
      if (greenPlane) greenPlane.visible = false;

      gltf.scene.traverse((obj) => {
        if (obj.isMesh) {
          obj.castShadow = true;
          obj.receiveShadow = true;
        }
      });

      // ====== HOTSPOT RAIN GUTTER ======
      const hotspotRainGeo = new THREE.SphereGeometry(0.6, 16, 16);
      const hotspotRainMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.25,
        depthWrite: false
      });
      const hotspotRainGutter = new THREE.Mesh(hotspotRainGeo, hotspotRainMat);

      hotspotRainGutter.position.set(5, 9, 0);
      hotspotRainGutter.userData.info = `
        <img src="https://hajjumrahplanner.com/wp-content/uploads/2024/05/meezab.jpg" class="thumb">
        <b>Mīzāb Ka'bah</b><br>
        Mīzāb al-Raḥmah, atau yang biasa disebut sebagai Mīzāb atau Meezab merupakan saluran air berlapis emas murni di sisi Hijir Ismail.
        Dibuat untuk mengalirkan air hujan dari atap Ka'bah. Desain emasnya membuatnya jadi salah satu bagian paling ikonik.
        Ditambahkan ketika Ka'bah dibangun kembali pada tahun 1627, setelah banjir pada tahun 1626 yang menyebabkan tiga dari empat dinding runtuh.
      `;

      // ====== HOTSPOT HAJAR ASWAD ======
      const hotspotHajarGeo = new THREE.SphereGeometry(0.3, 16, 16);
      const hotspotHajarMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.25,
        depthWrite: false
      });
      const hotspotHajarAswad = new THREE.Mesh(hotspotHajarGeo, hotspotHajarMat);

      hotspotHajarAswad.position.set(-4.8, 1.6, 4.8);
      hotspotHajarAswad.userData.info = `
        <img src="https://upload.wikimedia.org/wikipedia/commons/f/f3/The_Blackstone.jpg" class="thumb">
        <b>Hajar Aswad</b><br>
        Batu hitam yang dipasang di sudut timur Ka'bah. Terdiri dari beberapa pecahan kecil yang disatukan dengan bingkai perak.
        Banyak riwayat menyebutkan warnanya dahulu lebih cerah, lalu menghitam karena "<i>dosa manusia</i>".
      `;

      // ====== HOTSPOT MULTAZAM ======
      const hotspotMultazamGeo = new THREE.SphereGeometry(0.3, 16, 16);
      const hotspotMultazamMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.25,
        depthWrite: false
      });
      const hotspotMultazam = new THREE.Mesh(hotspotMultazamGeo, hotspotMultazamMat);

      hotspotMultazam.position.set(-3.5, 1.6, 4.8);
      hotspotMultazam.userData.info = `
        <b>Multazam</b><br>
        Area dinding Ka'bah yang terletak di antara Hajar Aswad dan pintu Ka'bah, tempat ini dipercaya sebagai salah satu lokasi paling mustajab untuk berdoa.
        Umat Muslim sering menempelkan dada, wajah, dan tangan mereka ke dinding ini sambil memanjatkan doa dan permohonan kepada Allah SWT.
      `;

      // ====== HOTSPOT PINTU KABAH ======
      const hotspotPintuKaabahGeo = new THREE.SphereGeometry(0.4, 16, 16);
      const hotspotPintuKaabahMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.25,
        depthWrite: false
      });
      const hotspotPintuKaabah = new THREE.Mesh(hotspotPintuKaabahGeo, hotspotPintuKaabahMat);

      hotspotPintuKaabah.position.set(-1, 5, 4.8);
      hotspotPintuKaabah.userData.info = `
        <img src="https://hidayatullah.com/wp-content/uploads/2021/04/Enam-Pintu-Kabah-Dari-Sejak-5.000-Tahun-Lalu-e1617293226430.jpg" class="thumb">
        <b>Pintu Ka'bah</b><br>
        Terbuat dari emas dan berada sekitar 2,2 meter dari permukaan tanah. Dibuka hanya beberapa kali dalam setahun untuk keperluan tertentu.
      `;

      // ====== HOTSPOT HIJR ISMAIL ======
      const hotspotHijrIsmailGeo = new THREE.SphereGeometry(0.6, 16, 16);
      const hotspotHijrIsmailMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.25,
        depthWrite: false
      });
      const hotspotHijrIsmail = new THREE.Mesh(hotspotHijrIsmailGeo, hotspotHijrIsmailMat);

      hotspotHijrIsmail.position.set(12.5, 0.5, 0);
      hotspotHijrIsmail.userData.info = `
        <b>Hijr Ismail</b><br>
        Area berbentuk setengah lingkaran yang terletak di sebelah utara Ka'bah, ditandai oleh dinding rendah dan dianggap sebagai bagian dari Ka'bah itu sendiri. 
        Tempat ini dianggap suci, menjadi lokasi salat, dan banyak yang meyakini sebagai tempat yang mustajab untuk berdoa.
      `;

      // ====== HOTSPOT MAQAM IBRAHIM ======
      const hotspotMaqamIbrahimGeo = new THREE.SphereGeometry(0.6, 16, 16);
      const hotspotMaqamIbrahimMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.25,
        depthWrite: false
      });
      const hotspotMaqamIbrahim = new THREE.Mesh(hotspotMaqamIbrahimGeo, hotspotMaqamIbrahimMat);

      hotspotMaqamIbrahim.position.set(0.5, 0.7, 12.2);
      hotspotMaqamIbrahim.userData.info = `
        <img src="https://blue.kumparan.com/image/upload/fl_progressive,fl_lossy,c_fill,f_auto,q_auto:best,w_412/v1620216920/qr4xxhovluzxmucclpwh.jpg" class="thumb">
        <b>Maqam Ibrahim</b><br>
        Maqam Ibrahim adalah batu yang memiliki bekas telapak kaki Nabi Ibrahim AS dan digunakan sebagai tempatnya berdiri saat membangun Ka'bah.
      `;

      // ====== HOTSPOT KISWAH ======
      const hotspotKiswahGeo = new THREE.SphereGeometry(0.6, 16, 16);
      const hotspotKiswahMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.25,
        depthWrite: false
      });
      const hotspotKiswah = new THREE.Mesh(hotspotKiswahGeo, hotspotKiswahMat);

      hotspotKiswah.position.set(4.8, 5, 0);
      hotspotKiswah.userData.info = `
        <img src="https://img.antarafoto.com/cache/1200x800/2023/03/31/kiswah-kabah-di-masjid-surabaya-14vl9-dom.jpg" class="thumb">
        <b>Kiswah</b><br>
        kain hitam penutup Ka'bah yang disulam dengan ayat-ayat Al-Qur'an menggunakan benang emas dan perak. 
        Kain ini diganti setiap tahun dalam upacara sakral, menandai dimulainya tahun baru Hijriah
      `;

      // ====== HOTSPOT REGISTER ======
      model.add(hotspotRainGutter);
      hotspots.push(hotspotRainGutter);

      model.add(hotspotHajarAswad);
      hotspots.push(hotspotHajarAswad);

      model.add(hotspotMultazam);
      hotspots.push(hotspotMultazam);

      model.add(hotspotPintuKaabah);
      hotspots.push(hotspotPintuKaabah);

      model.add(hotspotHijrIsmail);
      hotspots.push(hotspotHijrIsmail);

      model.add(hotspotMaqamIbrahim);
      hotspots.push(hotspotMaqamIbrahim);

      model.add(hotspotKiswah);
      hotspots.push(hotspotKiswah);
    }
  );

  // === Raycaster ===
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  let activeHotspot = null;

  renderer.domElement.addEventListener("click", (event) => {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(hotspots);

    if (intersects.length > 0) {
      const hotspot = intersects[0].object;

      // --- TOGGLE BEHAVIOR ---
      if (activeHotspot === hotspot) {
        // Clicked the same hotspot → hide popup
        popup.style.display = "none";
        activeHotspot = null;
        return;
      }

      // Clicked a different hotspot → show/update popup
      activeHotspot = hotspot;
      popup.innerHTML = hotspot.userData.info;
      popup.style.display = "block";
      popup.style.maxWidth = "260px";
      popup.style.background = "rgba(0,0,0,0.85)";
      popup.style.color = "white";
      popup.style.padding = "12px 16px";
      popup.style.borderRadius = "10px";
      popup.style.textAlign = "justify";
      popup.style.fontSize = "14px";
      popup.style.lineHeight = "1.4";
      popup.style.backdropFilter = "blur(4px)";
      popup.style.border = "1px solid rgba(255,255,255,0.2)";

      updatePopupPosition(hotspot);

    }
  });


  // === Popup Pos Updater ===
  function updatePopupPosition(hotspot) {
    const pos = new THREE.Vector3();
    hotspot.getWorldPosition(pos);
    pos.project(camera);

    const rect = canvas.getBoundingClientRect();
    const x = (pos.x * 0.5 + 0.5) * rect.width + rect.left;
    const y = (-(pos.y * 0.5) + 0.5) * rect.height + rect.top;

    popup.style.left = x + "px";
    popup.style.top = y + "px";
  }

  // === Render ===
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

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // left view
    {
      const aspect = setScissorForElement(view1Elem);
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
      cameraHelper.visible = false;
      dirLightHelper.visible = false;
      renderer.render(scene, camera);
    }

    // right view
    {
      const aspect = setScissorForElement(view2Elem);
      camera2.aspect = aspect;
      camera2.updateProjectionMatrix();
      cameraHelper.visible = true;
      renderer.render(scene, camera2);
    }

    // update popup each frame
    if (activeHotspot) {
      updatePopupPosition(activeHotspot);
    }

    requestAnimationFrame(render);
  }

  view1Elem.addEventListener("click", e => {
    canvas.dispatchEvent(new MouseEvent("click", e));
  });

  view2Elem.addEventListener("click", e => {
    canvas.dispatchEvent(new MouseEvent("click", e));
  });

  requestAnimationFrame(render);
}

main();
