<template>
  <div ref="containerRef" class="viewer-container">
    <div 
      v-if="hoveredPart" 
      class="model-tooltip"
      :style="{ 
        left: tooltipPos.x + 'px', 
        top: tooltipPos.y + 'px' 
      }"
    >
      <div class="tooltip-name">{{ hoveredPart.name }}</div>
      <div v-if="hoveredPart.description" class="tooltip-desc">
        {{ hoveredPart.description }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, reactive } from "vue";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { ModelPart, TexturePack } from "../types/models";

interface Props {
  modelPath: string;
  selectedPart: ModelPart | null;
  selectedTexturePack: TexturePack | null;
  visibleParts: Set<string>;
  focusOnSelectedPart?: boolean;
  isAnimationPlaying?: boolean;
  animationTime?: number;
  animationSpeed?: number;
  animationLoop?: boolean;
  lightPosition?: { x: number; y: number; z: number };
  showLightHelper?: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  partsLoaded: [parts: ModelPart[]];
  partClick: [part: ModelPart];
  animationsLoaded: [hasAnimations: boolean, duration: number];
  animationTimeUpdate: [time: number];
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
let directionalLight: THREE.DirectionalLight;
let lightHelperGroup: THREE.Group;
let lightSprite: THREE.Sprite;
let lightLine: THREE.Line;

const hoveredPart = ref<ModelPart | null>(null);
const tooltipPos = reactive({ x: 0, y: 0 });

// Переменные для анимации
let mixer: THREE.AnimationMixer | null = null;
let animations: THREE.AnimationClip[] = [];
let currentAction: THREE.AnimationAction | null = null;
let clock: THREE.Clock;

const parts: ModelPart[] = [];
// Так как модель принудительно центрируется в сцене (см. loadModel),
// базовый pivot для вращения по умолчанию - мировой (0,0,0).
const defaultOrbitTarget = new THREE.Vector3(0, 0, 0);

onMounted(() => {
  clock = new THREE.Clock();
  initScene();
  loadModel();
  animate();
  window.addEventListener("resize", onWindowResize);
  containerRef.value?.addEventListener("click", onCanvasClick);
  containerRef.value?.addEventListener("mousemove", onMouseMove);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", onWindowResize);
  containerRef.value?.removeEventListener("click", onCanvasClick);
  containerRef.value?.removeEventListener("mousemove", onMouseMove);
  
  cancelAnimationFrame(animationId);
  if (mixer) {
    mixer.stopAllAction();
  }
  renderer.dispose();
  controls.dispose();
});

// Обработка движения мыши для тултипа
function onMouseMove(event: MouseEvent) {
  if (!containerRef.value || !model) return;

  const rect = containerRef.value.getBoundingClientRect();
  
  // Обновляем координаты для Raycaster (нормализованные -1..1)
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  // Обновляем позицию тултипа в пикселях (с небольшим отступом от курсора)
  tooltipPos.x = event.clientX - rect.left + 15;
  tooltipPos.y = event.clientY - rect.top + 15;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(model.children, true);

  if (intersects.length > 0 && intersects[0]) {
    const clickedMesh = intersects[0].object as THREE.Mesh;
    const part = parts.find((p) => p.mesh === clickedMesh);

    if (part && part.visible) {
      hoveredPart.value = part;
      containerRef.value.style.cursor = 'pointer';
    } else {
      hoveredPart.value = null;
      containerRef.value.style.cursor = 'default';
    }
  } else {
    hoveredPart.value = null;
    containerRef.value.style.cursor = 'default';
  }
}

watch(
  () => props.selectedPart,
  (newPart) => {
    highlightPart(newPart);
    updateOrbitTarget(newPart);
  },
);

watch(
  () => props.focusOnSelectedPart,
  () => {
    updateOrbitTarget(props.selectedPart);
  },
);

watch(
  () => props.selectedTexturePack,
  (newPack) => {
    if (newPack) {
      applyTexturePack(newPack);
    }
  },
);

watch(
  () => props.visibleParts,
  (visibleParts) => {
    updatePartsVisibility(visibleParts);
  },
  { deep: true },
);

// Отслеживание изменений параметров анимации
// Управление воспроизведением/паузой анимации
watch(
  () => props.isAnimationPlaying,
  (isPlaying) => {
    if (currentAction) {
      if (isPlaying) {
        currentAction.paused = false;
      } else {
        currentAction.paused = true;
      }
    }
  },
);

// Перемотка анимации на указанное время
watch(
  () => props.animationTime,
  (time) => {
    if (mixer && currentAction && time !== undefined) {
      mixer.setTime(time);
    }
  },
);

// Изменение скорости воспроизведения анимации
watch(
  () => props.animationSpeed,
  (speed) => {
    if (currentAction && speed !== undefined) {
      currentAction.timeScale = speed;
    }
  },
);

// Изменение режима повтора анимации
watch(
  () => props.animationLoop,
  (loop) => {
    if (currentAction) {
      currentAction.loop = loop ? THREE.LoopRepeat : THREE.LoopOnce;
    }
  },
);

// Позиция источника света
watch(
  () => props.lightPosition,
  (pos) => {
    if (!pos) return;
    if (directionalLight) {
      directionalLight.position.set(pos.x, pos.y, pos.z);
    }
    if (lightSprite) {
      lightSprite.position.set(pos.x, pos.y, pos.z);
    }
    if (lightLine) {
      const positions = lightLine.geometry.attributes.position as THREE.BufferAttribute;
      positions.setXYZ(0, pos.x, pos.y, pos.z);
      positions.needsUpdate = true;
      lightLine.computeLineDistances();
    }
  },
  { deep: true },
);

// Видимость хелпера источника света
watch(
  () => props.showLightHelper,
  (visible) => {
    if (lightHelperGroup) {
      lightHelperGroup.visible = visible ?? true;
    }
  },
);

function createSunTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const cx = size / 2, cy = size / 2;

