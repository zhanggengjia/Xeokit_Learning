// components/xeokit/ContextMenuTreeView.tsx
import { useEffect, useRef, useState } from 'react';
import { Viewer, TreeViewPlugin, ContextMenu } from '@xeokit/xeokit-sdk';
import { useCanvasDPRSync } from '../hooks/useCanvasDPRSync';
import { setupCamera, type CameraOptions } from '../utils/xeokit/setupCamera';
import { setupPivot } from '../utils/xeokit/setupPivot';
import { setupNavCube } from '../utils/xeokit/setupNavCube';
import { createGrid } from '../utils/xeokit/createGrid';
import { loadXKT } from '../utils/xeokit/loadXKT';
import { setupHighlightAndSelectMaterials } from '../utils/xeokit/setupMaterials';

type Props = {
  src: string;
  camera?: CameraOptions;
  grid?: { size?: number; divisions?: number; y?: number } | false;
  navCube?: boolean;
  treeWidth?: number;
  autoExpandDepth?: number;
  className?: string;
};

const LONGPRESS_MS = 500;
const MOVE_TOL = 3;

export default function ContextMenuTreeView({
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
  treeWidth = 350,
  autoExpandDepth = 3,
  className,
}: Props) {
  const sceneCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const navCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const treeRef = useRef<HTMLDivElement | null>(null);

  const viewerRef = useRef<Viewer | null>(null);
  const treeViewRef = useRef<TreeViewPlugin | null>(null);
  const [info, setInfo] = useState('Loading JavaScript modules...');

  useCanvasDPRSync(sceneCanvasRef, () => viewerRef.current?.scene.render());
  useCanvasDPRSync(navCanvasRef, () => viewerRef.current?.scene.render());

  useEffect(() => {
    if (!sceneCanvasRef.current) return;

    // 1) Viewer 初始化
    const viewer = new Viewer({
      canvasElement: sceneCanvasRef.current,
      transparent: true,
    });
    viewerRef.current = viewer;

    // 相機/控制
    setupCamera(viewer, camera);
    viewer.cameraControl.followPointer = true;
    const disposePivot = setupPivot(viewer);

    // 高亮/選取材質（可依需求調）
    setupHighlightAndSelectMaterials(viewer);

    // NavCube
    const disposeNavCube =
      navCube && navCanvasRef.current
        ? setupNavCube(viewer, navCanvasRef.current)
        : undefined;

    // Grid
    const gridMesh = grid ? createGrid(viewer, grid) : undefined;

    // 2) TreeView
    let treeView: TreeViewPlugin | null = null;
    if (treeRef.current) {
      treeView = new TreeViewPlugin(viewer, {
        containerElement: treeRef.current,
        autoExpandDepth,
        hierarchy: 'containment',
        sortNodes: true,
      });
      treeViewRef.current = treeView;
    }

    // 3) 載入 XKT
    const t0 = performance.now();
    setInfo('Loading model...');
    const { sceneModel, dispose: disposeModel } = loadXKT(viewer, {
      src,
      withSectionPlane: false,
    });
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

    // 清理
    return () => {
      disposeModel?.();
      disposePivot?.();
      disposeNavCube?.();
      gridMesh?.destroy?.();
      viewer.destroy?.();
      viewerRef.current = null;
    };
  }, [src]);

  // JSX
  return (
    <>
      <canvas
        ref={sceneCanvasRef}
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
      <div
        ref={treeRef}
        className="pt-2 pointer-events-auto h-[80%] overflow-y-auto  absolute bg-white/20 text-black top-25 z-[200000] left-10 pl-[10px] font-roboto text-[15px] select-none"
        style={{ width: treeWidth }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 12,
          right: 16,
          padding: '6px 10px',
          background: 'rgba(255,255,255,0.8)',
          borderRadius: 6,
          border: '1px solid #ddd',
          fontSize: 14,
          zIndex: 200001,
        }}
      >
        {info}
      </div>
    </>
  );
}
