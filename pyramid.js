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

  // === GUI ===
  const gui = new GUI();
  gui.add(camera, 'fov', 1, 180).onChange(updateCamera);
  const minMaxGUIHelper = new MinMaxGUIHelper(camera, 'near', 'far', 0.01);
  gui.add(minMaxGUIHelper, 'min', 0.01, 100, 0.1).name('near').onChange(updateCamera);
  gui.add(minMaxGUIHelper, 'max', 0.1, 250, 0.1).name('far').onChange(updateCamera);

  gui.addColor(new ColorGUIHelper(dirLight, 'color'), 'value').name('Light Color');
  gui.add(dirLight, 'intensity', 0, 5, 0.01);
  makeXYZGUI(gui, dirLight.position, 'Light Position', updateLight);
  makeXYZGUI(gui, dirLight.target.position, 'Light Target', updateLight);

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

          // Apply pyramid texture to Sphinx
          node.material = new THREE.MeshPhongMaterial({ map: clayTexture });
        }
      });
      scene.add(sphinx);

      // // Optional GUI controls
      // const sphinxFolder = gui.addFolder('Sphinx');
      // makeXYZGUI(sphinxFolder, sphinx.position, 'Position', () => {});
      // makeXYZGUI(sphinxFolder, sphinx.scale, 'Scale', () => {});
      // makeXYZGUI(sphinxFolder, sphinx.rotation, 'Rotation', () => {});
      // sphinxFolder.open();
    },
    (xhr) => {
      console.log(`Sphinx model ${(xhr.loaded / xhr.total * 100).toFixed(2)}% loaded`);
    },
    (error) => {
      console.error('An error occurred while loading the Sphinx model:', error);
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
  }

  requestAnimationFrame(render);
}

main();
