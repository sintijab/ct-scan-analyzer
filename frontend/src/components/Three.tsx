import { onMount } from 'solid-js';
import WebGL from 'three/addons/capabilities/WebGL.js';
import { Viewer } from './viewer.jsx';
import { useThreeJSContext } from '@/threeJSContext.js';
import * as THREE from 'three';

window.VIEWER = {};
type PointsCallback = (points: THREE.Vector3[]) => void;
class App {
  options: { model: string; preset: string; cameraPosition: null; };
  el: Element;
  viewer: Viewer | null;
  viewerEl: HTMLDivElement | null;
  dropEl: any;
  /**
   * @param  {Element} el
   * @param  {Location} location
   */
  onPointsLoaded?: PointsCallback;
  constructor(el: Element, url: string, onPointsLoaded?: PointsCallback) {
    this.options = {
      model: url,
      preset: '',
      cameraPosition: null
    };

    this.el = el;
    this.viewer = null;
    this.viewerEl = null;
    this.dropEl = el.querySelector('.dropzone');
    this.onPointsLoaded = onPointsLoaded;

    const options = this.options;

    if (options.model) {
      this.view(options.model, '', new Map());
    }
  }

  /**
   * Sets up the view manager.
   * @return {Viewer}
   */
  createViewer() {
    this.viewerEl = document.createElement('div');
    this.viewerEl.classList.add('viewer');
    this.dropEl.appendChild(this.viewerEl);
    this.viewer = new Viewer(this.viewerEl, this.options, this.onPointsLoaded as PointsCallback);
    this.viewer.resize()
    this.viewer.render()
    return this.viewer;
  }

  /**
   * Loads a fileset
   * @param  {Map<string, File>} fileMap
   */
  load(fileMap: Map<string, File>) {
    let rootFile: File | undefined;
    let rootPath: string | undefined;
    Array.from(fileMap).forEach(([path, file]) => {
      if (file.name.match(/\.(gltf|glb)$/)) {
        rootFile = file;
        rootPath = path.replace(file.name, '');
      }
    });

    if (!rootFile) {
      this.onError('No .gltf or .glb asset found.');
      return;
    }

    this.view(rootFile, rootPath!, fileMap);
  }

  /**
   * Passes a model to the viewer, given file and resources.
   * @param  {File|string} rootFile
   * @param  {string} rootPath
   * @param  {Map<string, File>} fileMap
   */
  view(rootFile: File | string, rootPath: string, fileMap: Map<string, File>) {
    if (this.viewer) this.viewer.clear();
    const viewer = this.viewer || this.createViewer();

    const fileURL =
      typeof rootFile === 'string' ? rootFile : URL.createObjectURL(rootFile);
    viewer
      .load(fileURL, rootPath, fileMap)
      .catch((e: any) => this.onError(e))
  }

  /**
   * @param  {Error|string} error
   */
  onError(error: any) {
    let message = (error || {}).message || error.toString();
    if (message.match(/ProgressEvent/)) {
      message =
        'Unable to retrieve this file. Check JS console and browser network tab.';
    } else if (message.match(/Unexpected token/)) {
      message = `Unable to parse file content. Verify that this file is valid. Error: "${message}"`;
    } else if (error && error.target && error.target instanceof Image) {
      message = 'Missing texture: ' + error.target.src.split('/').pop();
    }
    window.alert(message);
    console.error(error);
  }
}

const ViewerApp = ({ url }: { url: string }) => {
  let container: HTMLDivElement | undefined;
  const [state, { setPoints }] = useThreeJSContext();

  onMount(() => {
    if (!(window.File && window.FileReader && window.FileList && window.Blob)) {
      console.error('The File APIs are not fully supported in this browser.');
    } else if (!WebGL.isWebGLAvailable()) {
      console.error('WebGL is not supported in this browser.');
    } else {
      const app: any = new App(container!, url, (points: THREE.Vector3[]) => {
        setPoints(points);
      });

      window.VIEWER.app = app;
      console.info('[glTF Viewer] Debugging data exported as `window.VIEWER`.');
    }
  });

  return (
    <>
      <div ref={container} style={{ width: '600px', height: '600px' }}>
      <canvas id="fabric-canvas" style="position: absolute; top: 0; left: 0; pointer-events: none;"></canvas>
        <div class="dropzone"></div>
        <input id="file-input" type="file" style={{ display: 'none' }} />
      </div>
    </>
  );
};

export default ViewerApp;
