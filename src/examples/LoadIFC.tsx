import { useEffect, useRef } from 'react';
import {
  Viewer,
  WebIFCLoaderPlugin,
  Mesh,
  VBOGeometry,
  buildGridGeometry,
  PhongMaterial,
  NavCubePlugin,
} from '@xeokit/xeokit-sdk';
import * as WebIFC from 'web-ifc';

export default function CameraControlOrbitDuplex() {
  const sceneCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const navCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pivotRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!sceneCanvasRef.current || !navCanvasRef.current) return;

    let destroyed = false;
    let sceneModel: any | undefined;
    let navCube: NavCubePlugin | undefined;

    // 1) Viewer
    const viewer = new Viewer({
      canvasElement: sceneCanvasRef.current,
      transparent: true,
    });

    // 初始相機（與原例一致）
    viewer.camera.eye = [-8.23, 10.67, 35.26];
    viewer.camera.look = [4.39, 3.72, 8.89];
    viewer.camera.up = [0.1, 0.97, -0.2];

    // 2) 相機控制
    const cameraControl = viewer.cameraControl;
    cameraControl.navMode = 'orbit';
    cameraControl.followPointer = true;

    // 3) pivot 標記（可見時才顯示）
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

    // 4) NavCube（大小由這顆 canvas 決定）
    navCube = new NavCubePlugin(viewer, {
      canvasElement: navCanvasRef.current!,
      visible: true,
      cameraFly: true,
      cameraFitFOV: 45,
      cameraFlyDuration: 0.5,
    });

    // 5) 地面格線
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

    // 6) 載入 IFC（web-ifc）
    (async () => {
      try {
        const IfcAPI = new (WebIFC as any).IfcAPI();

        // 用 BASE_URL 兼容 dev/build 子路徑
        let wasmBase = `${import.meta.env.BASE_URL}web-ifc/`;

        // 路徑健檢（避免被 SPA fallback 成 index.html）
        const ensureWasmReachable = async (base: string) => {
          const url = `${base}web-ifc.wasm`;
          const res = await fetch(url, { method: 'HEAD' });
          if (!res.ok) {
            throw new Error(`WASM not reachable: ${url} (HTTP ${res.status})`);
          }
        };

        try {
          await ensureWasmReachable(wasmBase);
        } catch {
          // 可選：CDN 備援，先跑起來再說
          wasmBase = 'https://unpkg.com/web-ifc@0.0.62/';
        }

        IfcAPI.SetWasmPath(wasmBase);
        await IfcAPI.Init();
        if (destroyed) return;

        const ifcLoader = new WebIFCLoaderPlugin(viewer, { WebIFC, IfcAPI });

        sceneModel = ifcLoader.load({
          id: 'myIFC',
          src: '/models/Duplex_A_20110907.ifc',
          edges: true,
          // excludeTypes: ["IfcSpace"], // 需要可先排除空間加快
        });

        sceneModel.on?.('loaded', () => {
          viewer.cameraFlight?.flyTo(sceneModel); // 或 { aabb: sceneModel.aabb }
        });
      } catch (err) {
        console.error('IFC load failed:', err);
      }
    })();

    // 7) 清理
    return () => {
      destroyed = true;
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