  // Лучи
  ctx.save();
  ctx.strokeStyle = "rgba(255, 210, 60, 0.85)";
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * 24, cy + Math.sin(angle) * 24);
    ctx.lineTo(cx + Math.cos(angle) * 36, cy + Math.sin(angle) * 36);
    ctx.stroke();
  }
  ctx.restore();

  // Внешнее свечение
  const glow = ctx.createRadialGradient(cx, cy, 8, cx, cy, 22);
  glow.addColorStop(0, "rgba(255, 240, 100, 1)");
  glow.addColorStop(0.5, "rgba(255, 180, 30, 0.9)");
  glow.addColorStop(1, "rgba(255, 100, 0, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, 22, 0, Math.PI * 2);
  ctx.fill();

  // Яркий центр
  const core = ctx.createRadialGradient(cx - 2, cy - 2, 0, cx, cy, 9);
  core.addColorStop(0, "rgba(255, 255, 255, 1)");
  core.addColorStop(0.6, "rgba(255, 240, 120, 1)");
  core.addColorStop(1, "rgba(255, 200, 50, 0.9)");
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(cx, cy, 9, 0, Math.PI * 2);
  ctx.fill();

  return new THREE.CanvasTexture(canvas);
}

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
    1000,
  );
  camera.position.set(5, 3, 5);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(
    containerRef.value.clientWidth,
    containerRef.value.clientHeight,
  );
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Для красивых мягких краев тени
  containerRef.value.appendChild(renderer.domElement);

  // Controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;

  // Lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(5, 10, 7);

  directionalLight.castShadow = true;

  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;

  const d = 10;
  directionalLight.shadow.camera.left = -d;
  directionalLight.shadow.camera.right = d;
  directionalLight.shadow.camera.top = d;
  directionalLight.shadow.camera.bottom = -d;
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 50;

  scene.add(directionalLight);

  // Хелпер источника света (спрайт + линия к центру)
  lightHelperGroup = new THREE.Group();

  const spriteTexture = createSunTexture();
  const spriteMat = new THREE.SpriteMaterial({
    map: spriteTexture,
    depthTest: false,
    transparent: true,
  });
  lightSprite = new THREE.Sprite(spriteMat);
  lightSprite.scale.set(2, 2, 1);
  lightSprite.position.set(5, 10, 7);
  lightHelperGroup.add(lightSprite);

  const lineGeo = new THREE.BufferGeometry();
  const linePositions = new Float32Array([5, 10, 7, 0, 0, 0]);
  lineGeo.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));
  const lineMat = new THREE.LineDashedMaterial({
    color: 0xf5a623,
    dashSize: 0.4,
    gapSize: 0.25,
    opacity: 0.6,
    transparent: true,
  });
  lightLine = new THREE.Line(lineGeo, lineMat);
  lightLine.computeLineDistances();
  lightHelperGroup.add(lightLine);

  lightHelperGroup.visible = props.showLightHelper ?? true;
  scene.add(lightHelperGroup);

  const planeGeometry = new THREE.PlaneGeometry(200, 200);
  const planeMaterial = new THREE.ShadowMaterial({ opacity: 0.5 });
  const plane = new THREE.Mesh(planeGeometry, planeMaterial);

  plane.rotation.x = -Math.PI / 2;
  plane.position.y = 0;
  plane.receiveShadow = true;

  scene.add(plane);

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
          child.castShadow = true;
          child.receiveShadow = true;
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

          // Инициализировать видимость
          part.visible = true;
        }
      });

      scene.add(model);

      // Центрировать модель
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      model.position.x -= center.x;
      model.position.z -= center.z;
      model.position.y -= box.min.y;

      // Обработка анимаций из загруженной модели
      if (gltf.animations && gltf.animations.length > 0) {
        animations = gltf.animations;
        mixer = new THREE.AnimationMixer(model);

        // Запустить первую анимацию из списка
        currentAction = mixer.clipAction(animations[0]!);
        currentAction.loop = THREE.LoopRepeat; // Режим повтора по умолчанию
        currentAction.play();
        currentAction.paused = true; // Начинаем с паузы

        const duration = animations[0]!.duration;
        emit("animationsLoaded", true, duration);
        console.log(
          "Анимации загружены:",
          animations.length,
          "Длительность:",
          duration,
        );
      } else {
        emit("animationsLoaded", false, 0);
        console.log("Анимации не найдены");
      }

      emit("partsLoaded", parts);
      console.log("Модель загружена успешно, деталей:", parts.length);
    },
    undefined,
    (error) => {
      console.error("Ошибка загрузки модели:", error);
      console.error("Путь к модели:", absolutePath);
      console.error("Оригинальный путь:", props.modelPath);
    },
  );
}

