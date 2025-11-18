import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

function main() {
  // DOM
  const canvas = document.querySelector('#c');
  const view1Elem = document.querySelector('#view1');
  const view2Elem = document.querySelector('#view2');

  // Scene + renderer + camera
  const scene = new THREE.Scene();

  const renderer = new THREE.WebGLRenderer({ antialias: true, canvas });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const fov = 75;
  const camera = new THREE.PerspectiveCamera(fov, 2, 0.1, 500);
  camera.position.set(0, 60, 100);
  camera.zoom = 1.2;
  camera.updateProjectionMatrix();

  // Sky / fog
  const texLoader = new THREE.TextureLoader();
  texLoader.load(
    'textures/louvresky.jpeg',
    (t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      scene.background = t;
    },
    undefined,
    (err) => {
      console.warn('Sky texture not found, using fallback color');
      scene.background = new THREE.Color(0xc8d5e8);
    }
  );
  scene.fog = new THREE.Fog(0xc8d5e8, 150, 450);

  // Lights
  const dirLight = new THREE.DirectionalLight(0xfff5e1, 1.4);
  dirLight.position.set(80, 80, 50);
  dirLight.target.position.set(0, 0, 0);
  dirLight.castShadow = true;
  dirLight.shadow.bias = -0.0003;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  dirLight.shadow.camera.left = -150;
  dirLight.shadow.camera.right = 150;
  dirLight.shadow.camera.top = 150;
  dirLight.shadow.camera.bottom = -150;
  dirLight.shadow.camera.near = 0.1;
  dirLight.shadow.camera.far = 350;
  scene.add(dirLight);
  scene.add(dirLight.target);

  const ambLight = new THREE.AmbientLight(0xd8e8f5, 0.8);
  scene.add(ambLight);

  const fillLight = new THREE.DirectionalLight(0xa8c8e8, 0.5);
  fillLight.position.set(-60, 40, -40);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0xffffff, 0.4);
  rimLight.position.set(-50, 30, 80);
  scene.add(rimLight);

  // Controls (two views)
  const controls = new OrbitControls(camera, view1Elem);
  controls.target.set(0, 10, 0);
  controls.minPolarAngle = 0;
  controls.maxPolarAngle = Math.PI / 2 - 0.05;
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.update();

  const camera2 = new THREE.PerspectiveCamera(60, 2, 0.1, 500);
  camera2.position.set(0, 120, 0.1);
  camera2.lookAt(0, 0, 0);

  const controls2 = new OrbitControls(camera2, view2Elem);
  controls2.target.set(0, 0, 0);
  controls2.update();

  // Textures
  const loader = new THREE.TextureLoader();

  // Ground - pavement
  const planeSize = 450;
  const pavementTexture = loader.load(
    'textures/louvrepaving.png',
    (t) => {
      t.wrapS = THREE.RepeatWrapping;
      t.wrapT = THREE.RepeatWrapping;
      t.colorSpace = THREE.SRGBColorSpace;
      const pavementRepeats = planeSize / 8;
      t.repeat.set(pavementRepeats, pavementRepeats);
    },
    undefined,
    (err) => console.warn('pavement texture failed:', err)
  );

  const planeGeo = new THREE.PlaneGeometry(planeSize, planeSize);
  const planeMat = new THREE.MeshStandardMaterial({
    map: pavementTexture,
    color: 0xe5ddd0,
    roughness: 0.85,
    metalness: 0.05
  });
  const planeMesh = new THREE.Mesh(planeGeo, planeMat);
  planeMesh.rotation.x = Math.PI * -0.5;
  planeMesh.receiveShadow = true;
  scene.add(planeMesh);

  // === MAIN PYRAMID ===
  const pyramidGroup = new THREE.Group();
  scene.add(pyramidGroup);

  const pyramidBaseSize = 35;
  const pyramidHeight = 21.6;

  // Glass material
  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xd5e8f5,
    metalness: 0.0,
    roughness: 0.02,
    transmission: 0.93,
    thickness: 0.2,
    transparent: true,
    opacity: 0.2,
    side: THREE.DoubleSide,
    envMapIntensity: 2.5,
    ior: 1.52,
    clearcoat: 1.0,
    clearcoatRoughness: 0.03,
    reflectivity: 0.95
  });

  // Steel frame material
  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0x0f1419,
    metalness: 0.95,
    roughness: 0.2
  });

  // Base corners (square rotated 45°)
  const baseCorners = [
    new THREE.Vector3(pyramidBaseSize * 0.707, 0, 0),
    new THREE.Vector3(0, 0, pyramidBaseSize * 0.707),
    new THREE.Vector3(-pyramidBaseSize * 0.707, 0, 0),
    new THREE.Vector3(0, 0, -pyramidBaseSize * 0.707)
  ];
  const apex = new THREE.Vector3(0, pyramidHeight, 0);

  // Create pyramid with glass panels
  const panelsPerRow = 11;
  const rowCount = 9;

  function createPyramidSide(corner1, corner2, apex) {
    const sideGroup = new THREE.Group();

    for (let row = 0; row < rowCount; row++) {
      const t1 = row / rowCount;
      const t2 = (row + 1) / rowCount;

      const bottomLeft = new THREE.Vector3().lerpVectors(corner1, apex, t1);
      const bottomRight = new THREE.Vector3().lerpVectors(corner2, apex, t1);
      const topLeft = new THREE.Vector3().lerpVectors(corner1, apex, t2);
      const topRight = new THREE.Vector3().lerpVectors(corner2, apex, t2);

      const panelsInThisRow = Math.max(2, Math.floor(panelsPerRow * (1 - t1)));

      for (let col = 0; col < panelsInThisRow; col++) {
        const s1 = col / panelsInThisRow;
        const s2 = (col + 1) / panelsInThisRow;

        const p1 = new THREE.Vector3().lerpVectors(bottomLeft, bottomRight, s1);
        const p2 = new THREE.Vector3().lerpVectors(bottomLeft, bottomRight, s2);
        const p3 = new THREE.Vector3().lerpVectors(topLeft, topRight, s2);
        const p4 = new THREE.Vector3().lerpVectors(topLeft, topRight, s1);

        // Glass panel
        const panelGeo = new THREE.BufferGeometry();
        const vertices = new Float32Array([
          p1.x, p1.y, p1.z,
          p2.x, p2.y, p2.z,
          p3.x, p3.y, p3.z,
          p1.x, p1.y, p1.z,
          p3.x, p3.y, p3.z,
          p4.x, p4.y, p4.z
        ]);
        panelGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        panelGeo.computeVertexNormals();

        const panel = new THREE.Mesh(panelGeo, glassMaterial);
        panel.castShadow = true;
        panel.receiveShadow = true;
        sideGroup.add(panel);

        // Frame edges
        const frameThickness = 0.07;
        createPanelFrame(p1, p2, p3, p4, frameThickness, frameMaterial, sideGroup);
      }
    }

    return sideGroup;
  }

  function createPanelFrame(p1, p2, p3, p4, thickness, material, parent) {
    parent.add(createFrameEdge(p1, p2, thickness, material));
    parent.add(createFrameEdge(p2, p3, thickness, material));
    parent.add(createFrameEdge(p3, p4, thickness, material));
    parent.add(createFrameEdge(p4, p1, thickness, material));
  }

  function createFrameEdge(start, end, radius, material) {
    const length = start.distanceTo(end);
    if (length < 0.01) return new THREE.Object3D();

    const geometry = new THREE.CylinderGeometry(radius, radius, length, 6);
    const edge = new THREE.Mesh(geometry, material);

    edge.position.copy(start).add(end).multiplyScalar(0.5);

    const direction = new THREE.Vector3().subVectors(end, start).normalize();
    const axis = new THREE.Vector3(0, 1, 0);
    edge.quaternion.setFromUnitVectors(axis, direction);

    edge.castShadow = true;
    edge.receiveShadow = false;

    return edge;
  }

  // Build all 4 sides
  for (let i = 0; i < 4; i++) {
    const corner1 = baseCorners[i];
    const corner2 = baseCorners[(i + 1) % 4];
    const side = createPyramidSide(corner1, corner2, apex);
    pyramidGroup.add(side);
  }

  // Main structural frame
  const mainFrameRadius = 0.14;

  for (let i = 0; i < baseCorners.length; i++) {
    const start = baseCorners[i];
    const end = baseCorners[(i + 1) % baseCorners.length];
    const edge = createFrameEdge(start, end, mainFrameRadius, frameMaterial);
    pyramidGroup.add(edge);
  }

  baseCorners.forEach(corner => {
    const edge = createFrameEdge(corner, apex, mainFrameRadius, frameMaterial);
    pyramidGroup.add(edge);
  });

  // Underground entrance
  const entranceDepth = 3.5;
  const entranceSize = 16;
  const entranceGeo = new THREE.BoxGeometry(entranceSize, entranceDepth, entranceSize);
  const entranceMat = new THREE.MeshPhysicalMaterial({
    color: 0xe5e8f0,
    metalness: 0.1,
    roughness: 0.15,
    transmission: 0.88,
    transparent: true,
    opacity: 0.35
  });
  const entrance = new THREE.Mesh(entranceGeo, entranceMat);
  entrance.position.y = -entranceDepth / 2 + 0.15;
  entrance.castShadow = true;
  entrance.receiveShadow = true;
  pyramidGroup.add(entrance);

  // === TRIANGULAR FOUNTAIN POOLS (Like the real Louvre!) ===
  // Material for water
  const waterMaterial = new THREE.MeshStandardMaterial({
    color: 0x4a9db5,
    metalness: 0.5,
    roughness: 0.08,
    transparent: true,
    opacity: 0.75
  });

  // Create triangular pool shape
  function createTriangularPool(vertex1, vertex2, center) {
    const shape = new THREE.Shape();
    shape.moveTo(vertex1.x, vertex1.z);
    shape.lineTo(vertex2.x, vertex2.z);
    shape.lineTo(center.x, center.z);
    shape.lineTo(vertex1.x, vertex1.z);

    const extrudeSettings = {
      depth: 0.3,
      bevelEnabled: false
    };

    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    const pool = new THREE.Mesh(geometry, waterMaterial);
    pool.rotation.x = -Math.PI / 2;
    pool.position.y = 0.05;
    pool.receiveShadow = true;
    return pool;
  }

  // Center of pyramid base
  const center = new THREE.Vector3(0, 0, 0);

  // Create 3 triangular pools between each base corner
  // Pool 1: Between corners 0 and 1 (front)
  const pool1 = createTriangularPool(
    new THREE.Vector3(baseCorners[0].x * 1.3, 0, baseCorners[0].z * 1.3),
    new THREE.Vector3(baseCorners[1].x * 1.3, 0, baseCorners[1].z * 1.3),
    new THREE.Vector3(center.x, 0, center.z + 8)
  );
  scene.add(pool1);

  // Pool 2: Between corners 2 and 3 (back-left and back-right)
  const pool2 = createTriangularPool(
    new THREE.Vector3(baseCorners[2].x * 1.3, 0, baseCorners[2].z * 1.3),
    new THREE.Vector3(baseCorners[3].x * 1.3, 0, baseCorners[3].z * 1.3),
    new THREE.Vector3(center.x, 0, center.z - 8)
  );
  scene.add(pool2);

  // Pool 3: Left side (between corners 1 and 2)
  const pool3 = createTriangularPool(
    new THREE.Vector3(baseCorners[1].x * 1.3, 0, baseCorners[1].z * 1.3),
    new THREE.Vector3(baseCorners[2].x * 1.3, 0, baseCorners[2].z * 1.3),
    new THREE.Vector3(center.x - 8, 0, center.z)
  );
  scene.add(pool3);

  // Pool 4: Right side (between corners 3 and 0)
  const pool4 = createTriangularPool(
    new THREE.Vector3(baseCorners[3].x * 1.3, 0, baseCorners[3].z * 1.3),
    new THREE.Vector3(baseCorners[0].x * 1.3, 0, baseCorners[0].z * 1.3),
    new THREE.Vector3(center.x + 8, 0, center.z)
  );
  scene.add(pool4);

  // === SMALL PYRAMIDS ===
  const smallPyramidScale = 0.15;
  const smallPyramidBase = pyramidBaseSize * smallPyramidScale;
  const smallPyramidHeight = pyramidHeight * smallPyramidScale;

  // Positioned in the triangular pools
  const smallPositions = [
    new THREE.Vector3(0, 0, 40),           // Front
    new THREE.Vector3(-40, 0, 0),          // Left
    new THREE.Vector3(40, 0, 0),           // Right
  ];

  smallPositions.forEach(pos => {
    const smallGroup = new THREE.Group();
    
    // Glass pyramid
    const smallPyramidGeo = new THREE.ConeGeometry(smallPyramidBase, smallPyramidHeight, 4, 3);
    const smallPyramid = new THREE.Mesh(smallPyramidGeo, glassMaterial);
    smallPyramid.position.y = smallPyramidHeight / 2;
    smallPyramid.rotation.y = Math.PI / 4;
    smallPyramid.castShadow = true;
    smallPyramid.receiveShadow = true;
    smallGroup.add(smallPyramid);

    // Frame edges
    const smallBaseCorners = [
      new THREE.Vector3(smallPyramidBase * 0.707, 0, 0),
      new THREE.Vector3(0, 0, smallPyramidBase * 0.707),
      new THREE.Vector3(-smallPyramidBase * 0.707, 0, 0),
      new THREE.Vector3(0, 0, -smallPyramidBase * 0.707)
    ];
    const smallApex = new THREE.Vector3(0, smallPyramidHeight, 0);

    // Base frame
    for (let i = 0; i < smallBaseCorners.length; i++) {
      const start = smallBaseCorners[i];
      const end = smallBaseCorners[(i + 1) % 4];
      const edge = createFrameEdge(start, end, 0.05, frameMaterial);
      smallGroup.add(edge);
    }

    // Edges to apex
    smallBaseCorners.forEach(corner => {
      const edge = createFrameEdge(corner, smallApex, 0.05, frameMaterial);
      smallGroup.add(edge);
    });

    smallGroup.position.copy(pos);
    scene.add(smallGroup);
  });

  // Render functions
  function resizeRendererToDisplaySize(renderer) {
    const canvasEl = renderer.domElement;
    const width = canvasEl.clientWidth;
    const height = canvasEl.clientHeight;
    const needResize = canvasEl.width !== width || canvasEl.height !== height;
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

    controls.update();
    controls2.update();

    // Left view
    {
      const aspect = setScissorForElement(view1Elem);
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    }

    // Right view (TOP VIEW)
    {
      const aspect = setScissorForElement(view2Elem);
      camera2.aspect = aspect;
      camera2.updateProjectionMatrix();
      renderer.render(scene, camera2);
    }

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}

main();