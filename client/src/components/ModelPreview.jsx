import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { STLLoader } from "three/addons/loaders/STLLoader.js";
import { ThreeMFLoader } from "three/addons/loaders/3MFLoader.js";

const makeModelMaterial = (color = "#E36414") =>
  new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    metalness: 0.22,
    roughness: 0.38,
  });

function createPlaceholder(scene) {
  const placeholder = new THREE.Group();
  const primary = new THREE.Mesh(
    new THREE.TorusKnotGeometry(0.67, 0.2, 150, 18, 2, 3),
    makeModelMaterial(),
  );
  const accent = new THREE.Mesh(
    new THREE.TorusGeometry(0.91, 0.025, 12, 100),
    new THREE.MeshStandardMaterial({
      color: 0x0f4c5c,
      metalness: 0.34,
      roughness: 0.38,
    }),
  );
  accent.rotation.x = 0.76;
  accent.rotation.y = 0.42;
  placeholder.add(primary, accent);
  scene.add(placeholder);
  return placeholder;
}

function disposeObject(object) {
  if (!object) return;
  object.traverse((child) => {
    if (!child.isMesh) return;
    child.geometry?.dispose();
    if (Array.isArray(child.material)) {
      child.material.forEach((material) => material.dispose());
    } else {
      child.material?.dispose();
    }
  });
}

function getSignedVolume(object) {
  let volume = 0;
  const vertexA = new THREE.Vector3();
  const vertexB = new THREE.Vector3();
  const vertexC = new THREE.Vector3();
  const cross = new THREE.Vector3();

  object.updateMatrixWorld(true);
  object.traverse((mesh) => {
    if (!mesh.isMesh || !mesh.geometry?.getAttribute("position")) return;
    const positions = mesh.geometry.getAttribute("position");
    const indices = mesh.geometry.getIndex();
    const count = indices ? indices.count : positions.count;

    for (let index = 0; index + 2 < count; index += 3) {
      const a = indices ? indices.getX(index) : index;
      const b = indices ? indices.getX(index + 1) : index + 1;
      const c = indices ? indices.getX(index + 2) : index + 2;
      vertexA.fromBufferAttribute(positions, a).applyMatrix4(mesh.matrixWorld);
      vertexB.fromBufferAttribute(positions, b).applyMatrix4(mesh.matrixWorld);
      vertexC.fromBufferAttribute(positions, c).applyMatrix4(mesh.matrixWorld);
      cross.crossVectors(vertexB, vertexC);
      volume += vertexA.dot(cross) / 6;
    }
  });

  return Math.abs(volume);
}

function readModelStats(object, modelName) {
  object.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(object);
  const rawSize = bounds.getSize(new THREE.Vector3());
  const largestSide = Math.max(rawSize.x, rawSize.y, rawSize.z);
  const unitScale = largestSide < 1 ? 1000 : largestSide > 50000 ? 0.001 : 1;
  const scaledSize = rawSize.clone().multiplyScalar(unitScale);
  const signedVolume = getSignedVolume(object) * unitScale ** 3;
  const boxVolume = scaledSize.x * scaledSize.y * scaledSize.z;
  const usableVolume = signedVolume > 0.01 ? signedVolume : boxVolume * 0.18;

  return {
    modelName,
    volumeCm3: Math.max(0.1, Number((usableVolume / 1000).toFixed(2))),
    dimensionsMm: {
      x: Number(scaledSize.x.toFixed(1)),
      y: Number(scaledSize.y.toFixed(1)),
      z: Number(scaledSize.z.toFixed(1)),
    },
  };
}

async function loadModel(file, objectUrl) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "stl") {
    const geometry = await new STLLoader().loadAsync(objectUrl);
    geometry.computeVertexNormals();
    return new THREE.Mesh(geometry, makeModelMaterial());
  }
  if (extension === "obj") {
    return new OBJLoader().loadAsync(objectUrl);
  }
  if (extension === "3mf") {
    return new ThreeMFLoader().loadAsync(objectUrl);
  }
  throw new Error("صيغة الملف غير مدعومة. استخدم STL أو OBJ أو 3MF.");
}