function animate() {
  animationId = requestAnimationFrame(animate);

  // Обновление анимации при воспроизведении
  if (mixer && props.isAnimationPlaying) {
    const delta = clock.getDelta();
    mixer.update(delta);

    // Отправить текущее время анимации родительскому компоненту
    if (currentAction) {
      emit("animationTimeUpdate", currentAction.time);
    }
  }

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
    containerRef.value.clientHeight,
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

function updateOrbitTarget(part: ModelPart | null) {
  if (!controls) return;

  if (!props.focusOnSelectedPart || !part?.mesh) {
    controls.target.copy(defaultOrbitTarget);
    controls.update();
    return;
  }

  // Обновляем матрицы мира на случай анимаций/перемещений
  part.mesh.updateWorldMatrix(true, false);

  const box = new THREE.Box3().setFromObject(part.mesh);
  const center = box.getCenter(new THREE.Vector3());

  // OrbitControls вращает камеру вокруг controls.target
  controls.target.copy(center);
  controls.update();
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
        `Деталь: ${part.name}, Материал: ${part.materialName}, Путь: ${absoluteTexturePath}`,
      );

      textureLoader.load(
        absoluteTexturePath,
        (texture) => {
        if (part.mesh) {
            console.log(
              `✓ Текстура загружена для ${part.name} (${part.materialName})`,
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
            `✗ Не удалось загрузить текстуру для ${part.name} (${part.materialName}): ${absoluteTexturePath}`,
          );
        },
      );
    }
  });
}

function updatePartsVisibility(visibleParts: Set<string>) {
  parts.forEach((part) => {
    if (part.mesh) {
      const shouldBeVisible = visibleParts.has(part.name);
      part.mesh.visible = shouldBeVisible;
      part.visible = shouldBeVisible;
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

/* Стили тултипа */
.model-tooltip {
  position: absolute;
  z-index: 1000;
  pointer-events: none; /* Чтобы тултип не мешал рейкасту */
  background: rgba(28, 28, 28, 0.9);
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 13px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  max-width: 200px;
}

.tooltip-name {
  font-weight: 600;
  color: #4a90e2;
  margin-bottom: 2px;
}

.tooltip-desc {
  font-size: 11px;
  color: #ccc;
  line-height: 1.3;
}
</style>
