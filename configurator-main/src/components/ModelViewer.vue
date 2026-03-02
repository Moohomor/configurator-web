<template>
  <div ref="containerRef" class="viewer-container"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { ModelPart, TexturePack } from "../types/models";

interface Props {
  modelPath: string;
  selectedPart: ModelPart | null;
  selectedTexturePack: TexturePack | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  partsLoaded: [parts: ModelPart[]];
  partClick: [part: ModelPart];
}>();

const containerRef = ref<HTMLDivElement>();
let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let model: THREE.Group;
let raycaster: THREE.Raycaster;
let mouse: THREE.Vector2;
let animationId: number;

const parts: ModelPart[] = [];

onMounted(() => {
  initScene();
  loadModel();
  animate();
  window.addEventListener("resize", onWindowResize);
  containerRef.value?.addEventListener("click", onCanvasClick);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", onWindowResize);
  containerRef.value?.removeEventListener("click", onCanvasClick);
  cancelAnimationFrame(animationId);
  renderer.dispose();
  controls.dispose();
});

watch(
  () => props.selectedPart,
  (newPart) => {
    highlightPart(newPart);
  }
);

watch(
  () => props.selectedTexturePack,
  (newPack) => {
    if (newPack) {
      applyTexturePack(newPack);
    }
  }
);

function initScene() {
  if (!containerRef.value) return;

  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf0f0f0);

  // Camera
  camera = new THREE.PerspectiveCamera(
    60,
    containerRef.value.clientWidth / containerRef.value.clientHeight,
    0.1,
    1000
  );
  camera.position.set(5, 3, 5);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(
    containerRef.value.clientWidth,
    containerRef.value.clientHeight
  );
  renderer.setPixelRatio(window.devicePixelRatio);
  containerRef.value.appendChild(renderer.domElement);

  // Controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;

  // Lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(5, 10, 7);
  scene.add(directionalLight);

  // Raycaster for picking
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();
}

function loadModel() {
  const loader = new GLTFLoader();

  // Преобразовать относительный путь в абсолютный для работы внутри iframe
  let absolutePath: string;

  if (props.modelPath.startsWith("http")) {
    // Уже абсолютный URL
    absolutePath = props.modelPath;
  } else {
    // Относительный путь - резолвим относительно родительского окна
    const baseUrl = window.parent?.location?.href || window.location.href;
    absolutePath = new URL(props.modelPath, baseUrl).href;
  }

  console.log("Загрузка модели:", absolutePath);

  loader.load(
    absolutePath,
    (gltf) => {
      model = gltf.scene;

      // Извлечь все детали модели
      model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const part: ModelPart = {
            name: child.name || "Unnamed",
            materialName: child.material?.name || "default",
            mesh: child,
            // Извлечь описание из userData если есть
            description: child.userData?.description,
            metadata: child.userData,
          };
          parts.push(part);

          // Добавить свойство для хранения оригинального материала
          (child as any).originalMaterial = child.material.clone();
        }
      });

      scene.add(model);

      // Центрировать модель
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      model.position.sub(center);

      emit("partsLoaded", parts);
      console.log("Модель загружена успешно, деталей:", parts.length);
    },
    undefined,
    (error) => {
      console.error("Ошибка загрузки модели:", error);
      console.error("Путь к модели:", absolutePath);
      console.error("Оригинальный путь:", props.modelPath);
    }
  );
}

function animate() {
  animationId = requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

function onWindowResize() {
  if (!containerRef.value) return;

  camera.aspect =
    containerRef.value.clientWidth / containerRef.value.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(
    containerRef.value.clientWidth,
    containerRef.value.clientHeight
  );
}

function onCanvasClick(event: MouseEvent) {
  if (!containerRef.value) return;

  const rect = containerRef.value.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObjects(model.children, true);

  if (intersects.length > 0 && intersects[0]) {
    const clickedMesh = intersects[0].object as THREE.Mesh;
    const part = parts.find((p) => p.mesh === clickedMesh);

    if (part) {
      emit("partClick", part);
    }
  }
}

function highlightPart(part: ModelPart | null) {
  // Сбросить предыдущее выделение
  parts.forEach((p) => {
    if (p.mesh) {
      const originalMat = (p.mesh as any).originalMaterial;
      p.mesh.material = originalMat.clone();
      // Сохранить все важные свойства материала
      p.mesh.material.transparent = originalMat.transparent;
      p.mesh.material.opacity = originalMat.opacity;
      p.mesh.material.side = originalMat.side;
      p.mesh.material.needsUpdate = true;
    }
  });

  // Выделить новую деталь
  if (part && part.mesh) {
    const originalMat = (part.mesh as any).originalMaterial;
    const highlightMaterial = originalMat.clone();
    highlightMaterial.emissive = new THREE.Color(0x4a90e2);
    highlightMaterial.emissiveIntensity = 0.3;
    // Сохранить прозрачность
    highlightMaterial.transparent = originalMat.transparent;
    highlightMaterial.opacity = originalMat.opacity;
    highlightMaterial.side = originalMat.side;
    highlightMaterial.needsUpdate = true;
    part.mesh.material = highlightMaterial;
  }
}

function applyTexturePack(pack: TexturePack) {
  const textureLoader = new THREE.TextureLoader();

  console.log(`Применяю текстур-пак: ${pack.name} (${pack.path})`);
  console.log(`Всего деталей: ${parts.length}`);

  parts.forEach((part) => {
    if (part.mesh) {
      const texturePath = `${pack.path}/${part.materialName}_baseColor.png`;
      const absoluteTexturePath = texturePath.startsWith("http")
        ? texturePath
        : new URL(texturePath, window.parent.location.href).href;

      console.log(
        `Деталь: ${part.name}, Материал: ${part.materialName}, Путь: ${absoluteTexturePath}`
      );

      textureLoader.load(
        absoluteTexturePath,
        (texture) => {
          if (part.mesh) {
            console.log(
              `✓ Текстура загружена для ${part.name} (${part.materialName})`
            );

            const originalMat = (part.mesh as any).originalMaterial;
            const material = originalMat.clone();

            // Правильно настраиваем текстуру
            texture.colorSpace = THREE.SRGBColorSpace;
            texture.flipY = false; // Для GLTF текстур

            material.map = texture;
            // Сохранить все важные свойства
            material.transparent = originalMat.transparent;
            material.opacity = originalMat.opacity;
            material.side = originalMat.side;
            material.alphaTest = originalMat.alphaTest;
            material.depthWrite = originalMat.depthWrite;
            material.needsUpdate = true;

            part.mesh.material = material;
            (part.mesh as any).originalMaterial = material;
          }
        },
        undefined,
        (_error) => {
          console.warn(
            `✗ Не удалось загрузить текстуру для ${part.name} (${part.materialName}): ${absoluteTexturePath}`
          );
        }
      );
    }
  });
}
</script>

<style scoped>
.viewer-container {
  width: 100%;
  height: 100%;
  position: relative;
}
</style>
