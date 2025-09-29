import { useEffect, useRef } from 'react';
import { useCanvasDPRSync } from '../hooks/useCanvasDPRSync';
import { setupCamera, type CameraOptions } from '../utils/xeokit/setupCamera';
import { createGrid } from '../utils/xeokit/createGrid';
import { setupPivot } from '../utils/xeokit/setupPivot';
import { setupNavCube } from '../utils/xeokit/setupNavCube';
import { loadXKT } from '../utils/xeokit/loadXKT';
import SectionPlaneToggle from '../components/SectionPlaneToggle';

type XeokitViewerProps = {
  src: string; // xkt 路徑
  camera?: CameraOptions; // 相機參數
  grid?: { size?: number; divisions?: number; y?: number } | false; // 關閉傳 false
  navCube?: boolean;
  className?: string;
};

export default function XktModelViewer({
  src,
  camera = {
    eye: [-8.23, 10.67, 35.26],
    look: [4.39, 3.72, 8.89],
    up: [0.1, 0.97, -0.2],
    navMode: 'orbit',
    followPointer: true,
  },
  grid = { size: 300, divisions: 60, y: -1.6 },
  navCube = true,
  className,
}: XeokitViewerProps) {
  const sceneCanvasRef = useRef<HTMLCanvasElement>(null);
  const navCanvasRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<any | null>(null);
  const sceneModelRef = useRef<any | null>(null);

  // 解析度同步
  useCanvasDPRSync(sceneCanvasRef, () => viewerRef.current?.scene.render());
  useCanvasDPRSync(navCanvasRef, () => viewerRef.current?.scene.render());

  useEffect(() => {
    let disposeModel: (() => void) | undefined;
    let disposePivot: (() => void) | undefined;
    let disposeNavCube: (() => void) | undefined;
    let gridMesh: any | undefined;

    (async () => {
      if (!sceneCanvasRef.current) return;

      // 用專案 base 組成絕對 URL，避免相對路徑在 Netlify 出錯
      const url = new URL(
        `${import.meta.env.BASE_URL}lib/xeokit-sdk.min.es.js`,
        window.location.origin
      ).toString();
      // 告訴 Vite 不要分析這個 import（否則它會報你現在那個錯）
      const mod = await import(/* @vite-ignore */ url);

      const { Viewer } = mod as any;

      const viewer = new Viewer({
        canvasElement: sceneCanvasRef.current,
        transparent: true,
        readableGeometryEnabled: true, // 你需要的屬性
      });
      viewerRef.current = viewer;

      // 相機 / Pivot
      setupCamera(viewer, camera);
      disposePivot = setupPivot(viewer);

      // NavCube
      if (navCube && navCanvasRef.current) {
        disposeNavCube = setupNavCube(viewer, navCanvasRef.current);
      }

      // Grid
      if (grid) {
        gridMesh = createGrid(viewer, grid);
      }

      // 載入 XKT
      const loaded = loadXKT(viewer, {
        src,
        withSectionPlane: false, // 關掉，避免和按鈕邏輯衝突
      });
      sceneModelRef.current = loaded.sceneModel;
      disposeModel = loaded.dispose;
    })();

    return () => {
      try {
        disposeModel?.();
        gridMesh?.destroy?.();
        disposeNavCube?.();
        disposePivot?.();
        viewerRef.current?.destroy?.();
      } finally {
        viewerRef.current = null;
        sceneModelRef.current = null;
      }
    };
  }, [src, camera, grid, navCube]);

  return (
    <>
      <canvas
        ref={sceneCanvasRef}
        className={className}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
      {navCube && (
        <canvas
          ref={navCanvasRef}
          width={250}
          height={250}
          style={{
            position: 'absolute',
            right: 10,
            bottom: 50,
            width: 'clamp(100px, 20vw, 300px)', // 最小 100px，最大 300px，正常跟螢幕 20% 綁定
            height: 'clamp(100px, 20vw, 300px)',
            zIndex: 200000,
            pointerEvents: 'auto',
          }}
        />
      )}

      <SectionPlaneToggle
        key={src}
        viewerRef={viewerRef}
        sceneModelRef={sceneModelRef}
        resetKey={src} // src 改變就自動關閉
        defaultOn={false} // 進場預設關閉（可改成 true）
        plane={{
          // 可選：自訂主平面
          id: 'mainPlane',
          pos: [0, 0, 0],
          dir: [1, 0, 0],
          showControl: true,
        }}
        capColor={[0.3, 0.3, 0.3]} // 可選：截面填色
        className="text-black"
        // 也可自訂 className / style / labels
        // className="btn btn-outline"
        // labels={{ on: "關閉切面", off: "開啟切面" }}
      />
    </>
  );
}
