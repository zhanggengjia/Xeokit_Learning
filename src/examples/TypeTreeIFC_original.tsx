import React, { useEffect, useRef } from 'react';
import { Viewer, TreeViewPlugin, WebIFCLoaderPlugin } from '@xeokit/xeokit-sdk';
import * as WebIFC from 'web-ifc';

type Props = {
  src?: string;
  autoExpandDepth?: number;
  treeHeight?: number | string;
};

const TypeTreeIFC: React.FC<Props> = ({
  src = '/models/Duplex.ifc',
  autoExpandDepth = 1,
  treeHeight = 480,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const treeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !treeRef.current) return;

    let destroyed = false;

    (async () => {
      // 1) Viewer
      const viewer = new Viewer({
        canvasElement: canvasRef.current!,
        transparent: true,
      });
      viewer.cameraControl.navMode = 'orbit';
      viewer.cameraControl.followPointer = true;

      // 2) Tree（Types）
      const tree = new TreeViewPlugin(viewer, {
        containerElement: treeRef.current!,
        hierarchy: 'types',
        autoExpandDepth,
      });

      // 3) IfcAPI + WASM 初始化（★ 一定要 await）
      const IfcAPI = new WebIFC.IfcAPI();

      // 對 Vite/CRA 皆通用：優先用本地 public/web-ifc/，失敗再退 CDN
      const ensureWasmReachable = async (base: string) => {
        const url = `${base}web-ifc.wasm`;
        const r = await fetch(url, { method: 'HEAD' });
        if (!r.ok) throw new Error(`WASM not reachable: ${url}`);
      };

      let wasmBase = `${import.meta.env.BASE_URL}web-ifc/`; // 例如 /web-ifc/
      try {
        await ensureWasmReachable(wasmBase);
      } catch {
        wasmBase = 'https://unpkg.com/web-ifc@0.0.62/'; // ★ 後備
      }
      IfcAPI.SetWasmPath(wasmBase);
      await IfcAPI.Init(); // ★ 關鍵：等初始化完成

      if (destroyed) return;

      // 4) Loader 要在 Init 之後建立（★）
      const ifcLoader = new WebIFCLoaderPlugin(viewer, { WebIFC, IfcAPI });

      // 5) 載 IFC
      const model = ifcLoader.load({
        id: 'IFC_Model_1',
        src,
        edges: true,
      });

      model.on('loaded', () => {
        if (destroyed) return;
        tree.addModel(model.id);
        viewer.cameraFlight.flyTo(model);
      });

      // 6) 清理
      return () => {
        destroyed = true;
        try {
          viewer.destroy();
        } catch {}
      };
    })();

    return () => {
      destroyed = true;
    };
  }, [src, autoExpandDepth]);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(280px,360px) 1fr',
        gap: 12,
      }}
    >
      <div
        ref={treeRef}
        style={{
          height:
            typeof treeHeight === 'number' ? `${treeHeight}px` : treeHeight,
          overflow: 'auto',
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          padding: 8,
          background: '#fff',
          fontSize: 14,
        }}
      />
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height:
            typeof treeHeight === 'number' ? `${treeHeight}px` : treeHeight,
          display: 'block',
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          background: 'transparent',
        }}
      />
    </div>
  );
};

export default TypeTreeIFC;
