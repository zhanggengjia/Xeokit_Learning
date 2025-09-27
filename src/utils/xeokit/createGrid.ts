import {
  Mesh,
  VBOGeometry,
  buildGridGeometry,
  PhongMaterial,
  type Viewer,
} from '@xeokit/xeokit-sdk';

export function createGrid(
  viewer: Viewer,
  opts: { size?: number; divisions?: number; y?: number } = {}
) {
  const { size = 300, divisions = 60, y = -1.6 } = opts;
  return new Mesh(viewer.scene, {
    geometry: new VBOGeometry(
      viewer.scene,
      buildGridGeometry({ size, divisions })
    ),
    material: new PhongMaterial(viewer.scene, {
      color: [0, 0, 0],
      emissive: [0.4, 0.4, 0.4],
    }),
    position: [0, y, 0],
    collidable: false,
  });
}
