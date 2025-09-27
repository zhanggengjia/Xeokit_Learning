import { useEffect, useRef } from 'react';
import { Viewer } from '@xeokit/xeokit-sdk';
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
  const viewerRef = useRef<Viewer | null>(null);
  const sceneModelRef = useRef<any | null>(null);

  // 解析度同步
  useCanvasDPRSync(sceneCanvasRef, () => viewerRef.current?.scene.render());
  useCanvasDPRSync(navCanvasRef, () => viewerRef.current?.scene.render());

  useEffect(() => {
    if (!sceneCanvasRef.current) return;

    const viewer = new Viewer({
      canvasElement: sceneCanvasRef.current,
      transparent: true,
      // readableGeometryEnabled: true,
    });
    viewerRef.current = viewer;

    // 相機 / Pivot
    setupCamera(viewer, camera);
    const disposePivot = setupPivot(viewer);

    // NavCube
    const disposeNavCube =
      navCube && navCanvasRef.current
        ? setupNavCube(viewer, navCanvasRef.current)
        : undefined;

    // Grid
    const gridMesh = grid ? createGrid(viewer, grid) : undefined;

    // 載入 XKT
    const { sceneModel, dispose: disposeModel } = loadXKT(viewer, {
      src,
      withSectionPlane: false, // ← 關掉，避免跟按鈕邏輯衝突
    });
    sceneModelRef.current = sceneModel;

    return () => {
      disposeModel?.();
      gridMesh?.destroy?.();
      disposeNavCube?.();
      disposePivot?.();
      viewer.destroy?.();
      viewerRef.current = null;
      sceneModelRef.current = null;
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
            width: 250,
            height: 250,
            zIndex: 200000,
            pointerEvents: 'auto',
          }}
        />
      )}
      {/* 🔻 新增：可重用的 Section Plane 切換元件 */}
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
        capColor={[0.9, 0.2, 0.2]} // 可選：截面填色
        // 也可自訂 className / style / labels
        // className="btn btn-outline"
        // labels={{ on: "關閉切面", off: "開啟切面" }}
      />
    </>
  );
}
