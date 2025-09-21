import { useEffect, useRef } from 'react';
import {
  Viewer, // xeokit 核心 Viewer：管理 Scene / Camera / Render
  WebIFCLoaderPlugin, // 載入 IFC 的 plugin（內部用 web-ifc 解析）
  Mesh, // Mesh：建立一個場景中的幾何物件
  VBOGeometry, // 頂點緩衝幾何（Vertex Buffer Object）
  buildGridGeometry, // 幫助函式：產生格線
  PhongMaterial, // 簡單材質（漫反射 + 自發光）
  NavCubePlugin, // 右下角方塊導航
} from '@xeokit/xeokit-sdk';
import * as WebIFC from 'web-ifc'; // web-ifc 模組，提供 IfcAPI

export default function CameraControlOrbitDuplex() {
  const sceneCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const navCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pivotRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!sceneCanvasRef.current || !navCanvasRef.current) return;

    let destroyed = false;
    let sceneModel: any | undefined;
    let navCube: NavCubePlugin | undefined;

    const syncCanvasResolution = (canvas: HTMLCanvasElement) => {
      const dpr = window.devicePixelRatio || 1;
      const targetW = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const targetH = Math.max(1, Math.round(canvas.clientHeight * dpr));

      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
    };

    const viewer = new Viewer({
      canvasElement: sceneCanvasRef.current!,
      transparent: true,
    });

    syncCanvasResolution(sceneCanvasRef.current!);
    syncCanvasResolution(navCanvasRef.current!);

    const roScene = new ResizeObserver(() => {
      if (destroyed || !sceneCanvasRef.current) return;
      syncCanvasResolution(sceneCanvasRef.current);
      viewer.scene.render();
    });
    roScene.observe(sceneCanvasRef.current);

    const roNav = new ResizeObserver(() => {
      if (destroyed || !navCanvasRef.current) return;
      syncCanvasResolution(navCanvasRef.current);
      viewer.scene.render();
    });
    roNav.observe(navCanvasRef.current);

    const onWinResize = () => {
      if (sceneCanvasRef.current) syncCanvasResolution(sceneCanvasRef.current);
      if (navCanvasRef.current) syncCanvasResolution(navCanvasRef.current);
      viewer.scene.render();
    };

    window.addEventListener('resize', onWinResize);

    // === 5) 設定相機 ===
    viewer.camera.eye = [-8.23, 10.67, 35.26]; // 相機位置
    viewer.camera.look = [4.39, 3.72, 8.89]; // 注視點
    viewer.camera.up = [0.1, 0.97, -0.2]; // 上方向

    const cameraControl = viewer.cameraControl;
    cameraControl.navMode = 'orbit';
    cameraControl.followPointer = true;

    // === 7) 建 pivot DOM（小圓點）===
    const pivot = document.createElement('div');
    pivot.style.position = 'absolute';
    pivot.style.width = '25px';
    pivot.style.height = '25px';
    pivot.style.borderRadius = '15px';
    pivot.style.border = '2px solid #ebebeb';
    pivot.style.background = 'red';
    pivot.style.visibility = 'hidden';
    pivot.style.pointerEvents = 'none';
    pivot.style.boxShadow = '5px 5px 15px 1px #000000';
    pivot.style.zIndex = '10000';
    document.body.appendChild(pivot);
    pivotRef.current = pivot;
    cameraControl.pivotElement = pivot;

    navCube = new NavCubePlugin(viewer, {
      canvasElement: navCanvasRef.current,
      visible: true,
      cameraFly: true,
      cameraFitFOV: 45,
      cameraFlyDuration: 0.5,
    });

    new Mesh(viewer.scene, {
      geometry: new VBOGeometry(
        viewer.scene,
        buildGridGeometry({ size: 300, divisions: 60 })
      ),
      material: new PhongMaterial(viewer.scene, {
        color: [0.0, 0.0, 0.0],
        emisiive: [0.4, 0.4, 0.4],
      }),
      position: [0, -1.6, 0],
      collidable: false,
    });

    return () => {
      destroyed = true;
    };
  }, []);
  return (
    <>
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
        }}
      />
    </>
  );
}
