import { onMount, onCleanup } from 'solid-js';
import {
  AmbientLight,
  AnimationMixer,
  AxesHelper,
  Box3,
  Cache,
  Color,
  DirectionalLight,
  GridHelper,
  HemisphereLight,
  LoaderUtils,
  LoadingManager,
  PMREMGenerator,
  PerspectiveCamera,
  PointsMaterial,
  REVISION,
  Scene,
  SkeletonHelper,
  Vector3,
  WebGLRenderer,
  LinearToneMapping,
  ACESFilmicToneMapping,
} from 'three';
import * as THREE from 'three';
import Stats from 'three/addons/libs/stats.module.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GUI } from 'dat.gui';
import { environments } from './environments.js';
import { useThreeJSContext } from '@/threeJSContext.js';

// Constants and loaders
const DEFAULT_CAMERA = '[default]';
const MANAGER = new LoadingManager();
const THREE_PATH = `https://unpkg.com/three@0.${REVISION}.x`;
const DRACO_LOADER = new DRACOLoader(MANAGER).setDecoderPath(
  `${THREE_PATH}/examples/jsm/libs/draco/gltf/`
);
const KTX2_LOADER = new KTX2Loader(MANAGER).setTranscoderPath(
  `${THREE_PATH}/examples/jsm/libs/basis/`
);

const Preset = { ASSET_GENERATOR: 'assetgenerator' };

Cache.enabled = true;
type PointsCallback = (points: THREE.Vector3[]) => void;

export class Viewer {
  el: Element;
  options: any;
  lights: any[];
  content: any;
  mixer: any;
  clips: any[];
  gui: GUI | null;
  state: any;
  prevTime: number;
  stats: any;
  backgroundColor: Color;
  scene: Scene;
  defaultCamera: PerspectiveCamera;
  activeCamera: any;
  renderer: WebGLRenderer;
  pmremGenerator: PMREMGenerator;
  neutralEnvironment: any;
  controls: OrbitControls;
  cameraCtrl: any;
  cameraFolder: any;
  animFolder: any;
  animCtrls: any[];
  morphFolder: any;
  morphCtrls: any[];
  skeletonHelpers: any[];
  gridHelper: any;
  axesHelper: any;
  axesDiv!: HTMLElement;
  axesScene!: Scene;
  axesCamera!: PerspectiveCamera;
  axesRenderer!: WebGLRenderer;
  axesCorner!: AxesHelper;
  onPointsLoaded?: PointsCallback;

  constructor(el: Element, options: any, onPointsLoaded: PointsCallback) {
    this.el = el;
    this.options = options;

    this.lights = [];
    this.content = null;
    this.mixer = null;
    this.clips = [];
    this.gui = null;

    this.state = {
      environment:
        options.preset === Preset.ASSET_GENERATOR
          ? environments.find((e) => e.id === 'footprint-court')!.name
          : environments[1].name,
      background: false,
      playbackSpeed: 1.0,
      actionStates: {},
      camera: DEFAULT_CAMERA,
      wireframe: false,
      skeleton: false,
      grid: false,
      autoRotate: false,
      // Lights
      punctualLights: true,
      exposure: 0.0,
      toneMapping: LinearToneMapping,
      ambientIntensity: 0.3,
      ambientColor: '#FFFFFF',
      directIntensity: 0.8 * Math.PI,
      directColor: '#FFFFFF',
      bgColor: '#ffecec',
      pointSize: 1.0,
    };

    this.prevTime = 0;

    this.stats = new Stats();
    this.stats.dom.height = '48px';
    [].forEach.call(this.stats.dom.children, (child: HTMLElement) => (child.style.display = ''));

    this.backgroundColor = new Color(this.state.bgColor);

    this.scene = new Scene();
    // this.scene.background = this.backgroundColor;

    const fov = options.preset === Preset.ASSET_GENERATOR ? (0.8 * 180) / Math.PI : 60;
    const aspect = el.clientWidth / el.clientHeight;
    this.defaultCamera = new PerspectiveCamera(fov, aspect, 0.01, 1000);
    this.activeCamera = this.defaultCamera;
    this.scene.add(this.defaultCamera);

    this.renderer = new WebGLRenderer({ antialias: true, alpha: true });
    // this.renderer.setClearColor(0xcccccc);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(el.clientWidth, el.clientHeight);
    this.renderer.setClearColor( 0x000000, 0 );

    this.pmremGenerator = new PMREMGenerator(this.renderer);
    this.pmremGenerator.compileEquirectangularShader();

    this.neutralEnvironment = this.pmremGenerator.fromScene(new RoomEnvironment()).texture;

    this.controls = new OrbitControls(this.defaultCamera, this.renderer.domElement);
    this.controls.screenSpacePanning = true;

    this.el.appendChild(this.renderer.domElement);

    this.cameraCtrl = null;
    this.cameraFolder = null;
    this.animFolder = null;
    this.animCtrls = [];
    this.morphFolder = null;
    this.morphCtrls = [];
    this.skeletonHelpers = [];
    this.gridHelper = null;
    this.axesHelper = null;

    this.addAxesHelper();
    this.addGUI();
    if (options.kiosk) this.gui && (this.gui as any).close();

    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
    window.addEventListener('resize', this.resize.bind(this), false);
    this.onPointsLoaded = onPointsLoaded;
  }

