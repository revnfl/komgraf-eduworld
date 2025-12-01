import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const clock = new THREE.Clock();

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

  // Initial zoom
  camera.zoom = 1.5;
  camera.updateProjectionMatrix();

  // === Audio: Desert Wind Ambient ===
  const listener = new THREE.AudioListener();
  camera.add(listener);

  const desertWind = new THREE.Audio(listener);
  const audioLoader = new THREE.AudioLoader();

  const soundState = {
    enabled: true,
    volume: 0.1,
  };

  audioLoader.load('audio/pyramid.mp3', (buffer) => {
    desertWind.setBuffer(buffer);
    desertWind.setLoop(true);
    desertWind.setVolume(soundState.volume);
    // tidak langsung play; nunggu interaksi user
  });

  const scene = new THREE.Scene();

  // === Sky background ===
  const skyTexture = new THREE.TextureLoader().load('textures/blue-sky.jpg');
  skyTexture.colorSpace = THREE.SRGBColorSpace;
  scene.background = skyTexture;

  scene.fog = new THREE.Fog(0xc58b4b, 40, 260);

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
  const timeState = { minutes: 710 }; // 11:50

  function getFormattedTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  }

  function updateLightingForTime(minutes) {
    const timeNorm = (minutes % 1440) / 1440;

    const sunAngle = timeNorm * Math.PI * 2 - Math.PI;
    const sunHeight = Math.max(0, Math.sin(timeNorm * Math.PI) * 50);
    const sunHorizontal = Math.cos(sunAngle) * 70;

    dirLight.position.set(sunHorizontal, sunHeight + 20, Math.sin(sunAngle) * 70);
    dirLight.target.position.set(0, 0, 0);

    const daylight = Math.max(0.1, sunHeight / 50);
    dirLight.intensity = daylight;

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

    ambLight.intensity = Math.max(0.1, daylight * 0.3);

    updateBackgroundBrightness(daylight);
    updateLight();
  }

  // === Background brightness overlay ===
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

  // === GUI ===
  const gui = new GUI();
  gui.add(camera, 'fov', 1, 180).onChange(updateCamera).name('Field of View');
  const minMaxGUIHelper = new MinMaxGUIHelper(camera, 'near', 'far', 0.01);
  gui.add(minMaxGUIHelper, 'min', 0.01, 100, 0.1).name('Near Value').onChange(updateCamera);
  gui.add(minMaxGUIHelper, 'max', 0.1, 250, 0.1).name('Far Value').onChange(updateCamera);
  gui.add(timeState, 'minutes', 0, 1439, 1)
    .name('Time of Day')
    .onChange((value) => {
      updateLightingForTime(value);
      updateTimeDisplay();
    });

  // audio
  const soundFolder = gui.addFolder('Desert Wind');
  soundFolder.add(soundState, 'enabled')
    .name('Enable sound')
    .onChange((v) => {
      if (v) {
        if (desertWind.buffer && !desertWind.isPlaying) {
          desertWind.play();
        }
      } else {
        if (desertWind.isPlaying) {
          desertWind.pause();
        }
      }
    });

  soundFolder.add(soundState, 'volume', 0, 1, 0.01)
    .name('Volume')
    .onChange((v) => {
      desertWind.setVolume(v);
    });
  soundFolder.open();

  // Time label
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

  function updateTimeDisplay() {
    timeDisplay.textContent = `Time: ${getFormattedTime(timeState.minutes)}`;
  }

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
  const planeSize = 500;
  const loader = new THREE.TextureLoader();

  const clayTexture = loader.load('textures/clay.png');
  clayTexture.wrapS = THREE.RepeatWrapping;
  clayTexture.wrapT = THREE.RepeatWrapping;
  clayTexture.magFilter = THREE.NearestFilter;
  const repeatsClay = 15;
  clayTexture.repeat.set(repeatsClay, repeatsClay);

  const landTexture = loader.load('textures/sand.png');
  landTexture.wrapS = THREE.RepeatWrapping;
  landTexture.wrapT = THREE.RepeatWrapping;
  landTexture.magFilter = THREE.NearestFilter;
  landTexture.colorSpace = THREE.SRGBColorSpace;
  const repeats = planeSize / 2;
  landTexture.repeat.set(repeats, repeats);

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

  pyramidGroup.add(pyramid1Mesh, pyramid2Mesh, pyramid3Mesh);
  pyramidGroup.position.set(0, 0, 0);

  // === Sphinx model ===
  const gltfLoader = new GLTFLoader();
  gltfLoader.load(
    'models/sphinx.glb',
    (gltf) => {
      const sphinx = gltf.scene;
      sphinx.scale.set(0.5, 0.5, 0.5);
      sphinx.position.set(0, 1.8, 30);
      sphinx.rotation.set(0, THREE.MathUtils.degToRad(300), 0);

      sphinx.traverse((node) => {
        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
          node.material = new THREE.MeshPhongMaterial({ map: clayTexture });
        }
      });

      scene.add(sphinx);

      // === HOTSPOT SPHINX ===
      createHotspotOnObject(
        sphinx,
        0.4,
        `
        <div style="width: 600px; max-width: 100%;">
          <img src="textures/Sphinx.png"
               alt="Great Sphinx of Giza"
               style="width:100%; border-radius:10px; margin-bottom:10px; object-fit:cover;">
          <h3 style="margin:0 0 6px; font-size:18px;">Great Sphinx of Giza</h3>
          <p style="margin:0; font-size:14px; line-height:1.4;">
            Limestone statue with a human head and lion body, believed to represent Pharaoh Khafre.
          </p>
        </div>
        `
      );
    }
  );

  // === Camel Caravan ===
  gltfLoader.load(
    'models/camel.glb',
    (gltf) => {
      const originalCamel = gltf.scene;
      originalCamel.scale.set(0.01, 0.01, 0.01);

      const camelPositions = [
        { x: -50, z: -15, rotY: Math.random() * Math.PI * 2 },
        { x: -30, z: 25, rotY: Math.random() * Math.PI * 2 },
        { x: -50, z: 25, rotY: Math.random() * Math.PI * 2 },
        { x: 45, z: -5, rotY: Math.random() * Math.PI * 2 },
        { x: 55, z: 30, rotY: Math.random() * Math.PI * 2 },
        { x: -15, z: 55, rotY: Math.random() * Math.PI * 2 },
      ];

      camelPositions.forEach((cfg, index) => {
        const camel = originalCamel.clone(true);
        camel.position.set(cfg.x, 0.1, cfg.z);
        camel.rotation.y = cfg.rotY;

        camel.traverse((node) => {
          if (node.isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;
          }
        });

        scene.add(camel);

        // HOTSPOT CAMEL 
        if (index === 2) {
          createHotspotOnObject(
            camel,
            0.8,
            `
            <div style="width: 600px; max-width: 100%;">
              <img src="textures/camel.png"
                   alt="Desert Caravan Camels"
                   style="width:100%; border-radius:10px; margin-bottom:10px; object-fit:cover;">
              <h3 style="margin:0 0 6px; font-size:18px;">Desert Caravan Camels</h3>
              <p style="margin:0; font-size:14px; line-height:1.4;">
                Camels were not used for pyramid construction, but served as transport for
                long-distance travel and trade across the desert in caravan groups.
              </p>
            </div>
            `
          );
        }
      });
    }
  );

  // === Desert Dunes ===
  const dunesGroup = new THREE.Group();

  function createDune(x, z, radius = 20, height = 5) {
    const geo = new THREE.ConeGeometry(radius, height, 32);
    const mat = new THREE.MeshPhongMaterial({
      map: landTexture,
      shininess: 8,
    });

    const dune = new THREE.Mesh(geo, mat);
    dune.position.set(x, height / 2, z);
    dune.castShadow = true;
    dune.receiveShadow = true;

    dunesGroup.add(dune);
  }

  createDune(-60, -40, 25, 7);
  createDune(70, -20, 22, 6);
  createDune(-40, 60, 20, 5);
  createDune(60, 80, 28, 8);

  scene.add(dunesGroup);

  // === Render helpers ===
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

  // === Hotspot Raycasting ===
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  const hotspots = [];
  let activeHotspot = null;

  const popup = document.getElementById('popup');

  function updatePopupPosition(hotspot) {
    const pos = new THREE.Vector3();
    hotspot.getWorldPosition(pos);
    pos.project(camera);

    const rect = renderer.domElement.getBoundingClientRect();
    const x = (pos.x * 0.5 + 0.5) * rect.width + rect.left;
    const y = (-(pos.y * 0.5) + 0.5) * rect.height + rect.top;

    popup.style.left = `${x}px`;
    popup.style.top = `${y}px`;
  }

  function createHotspot(position, html) {
    const geo = new THREE.SphereGeometry(0.5, 16, 16);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      opacity: 0.25,
      transparent: true,
    });
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

    const hotspotPos = new THREE.Vector3(
      center.x,
      box.max.y + offsetY,
      center.z
    );

    return createHotspot(hotspotPos, html);
  }

  // === Hotspot pyramids ===
  createHotspotOnObject(
    pyramid1Mesh,
    1,
    `
    <div style="width: 600px; max-width: 100%;">
      <img src="textures/Khufu.png"
           alt="Great Pyramid of Giza (Khufu)"
           style="width:100%; border-radius:10px; margin-bottom:10px; object-fit:cover;">
      <h3 style="margin:0 0 6px; font-size:18px;">Great Pyramid of Giza (Khufu)</h3>
      <p style="margin:0; font-size:14px; line-height:1.4;">
        Largest and oldest pyramid in the Giza complex, built as the tomb of Pharaoh Khufu.
      </p>
    </div>
    `
  );

  createHotspotOnObject(
    pyramid2Mesh,
    1,
    `
    <div style="width: 600px; max-width: 100%;">
      <img src="textures/Khafre.png"
           alt="Pyramid of Khafre"
           style="width:100%; border-radius:10px; margin-bottom:10px; object-fit:cover;">
      <h3 style="margin:0 0 6px; font-size:18px;">Pyramid of Khafre</h3>
      <p style="margin:0; font-size:14px; line-height:1.4;">
        Second-largest pyramid at Giza, associated with Pharaoh Khafre and the nearby Great Sphinx.
      </p>
    </div>
    `
  );

  createHotspotOnObject(
    pyramid3Mesh,
    1,
    `
    <div style="width: 600px; max-width: 100%;">
      <img src="textures/Menkaure.png"
           alt="Pyramid of Menkaure"
           style="width:100%; border-radius:10px; margin-bottom:10px; object-fit:cover;">
      <h3 style="margin:0 0 6px; font-size:18px;">Pyramid of Menkaure</h3>
      <p style="margin:0; font-size:14px; line-height:1.4;">
        The smallest of the three main Giza pyramids, dedicated to Pharaoh Menkaure.
      </p>
    </div>
    `
  );

  function onClick(event) {
    let clickedCamera = camera;
    const rect = renderer.domElement.getBoundingClientRect();

    const view2Rect = view2Elem.getBoundingClientRect();
    const clickX = event.clientX;
    if (clickX > view2Rect.left) {
      clickedCamera = camera2;
    }

    mouse.x = ((clickX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, clickedCamera);
    const intersects = raycaster.intersectObjects(hotspots, true);

    if (intersects.length > 0) {
      const hotspot = intersects[0].object;

      if (activeHotspot === hotspot) {
        popup.style.display = 'none';
        activeHotspot = null;
        return;
      }

      activeHotspot = hotspot;
      popup.innerHTML = hotspot.userData.info;
      popup.style.display = 'block';
      updatePopupPosition(hotspot);
    }
  }

  renderer.domElement.addEventListener('click', onClick);

  view1Elem.addEventListener('click', (e) => {
    if (e.target === view1Elem) {
      onClick(e);
    }
  });
  view2Elem.addEventListener('click', (e) => {
    if (e.target === view2Elem) {
      onClick(e);
    }
  });

  // === Mulai suara ===
  let windStarted = false;
  function startWindOnFirstInteraction() {
    if (windStarted) return;
    if (!soundState.enabled) return;

    if (desertWind.buffer && !desertWind.isPlaying) {
      desertWind.play();
      windStarted = true;
      window.removeEventListener('pointerdown', startWindOnFirstInteraction);
      window.removeEventListener('keydown', startWindOnFirstInteraction);
    }
  }
  window.addEventListener('pointerdown', startWindOnFirstInteraction);
  window.addEventListener('keydown', startWindOnFirstInteraction);

  // === Render loop ===
  function render() {
    animateSand();

    resizeRendererToDisplaySize(renderer);
    renderer.setScissorTest(true);

    // Left view (kamera utama)
    {
      const aspect = setScissorForElement(view1Elem);
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
      cameraHelper.visible = false;
      dirLightHelper.visible = false;
      renderer.render(scene, camera);
    }

    // Right view (mini-map / kamera 2)
    {
      const aspect = setScissorForElement(view2Elem);
      camera2.aspect = aspect;
      camera2.updateProjectionMatrix();
      cameraHelper.visible = true;
      renderer.render(scene, camera2);
    }

    // Update posisi popup kalau ada hotspot aktif
    if (activeHotspot) {
      updatePopupPosition(activeHotspot);
    }

    // Loop lagi
    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}

main();
