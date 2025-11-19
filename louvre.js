import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

// config textures
const TEXTURES = {
  sky: 'textures/louvresky.jpeg',
  ground: 'textures/louvrepaving2.jpg'
};

// pengaturan buat si pyramid
const PYRAMID_CONFIG = {
  radius: 20,
  height: 20,
  segments: 4,
  heightSegments: 32,
  wireframeDivisions: 8
};

// config scene sesuai kdoe revo
const SCENE_CONFIG = {
  planeSize: 500,
  cameraFov: 75,
  cameraZoom: 1.5
};

// helper class buat GUI (kayak kode revo)
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

// fungsi buat bikin pyramid pake wireframe
function createPyramid(config) {
  const group = new THREE.Group();

  // material kaca pyramid
  const pyramidMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xFFFFFF,
    metalness: 0.05,
    roughness: 0.1,
    transparent: true,
    opacity: 0.75,
    transmission: 0.85,
    ior: 1.52,
    thickness: 0.3,
    clearcoat: 0.1,
    side: THREE.DoubleSide
  });

  // geometry pyramid
  const pyramidGeometry = new THREE.ConeGeometry(
    config.radius,
    config.height,
    config.segments,
    config.heightSegments
  );

  // translate geometry biar basenya di y=0
  pyramidGeometry.translate(0, config.height / 2, 0);
  
  const pyramidMesh = new THREE.Mesh(pyramidGeometry, pyramidMaterial);
  pyramidMesh.castShadow = true;
  pyramidMesh.receiveShadow = true;
  group.add(pyramidMesh);

  // bikin wireframe belah ketupat
  const wireframePoints = [];
  const divisions = config.wireframeDivisions;

  // fungsi dapet titik di permukaan pyramid, ini gemini 
  function getPyramidPoint(sideIndex, u, v) {
    const rBase = config.radius;
    const height = config.height;
    const angleStart = sideIndex * Math.PI / 2;
    const angleEnd = (sideIndex + 1) * Math.PI / 2;
    
    const v1 = new THREE.Vector3(rBase * Math.cos(angleStart), 0, rBase * Math.sin(angleStart));
    const v2 = new THREE.Vector3(rBase * Math.cos(angleEnd), 0, rBase * Math.sin(angleEnd));
    const apex = new THREE.Vector3(0, height, 0);
    const basePoint = new THREE.Vector3().lerpVectors(v1, v2, u);
    
    return new THREE.Vector3().lerpVectors(basePoint, apex, v);
  }

  // loop buat bikin garis wireframe
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

        wireframePoints.push(pTL.x, pTL.y, pTL.z, pBR.x, pBR.y, pBR.z);
        wireframePoints.push(pTR.x, pTR.y, pTR.z, pBL.x, pBL.y, pBL.z);
      }
    }
  }

  const wireframeGeometry = new THREE.BufferGeometry();
  wireframeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(wireframePoints, 3));

  const wireframeMaterial = new THREE.LineBasicMaterial({ 
    color: 0x1a1a1a,
    linewidth: 3
  });

  const wireframeLines = new THREE.LineSegments(wireframeGeometry, wireframeMaterial);
  group.add(wireframeLines);

  return group;
}

function main() {
  const canvas = document.querySelector('#c');
  const view1Elem = document.querySelector('#view1');
  const view2Elem = document.querySelector('#view2');
  const renderer = new THREE.WebGLRenderer({ antialias: true, canvas });

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // setup camera utama sesuai revo
  const camera = new THREE.PerspectiveCamera(SCENE_CONFIG.cameraFov, 2, 0.1, 200);
  camera.position.set(0, 10, 80);
  camera.zoom = SCENE_CONFIG.cameraZoom;
  camera.updateProjectionMatrix();

  // setup scene sesuai revo
  const scene = new THREE.Scene();
  const skyTexture = new THREE.TextureLoader().load(TEXTURES.sky);
  scene.background = skyTexture;

  // setup lighting sesuai revo
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

  // setup GUI controls
  const gui = new GUI();
  gui.add(camera, 'fov', 1, 180).onChange(updateCamera);
  const minMaxGUIHelper = new MinMaxGUIHelper(camera, 'near', 'far', 0.01);
  gui.add(minMaxGUIHelper, 'min', 0.01, 100, 0.1).name('near').onChange(updateCamera);
  gui.add(minMaxGUIHelper, 'max', 0.1, 250, 0.1).name('far').onChange(updateCamera);
  gui.addColor(new ColorGUIHelper(dirLight, 'color'), 'value').name('Light Color');
  gui.add(dirLight, 'intensity', 0, 5, 0.01);
  makeXYZGUI(gui, dirLight.position, 'Light Position', updateLight);
  makeXYZGUI(gui, dirLight.target.position, 'Light Target', updateLight);

  // setup orbit controls view 1 sesuai revo
  const controls = new OrbitControls(camera, view1Elem);
  controls.target.set(0, 5, 0);
  controls.minPolarAngle = 0;
  controls.maxPolarAngle = Math.PI / 2;
  controls.update();

  // setup camera kedua buat view 2 sesuai revo
  const camera2 = new THREE.PerspectiveCamera(60, 2, 0.1, 500);
  camera2.position.set(40, 10, 30);
  camera2.lookAt(0, 5, 0);

  const controls2 = new OrbitControls(camera2, view2Elem);
  controls2.target.set(0, 5, 0);
  controls2.update();

  // bikin ground plane - texture paving
  const loader = new THREE.TextureLoader();
  const landTexture = loader.load(TEXTURES.ground);
  landTexture.wrapS = THREE.RepeatWrapping;
  landTexture.wrapT = THREE.RepeatWrapping;
  landTexture.magFilter = THREE.NearestFilter;
  landTexture.colorSpace = THREE.SRGBColorSpace;
  const repeats = SCENE_CONFIG.planeSize / 2;
  landTexture.repeat.set(repeats, repeats);

  const planeGeo = new THREE.PlaneGeometry(SCENE_CONFIG.planeSize, SCENE_CONFIG.planeSize);
  const planeMat = new THREE.MeshPhongMaterial({ map: landTexture });
  const planeMesh = new THREE.Mesh(planeGeo, planeMat);
  planeMesh.rotation.x = Math.PI * -0.5;
  planeMesh.receiveShadow = true;
  scene.add(planeMesh);

  // bikin pyramid utama di tengah
  const mainPyramid = createPyramid(PYRAMID_CONFIG);
  scene.add(mainPyramid);

  // kalo mau nambah pyramid lagi tinggal panggil createPyramid
  // contoh:
  // const pyramid2 = createPyramid(PYRAMID_CONFIG);
  // pyramid2.position.set(50, 0, 0);
  // scene.add(pyramid2);
  
  

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

  // render loop buat kedua view
  function render() {
    resizeRendererToDisplaySize(renderer);
    renderer.setScissorTest(true);

    // render view 1
    {
      const aspect = setScissorForElement(view1Elem);
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
      cameraHelper.visible = false;
      dirLightHelper.visible = false;
      renderer.render(scene, camera);
    }

    // render view 2
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