  animate(time: number) {
    requestAnimationFrame(this.animate);
    const dt = (time - this.prevTime) / 1000;
    this.controls.update();
    this.stats.update();
    this.mixer && this.mixer.update(dt);
    this.render();
    this.prevTime = time;
  }

  render() {
    this.renderer.render(this.scene, this.activeCamera);
    if (this.state.grid) {
      this.axesCamera.position.copy(this.defaultCamera.position);
      this.axesCamera.lookAt(this.axesScene.position);
      this.axesRenderer.render(this.axesScene, this.axesCamera);
    }
  }

  resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.defaultCamera.aspect = width / height;
    this.defaultCamera.updateProjectionMatrix();
    this.renderer.setSize(width, height);

    this.axesCamera.aspect = this.axesDiv.clientWidth / this.axesDiv.clientHeight;
    this.axesCamera.updateProjectionMatrix();
    this.axesRenderer.setSize(this.axesDiv.clientWidth, this.axesDiv.clientHeight);
  }

  load(url: string, rootPath: string, assetMap: Map<string, File>) {
    const baseURL = LoaderUtils.extractUrlBase(url);
    return new Promise((resolve, reject) => {
      MANAGER.setURLModifier((url: string, path?: string) => {
        const normalizedURL =
          rootPath +
          decodeURI(url)
            .replace(baseURL, '')
            .replace(/^(\.?\/)/, '');
        if (assetMap.has(normalizedURL)) {
          const blob = assetMap.get(normalizedURL)!;
          const blobURL = URL.createObjectURL(blob);
          return blobURL;
        }
        return (path || '') + url;
      });
      const gltfModel = new GLTFLoader(MANAGER)

      gltfModel.load(url, (gltf) => {
        const points: THREE.Vector3[] = [];
        gltf.scene.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            const geometry = mesh.geometry as THREE.BufferGeometry;
            const positionAttribute = geometry.attributes.position;
            
            for (let i = 0; i < positionAttribute.count; i++) {
              const vertex = new THREE.Vector3();
              vertex.fromBufferAttribute(positionAttribute, i);
              // convert vertex position
              mesh.localToWorld(vertex);
              points.push(vertex);
            }
          }
        });
        if (this.onPointsLoaded) {
          this.onPointsLoaded(points);
        }
        const [_, { setPoints }] = useThreeJSContext();
        setPoints(points)
      });

      const loader = gltfModel
        .setCrossOrigin('anonymous')
        .setDRACOLoader(DRACO_LOADER)
        .setKTX2Loader(KTX2_LOADER.detectSupport(this.renderer))
        .setMeshoptDecoder(MeshoptDecoder);

      const blobURLs: string[] = [];
      loader.load(
        url,
        (gltf) => {
          (window as any).VIEWER.json = gltf;
          const scene = gltf.scene;
          // Konva Overlay - traverse the model’s scene graph, locate the meshes, and read the positions from their geometries
          const points: any = [];
          scene.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const mesh = child as THREE.Mesh;
              const geometry = mesh.geometry as THREE.BufferGeometry;
              const positionAttribute = geometry.attributes.position;
              
              for (let i = 0; i < positionAttribute.count; i++) {
                const vertex = new THREE.Vector3();
                vertex.fromBufferAttribute(positionAttribute, i);
                // convert vertex position
                mesh.localToWorld(vertex);
                points.push(vertex);
              }
            }
          });
          const clips = gltf.animations || [];
          if (!scene) {
            throw new Error(
              'This model contains no scene, and cannot be viewed here. However, it may contain individual 3D resources.'
            );
          }
          this.setContent(scene, clips);
          blobURLs.forEach(URL.revokeObjectURL);
          resolve(gltf);
        },
        undefined,
        reject
      );
    });
  }

  setContent(object: THREE.Object3D, clips: any[]) {
    this.clear();
    object.updateMatrixWorld();
    const box = new Box3().setFromObject(object);
    const size = box.getSize(new Vector3()).length();
    const center = box.getCenter(new Vector3());
    this.controls.reset();
    object.position.x -= center.x;
    object.position.y -= center.y;
    object.position.z -= center.z;
    this.controls.maxDistance = size * 10;
    this.defaultCamera.near = size / 100;
    this.defaultCamera.far = size * 100;
    this.defaultCamera.updateProjectionMatrix();
    if (this.options.cameraPosition) {
      this.defaultCamera.position.fromArray(this.options.cameraPosition);
      this.defaultCamera.lookAt(new Vector3());
    } else {
      this.defaultCamera.position.copy(center);
      this.defaultCamera.position.x += size / 2.0;
      this.defaultCamera.position.y += size / 5.0;
      this.defaultCamera.position.z += size / 2.0;
      this.defaultCamera.lookAt(center);
    }
    this.setCamera(DEFAULT_CAMERA);
    this.axesCamera.position.copy(this.defaultCamera.position);
    this.axesCamera.lookAt(this.axesScene.position);
    this.axesCamera.near = size / 100;
    this.axesCamera.far = size * 100;
    this.axesCamera.updateProjectionMatrix();
    this.axesCorner.scale.set(size, size, size);
    this.controls.saveState();
    this.scene.add(object);
    this.content = object;
    this.state.punctualLights = true;
    this.content.traverse((node: any) => {
      if (node.isLight) {
        this.state.punctualLights = false;
      }
    });
    this.setClips(clips);
    this.updateLights();
    this.updateGUI();
    this.updateEnvironment();
    this.updateDisplay();
    (window as any).VIEWER.scene = this.content;
    this.printGraph(this.content);
  }

  printGraph(node: THREE.Object3D) {
    console.group(' <' + node.type + '> ' + node.name);
    node.children.forEach((child) => this.printGraph(child));
    console.groupEnd();
  }

  setClips(clips: any[]) {
    if (this.mixer) {
      this.mixer.stopAllAction();
      this.mixer.uncacheRoot(this.mixer.getRoot());
      this.mixer = null;
    }
    this.clips = clips;
    if (!clips.length) return;
    this.mixer = new AnimationMixer(this.content);
  }

  playAllClips() {
    this.clips.forEach((clip) => {
      this.mixer.clipAction(clip).reset().play();
      this.state.actionStates[clip.name] = true;
    });
  }

  setCamera(name: string) {
    if (name === DEFAULT_CAMERA) {
      this.controls.enabled = true;
      this.activeCamera = this.defaultCamera;
    } else {
      this.controls.enabled = false;
      this.content.traverse((node: any) => {
        if (node.isCamera && node.name === name) {
          this.activeCamera = node;
        }
      });
    }
  }

  updateLights() {
    const state = this.state;
    const lights = this.lights;
    if (state.punctualLights && !lights.length) {
      this.addLights();
    } else if (!state.punctualLights && lights.length) {
      this.removeLights();
    }
    this.renderer.toneMapping = Number(state.toneMapping) as unknown as THREE.ToneMapping;
    this.renderer.toneMappingExposure = Math.pow(2, state.exposure);
    if (lights.length === 2) {
      lights[0].intensity = state.ambientIntensity;
      lights[0].color.set(state.ambientColor);
      lights[1].intensity = state.directIntensity;
      lights[1].color.set(state.directColor);
    }
  }

  addLights() {
    const state = this.state;
    if (this.options.preset === Preset.ASSET_GENERATOR) {
      const hemiLight = new HemisphereLight();
      hemiLight.name = 'hemi_light';
      this.scene.add(hemiLight);
      this.lights.push(hemiLight);
      return;
    }
    const light1 = new AmbientLight(state.ambientColor, state.ambientIntensity);
    light1.name = 'ambient_light';
    this.defaultCamera.add(light1);
    const light2 = new DirectionalLight(state.directColor, state.directIntensity);
    light2.position.set(0.5, 0, 0.866);
    light2.name = 'main_light';
    this.defaultCamera.add(light2);
    this.lights.push(light1, light2);
  }

  removeLights() {
    this.lights.forEach((light) => light.parent.remove(light));
    this.lights.length = 0;
  }

  updateEnvironment() {
    const environment = environments.filter(
      (entry) => entry.name === this.state.environment
    )[0];
    this.getCubeMapTexture(environment).then(({ envMap }) => {
      this.scene.environment = envMap;
      // this.scene.background = this.state.background ? envMap : this.backgroundColor;
    });
  }

  getCubeMapTexture(environment: any): Promise<{ envMap: any }> {
    const { id, path } = environment;
    if (id === 'neutral') {
      return Promise.resolve({ envMap: this.neutralEnvironment });
    }
    if (id === '') {
      return Promise.resolve({ envMap: null });
    }
    return new Promise((resolve, reject) => {
      new EXRLoader().load(
        path,
        (texture) => {
          const envMap = this.pmremGenerator.fromEquirectangular(texture).texture;
          this.pmremGenerator.dispose();
          resolve({ envMap });
        },
        undefined,
        reject
      );
    });
  }

  updateDisplay() {
    if (this.skeletonHelpers.length) {
      this.skeletonHelpers.forEach((helper) => this.scene.remove(helper));
    }
    traverseMaterials(this.content, (material) => {
      material.wireframe = this.state.wireframe;
      material.transparent = true;
      material.depthWrite = false;
      material.opacity = 0.6;
      if (material instanceof PointsMaterial) {
        material.size = this.state.pointSize;
      }
    });
    this.content.traverse((node: any) => {
      if (node.geometry && node.skeleton && this.state.skeleton) {
        const helper = new SkeletonHelper(node.skeleton.bones[0].parent);
        (helper.material as THREE.LineBasicMaterial).linewidth = 3;
        this.scene.add(helper);
        this.skeletonHelpers.push(helper);
      }
    });
    if (this.state.grid !== Boolean(this.gridHelper)) {
      if (this.state.grid) {
        this.gridHelper = new GridHelper();
        this.axesHelper = new AxesHelper();
        this.axesHelper.renderOrder = 999;
        this.axesHelper.onBeforeRender = (renderer: THREE.WebGLRenderer) => renderer.clearDepth();
        this.scene.add(this.gridHelper);
        this.scene.add(this.axesHelper);
      } else {
        this.scene.remove(this.gridHelper);
        this.scene.remove(this.axesHelper);
        this.gridHelper = null;
        this.axesHelper = null;
        this.axesRenderer.clear();
      }
    }
    this.controls.autoRotate = this.state.autoRotate;
  }

  updateBackground() {
    this.backgroundColor.set(this.state.bgColor);
  }

  addAxesHelper() {
    this.axesDiv = document.createElement('div');
    this.el.appendChild(this.axesDiv);
    this.axesDiv.classList.add('axes');
    const { clientWidth, clientHeight } = this.axesDiv;
    this.axesScene = new Scene();
    this.axesCamera = new PerspectiveCamera(50, clientWidth / clientHeight, 0.1, 10);
    this.axesScene.add(this.axesCamera);
    this.axesRenderer = new WebGLRenderer({ alpha: true });
    this.axesRenderer.setPixelRatio(window.devicePixelRatio);
    this.axesRenderer.setSize(this.axesDiv.clientWidth, this.axesDiv.clientHeight);
    this.axesCamera.up = this.defaultCamera.up;
    this.axesCorner = new AxesHelper(5);
    this.axesScene.add(this.axesCorner);
    this.axesDiv.appendChild(this.axesRenderer.domElement);
  }

  addGUI() {
    const gui = (this.gui = new GUI({
      autoPlace: false,
      width: 260,
      hideable: true,
    }));
    const dispFolder = gui.addFolder('Display');
    const envBackgroundCtrl = dispFolder.add(this.state, 'background');
    envBackgroundCtrl.onChange(() => this.updateEnvironment());
    const autoRotateCtrl = dispFolder.add(this.state, 'autoRotate');
    autoRotateCtrl.onChange(() => this.updateDisplay());
    const wireframeCtrl = dispFolder.add(this.state, 'wireframe');
    wireframeCtrl.onChange(() => this.updateDisplay());
    const skeletonCtrl = dispFolder.add(this.state, 'skeleton');
    skeletonCtrl.onChange(() => this.updateDisplay());
    const gridCtrl = dispFolder.add(this.state, 'grid');
    gridCtrl.onChange(() => this.updateDisplay());
    dispFolder.add(this.controls, 'screenSpacePanning');
    const pointSizeCtrl = dispFolder.add(this.state, 'pointSize', 1, 16);
    pointSizeCtrl.onChange(() => this.updateDisplay());
    const bgColorCtrl = dispFolder.addColor(this.state, 'bgColor');
    bgColorCtrl.onChange(() => this.updateBackground());
    const lightFolder = gui.addFolder('Lighting');
    const envMapCtrl = lightFolder.add(
      this.state,
      'environment',
      environments.map((env) => env.name)
    );
    envMapCtrl.onChange(() => this.updateEnvironment());
    [
      lightFolder.add(this.state, 'toneMapping', {
        Linear: LinearToneMapping,
        'ACES Filmic': ACESFilmicToneMapping,
      }),
      lightFolder.add(this.state, 'exposure', -10, 10, 0.01),
      lightFolder.add(this.state, 'punctualLights').listen(),
      lightFolder.add(this.state, 'ambientIntensity', 0, 2),
      lightFolder.addColor(this.state, 'ambientColor'),
      lightFolder.add(this.state, 'directIntensity', 0, 4),
      lightFolder.addColor(this.state, 'directColor'),
    ].forEach((ctrl) => ctrl.onChange(() => this.updateLights()));
    this.animFolder = gui.addFolder('Animation');
    this.animFolder.domElement.style.display = 'none';
    const playbackSpeedCtrl = this.animFolder.add(this.state, 'playbackSpeed', 0, 1);
    playbackSpeedCtrl.onChange((speed: number) => {
      if (this.mixer) this.mixer.timeScale = speed;
    });
    this.animFolder.add({ playAll: () => this.playAllClips() }, 'playAll');
    this.morphFolder = gui.addFolder('Morph Targets');
    this.morphFolder.domElement.style.display = 'none';
    this.cameraFolder = gui.addFolder('Cameras');
    this.cameraFolder.domElement.style.display = 'none';
    const perfFolder = gui.addFolder('Performance');
    const perfLi = document.createElement('li');
    this.stats.dom.style.position = 'static';
    perfLi.appendChild(this.stats.dom);
    perfLi.classList.add('gui-stats');
    (perfFolder as any).__ul.appendChild(perfLi);
    const guiWrap = document.createElement('div');
    this.el.appendChild(guiWrap);
    guiWrap.classList.add('gui-wrap');
    guiWrap.appendChild(gui.domElement);
    gui.open();
  }

  updateGUI() {
    this.cameraFolder.domElement.style.display = 'none';
    this.morphCtrls.forEach((ctrl: any) => ctrl.remove());
    this.morphCtrls.length = 0;
    this.morphFolder.domElement.style.display = 'none';
    this.animCtrls.forEach((ctrl: any) => ctrl.remove());
    this.animCtrls.length = 0;
    this.animFolder.domElement.style.display = 'none';
    const cameraNames: string[] = [];
    const morphMeshes: any[] = [];
    this.content.traverse((node: any) => {
      if (node.geometry && node.morphTargetInfluences) {
        morphMeshes.push(node);
      }
      if (node.isCamera) {
        node.name = node.name || `VIEWER__camera_${cameraNames.length + 1}`;
        cameraNames.push(node.name);
      }
    });
    if (cameraNames.length) {
      this.cameraFolder.domElement.style.display = '';
      if (this.cameraCtrl) this.cameraCtrl.remove();
      const cameraOptions = [DEFAULT_CAMERA].concat(cameraNames);
      this.cameraCtrl = this.cameraFolder.add(this.state, 'camera', cameraOptions);
      this.cameraCtrl.onChange((name: string) => this.setCamera(name));
    }
    if (morphMeshes.length) {
      this.morphFolder.domElement.style.display = '';
      morphMeshes.forEach((mesh) => {
        if (mesh.morphTargetInfluences.length) {
          const nameCtrl = this.morphFolder.add({ name: mesh.name || 'Untitled' }, 'name');
          this.morphCtrls.push(nameCtrl);
        }
        for (let i = 0; i < mesh.morphTargetInfluences.length; i++) {
          const ctrl = this.morphFolder
            .add(mesh.morphTargetInfluences, i, 0, 1, 0.01)
            .listen();
          Object.keys(mesh.morphTargetDictionary).forEach((key) => {
            if (key && mesh.morphTargetDictionary[key] === i) ctrl.name(key);
          });
          this.morphCtrls.push(ctrl);
        }
      });
    }
    if (this.clips.length) {
      this.animFolder.domElement.style.display = '';
      const actionStates: any = (this.state.actionStates = {});
      this.clips.forEach((clip, clipIndex) => {
        clip.name = `${clipIndex + 1}. ${clip.name}`;
        let action: THREE.AnimationAction;
        if (clipIndex === 0) {
          actionStates[clip.name] = true;
          action = this.mixer.clipAction(clip);
          action.play();
        } else {
          actionStates[clip.name] = false;
        }
        const ctrl = this.animFolder.add(actionStates, clip.name).listen();
        ctrl.onChange((playAnimation: boolean) => {
          action = action || this.mixer.clipAction(clip);
          action.setEffectiveTimeScale(1);
          playAnimation ? action.play() : action.stop();
        });
        this.animCtrls.push(ctrl);
      });
    }
  }

  clear() {
    if (!this.content) return;
    this.scene.remove(this.content);
    this.content.traverse((node: any) => {
      if (!node.geometry) return;
      node.geometry.dispose();
    });
    traverseMaterials(this.content, (material: any) => {
      for (const key in material) {
        if (key !== 'envMap' && material[key] && material[key].isTexture) {
          material[key].dispose();
        }
      }
    });
  }
}

function traverseMaterials(object: THREE.Object3D, callback: (material: any) => void) {
  object.traverse((node: any) => {
    if (!node.geometry) return;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.forEach(callback);
  });
}

function isIOS() {
  return (
    ['iPad Simulator', 'iPhone Simulator', 'iPod Simulator', 'iPad', 'iPhone', 'iPod'].includes(
      navigator.platform
    ) ||
    (navigator.userAgent.includes('Mac') && 'ontouchend' in document)
  );
}

const ViewerComponent = () => {
  let container: HTMLDivElement | undefined;
  const [_, { setPoints }] = useThreeJSContext();

  onMount(() => {
    if (!container) return;
    const viewer = new Viewer(container, { preset: '', kiosk: false }, (points: THREE.Vector3[]) => {
      setPoints(points); // update context with the loaded points
    });
    (window as any).VIEWER = { viewer };
  });
  return (
    <div ref={container} style={{ width: '100vw', height: '100vh' }}></div>
  );
};

export default ViewerComponent;
