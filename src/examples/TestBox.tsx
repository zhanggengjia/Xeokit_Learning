// TestBox.tsx
import { useEffect, useRef } from 'react';
import {
  Viewer,
  SectionPlanesPlugin,
  SceneModel,
  PhongMaterial,
} from '@xeokit/xeokit-sdk';

export default function TestBoxOnly_SceneModelCaps() {
  const hostRef = useRef<HTMLDivElement>(null);
  const overviewRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!hostRef.current) return;

    // 1) 建 Viewer，務必打開 readableGeometryEnabled
    const viewer = new Viewer({
      canvasId: 'xeokit_canvas',
      transparent: true,
      readableGeometryEnabled: true, // ← 沒開這個，切面不會有填色
    });
    // 基本視角
    viewer.scene.camera.eye = [5, 4, 8];
    viewer.scene.camera.look = [0, 0, 0];
    viewer.scene.camera.up = [0, 1, 0];

    // 2) SectionPlanesPlugin + 一個平面 + 顯示控制軸
    const sectionPlanes = new SectionPlanesPlugin(viewer, {
      overviewCanvasId: 'overview_canvas',
      overviewVisible: true,
    });
    console.log('[A] SectionPlanesPlugin ok?', !!sectionPlanes);

    const mainPlane = sectionPlanes.createSectionPlane({
      id: 'mainPlane',
      pos: [0, 0, 0],
      dir: [1, 0, 0],
      active: true,
    });
    console.log(
      '[B] Plane created: mainPlane active?',
      mainPlane.active,
      'pos=',
      mainPlane.pos,
      'dir=',
      mainPlane.dir
    );
    sectionPlanes.showControl(mainPlane.id); // 顯示十字軸控制

    // 3) 用 SceneModel 建一顆盒子
    const sceneModel = new SceneModel(viewer.scene, {
      id: 'capsModel',
      isModel: true, // 讓它註冊到 viewer.scene.models
      edges: true,
    });

    // 幾何資料：一顆單位方盒（positions + normals + indices）
    // （這裡給齊 normals，避免某些版本/驅動下的面法線問題）
    const positions = [
      // 前面
      1, 1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1,
      // 右面
      1, 1, 1, 1, -1, 1, 1, -1, -1, 1, 1, -1,
      // 上面
      1, 1, 1, 1, 1, -1, -1, 1, -1, -1, 1, 1,
      // 左面
      -1, 1, 1, -1, 1, -1, -1, -1, -1, -1, -1, 1,
      // 下面
      -1, -1, -1, 1, -1, -1, 1, -1, 1, -1, -1, 1,
      // 後面
      1, -1, -1, -1, -1, -1, -1, 1, -1, 1, 1, -1,
    ];
    const normals = [
      // 前
      0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
      // 右
      1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
      // 上
      0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
      // 左
      -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,
      // 下
      0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,
      // 後
      0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
    ];
    const indices = [
      // 前
      0, 1, 2, 0, 2, 3,
      // 右
      4, 5, 6, 4, 6, 7,
      // 上
      8, 9, 10, 8, 10, 11,
      // 左
      12, 13, 14, 12, 14, 15,
      // 下
      16, 17, 18, 16, 18, 19,
      // 後
      20, 21, 22, 20, 22, 23,
    ];

    sceneModel.createGeometry({
      id: 'boxGeom',
      primitive: 'triangles',
      positions,
      normals,
      indices,
    });

    sceneModel.createMesh({
      id: 'boxMesh',
      geometryId: 'boxGeom',
      position: [0, 0, 0],
      scale: [2, 2, 2],
      rotation: [0, 0, 0],
      color: [0.6, 0.85, 1.0],
    });

    const boxEntity = sceneModel.createEntity({
      id: 'boxEntity',
      meshIds: ['boxMesh'],
      isObject: true, // 讓它出現在 viewer.scene.objects
    });

    // 關鍵：對「entity」指定 capMaterial（不是 Mesh、不是抽象 Entity）
    boxEntity.capMaterial = new PhongMaterial(viewer.scene, {
      diffuse: [0.95, 0.25, 0.25], // 切面顏色
      backfaces: true, // 建議開啟，避免切面背面被剔除
    });

    console.log('[T] box entity ready. id=', (boxEntity as any).id);
    // 完成打包
    sceneModel.finalize();

    // 小小的場景落點
    viewer.cameraFlight.flyTo({ aabb: viewer.scene.aabb });

    // 附上幾個除錯點
    console.log(
      '[C] models=',
      Object.keys(viewer.scene.models),
      'objects(total)=',
      Object.keys(viewer.scene.objects).length
    );
    const obj = viewer.scene.objects['boxEntity'];
    console.log(
      '[C] boxEntity exists?',
      !!obj,
      'capMaterial?',
      !!(obj as any).capMaterial
    );

    return () => {
      sectionPlanes.destroy();
      viewer.destroy();
    };
  }, []);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: 8 }}>
      <div
        ref={hostRef}
        style={{ width: '100%', height: '80vh', position: 'relative' }}
      >
        <canvas id="xeokit_canvas" style={{ width: '100%', height: '100%' }} />
      </div>
      <div>
        <canvas
          id="overview_canvas"
          ref={overviewRef}
          style={{
            width: 220,
            height: 220,
            border: '1px solid #ccc',
            background: '#f8f8f8',
          }}
        />
        <div style={{ fontSize: 12, color: '#555', marginTop: 6 }}>
          SectionPlanes overview
        </div>
      </div>
    </div>
  );
}
