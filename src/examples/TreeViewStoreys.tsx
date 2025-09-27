// components/xeokit/TreeViewStoreys.tsx
import { useEffect, useRef, useState } from 'react';

import { Viewer, TreeViewPlugin } from '@xeokit/xeokit-sdk';
import { useCanvasDPRSync } from '../hooks/useCanvasDPRSync';
import { setupCamera } from '../utils/xeokit/setupCamera';
import { setupNavCube } from '../utils/xeokit/setupNavCube';
import { createGrid } from '../utils/xeokit/createGrid';
import { loadXKT } from '../utils/xeokit/loadXKT';

type TreeViewStoreysProps = {
  /** xkt 檔案位置 */
  src: string;
  /** NavCube 是否顯示 */
  navCube?: boolean;
  /** 左側樹狀容器寬度 (px) */
  treeWidth?: number;
  /** 初始展開層級 */
  autoExpandDepth?: number;
  /** 包裹容器樣式類名 */
  className?: string;
};

export default function TreeViewStoreys({
  src,
  navCube = true,
  treeWidth = 350,
  autoExpandDepth = 1,
  className,
}: TreeViewStoreysProps) {
  // 兩個 canvas
  const sceneCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const navCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Tree 容器
  const treeContainerRef = useRef<HTMLDivElement | null>(null);

  // xeokit 實例
  const viewerRef = useRef<Viewer | null>(null);
  const treeViewRef = useRef<TreeViewPlugin | null>(null);
  const sceneModelRef = useRef<any | null>(null);

  // Loading/統計
  const [info, setInfo] = useState<string>('Loading JavaScript modules...');

  // 解析度同步（之後尺寸/DPR 改變自動 render）
  useCanvasDPRSync(sceneCanvasRef, () => viewerRef.current?.scene.render());
  useCanvasDPRSync(navCanvasRef, () => viewerRef.current?.scene.render());

  useEffect(() => {
    if (!sceneCanvasRef.current) return;

    // 建 viewer
    const viewer = new Viewer({
      canvasElement: sceneCanvasRef.current,
      transparent: true,
    });
    viewerRef.current = viewer;

    // 相機與控制（對齊官方示例的感覺）
    setupCamera(viewer, {
      eye: [-2.56, 8.38, 8.27],
      look: [13.44, 3.31, -14.83],
      up: [0.1, 0.98, -0.14],
      navMode: 'orbit',
      followPointer: true,
    });
    viewer.cameraFlight.duration = 1.0;
    (viewer.cameraFlight as any).fitFOV = 25;

    // 調整 xray & highlight（可視需要保留）
    viewer.scene.xrayMaterial.fillAlpha = 0.1;
    viewer.scene.xrayMaterial.fillColor = [0, 0, 0];
    viewer.scene.xrayMaterial.edgeAlpha = 0.4;
    viewer.scene.xrayMaterial.edgeColor = [0, 0, 0];

    viewer.scene.highlightMaterial.fill = false;
    viewer.scene.highlightMaterial.fillAlpha = 0.3;
    viewer.scene.highlightMaterial.edgeColor = [1, 1, 0];

    // NavCube
    const disposeNavCube =
      navCube && navCanvasRef.current
        ? setupNavCube(viewer, navCanvasRef.current, {
            visible: true,
            cameraFly: true,
            cameraFitFOV: 45,
            cameraFlyDuration: 0.5,
          })
        : undefined;

    // 地面格線（可選）
    const gridMesh = createGrid(viewer, { size: 300, divisions: 60, y: -1.6 });

    // TreeViewPlugin（樓層 storeys）
    let treeView: TreeViewPlugin | null = null;
    if (treeContainerRef.current) {
      treeView = new TreeViewPlugin(viewer, {
        containerElement: treeContainerRef.current,
        autoExpandDepth,
        hierarchy: 'storeys',
        sortNodes: true,
      });
      treeViewRef.current = treeView;
    }

    // 載入 XKT（關掉內建截面，避免跟你的按鈕邏輯衝突）
    const t0 = performance.now();
    setInfo('Loading model...');
    const { sceneModel, dispose: disposeModel } = loadXKT(viewer, {
      src,
      withSectionPlane: false,
    });
    sceneModelRef.current = sceneModel;

    sceneModel.on?.('loaded', () => {
      const t1 = performance.now();
      const anyModel = sceneModel as any;
      const objectsCount =
        anyModel?.numEntities ??
        (anyModel?.entities
          ? Object.keys(anyModel.entities).length
          : undefined);

      setInfo(
        `Model loaded in ${Math.floor((t1 - t0) / 1000)} seconds` +
          (objectsCount != null ? `\nObjects: ${objectsCount}` : '')
      );
      viewer.cameraFlight?.flyTo(sceneModel);
      viewer.scene.render();
    });

    // 滑鼠 hover 高亮（放在現有的 useEffect 裡，viewer 建好之後）
    let lastEntity: any = null;

    const canvas = sceneCanvasRef.current!;
    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const hit = viewer.scene.pick({ canvasPos: [x, y] });

      if (hit && hit.entity) {
        if (!lastEntity || hit.entity.id !== lastEntity.id) {
          if (lastEntity) lastEntity.highlighted = false;
          lastEntity = hit.entity;
          hit.entity.highlighted = true;
        }
      } else {
        if (lastEntity) lastEntity.highlighted = false;
        lastEntity = null;
      }
    };

    canvas.addEventListener('mousemove', onMouseMove);

    return () => {
      try {
        canvas.removeEventListener('mousemove', onMouseMove);
      } catch {}
      if (lastEntity) lastEntity.highlighted = false;

      // ✅ 1) 先拆 TreeView，並清空容器（避免它在模型銷毀事件中重建）
      try {
        treeView?.destroy?.();
      } catch {}
      treeViewRef.current = null;

      if (treeContainerRef.current) {
        try {
          treeContainerRef.current.innerHTML = '';
        } catch {}
      }

      // ✅ 2) 再拆模型
      try {
        disposeModel?.();
      } catch {}
      sceneModelRef.current = null;

      // 其餘資源照舊
      try {
        gridMesh?.destroy?.();
      } catch {}
      try {
        disposeNavCube?.();
      } catch {}
      viewer.destroy?.();

      viewerRef.current = null;
    };
  }, [src]);

  // src 變更時，讓 Tree 也能重新渲染/重設（若需要，可在這裡做更多重置）
  useEffect(() => {
    // 若你有額外 UI 需要 reset，可在這裡做
  }, [src]);

  return (
    <>
      {/* 主畫布 */}
      <canvas
        ref={sceneCanvasRef}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />

      {/* NavCube 畫布 */}
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

      {/* 左側 TreeView 容器 */}
      <div
        ref={treeContainerRef}
        style={{
          pointerEvents: 'all',
          height: '80%',
          overflowY: 'auto',
          overflowX: 'hidden',
          position: 'absolute',
          backgroundColor: 'rgba(255,255,255,0.2)',
          color: 'black',
          top: 80,
          zIndex: 200000,
          left: 0,
          paddingLeft: 10,
          fontFamily: 'Roboto, sans-serif',
          fontSize: 15,
          userSelect: 'none',
          width: treeWidth,
        }}
      />

      {/* 右側/或任何位置顯示 loading info（你也可放在自家 UI） */}
      <div
        style={{
          position: 'absolute',
          bottom: 12,
          left: treeWidth + 16,
          padding: '6px 10px',
          background: 'rgba(255,255,255,0.8)',
          borderRadius: 6,
          border: '1px solid #ddd',
          whiteSpace: 'pre-line',
          fontSize: 14,
          zIndex: 200001,
        }}
      >
        {info}
      </div>
    </>
  );
}
