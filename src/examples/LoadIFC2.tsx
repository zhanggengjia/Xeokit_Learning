import { useEffect, useRef } from 'react';

import {
  Viewer, // xeokit核心Viewer
  WebIFCLoaderPlugin, // IFC載入plugin
  Mesh,
  VBOGeometry,
  buildGridGeometry,
  PhongMaterial,
  NavCubePlugin,
  SectionPlanesPlugin,
  math,
} from '@xeokit/xeokit-sdk';

import * as WebIFC from 'web-ifc';

// 你的React元件
export default function CameraControlOrbitDuplex({
  src = '/models/ifc/Duplex.ifc',
}: {
  src?: string;
}) {
  // DOM 參考
  const sceneCanvasRef = useRef<HTMLCanvasElement>(null);
  const navCanvasRef = useRef<HTMLCanvasElement>(null);
  const pivotRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!sceneCanvasRef.current || !navCanvasRef.current) return;

    let destroyed = false;
    let sceneModel: any | undefined;
    let navCube: NavCubePlugin | undefined;
    let sectionPlanes: SectionPlanesPlugin | undefined;

    // 同步canvas像素解析度
    const syncCanvasResolution = (canvas: HTMLCanvasElement) => {
      const dpr = window.devicePixelRatio || 1;
      const targetW = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const targetH = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
    };

    // 建Viewer
    const viewer = new Viewer({
      canvasElement: sceneCanvasRef.current!,
      transparent: true,
    });

    syncCanvasResolution(sceneCanvasRef.current);
    syncCanvasResolution(navCanvasRef.current);

    // ResizeObserver同解析度同步
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
      if (destroyed) return;
      if (sceneCanvasRef.current) syncCanvasResolution(sceneCanvasRef.current);
      if (navCanvasRef.current) syncCanvasResolution(navCanvasRef.current);
      viewer.scene.render();
    };
    window.addEventListener('resize', onWinResize);

    // 相機參數設置
    viewer.camera.eye = [-8.23, 10.67, 35.26];
    viewer.camera.look = [4.39, 3.72, 8.89];
    viewer.camera.up = [0.1, 0.97, -0.2];

    // 相機控制器設定
    const cameraControl = viewer.cameraControl;
    cameraControl.navMode = 'orbit';
    cameraControl.followPointer = true;

    // 建立pivot DOM (小圓點)
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

    // NavCube插件
    navCube = new NavCubePlugin(viewer, {
      canvasElement: navCanvasRef.current!,
      visible: true,
      cameraFly: true,
      cameraFitFOV: 45,
      cameraFlyDuration: 0.5,
    });

    // 建地面格線
    new Mesh(viewer.scene, {
      geometry: new VBOGeometry(
        viewer.scene,
        buildGridGeometry({ size: 300, divisions: 60 })
      ),
      material: new PhongMaterial(viewer.scene, {
        color: [0, 0, 0],
        emissive: [0.4, 0.4, 0.4],
      }),
      position: [0, -1.6, 0],
      collidable: false,
    });

    // SectionPlanesPlugin 初始化
    sectionPlanes = new SectionPlanesPlugin(viewer);

    // 建立一個section plane，初始位置平面垂直於X軸（可根據需求調整）
    const sectionPlaneId = sectionPlanes.createSectionPlane({
      dir: [1, 0, 0], // 方向向量，X軸方向切割面
      pos: [0, 0, 0], // 初始位置（沿方向軸的偏移）
    });

    // 顯示該 section plane 的控制軸讓用戶操作移動平面
    sectionPlanes.showControl(sectionPlaneId.id);

    // IFC載入
    (async () => {
      try {
        const IfcAPI = new WebIFC.IfcAPI();
        let wasmBase = `${import.meta.env.BASE_URL}web-ifc/`;

        const ensureWasmReachable = async (base: string) => {
          const url = `${base}web-ifc.wasm`;
          const res = await fetch(url, { method: 'HEAD' });
          if (!res.ok) throw new Error(`WASM not reachable: ${url}`);
        };

        try {
          await ensureWasmReachable(wasmBase);
        } catch {
          wasmBase = 'https://unpkg.com/web-ifc@0.0.62/';
        }

        IfcAPI.SetWasmPath(wasmBase);
        await IfcAPI.Init();

        if (destroyed) return;

        const ifcLoader = new WebIFCLoaderPlugin(viewer, { WebIFC, IfcAPI });
        sceneModel = ifcLoader.load({
          id: 'myIFC',
          src,
          edges: true,
        });

        sceneModel.on?.('loaded', () => {
          viewer.cameraFlight?.flyTo(sceneModel);
          viewer.scene.render();
        });
      } catch (err) {
        console.error('IFC load failed:', err);
      }
    })();

    // 清理
    return () => {
      destroyed = true;
      try {
        window.removeEventListener('resize', onWinResize);
        roScene.disconnect();
        roNav.disconnect();
        navCube?.destroy?.();
        sceneModel?.destroy?.();
        sectionPlanes?.destroy?.();
        viewer?.destroy?.();
      } finally {
        if (pivotRef.current) {
          document.body.removeChild(pivotRef.current);
          pivotRef.current = null;
        }
      }
    };
  }, [src]);

  return (
    <>
      {/* 主場景canvas */}
      <canvas
        ref={sceneCanvasRef}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
      {/* NavCube canvas */}
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
    </>
  );
}
