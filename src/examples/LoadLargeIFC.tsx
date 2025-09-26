import { useEffect, useRef } from 'react';
import {
  Viewer,
  WebIFCLoaderPlugin,
  Mesh,
  VBOGeometry,
  buildGridGeometry,
  PhongMaterial,
  NavCubePlugin,
  SectionPlanesPlugin,
} from '@xeokit/xeokit-sdk';
import * as WebIFC from 'web-ifc';

type Props = {
  src?: string;
  /** 建議放 public/web-ifc/ → URL: /web-ifc/ */
  wasmBaseURL?: string;
  /** 也放一份在根目錄（有些 web-ifc 版本會直取根路徑 worker） */
  rootWorkerURL?: string; // 預設 /web-ifc-mt.worker.js
  maxDPR?: number;
};

export default function LoadIFC2({
  src = '/models/Duplex.ifc',
  wasmBaseURL = `${import.meta.env.BASE_URL}web-ifc/`,
  rootWorkerURL = `${import.meta.env.BASE_URL}web-ifc-mt.worker.js`,
  maxDPR = 1.5,
}: Props) {
  const sceneCanvasRef = useRef<HTMLCanvasElement>(null);
  const navCanvasRef = useRef<HTMLCanvasElement>(null);
  const pivotRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!sceneCanvasRef.current || !navCanvasRef.current) return;

    let destroyed = false;
    let sceneModel: any | undefined;
    let navCube: NavCubePlugin | undefined;
    let sectionPlanes: SectionPlanesPlugin | undefined;

    const getDPR = () => Math.min(window.devicePixelRatio || 1, maxDPR);
    const syncCanvasResolution = (canvas: HTMLCanvasElement) => {
      const dpr = getDPR();
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    };

    const viewer = new Viewer({
      canvasElement: sceneCanvasRef.current!,
      transparent: true,
    });

    syncCanvasResolution(sceneCanvasRef.current);
    syncCanvasResolution(navCanvasRef.current);

    const roScene = new ResizeObserver(() => {
      if (!sceneCanvasRef.current) return;
      syncCanvasResolution(sceneCanvasRef.current);
      viewer.scene.render();
    });
    roScene.observe(sceneCanvasRef.current);

    const roNav = new ResizeObserver(() => {
      if (!navCanvasRef.current) return;
      syncCanvasResolution(navCanvasRef.current);
      viewer.scene.render();
    });
    roNav.observe(navCanvasRef.current);

    const onWinResize = () => {
      if (destroyed) return;
      sceneCanvasRef.current && syncCanvasResolution(sceneCanvasRef.current);
      navCanvasRef.current && syncCanvasResolution(navCanvasRef.current);
      viewer.scene.render();
    };
    window.addEventListener('resize', onWinResize);

    // Camera
    viewer.camera.eye = [-8.23, 10.67, 35.26];
    viewer.camera.look = [4.39, 3.72, 8.89];
    viewer.camera.up = [0.1, 0.97, -0.2];
    const cameraControl = viewer.cameraControl;
    cameraControl.navMode = 'orbit';
    cameraControl.followPointer = true;

    // Pivot
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

    // Grid
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

    // Section planes
    sectionPlanes = new SectionPlanesPlugin(viewer);
    const sectionPlaneId = sectionPlanes.createSectionPlane({
      dir: [1, 0, 0],
      pos: [0, 0, 0],
    });
    sectionPlanes.showControl(sectionPlaneId.id);

    (async () => {
      const base = wasmBaseURL.endsWith('/') ? wasmBaseURL : wasmBaseURL + '/';

      // 1) 檢查兩種 worker URL 是否可用（根/資料夾）
      const checkHEAD = async (url: string) => {
        try {
          const r = await fetch(url, { method: 'HEAD' });
          return r.ok;
        } catch {
          return false;
        }
      };
      const workerInFolder = await checkHEAD(`${base}web-ifc-mt.worker.js`);
      const workerAtRoot = await checkHEAD(rootWorkerURL);

      // 2) 先嘗試多執行緒；初始化失敗再回退單執行緒
      const initIFC = async (forceSingleThread = false) => {
        const IfcAPI = new WebIFC.IfcAPI();

        // wasm 路徑（夾帶 wasm / mt.wasm）
        IfcAPI.SetWasmPath(base);

        // 指定 worker 路徑（優先用你確定能開的 URL）
        const desiredWorkerURL = workerInFolder
          ? `${base}web-ifc-mt.worker.js`
          : workerAtRoot
          ? rootWorkerURL
          : ''; // 皆不可用時留空 → 走 ST

        // 新版 web-ifc
        if (
          typeof (IfcAPI as any).SetWorkerPath === 'function' &&
          !forceSingleThread &&
          desiredWorkerURL
        ) {
          (IfcAPI as any).SetWorkerPath(desiredWorkerURL);
        } else {
          // 舊版相容（或強制 ST 就不要設）
          if (!forceSingleThread && desiredWorkerURL) {
            (globalThis as any).WEB_IFC_WORKER_PATH = desiredWorkerURL;
          }
        }

        // 初始化（若 crossOriginIsolated + worker 可用 → MT；否則 ST）
        await IfcAPI.Init();
        return IfcAPI;
      };

      let IfcAPI: WebIFC.IfcAPI | null = null;

      try {
        // 嘗試 MT
        IfcAPI = await initIFC(false);
        // 額外檢查：若非 crossOriginIsolated，雖然能 Init，但實際仍是 ST
        if (!(window as any).crossOriginIsolated) {
          console.warn(
            '[web-ifc] not crossOriginIsolated → running single-thread'
          );
        }
      } catch (e) {
        console.warn(
          '[web-ifc] MT init failed, falling back to single-thread:',
          e
        );
        // ★ 這裡捕捉到像你遇到的 createObjectURL 錯誤 → 退 ST 再 Init
        IfcAPI = await initIFC(true);
      }

      if (destroyed || !IfcAPI) return;

      // 3) 建 loader（你的型別需要 IfcAPI + WebIFC）
      const ifcLoader = new WebIFCLoaderPlugin(viewer, { IfcAPI, WebIFC });

      // 4) 載入 IFC（先關 edges，loaded 後再建 NavCube）
      const modelId = `ifc_${Date.now()}`;
      sceneModel = ifcLoader.load({
        id: modelId,
        src,
        edges: false,
      });

      sceneModel.on?.('loaded', () => {
        if (destroyed) return;

        navCube = new NavCubePlugin(viewer, {
          canvasElement: navCanvasRef.current!,
          visible: true,
          cameraFly: true,
          cameraFitFOV: 45,
          cameraFlyDuration: 0.5,
        });

        // 視需要再 fit 全模
        // viewer.cameraFlight?.flyTo(sceneModel);

        viewer.scene.render();
      });

      sceneModel.on?.('error', (e: any) => {
        console.error('[IFC load error]', e);
      });
    })();

    return () => {
      destroyed = true;
      try {
        window.removeEventListener('resize', onWinResize);
        roScene.disconnect();
        roNav.disconnect();
        navCube?.destroy?.();
        sceneModel?.destroy?.();
        sectionPlanes?.destroy?.();
        (viewer as any)?.destroy?.();
      } finally {
        if (pivotRef.current) {
          document.body.removeChild(pivotRef.current);
          pivotRef.current = null;
        }
      }
    };
  }, [src, wasmBaseURL, rootWorkerURL, maxDPR]);

  return (
    <>
      <canvas
        ref={sceneCanvasRef}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
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
