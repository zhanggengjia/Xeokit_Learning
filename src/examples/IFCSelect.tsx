// src/components/OverlappingPressIFC.tsx
import { useEffect, useRef } from 'react';
import * as SDK from '@xeokit/xeokit-sdk';
import * as WebIFC from 'web-ifc';

type Props = {
  src?: string; // IFC 路徑
  edges?: boolean;
};

export default function OverlappingPressIFC({
  src = '/models/Duplex.ifc',
  edges = true,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // 以星號匯入，避免你的型別增補/版本差異造成 named import 失效
    const { Viewer, WebIFCLoaderPlugin } = SDK as any;

    // 1) 建 Viewer
    const viewer: any = new Viewer({
      canvasElement: canvasRef.current,
      transparent: true,
    });
    viewer.camera.eye = [-8.23, 10.67, 35.26];
    viewer.camera.look = [4.39, 3.72, 8.89];
    viewer.camera.up = [0.1, 0.97, -0.2];
    viewer.cameraControl.doublePickFlyTo = false;

    let destroyed = false;
    let sceneModel: any | undefined;
    let highlighted: any = null;

    // 2) web-ifc 初始化（WASM 路徑健檢 → 初始化）
    (async () => {
      try {
        const IfcAPI = new (WebIFC as any).IfcAPI();

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

        // 3) 載入 IFC
        const ifcLoader = new WebIFCLoaderPlugin(viewer, { WebIFC, IfcAPI });
        sceneModel = ifcLoader.load({
          id: 'ifcModel',
          src,
          edges,
        });

        sceneModel.on?.('loaded', () => {
          viewer.cameraFlight?.flyTo(sceneModel);
        });
      } catch (err) {
        console.error('IFC load failed:', err);
      }
    })();

    // 4) still-press 偵測 + 精確拾取 + 高亮
    const pressPrecision = 3; // 允許移動像素半徑
    let downPt: { x: number; y: number } | null = null;

    const onDown = (e: MouseEvent) => {
      console.log('on down');
      if (e.button !== 0) return; // 左鍵
      downPt = { x: e.clientX, y: e.clientY };
    };

    const onMove = (e: MouseEvent) => {
      console.log('on move');
      if (!downPt) return;
      const dx = e.clientX - downPt.x;
      const dy = e.clientY - downPt.y;
      if (dx * dx + dy * dy > pressPrecision * pressPrecision) {
        downPt = null; // 移動太多 → 取消這次 press
      }
    };

    const onUp = (e: MouseEvent) => {
      console.log('on up');
      if (e.button !== 0) return;
      if (!downPt) return; // 不是 still-press
      const dx = e.clientX - downPt.x;
      const dy = e.clientY - downPt.y;
      downPt = null;
      if (dx * dx + dy * dy > pressPrecision * pressPrecision) return;

      const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
      // 如遇高 DPI 拾取偏移，可乘上 DPR：const dpr = devicePixelRatio || 1;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const pick = viewer.scene.pick({
        canvasPos: [x, y],
        pickSurface: true,
      });

      // 還原上一個
      if (highlighted) {
        highlighted.highlighted = false;
        highlighted = null;
      }

      // 設定新的高亮
      const ent: any = pick?.entity;
      if (ent && ent.isObject) {
        highlighted = ent;
        highlighted.highlighted = true;
        // 若想飛到該物件：
        // viewer.cameraFlight?.flyTo(ent);
      }
    };

    const cvs = canvasRef.current;
    cvs.addEventListener('mousedown', onDown);
    cvs.addEventListener('mousemove', onMove);
    cvs.addEventListener('mouseup', onUp);

    // 5) 清理
    return () => {
      destroyed = true;
      try {
        cvs.removeEventListener('mousedown', onDown);
        cvs.removeEventListener('mousemove', onMove);
        cvs.removeEventListener('mouseup', onUp);
        sceneModel?.destroy?.();
        viewer?.destroy?.();
      } catch {
        // ignore
      }
    };
  }, [src, edges]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
    </div>
  );
}
