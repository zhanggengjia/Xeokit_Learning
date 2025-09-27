import {
  XKTLoaderPlugin,
  PhongMaterial,
  SectionPlanesPlugin,
  math,
  type Viewer,
} from '@xeokit/xeokit-sdk';

export type LoadXKTOptions = {
  id?: string;
  src: string;
  withSectionPlane?: boolean;
  capColor?: [number, number, number];
};

export function loadXKT(viewer: Viewer, opts: LoadXKTOptions) {
  const {
    id = 'model',
    src,
    withSectionPlane = true,
    capColor = [1, 0, 0],
  } = opts;

  const xktLoader = new XKTLoaderPlugin(viewer);
  const sceneModel = xktLoader.load({ id, src, edges: true });

  const disposeList: Array<() => void> = [];
  let sectionPlanes: SectionPlanesPlugin | undefined;

  sceneModel.on?.('loaded', () => {
    (viewer.scene as any).sectionPlanesEnabled = true;

    if (withSectionPlane) {
      sectionPlanes = new SectionPlanesPlugin(viewer);
      sectionPlanes.createSectionPlane({
        id: 'mainPlane',
        pos: [0.5, 2.5, 5.0],
        dir: math.normalizeVec3([0, 0, -0.5]),
      });
      // 可視化控制：
      (sectionPlanes as any).showControl?.('mainPlane');
      disposeList.push(() => sectionPlanes?.destroy?.());
    }

    // 設定截面填材
    const capMat = new PhongMaterial(viewer.scene, {
      diffuse: capColor,
      backfaces: true,
    });
    const objs = (sceneModel as any).objects;
    for (const id in objs) {
      const e = objs[id];
      if (!e) continue;
      (e as any).capMaterial = capMat;
      (e as any).capMaterialId = capMat.id;
      (e as any).clippable = true;
    }

    viewer.cameraFlight?.flyTo(sceneModel);
    viewer.scene.render();
  });

  const dispose = () => {
    try {
      sceneModel?.destroy?.();
    } finally {
      disposeList.forEach((fn) => fn());
    }
  };

  return { sceneModel, dispose };
}
