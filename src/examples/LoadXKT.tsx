import { useEffect, useRef } from 'react';
import {
  Viewer,
  XKTLoaderPlugin,
  Mesh,
  VBOGeometry,
  buildGridGeometry,
  PhongMaterial,
  NavCubePlugin,
} from '@xeokit/xeokit-sdk';

/**
 * 改寫自 xeokit 範例：
 * examples/navigation/CameraControl_orbit_Duplex.html 的 <script type="module"> 部分
 * - 相機：orbit 模式 + followPointer
 * - 載入 XKT 模型（Duplex）
 * - 載入完成後 cameraFlight 飛到模型
 * - 右下角 NavCube
 * - 地面 grid
 *
 * 使用方式：
 * 1) 將 Duplex_A_20110505.glTFEmbedded.xkt 放到 public/models/
 * 2) <CameraControlOrbitDuplex /> 掛在頁面上
 */
export default function CameraControlOrbitDuplex() {
  const sceneCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const navCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pivotRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!sceneCanvasRef.current || !navCanvasRef.current) return;

    // 建 Viewer（透明背景跟原例一致）
    const viewer = new Viewer({
      canvasElement: sceneCanvasRef.current,
      transparent: true,
    });

    const scene = viewer.scene;
    const cameraFlight = viewer.cameraFlight;
    const camera = scene.camera;

    // 相機初始位置（依原例）
    viewer.camera.eye = [-8.23, 10.67, 35.26];
    viewer.camera.look = [4.39, 3.72, 8.89];
    viewer.camera.up = [0.1, 0.97, -0.2];

    // CameraControl：orbit + followPointer
    const cameraControl = viewer.cameraControl;
    cameraControl.navMode = 'orbit';
    cameraControl.followPointer = true;

    // 建立 pivot 標記元素（原例是插一個 .xeokit-camera-pivot-marker）
    const pivot = document.createElement('div');
    pivot.style.color = '#ffffff';
    pivot.style.position = 'absolute';
    pivot.style.width = '25px';
    pivot.style.height = '25px';
    pivot.style.borderRadius = '15px';
    pivot.style.border = '2px solid #ebebeb';
    pivot.style.background = 'black';
    pivot.style.visibility = 'hidden';
    pivot.style.boxShadow = '5px 5px 15px 1px #000000';
    pivot.style.zIndex = '10000';
    pivot.style.pointerEvents = 'none';
    document.body.appendChild(pivot);
    pivotRef.current = pivot;
    cameraControl.pivotElement = pivot;

    // （選擇性）事件展示
    // cameraControl.on("picked", () => console.log("picked"));
    // cameraControl.on("doublePicked", () => console.log("doublePicked"));

    // 載模型（XKT）
    const xktLoader = new XKTLoaderPlugin(viewer);

    const sceneModel = xktLoader.load({
      id: 'myModel',
      // 將檔案放在 public/models/ 下，或改為你的路徑
      src: '/models/Duplex_A_20110505.glTFEmbedded.xkt',
      edges: true,
    });

    // 載入完成 → 飛到模型
    sceneModel.on?.('loaded', () => {
      cameraFlight.flyTo(sceneModel);
    });

    // 地面格線（與原例一致）
    new Mesh(viewer.scene, {
      geometry: new VBOGeometry(
        viewer.scene,
        buildGridGeometry({ size: 300, divisions: 60 })
      ),
      material: new PhongMaterial(viewer.scene, {
        color: [0.0, 0.0, 0.0],
        emissive: [0.4, 0.4, 0.4],
      }),
      position: [0, -1.6, 0],
      collidable: false,
    });

    // 右下角 NavCube（原例是用 canvasId，這裡用 canvasElement）
    const navCube = new NavCubePlugin(viewer, {
      canvasElement: navCanvasRef.current,
      visible: true,
      cameraFly: true,
      cameraFitFOV: 45,
      cameraFlyDuration: 0.5,
      // 也可依需求加：fitVisible, synchProjection, color, textColor...
    });

    // （選擇性）載入時間顯示：原例用 dat.gui 與 DOM #time，這裡略過 GUI

    return () => {
      try {
        navCube?.destroy?.();
        sceneModel?.destroy?.();
        viewer?.destroy?.();
      } finally {
        if (pivotRef.current) {
          document.body.removeChild(pivotRef.current);
          pivotRef.current = null;
        }
      }
    };
  }, []);

  return (
    <div style={{ position: 'relative', height: '100vh' }}>
      {/* 主場景 */}
      <canvas
        ref={sceneCanvasRef}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
      {/* NavCube 專用 canvas（右下角） */}
      <canvas
        ref={navCanvasRef}
        width={250}
        height={250}
        style={{
          position: 'absolute',
          right: 10,
          bottom: 50,
          width: 250,
          height: 250,
          zIndex: 200000,
          pointerEvents: 'auto',
        }}
      />
    </div>
  );
}