export default function ModelPreview({ file, color, onMetrics, onError }) {
  const mountRef = useRef(null);
  const runtimeRef = useRef(null);
  const onMetricsRef = useRef(onMetrics);
  const onErrorRef = useRef(onError);
  const colorRef = useRef(color);

  useEffect(() => {
    onMetricsRef.current = onMetrics;
    onErrorRef.current = onError;
    colorRef.current = color;
  }, [color, onMetrics, onError]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(3.5, 2.8, 4.2);

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      onErrorRef.current?.("المتصفح لا يدعم معاينة 3D على هذا الجهاز.");
      return undefined;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xc8dddf, 0x16191b, 2.1));
    const keyLight = new THREE.DirectionalLight(0xffe1cc, 3.2);
    keyLight.position.set(3.2, 5, 4);
    keyLight.castShadow = true;
    scene.add(keyLight);
    const tealLight = new THREE.PointLight(0x0f4c5c, 38, 9);
    tealLight.position.set(-3.2, 1.2, -1.5);
    scene.add(tealLight);
    const copperLight = new THREE.PointLight(0xe36414, 22, 7);
    copperLight.position.set(2, 0.4, 3);
    scene.add(copperLight);

    const grid = new THREE.GridHelper(5, 22, 0x0f4c5c, 0x526064);
    grid.position.y = -1.15;
    grid.material.transparent = true;
    grid.material.opacity = 0.42;
    scene.add(grid);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.065;
    controls.enablePan = false;
    controls.minDistance = 2.5;
    controls.maxDistance = 8;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.7;

    const runtime = {
      scene,
      camera,
      controls,
      renderer,
      placeholder: createPlaceholder(scene),
      modelRoot: null,
      animationFrame: 0,
      resizeObserver: null,
    };
    runtimeRef.current = runtime;

    const resize = () => {
      const width = Math.max(mount.clientWidth, 1);
      const height = Math.max(mount.clientHeight, 1);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    runtime.resizeObserver = new ResizeObserver(resize);
    runtime.resizeObserver.observe(mount);
    resize();

    const animate = () => {
      runtime.animationFrame = window.requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      window.cancelAnimationFrame(runtime.animationFrame);
      runtime.resizeObserver?.disconnect();
      controls.dispose();
      disposeObject(runtime.placeholder);
      disposeObject(runtime.modelRoot);
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
      runtimeRef.current = null;
    };
  }, []);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) return undefined;

    if (runtime.modelRoot) {
      runtime.scene.remove(runtime.modelRoot);
      disposeObject(runtime.modelRoot);
      runtime.modelRoot = null;
    }
    if (runtime.placeholder) {
      runtime.scene.remove(runtime.placeholder);
      disposeObject(runtime.placeholder);
      runtime.placeholder = null;
    }

    if (!file) {
      runtime.placeholder = createPlaceholder(runtime.scene);
      onMetricsRef.current?.(null);
      onErrorRef.current?.("");
      return undefined;
    }

    const objectUrl = URL.createObjectURL(file);
    let cancelled = false;

    loadModel(file, objectUrl)
      .then((object) => {
        if (cancelled) {
          disposeObject(object);
          return;
        }

        object.traverse((child) => {
          if (!child.isMesh) return;
          if (!child.geometry.getAttribute("normal")) {
            child.geometry.computeVertexNormals();
          }
          child.material = makeModelMaterial(colorRef.current);
          child.castShadow = true;
          child.receiveShadow = true;
        });

        const metrics = readModelStats(object, file.name);
        const bounds = new THREE.Box3().setFromObject(object);
        const size = bounds.getSize(new THREE.Vector3());
        const center = bounds.getCenter(new THREE.Vector3());
        const largestSide = Math.max(size.x, size.y, size.z);
        if (!Number.isFinite(largestSide) || largestSide <= 0) {
          throw new Error("الملف لا يحتوي على مجسم قابل للمعاينة.");
        }

        const scale = 2.1 / largestSide;
        const modelRoot = new THREE.Group();
        modelRoot.add(object);
        modelRoot.scale.setScalar(scale);
        modelRoot.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
        runtime.scene.add(modelRoot);
        runtime.modelRoot = modelRoot;
        runtime.controls.autoRotate = true;

        onMetricsRef.current?.(metrics);
        onErrorRef.current?.("");
      })
      .catch((error) => {
        if (!cancelled) {
          onMetricsRef.current?.(null);
          onErrorRef.current?.(error?.message || "تعذر فتح الملف. جرّب تصديره من جديد.");
        }
      });

    return () => {
      cancelled = true;
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime?.modelRoot || !color) return;
    runtime.modelRoot.traverse((child) => {
      if (child.isMesh) child.material.color.set(color);
    });
  }, [color]);

  return <div className="model-preview" ref={mountRef} aria-label="معاينة النموذج ثلاثي الأبعاد" />;
}

