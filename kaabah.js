import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

function main() {
  const canvas = document.querySelector('#c');
  const view1Elem = document.querySelector('#view1');
  const view2Elem = document.querySelector('#view2');
  const renderer = new THREE.WebGLRenderer({ antialias: true, canvas });

  const fov = 45;
  const aspect = 2;
  const near = 5;
  const far = 100;
  const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  camera.position.set(60, 40, 50);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('black');

  // === Lights ===
  const dirLight = new THREE.DirectionalLight(0xffffff, 1);
  dirLight.position.set(0, 10, 0);
  dirLight.target.position.set(-5, 0, 0);
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

  // === GUI ===
  const gui = new GUI();
  gui.add(camera, 'fov', 1, 180).onChange(updateCamera);
  gui.add(camera, 'zoom', 0.1, 5, 0.01).onChange(updateCamera).listen();
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
  controls.update();

  const camera2 = new THREE.PerspectiveCamera(60, 2, 0.1, 500);
  camera2.position.set(40, 10, 30);
  camera2.lookAt(0, 5, 0);

  const controls2 = new OrbitControls(camera2, view2Elem);
  controls2.target.set(0, 5, 0);
  controls2.update();

  // === Geometry ===
  const planeSize = 80;
  const loader = new THREE.TextureLoader();
  const texture = loader.load('https://threejs.org/manual/examples/resources/images/checker.png');
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
  scene.add(planeMesh);

  const cubeSize = 15;
  const cubeGeo = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
  const cubeMat = new THREE.MeshPhongMaterial({ color: '#8AC' });
  const cubeMesh = new THREE.Mesh(cubeGeo, cubeMat);
  cubeMesh.position.set(0, cubeSize / 2, 0);
  scene.add(cubeMesh);

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
      scene.background.set(0x000000);
      renderer.render(scene, camera);
    }

    // Right view (second camera)
    {
      const aspect = setScissorForElement(view2Elem);
      camera2.aspect = aspect;
      camera2.updateProjectionMatrix();
      cameraHelper.visible = true;
      scene.background.set(0x000040);
      renderer.render(scene, camera2);
    }

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}

main();
