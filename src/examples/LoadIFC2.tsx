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

    // —— 同步像素解析度（client × DPR → canvas.width/height）——
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
      canvasElement: sceneCanvasRef.current,
      transparent: true,
    });

    // 初始化先同步一次（避免第一次就模糊）
    syncCanvasResolution(sceneCanvasRef.current);
    syncCanvasResolution(navCanvasRef.current);

    // 觀察兩顆 canvas 的 CSS 尺寸變化
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

    // 視窗 resize（保險再同步一次）
    const onWinResize = () => {
      if (destroyed) return;
      if (sceneCanvasRef.current) syncCanvasResolution(sceneCanvasRef.current);
      if (navCanvasRef.current) syncCanvasResolution(navCanvasRef.current);
      viewer.scene.render();
    };
    window.addEventListener('resize', onWinResize);

    // —— 你的原有設定（相機 / 控制 / NavCube / 格線 / 載 IFC）——
    viewer.camera.eye = [-8.23, 10.67, 35.26];
    viewer.camera.look = [4.39, 3.72, 8.89];
    viewer.camera.up = [0.1, 0.97, -0.2];

    const cameraControl = viewer.cameraControl;
    cameraControl.navMode = 'orbit';
    cameraControl.followPointer = true;

    const pivot = document.createElement('div');
    pivot.style.color = '#ffffff';
    pivot.style.position = 'absolute';
    pivot.style.width = '25px';
    pivot.style.height = '25px';
    pivot.style.borderRadius = '15px';
    pivot.style.border = '2px solid #ebebeb';
    pivot.style.background = 'red';
    pivot.style.visibility = 'hidden';
    pivot.style.boxShadow = '5px 5px 15px 1px #000000';
    pivot.style.zIndex = '10000';
    pivot.style.pointerEvents = 'none';
    document.body.appendChild(pivot);
    pivotRef.current = pivot;
    cameraControl.pivotElement = pivot;

    navCube = new NavCubePlugin(viewer, {
      canvasElement: navCanvasRef.current!,
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
        emissive: [0.4, 0.4, 0.4],
      }),
      position: [0, -1.6, 0],
      collidable: false,
    });

    (async () => {
      try {
        const IfcAPI = new (WebIFC as any).IfcAPI();
        let wasmBase = `${import.meta.env.BASE_URL}web-ifc/`;
        const ensureWasmReachable = async (base: string) => {
          const url = `${base}web-ifc.wasm`;
          const res = await fetch(url, { method: 'HEAD' });
          if (!res.ok)
            throw new Error(`WASM not reachable: ${url} (HTTP ${res.status})`);
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
          src: '/models/Duplex.ifc',
          edges: true,
        });

        sceneModel.on?.('loaded', () => {
          viewer.cameraFlight?.flyTo(sceneModel);
        });
      } catch (err) {
        console.error('IFC load failed:', err);
      }
    })();

    return () => {
      destroyed = true;
      try {
        window.removeEventListener('resize', onWinResize);
        roScene.disconnect();
        roNav.disconnect();
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
    // ✅ 這裡是關鍵修正：容器固定鋪滿視窗，不受父層 layout 影響
    <div
      className="w-full h-[80%]"
      // style={{
      //   position: 'fixed',
      //   inset: 0, // top/right/bottom/left = 0
      //   width: '100vw',
      //   height: '100vh',
      // }}
    >
      {/* 主 3D 場景 */}
      <canvas ref={sceneCanvasRef} className="w-full h-full block" />
      {/* NavCube */}
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
