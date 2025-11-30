

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

function main() {
  const canvas = document.querySelector('#c');
  const renderer = new THREE.WebGLRenderer({ antialias: true, canvas });
  
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const fov = 45;
  const aspect = 2;
  const near = 0.1;
  const far = 500;
  const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  camera.position.set(0, 90, 120);

  const scene = new THREE.Scene();
  
  // Sky texture - bisa diganti dengan texture Anda
  const textureLoader = new THREE.TextureLoader();
  const skyTexture = textureLoader.load(
    'textures/sky.jpg',
    () => console.log('Sky texture loaded'),
    undefined,
    () => {
      scene.background = new THREE.Color(0xe5eaf0);
      console.log('Sky texture not found, using color');
    }
  );
  scene.background = skyTexture || new THREE.Color(0xe5eaf0);
  scene.fog = new THREE.Fog(0xe5eaf0, 180, 350);

  // === Lights ===
  const ambLight = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambLight);

  const hemiLight = new THREE.HemisphereLight(0xddeeff, 0x999999, 0.6);
  scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
  dirLight.position.set(50, 80, 30);
  dirLight.castShadow = true;
  dirLight.shadow.bias = -0.00005;
  dirLight.shadow.mapSize.width = 4096;
  dirLight.shadow.mapSize.height = 4096;
  dirLight.shadow.camera.left = -80;
  dirLight.shadow.camera.right = 80;
  dirLight.shadow.camera.top = 80;
  dirLight.shadow.camera.bottom = -80;
  dirLight.shadow.camera.near = 0.1;
  dirLight.shadow.camera.far = 250;
  scene.add(dirLight);

  const dirLightHelper = new THREE.DirectionalLightHelper(dirLight);
  scene.add(dirLightHelper);
  dirLightHelper.visible = false;

  const cameraHelper = new THREE.CameraHelper(dirLight.shadow.camera);
  scene.add(cameraHelper);
  cameraHelper.visible = false;

  // === GUI Helpers ===
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
    folder.add(vector3, 'x', -200, 200).onChange(onChangeFn);
    folder.add(vector3, 'y', 0, 200).onChange(onChangeFn);
    folder.add(vector3, 'z', -200, 200).onChange(onChangeFn);
    folder.open();
  }

  function updateLight() {
    dirLight.target.updateMatrixWorld();
    dirLightHelper.update();
    dirLight.shadow.camera.updateProjectionMatrix();
    cameraHelper.update();
  }

  function updateCamera() {
    camera.updateProjectionMatrix();
  }

  // === GUI ===
  const gui = new GUI();
  gui.add(camera, 'fov', 1, 180).onChange(updateCamera);
  gui.addColor(new ColorGUIHelper(dirLight, 'color'), 'value').name('Light Color');
  gui.add(dirLight, 'intensity', 0, 3, 0.01);
  gui.add(dirLightHelper, 'visible').name('Show Light Helper');
  gui.add(cameraHelper, 'visible').name('Show Camera Helper');
  makeXYZGUI(gui, dirLight.position, 'Light Position', updateLight);

  // === Controls ===
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 12, 0);
  controls.minPolarAngle = 0;
  controls.maxPolarAngle = Math.PI / 2.1;
  controls.minDistance = 40;
  controls.maxDistance = 250;
  controls.update();

  // === Load Textures ===
  const groundTexture = textureLoader.load(
    'textures/ground.jpg',
    (tex) => {
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(30, 30);
      console.log('Ground texture loaded');
    },
    undefined,
    () => console.log('Ground texture not found')
  );

  const waterTexture = textureLoader.load(
    'textures/water.jpg',
    (tex) => {
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(2, 2);
      console.log('Water texture loaded');
    },
    undefined,
    () => console.log('Water texture not found')
  );

  const glassTexture = textureLoader.load(
    'textures/glass.jpg',
    () => console.log('Glass texture loaded'),
    undefined,
    () => console.log('Glass texture not found')
  );

  // === Create Main Pyramid ===
  function createMainPyramid() {
    const group = new THREE.Group();
    const baseSize = 35;
    const height = 21.7;
    const halfBase = baseSize / 2;

    const vertices = new Float32Array([
      -halfBase, 0, -halfBase,
      halfBase, 0, -halfBase,
      halfBase, 0, halfBase,
      -halfBase, 0, halfBase,
      0, height, 0
    ]);

    const indices = [0, 1, 4, 1, 2, 4, 2, 3, 4, 3, 0, 4];

    const geometry = new THREE.BufferGeometry();
    geometry.setIndex(indices);
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();

    // Glass material dengan texture
    const glassMat = new THREE.MeshPhysicalMaterial({
      map: glassTexture,
      color: 0xf0f8ff,
      transparent: true,
      opacity: 0.12,
      transmission: 0.96,
      roughness: 0.02,
      metalness: 0,
      thickness: 0.8,
      ior: 1.52,
      reflectivity: 0.15,
      side: THREE.DoubleSide,
      envMapIntensity: 0.9,
      clearcoat: 0.1
    });

    const glassMesh = new THREE.Mesh(geometry, glassMat);
    glassMesh.castShadow = true;
    glassMesh.receiveShadow = true;
    group.add(glassMesh);

    // Frame material
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      metalness: 0.85,
      roughness: 0.25
    });

    const frameRadius = 0.08;

    function createFrameTube(p1, p2) {
      const dir = new THREE.Vector3().subVectors(p2, p1);
      const length = dir.length();
      const tubeGeo = new THREE.CylinderGeometry(frameRadius, frameRadius, length, 8);
      const tube = new THREE.Mesh(tubeGeo, frameMat);
      
      tube.position.copy(new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5));
      const axis = new THREE.Vector3(0, 1, 0);
      tube.quaternion.setFromUnitVectors(axis, dir.clone().normalize());
      tube.castShadow = true;
      
      return tube;
    }

    const apex = new THREE.Vector3(0, height, 0);
    const corners = [
      new THREE.Vector3(-halfBase, 0, -halfBase),
      new THREE.Vector3(halfBase, 0, -halfBase),
      new THREE.Vector3(halfBase, 0, halfBase),
      new THREE.Vector3(-halfBase, 0, halfBase),
    ];

    // Base frame
    for (let i = 0; i < 4; i++) {
      const next = (i + 1) % 4;
      group.add(createFrameTube(corners[i], corners[next]));
    }

    // Corner to apex
    corners.forEach(corner => {
      group.add(createFrameTube(corner, apex));
    });

    // Diamond grid
    const divisions = 7;
    
    for (let face = 0; face < 4; face++) {
      const c1 = corners[face];
      const c2 = corners[(face + 1) % 4];
      
      for (let i = 1; i < divisions; i++) {
        const t = i / divisions;
        const p1 = new THREE.Vector3().lerpVectors(c1, apex, t);
        const p2 = new THREE.Vector3().lerpVectors(c2, apex, t);
        group.add(createFrameTube(p1, p2));
      }
      
      for (let i = 1; i < divisions; i++) {
        const t = i / divisions;
        const basePoint = new THREE.Vector3().lerpVectors(c1, c2, t);
        group.add(createFrameTube(basePoint, apex));
      }
    }

    group.position.set(0, 0, 0);
    return group;
  }

  // === Create Small Pyramid ===
  function createSmallPyramid(position) {
    const group = new THREE.Group();
    const baseSize = 5;
    const height = 3.2;
    const halfBase = baseSize / 2;

    const vertices = new Float32Array([
      -halfBase, 0, -halfBase,
      halfBase, 0, -halfBase,
      halfBase, 0, halfBase,
      -halfBase, 0, halfBase,
      0, height, 0
    ]);

    const indices = [0, 1, 4, 1, 2, 4, 2, 3, 4, 3, 0, 4];

    const geometry = new THREE.BufferGeometry();
    geometry.setIndex(indices);
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();

    const glassMat = new THREE.MeshPhysicalMaterial({
      map: glassTexture,
      color: 0xf0f8ff,
      transparent: true,
      opacity: 0.12,
      transmission: 0.96,
      roughness: 0.02,
      metalness: 0,
      thickness: 0.5,
      ior: 1.52,
      side: THREE.DoubleSide
    });

    const glassMesh = new THREE.Mesh(geometry, glassMat);
    glassMesh.castShadow = true;
    glassMesh.receiveShadow = true;
    group.add(glassMesh);

    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      metalness: 0.85,
      roughness: 0.25
    });

    const frameRadius = 0.06;

    function createFrameTube(p1, p2) {
      const dir = new THREE.Vector3().subVectors(p2, p1);
      const length = dir.length();
      const tubeGeo = new THREE.CylinderGeometry(frameRadius, frameRadius, length, 8);
      const tube = new THREE.Mesh(tubeGeo, frameMat);
      tube.position.copy(new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5));
      const axis = new THREE.Vector3(0, 1, 0);
      tube.quaternion.setFromUnitVectors(axis, dir.clone().normalize());
      tube.castShadow = true;
      return tube;
    }

    const apex = new THREE.Vector3(0, height, 0);
    const corners = [
      new THREE.Vector3(-halfBase, 0, -halfBase),
      new THREE.Vector3(halfBase, 0, -halfBase),
      new THREE.Vector3(halfBase, 0, halfBase),
      new THREE.Vector3(-halfBase, 0, halfBase),
    ];

    for (let i = 0; i < 4; i++) {
      const next = (i + 1) % 4;
      group.add(createFrameTube(corners[i], corners[next]));
      group.add(createFrameTube(corners[i], apex));
    }

    const divisions = 3;
    for (let face = 0; face < 4; face++) {
      const c1 = corners[face];
      const c2 = corners[(face + 1) % 4];
      
      for (let i = 1; i < divisions; i++) {
        const t = i / divisions;
        const basePoint = new THREE.Vector3().lerpVectors(c1, c2, t);
        group.add(createFrameTube(basePoint, apex));
      }
    }

    group.position.copy(position);
    return group;
  }

  // === Create 6 Triangular Water Pools (CORRECT LAYOUT) ===
  function createSixTriangularPools() {
    // 3 Large triangular pools + 3 Small triangular pools = 6 total
    // Forming a hexagonal star pattern
    
    const poolBaseL = 40;   // Large pool base
    const poolHeightL = 32; // Large pool height
    const poolBaseS = 25;   // Small pool base
    const poolHeightS = 20; // Small pool height
    
    // Water material dengan texture
    const waterMat = new THREE.MeshStandardMaterial({
      map: waterTexture,
      color: 0xa8c8d8,
      roughness: 0.05,
      metalness: 0.6,
      envMapIntensity: 1.5
    });

    // THICK BLACK BORDER material
    const thickBorderMat = new THREE.MeshStandardMaterial({
      color: 0x0a0a0a,  // Very dark/black
      roughness: 0.6,
      metalness: 0.3
    });

    const borderThickness = 1.8;  // THICK border
    const borderHeight = 0.25;

    // Function to create triangular pool with thick black border
    function createTriangularPool(base, height, rotation, posX, posZ) {
      const group = new THREE.Group();

      // Water surface shape
      const waterShape = new THREE.Shape();
      waterShape.moveTo(0, height);
      waterShape.lineTo(-base/2, 0);
      waterShape.lineTo(base/2, 0);
      waterShape.closePath();

      // Water geometry
      const waterGeo = new THREE.ShapeGeometry(waterShape);
      const water = new THREE.Mesh(waterGeo, waterMat);
      water.rotation.x = -Math.PI / 2;
      water.position.y = 0.04;
      water.receiveShadow = true;
      group.add(water);

      // THICK BLACK BORDER
      const borderExtrudeSettings = {
        depth: borderHeight,
        bevelEnabled: false
      };
      
      const borderGeo = new THREE.ExtrudeGeometry(waterShape, borderExtrudeSettings);
      borderGeo.rotateX(-Math.PI / 2);
      
      const border = new THREE.Mesh(borderGeo, thickBorderMat);
      border.position.y = 0;
      border.castShadow = true;
      border.receiveShadow = true;
      group.add(border);

      // Extra thick edge outline
      const edges = new THREE.EdgesGeometry(borderGeo);
      const thickEdgeLine = new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({ 
          color: 0x000000,
          linewidth: 3 
        })
      );
      border.add(thickEdgeLine);

      group.rotation.y = rotation;
      group.position.set(posX, 0, posZ);
      
      return group;
    }

    // 3 LARGE triangular pools (pointing outward from center)
    const largePoolDistance = 28;
    const largePoolConfigs = [
      { rotation: 0, x: 0, z: -largePoolDistance },           // Front
      { rotation: 2*Math.PI/3, x: -largePoolDistance, z: largePoolDistance/2 },   // Back-left
      { rotation: -2*Math.PI/3, x: largePoolDistance, z: largePoolDistance/2 }    // Back-right
    ];

    largePoolConfigs.forEach(config => {
      scene.add(createTriangularPool(
        poolBaseL, 
        poolHeightL, 
        config.rotation, 
        config.x, 
        config.z
      ));
    });

    // 3 SMALL triangular pools (inverted, filling gaps)
    const smallPoolDistance = 24;
    const smallPoolConfigs = [
      { rotation: Math.PI, x: 0, z: smallPoolDistance },      // Back (inverted)
      { rotation: Math.PI + 2*Math.PI/3, x: smallPoolDistance, z: -smallPoolDistance/2 }, // Front-right
      { rotation: Math.PI - 2*Math.PI/3, x: -smallPoolDistance, z: -smallPoolDistance/2 } // Front-left
    ];

    smallPoolConfigs.forEach(config => {
      scene.add(createTriangularPool(
        poolBaseS, 
        poolHeightS, 
        config.rotation, 
        config.x, 
        config.z
      ));
    });
  }

  // === Create Ground ===
  const groundSize = 200;
  const groundGeo = new THREE.PlaneGeometry(groundSize, groundSize);
  const groundMat = new THREE.MeshStandardMaterial({
    map: groundTexture,
    color: 0xccd2d8,
    roughness: 0.85,
    metalness: 0.05
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // === Build Scene ===
  const mainPyramid = createMainPyramid();
  scene.add(mainPyramid);

  // 4 Small pyramids at corners (outside the pools)
  const cornerDistance = 35;
  const smallPyramidPositions = [
    new THREE.Vector3(-cornerDistance, 0, -cornerDistance),
    new THREE.Vector3(cornerDistance, 0, -cornerDistance),
    new THREE.Vector3(-cornerDistance, 0, cornerDistance),
    new THREE.Vector3(cornerDistance, 0, cornerDistance),
  ];

  smallPyramidPositions.forEach(pos => {
    scene.add(createSmallPyramid(pos));
  });

  // Create the 6 triangular pools with thick black borders
  createSixTriangularPools();

  // === Render Functions ===
  function resizeRendererToDisplaySize(renderer) {
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) renderer.setSize(width, height, false);
    return needResize;
  }

  function render() {
    if (resizeRendererToDisplaySize(renderer)) {
      const canvas = renderer.domElement;
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
    }

    renderer.render(scene, camera);
    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}

main();