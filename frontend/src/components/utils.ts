import * as THREE from 'three';

export const extractPointsFromScene = (scene: THREE.Scene): THREE.Vector3[] => {
  const points: THREE.Vector3[] = [];
  scene.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      const geometry = mesh.geometry as THREE.BufferGeometry;
      const posAttr = geometry.attributes.position;
      for (let i = 0; i < posAttr.count; i++) {
        const vertex = new THREE.Vector3();
        vertex.fromBufferAttribute(posAttr, i);
        // Convert local coordinates to world coordinates
        mesh.localToWorld(vertex);
        points.push(vertex);
      }
    }
  });
  return points;
}