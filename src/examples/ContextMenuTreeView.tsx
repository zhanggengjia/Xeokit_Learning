// components/xeokit/ContextMenuTreeView.tsx
import { useEffect, useRef, useState } from 'react';
import type { Viewer } from '@xeokit/xeokit-sdk';
import { Viewer as XeokitViewer, TreeViewPlugin } from '@xeokit/xeokit-sdk';

import InfoPanel from '../components/InfoPanel';
import {
  extractDoorWindowInfo,
  type DoorWindowInfo,
} from '../utils/xeokit/extractDoorWindowInfo';
import {
  createDefaultTreeMenu,
  createDefaultCanvasMenu,
  createDefaultObjectMenu,
  type MenuBuilder,
} from '../utils/xeokit/menus';

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
  /**
   * 可外部注入選單建構器；未提供時使用預設選單
   */
  menuBuilders?: {
    tree?: MenuBuilder;
    canvas?: MenuBuilder;
    object?: MenuBuilder;
  };
};

const LONGPRESS_MS = 500;
const MOVE_TOL = 3; // px

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
  treeWidth = 340,
  autoExpandDepth = 3,
  className,
  menuBuilders,
}: Props) {
  const sceneCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const navCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const treeRef = useRef<HTMLDivElement | null>(null);

  const viewerRef = useRef<Viewer | null>(null);

  const [info, setInfo] = useState('Loading...');
  const [dwInfo, setDwInfo] = useState<DoorWindowInfo | null>(null);

  const [infoType, setInfoType] = useState<
    'containment' | 'storeys' | 'types' | undefined
  >('containment');
  const infoTypeArray = ['containment', 'storeys', 'types'];

  const showInfoFor = (id: string) => {
    const v = viewerRef.current;
    if (!v) return;
    const data = extractDoorWindowInfo(v as any, id, [
      'IfcCovering',
      'IfcDoor',
      'IfcSlab',
      'IfcWall',
      'IfcWindow',
    ]);
    setDwInfo(data); // 非門窗 → null → 不顯示
  };
  const clearInfo = () => setDwInfo(null);

  // DPR 同步（Retina 清晰）
  useCanvasDPRSync(sceneCanvasRef, () => viewerRef.current?.scene.render());
  useCanvasDPRSync(navCanvasRef, () => viewerRef.current?.scene.render());

  useEffect(() => {
    if (!sceneCanvasRef.current) return;

    // 1) Viewer
    const viewer = new XeokitViewer({
      canvasElement: sceneCanvasRef.current,
      transparent: true,
    });
    viewerRef.current = viewer;

    // 2) Camera / Pivot
    setupCamera(viewer, camera);
    const disposePivot = setupPivot(viewer);

    // 3) Highlight/Selected 材質
    setupHighlightAndSelectMaterials(viewer);

    // 4) NavCube / Grid
    const disposeNavCube =
      navCube && navCanvasRef.current
        ? setupNavCube(viewer, navCanvasRef.current, {
            visible: true,
            cameraFly: true,
            cameraFitFOV: 45,
            cameraFlyDuration: 0.5,
          })
        : undefined;

    const gridMesh = grid ? createGrid(viewer, grid) : undefined;

    // 5) TreeView
    let treeView: TreeViewPlugin | null = null;
    if (treeRef.current) {
      treeView = new TreeViewPlugin(viewer, {
        containerElement: treeRef.current,
        autoExpandDepth,
        hierarchy: infoType,
        sortNodes: true,
      });

      // 節點左鍵：隔離 + 飛入（保留原有習慣）
      treeView.on('nodeTitleClicked', (e: any) => {
        const scene = viewer.scene;
        const objectIds: string[] = [];
        e.treeViewPlugin.withNodeTree(e.treeViewNode, (n: any) => {
          if (n.objectId) objectIds.push(n.objectId);
        });

        e.treeViewPlugin.unShowNode();
        scene.setObjectsXRayed(scene.objectIds, true);
        scene.setObjectsVisible(scene.objectIds, true);
        scene.setObjectsXRayed(objectIds, false);

        viewer.cameraFlight.flyTo(
          { aabb: scene.getAABB(objectIds), duration: 0.5 },
          () =>
            setTimeout(() => {
              scene.setObjectsVisible(scene.xrayedObjectIds, false);
              scene.setObjectsXRayed(scene.xrayedObjectIds, false);
            }, 500)
        );
      });
    }

    // 6) 載入 XKT
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

    // 7) Menus（可外部注入）
    const deps = {
      treeView,
      showInfoFor,
      clearInfo,
      getCanvasPos: (x: number, y: number) => {
        const el = sceneCanvasRef.current!;
        const rect = el.getBoundingClientRect();
        return [
          x - (rect.left + window.scrollX),
          y - (rect.top + window.scrollY),
        ] as [number, number];
      },
    };

    const treeMenu = (menuBuilders?.tree ?? createDefaultTreeMenu)(deps);
    const canvasMenu = (menuBuilders?.canvas ?? createDefaultCanvasMenu)(deps);
    const objectMenu = (menuBuilders?.object ?? createDefaultObjectMenu)(deps);

    // 8) 右鍵位置判斷：物件 vs 空白
    const openMenuAt = (pageX: number, pageY: number) => {
      const hit = viewer.scene.pick({
        canvasPos: deps.getCanvasPos!(pageX, pageY),
      });
      if (hit && (hit.entity as any)?.isObject) {
        objectMenu.context = {
          viewer,
          treeViewPlugin: treeView,
          entity: hit.entity,
        };
        objectMenu.show(pageX, pageY);
      } else {
        canvasMenu.context = { viewer };
        canvasMenu.show(pageX, pageY);
      }
    };

    // 9) RMB 拖曳距離判斷 + 原生 contextmenu 阻止
    const canvasEl = sceneCanvasRef.current as HTMLCanvasElement;
    let rmbDown = false;
    let rmbStartX = 0,
      rmbStartY = 0;
    let rmbMoved = false;

    let lastEntity: any = null;

    const onNativeContextMenu = (e: MouseEvent) => e.preventDefault();
    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 2) return;
      rmbDown = true;
      rmbMoved = false;
      rmbStartX = e.pageX;
      rmbStartY = e.pageY;
    };
    const onMouseUp = (e: MouseEvent) => {
      if (e.button !== 2) return;
      if (!rmbMoved) openMenuAt(e.pageX, e.pageY);
      rmbDown = false;
      rmbMoved = false;
    };

    const onMouseMove = (e: MouseEvent) => {
      // A) 右鍵拖移距離判斷
      if (rmbDown) {
        const dx = e.pageX - rmbStartX;
        const dy = e.pageY - rmbStartY;
        if (dx * dx + dy * dy > MOVE_TOL * MOVE_TOL) rmbMoved = true;
        // 右鍵拖移期間不做 hover 拾取，直接 return（降噪 + 省算力）
        return;
      }

      // B) Hover 拾取與高亮
      const rect = canvasEl.getBoundingClientRect();
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

    // 10) 觸控長按
    let pressTimer = 0 as unknown as number;
    let startX = 0,
      startY = 0;
    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
      pressTimer = window.setTimeout(
        () => openMenuAt(t.pageX, t.pageY),
        LONGPRESS_MS
      );
    };

    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (
        Math.abs(t.clientX - startX) > MOVE_TOL ||
        Math.abs(t.clientY - startY) > MOVE_TOL
      ) {
        clearTimeout(pressTimer);
      }
    };
    const onTouchEnd = () => clearTimeout(pressTimer);

    // 綁事件
    canvasEl.addEventListener('contextmenu', onNativeContextMenu);
    canvasEl.addEventListener('mousedown', onMouseDown);
    canvasEl.addEventListener('mouseup', onMouseUp);
    canvasEl.addEventListener('mousemove', onMouseMove);

    canvasEl.addEventListener('touchstart', onTouchStart);
    canvasEl.addEventListener('touchmove', onTouchMove);
    canvasEl.addEventListener('touchend', onTouchEnd);

    // Tree 右鍵
    treeView?.on('contextmenu', (e: any) => {
      treeMenu.context = {
        viewer: e.viewer,
        treeViewPlugin: e.treeViewPlugin,
        treeViewNode: e.treeViewNode,
        entity: e.viewer.scene.objects[e.treeViewNode.objectId],
      };
      treeMenu.show(e.event.pageX, e.event.pageY);
    });

    // 清理
    return () => {
      try {
        canvasEl.removeEventListener('contextmenu', onNativeContextMenu);
        canvasEl.removeEventListener('mousedown', onMouseDown);
        canvasEl.removeEventListener('mouseup', onMouseUp);
        canvasEl.removeEventListener('mousemove', onMouseMove);

        canvasEl.removeEventListener('touchstart', onTouchStart);
        canvasEl.removeEventListener('touchmove', onTouchMove);
        canvasEl.removeEventListener('touchend', onTouchEnd);
      } catch {}

      try {
        treeView?.destroy?.();
      } catch {}
      if (treeRef.current) {
        try {
          treeRef.current.innerHTML = '';
        } catch {}
      }
      disposeModel?.();
      gridMesh?.destroy?.();
      disposeNavCube?.();
      disposePivot?.();
      viewer.destroy?.();
      viewerRef.current = null;
    };
  }, [src, autoExpandDepth, menuBuilders, infoType]);

  return (
    <div className={`relative w-full h-full ${className ?? ''}`}>
      {/* 主 Canvas */}
      <canvas ref={sceneCanvasRef} className="block w-full h-full" />

      {/* NavCube */}
      {navCube && (
        <canvas
          ref={navCanvasRef}
          width={250}
          height={250}
          className="absolute right-2.5 bottom-[50px] w-[250px] h-[250px] z-[1] pointer-events-auto"
        />
      )}

      {/* Tree category button（左側） */}
      <div className="absolute top-1 left-2">
        {infoTypeArray.map((item) => {
          return (
            <button
              key={item}
              className={
                infoType === item ? `mx-1 p-1! bg-gray-500!` : `mx-1 p-1!`
              }
              onClick={() =>
                setInfoType(
                  item as 'containment' | 'storeys' | 'types' | undefined
                )
              }
            >
              {item}
            </button>
          );
        })}
      </div>

      {/* Tree 容器 */}
      <div
        ref={treeRef}
        className="pointer-events-auto absolute top-12 left-0 z-[200] h-[90%] overflow-y-auto bg-white/20 text-black pl-[10px] font-roboto text-[15px] select-none"
        style={{ width: treeWidth }}
      />

      {/* 資訊面板（選中門/窗時顯示） */}
      {dwInfo && <InfoPanel info={dwInfo} onClose={() => setDwInfo(null)} />}

      {/* 右下角提示 */}
      <div
        className="absolute bottom-3 right-4 z-[201] border border-gray-200 rounded-md bg-white/80 px-3 py-1.5 text-sm text-black"
        style={{ whiteSpace: 'pre-line' }}
      >
        {info}
      </div>
    </div>
  );
}
