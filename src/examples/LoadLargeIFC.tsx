import React, { useEffect, useRef } from 'react';
import type { FC } from 'react';

// 依你的專案實際安裝調整路徑：
// - 有些是 "xeokit-sdk"
// - 有些是 "@xeokit/xeokit-sdk"
// - 某些版本的 WebIFCLoaderPlugin 需要從 plugins 路徑單獨引入
import { Viewer, NavCubePlugin, WebIFCLoaderPlugin } from '@xeokit/xeokit-sdk';

import * as WebIFC from 'web-ifc';

type LoadIFC2Props = {
  /** IFC 檔案 URL */
  src: string;
  /** web-ifc.wasm 所在 URL（需能被靜態存取；預設 /web-ifc/ 對應 public/web-ifc/） */
  wasmPath?: string;
  /** 上限 DevicePixelRatio，預設 1.5：降低高 DPI 下的像素負擔 */
  maxDPR?: number;
  /** 當前是否載入中（可用來在 Navbar 禁用切換） */
  onLoadingChange?: (loading: boolean) => void;
  /** 是否顯示右上角 NavCube */
  showNavCube?: boolean;
};

const LoadIFC2: FC<LoadIFC2Props> = ({
  src,
  wasmPath = '/web-ifc/',
  maxDPR = 1.5,
  onLoadingChange,
  showNavCube = true,
}) => {
  const sceneCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const navCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const viewerRef = useRef<any>(null);
  const sceneModelRef = useRef<any>(null);
  const navCubeRef = useRef<any>(null);

  const loadingRef = useRef(false);

  // ---- DPI / 解析度控制 ----
  const getDPR = () => Math.min(window.devicePixelRatio || 1, maxDPR);
  const syncCanvasResolution = (canvas: HTMLCanvasElement) => {
    const dpr = getDPR();
    const targetW = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const targetH = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }
  };

  useEffect(() => {
    const sceneCanvas = sceneCanvasRef.current;
    const navCanvas = navCanvasRef.current;
    if (!sceneCanvas) return;

    let destroyed = false;

    const setLoading = (v: boolean) => {
      loadingRef.current = v;
      onLoadingChange?.(v);
    };

    const handleResize = () => {
      if (!sceneCanvas || !viewerRef.current) return;
      syncCanvasResolution(sceneCanvas);
      viewerRef.current.scene?.canvasDirty?.();
      viewerRef.current.scene?.render?.();
    };

    (async () => {
      try {
        setLoading(true);

        // 1) 建立 Viewer（先簡配置，其他插件等 loaded 再建）
        const viewer = new Viewer({
          canvasElement: sceneCanvas,
          transparent: true,
        });
        viewerRef.current = viewer;

        // 初始解析度同步 + 監聽
        syncCanvasResolution(sceneCanvas);
        window.addEventListener('resize', handleResize);

        // 2) 建 IfcAPI 實例 → 設定 wasm 路徑 → 初始化
        const IfcAPI = new WebIFC.IfcAPI();
        IfcAPI.SetWasmPath(wasmPath);
        await IfcAPI.Init();

        // 3) 以 IfcAPI 建 Loader
        const ifcLoader = new WebIFCLoaderPlugin(viewer, { WebIFC, IfcAPI });

        // 4) 載入 IFC（大檔先把 edges 關掉以降載）
        const sceneModel = ifcLoader.load({
          id: `ifc_${Date.now()}`,
          src,
          edges: false,
        });
        sceneModelRef.current = sceneModel;

        // 5) 事件：載入完成後再建立 NavCube 等配件
        sceneModel.on?.('loaded', () => {
          if (destroyed) return;

          if (showNavCube && navCanvas) {
            navCubeRef.current = new NavCubePlugin(viewer, {
              canvasElement: navCanvas,
              visible: true,
              cameraFly: true,
              cameraFitFOV: 45,
              cameraFlyDuration: 0.5,
            });
          }

          // 大檔可視需要再做 fit（避免一開始就包山包海）
          // viewer.cameraFlight?.flyTo(sceneModel);

          viewer.scene?.render?.();
          setLoading(false);
        });

        sceneModel.on?.('error', (err: any) => {
          console.error('[IFC load error]', err);
          setLoading(false);
        });
      } catch (err) {
        console.error('[IFC init/load error]', err);
        setLoading(false);
      }
    })();

    // ---- 清理：換檔或卸載 ----
    return () => {
      destroyed = true;
      try {
        navCubeRef.current?.destroy?.();
      } catch {}
      navCubeRef.current = null;

      try {
        sceneModelRef.current?.destroy?.();
      } catch {}
      sceneModelRef.current = null;

      try {
        viewerRef.current?.destroy?.();
      } catch {}
      viewerRef.current = null;

      window.removeEventListener('resize', handleResize);
      setLoading(false);
    };
  }, [src, wasmPath, maxDPR, showNavCube, onLoadingChange]);

  return (
    <div className="w-full h-full grid grid-rows-[1fr_auto]">
      {/* 主視窗 */}
      <div className="w-full h-full relative">
        <canvas
          ref={sceneCanvasRef}
          className="w-full h-full block outline-none"
        />
        {showNavCube && (
          <div className="absolute right-2 top-2 w-28 h-28 pointer-events-auto">
            <canvas ref={navCanvasRef} className="w-full h-full block" />
          </div>
        )}
        {/* 若要顯示載入中遮罩，建議把 loading 狀態提升到父層，以 props 控制 */}
      </div>

      {/* 底部狀態列（可自行移除） */}
      <div className="h-8 px-3 flex items-center text-sm opacity-70">
        <span className="truncate">IFC: {src}</span>
      </div>
    </div>
  );
};

export default LoadIFC2;
