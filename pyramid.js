import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

function main() {
  const canvas = document.querySelector('#c');
  const view1Elem = document.querySelector('#view1');
  const view2Elem = document.querySelector('#view2');
  const renderer = new THREE.WebGLRenderer({ antialias: true, canvas });
  
  // Enable shadows
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const fov = 75;
  const aspect = 2;
  const near = 0.1;
  const far = 200;
  const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  camera.position.set(0, 10, 80);

  // Initialize zoom value
  camera.zoom = 1.5;
  camera.updateProjectionMatrix();

  const scene = new THREE.Scene();

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
    get value() {
      return `#${this.object[this.prop].getHexString()}`;
    }
    set value(hexString) {
      this.object[this.prop].set(hexString);
    }
  }

  function makeXYZGUI(gui, vector3, name, onChangeFn) {
    const folder = gui.addFolder(name);
    folder.add(vector3, 'x', -360, 360).onChange(onChangeFn);
    folder.add(vector3, 'y', -360, 360).onChange(onChangeFn);
    folder.add(vector3, 'z', -360, 360).onChange(onChangeFn);
    folder.open();
  }

  function updateLight() {
    dirLight.target.updateMatrixWorld();
    dirLightHelper.update();
    dirLight.shadow.camera.updateProjectionMatrix();
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
  gui.add(minMaxGUIHelper, 'max', 0.1, 250, 0.1).name('Far Value').onChange(updateCamera);
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
  document.body.appendChild(timeDisplay);

  // Update time display
  function updateTimeDisplay() {
    timeDisplay.textContent = `Time: ${getFormattedTime(timeState.minutes)}`;
  }

  // Initialize lighting and display
  updateLightingForTime(timeState.minutes);
  updateTimeDisplay();

  // === Controls ===
  const controls = new OrbitControls(camera, view1Elem);
  controls.target.set(0, 5, 0);
  // Prevent camera from going below the ground
  controls.minPolarAngle = 0;             // straight ahead (horizontal)
  controls.maxPolarAngle = Math.PI / 2;   // straight down (90°)
  controls.update();

  const camera2 = new THREE.PerspectiveCamera(60, 2, 0.1, 500);
  camera2.position.set(40, 10, 30);
  camera2.lookAt(0, 5, 0);

  const controls2 = new OrbitControls(camera2, view2Elem);
  controls2.target.set(0, 5, 0);
  controls2.update();

  // === Geometry ===
  const planeSize = 500;
  const loader = new THREE.TextureLoader();

  // Clay texture
  const clayTexture = loader.load('textures/clay.png');
  clayTexture.wrapS = THREE.RepeatWrapping;
  clayTexture.wrapT = THREE.RepeatWrapping;
  clayTexture.magFilter = THREE.NearestFilter;
  const repeatsClay = 15;
  clayTexture.repeat.set(repeatsClay, repeatsClay);
  
  // Land texture
  const landTexture = loader.load('textures/sand.png');
  landTexture.wrapS = THREE.RepeatWrapping;
  landTexture.wrapT = THREE.RepeatWrapping;
  landTexture.magFilter = THREE.NearestFilter;
  landTexture.colorSpace = THREE.SRGBColorSpace;
  const repeats = planeSize / 2;
  landTexture.repeat.set(repeats, repeats);

  // Pyramid texture
  const pyramidTexture = loader.load('textures/brick.jpg');
  pyramidTexture.colorSpace = THREE.SRGBColorSpace;
  pyramidTexture.wrapS = THREE.RepeatWrapping;
  pyramidTexture.wrapT = THREE.RepeatWrapping;
  pyramidTexture.magFilter = THREE.NearestFilter;
  const repeatsPyramid = 10;
  pyramidTexture.repeat.x = repeatsPyramid * 2;
  pyramidTexture.repeat.y = repeatsPyramid / 2;

  const planeGeo = new THREE.PlaneGeometry(planeSize, planeSize);
  const planeMat = new THREE.MeshPhongMaterial({ map: landTexture });
  const planeMesh = new THREE.Mesh(planeGeo, planeMat);
  planeMesh.rotation.x = Math.PI * -0.5;
  planeMesh.receiveShadow = true;
  scene.add(planeMesh);

  const pyramidGroup = new THREE.Group();
  scene.add(pyramidGroup);

  const pyramid1Height = 15;
  const pyramid1Radius = 15;
  const pyramid1Geo = new THREE.ConeGeometry(pyramid1Radius, pyramid1Height, 4);
  const pyramid1Mat = new THREE.MeshPhongMaterial({ map: pyramidTexture, side: THREE.DoubleSide });
  const pyramid1Mesh = new THREE.Mesh(pyramid1Geo, pyramid1Mat);
  pyramid1Mesh.position.set(0, pyramid1Height / 2, 0);
  pyramid1Mesh.castShadow = true;
  pyramid1Mesh.receiveShadow = true;

  const pyramid2Height = 9;
  const pyramid2Radius = 9;
  const pyramid2Geo = new THREE.ConeGeometry(pyramid2Radius, pyramid2Height, 4);
  const pyramid2Mat = new THREE.MeshPhongMaterial({ map: pyramidTexture });
  const pyramid2Mesh = new THREE.Mesh(pyramid2Geo, pyramid2Mat);
  pyramid2Mesh.position.set(14, pyramid2Height / 2, 18);
  pyramid2Mesh.castShadow = true;
  pyramid2Mesh.receiveShadow = true;

  const pyramid3Height = 6;
  const pyramid3Radius = 6;
  const pyramid3Geo = new THREE.ConeGeometry(pyramid3Radius, pyramid3Height, 4);
  const pyramid3Mat = new THREE.MeshPhongMaterial({ map: pyramidTexture });
  const pyramid3Mesh = new THREE.Mesh(pyramid3Geo, pyramid3Mat);
  pyramid3Mesh.position.set(-16, pyramid3Height / 2, 20);
  pyramid3Mesh.castShadow = true;
  pyramid3Mesh.receiveShadow = true;

  // === Add to group ===
  pyramidGroup.add(pyramid1Mesh);
  pyramidGroup.add(pyramid2Mesh);
  pyramidGroup.add(pyramid3Mesh);

    // === Load Sphinx model ===
  const gltfLoader = new GLTFLoader();
  gltfLoader.load(
    'models/sphinx.glb',
    (gltf) => {
      const sphinx = gltf.scene;
      sphinx.scale.set(0.5, 0.5, 0.5);
      sphinx.position.set(0, 1.8, 30);
      sphinx.rotation.set(0, 300, 0);

      sphinx.traverse((node) => {
        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
          node.material = new THREE.MeshPhongMaterial({ map: clayTexture });
        }
      });

      scene.add(sphinx);

      // Tambahkan hotspot otomatis
      createHotspotOnObject(
        sphinx,
        0.4,
        `<b>Sphinx</b><br>
        Model GLB<br>
        Tekstur: clay.png<br>
        Posisi di depan piramida.`
      );
    }
  );


  // === Position group ===
  pyramidGroup.position.set(0, 0, 0);

  // === Render functions ===
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

  // === Hotspot Raycasting Setup ===
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  const hotspots = [];
  let activeHotspot = null;

  // Ambil elemen popup dari HTML
  const popup = document.getElementById("popup");

  function updatePopupPosition(hotspot) {
    const pos = new THREE.Vector3();
    hotspot.getWorldPosition(pos);

    // Convert 3D → Normalized Device Coordinates
    pos.project(camera);

    const rect = renderer.domElement.getBoundingClientRect();
    const x = (pos.x * 0.5 + 0.5) * rect.width + rect.left;
    const y = (-(pos.y * 0.5) + 0.5) * rect.height + rect.top;

    popup.style.left = `${x}px`;
    popup.style.top = `${y}px`;
  }

  function createHotspot(position, html) {
    const geo = new THREE.SphereGeometry(0.5, 16, 16);
    const mat = new THREE.MeshBasicMaterial({ color: 0xff0000, opacity: 0.25, transparent: true });
    const mesh = new THREE.Mesh(geo, mat);

    mesh.position.copy(position);
    mesh.userData.info = html;

    scene.add(mesh);
    hotspots.push(mesh);

    return mesh;
  }


  function createHotspotOnObject(object3D, offsetY, html) {
    const box = new THREE.Box3().setFromObject(object3D);
    const center = new THREE.Vector3();
    box.getCenter(center);

    // Tempatkan hotspot di atas model
    const hotspotPos = new THREE.Vector3(
      center.x,
      box.max.y + offsetY,
      center.z
    );

    return createHotspot(hotspotPos, html);
  }


  // === Create Hotspots ===

  // Hotspot Pyramid 1
  createHotspotOnObject(
    pyramid1Mesh,
    1, // offset di atas puncak
    `<b>Pyramid Besar</b><br>
    Tinggi: 15m<br>
    Menggunakan ConeGeometry.<br>
    Tekstur: brick.jpg`
  );

  // Hotspot Pyramid 2
  createHotspotOnObject(
    pyramid2Mesh,
    1,
    `<b>Pyramid Kedua</b><br>
    Tinggi: 9m<br>
    Lokasi timur laut piramida utama.`
  );

  // Hotspot Pyramid 3
  createHotspotOnObject(
    pyramid3Mesh,
    1,
    `<b>Pyramid Ketiga</b><br>
    Ukuran paling kecil<br>
    Radius: 6m`
  );


  function onClick(event) {
    // Determine which view was clicked and use appropriate camera
    let clickedCamera = camera;
    const rect = renderer.domElement.getBoundingClientRect();
    const eventRect = event.target?.getBoundingClientRect?.() || rect;
    
    // Check if click came from view2 (right pane)
    const view2Rect = view2Elem.getBoundingClientRect();
    const clickX = event.clientX;
    if (clickX > view2Rect.left) {
      clickedCamera = camera2;
      console.log('Using camera2 for raycasting');
    } else {
      console.log('Using camera1 for raycasting');
    }

    mouse.x = ((clickX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    console.log('Click at mouse coords:', mouse.x, mouse.y);
    raycaster.setFromCamera(mouse, clickedCamera);
    const intersects = raycaster.intersectObjects(hotspots, true);

    console.log('Intersects found:', intersects.length, 'out of', hotspots.length, 'hotspots');

    if (intersects.length > 0) {
      const hotspot = intersects[0].object;

      // Toggle jika klik hotspot yang sama
      if (activeHotspot === hotspot) {
        popup.style.display = "none";
        activeHotspot = null;
        return;
      }

      // Tampilkan popup
      activeHotspot = hotspot;
      popup.innerHTML = hotspot.userData.info;
      popup.style.display = "block";
      updatePopupPosition(hotspot);
    }
  }

  renderer.domElement.addEventListener("click", onClick);

  // Handle clicks from view1 and view2 split panes
  view1Elem.addEventListener("click", (e) => {
    if (e.target === view1Elem) {
      onClick(e);
    }
  });
  view2Elem.addEventListener("click", (e) => {
    if (e.target === view2Elem) {
      onClick(e);
    }
  });

  function render() {
    resizeRendererToDisplaySize(renderer);
    renderer.setScissorTest(true);

    // Left view (main)
    {
      const aspect = setScissorForElement(view1Elem);
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
      cameraHelper.visible = false;
      dirLightHelper.visible = false;
      renderer.render(scene, camera);
    }

    // Right view (second camera)
    {
      const aspect = setScissorForElement(view2Elem);
      camera2.aspect = aspect;
      camera2.updateProjectionMatrix();
      cameraHelper.visible = true;
      renderer.render(scene, camera2);
    }

    requestAnimationFrame(render);

    if (activeHotspot) {
      updatePopupPosition(activeHotspot);
    }
  }

  requestAnimationFrame(render);
}

main();
