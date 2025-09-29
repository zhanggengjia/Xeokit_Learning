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

  // 多個 effect / 回呼要跨生命週期 → 建議保留 viewerRef。
  const viewerRef = useRef<Viewer | null>(null);
  const treeViewRef = useRef<TreeViewPlugin | null>(null);
  const [info, setInfo] = useState('Loading JavaScript modules...');
  const [infoType, setInfoType] = useState<
    'containment' | 'storeys' | 'types' | undefined
  >('containment');
  const infoTypeArray = ['containment', 'storeys', 'types'];

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
    viewer.cameraControl.followPointer = true; // 同原 HTML
    const disposePivot = setupPivot(viewer);

    // 材質（依原 HTML 調整 highlight/selected）
    setupHighlightAndSelectMaterials(viewer);

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

    // Grid
    const gridMesh = grid ? createGrid(viewer, grid) : undefined;

    // 2) TreeView
    let treeView: TreeViewPlugin | null = null;
    if (treeRef.current) {
      treeView = new TreeViewPlugin(viewer, {
        containerElement: treeRef.current,
        autoExpandDepth,
        hierarchy: infoType,
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

    // 4) Context Menus（Tree、Canvas、Object）
    // 4-1 TreeView 選單（原 HTML 的群組與動作）
    const treeMenu = new ContextMenu({
      items: [
        [
          {
            title: 'View Fit',
            doAction: (ctx: any) => {
              const scene = ctx.viewer.scene;
              const objectIds: string[] = [];
              ctx.treeViewPlugin.withNodeTree(ctx.treeViewNode, (node: any) => {
                if (node.objectId) objectIds.push(node.objectId);
              });
              scene.setObjectsVisible(objectIds, true);
              scene.setObjectsHighlighted(objectIds, true);
              ctx.viewer.cameraFlight.flyTo(
                {
                  projection: 'perspective',
                  aabb: scene.getAABB(objectIds),
                  duration: 0.5,
                },
                () =>
                  setTimeout(
                    () =>
                      scene.setObjectsHighlighted(
                        scene.highlightedObjectIds,
                        false
                      ),
                    500
                  )
              );
            },
          },
          {
            title: 'View Fit All',
            doAction: (ctx: any) =>
              ctx.viewer.cameraFlight.flyTo({
                projection: 'perspective',
                aabb: ctx.viewer.scene.getAABB(),
                duration: 0.5,
              }),
          },
        ],
        [
          {
            title: 'Hide',
            doAction: (ctx: any) => {
              ctx.treeViewPlugin.withNodeTree(ctx.treeViewNode, (n: any) => {
                if (!n.objectId) return;
                const e = ctx.viewer.scene.objects[n.objectId];
                if (e) e.visible = false;
              });
            },
          },
          {
            title: 'Hide Others',
            doAction: (ctx: any) => {
              const s = ctx.viewer.scene;
              s.setObjectsVisible(s.visibleObjectIds, false);
              s.setObjectsXRayed(s.xrayedObjectIds, false);
              s.setObjectsSelected(s.selectedObjectIds, false);
              s.setObjectsHighlighted(s.highlightedObjectIds, false);
              ctx.treeViewPlugin.withNodeTree(ctx.treeViewNode, (n: any) => {
                if (!n.objectId) return;
                const e = s.objects[n.objectId];
                if (e) e.visible = true;
              });
            },
          },
          {
            title: 'Hide All',
            getEnabled: (ctx: any) =>
              ctx.viewer.scene.visibleObjectIds.length > 0,
            doAction: (ctx: any) =>
              ctx.viewer.scene.setObjectsVisible(
                ctx.viewer.scene.visibleObjectIds,
                false
              ),
          },
        ],
        [
          {
            title: 'Show',
            doAction: (ctx: any) => {
              ctx.treeViewPlugin.withNodeTree(ctx.treeViewNode, (n: any) => {
                if (!n.objectId) return;
                const e = ctx.viewer.scene.objects[n.objectId];
                if (e) {
                  e.visible = true;
                  e.xrayed = false;
                  e.selected = false;
                }
              });
            },
          },
          {
            title: 'Show Others',
            doAction: (ctx: any) => {
              const s = ctx.viewer.scene;
              s.setObjectsVisible(s.objectIds, true);
              s.setObjectsXRayed(s.xrayedObjectIds, false);
              s.setObjectsSelected(s.selectedObjectIds, false);
              ctx.treeViewPlugin.withNodeTree(ctx.treeViewNode, (n: any) => {
                if (!n.objectId) return;
                const e = s.objects[n.objectId];
                if (e) e.visible = false;
              });
            },
          },
          {
            title: 'Show All',
            getEnabled: (ctx: any) =>
              ctx.viewer.scene.numVisibleObjects < ctx.viewer.scene.numObjects,
            doAction: (ctx: any) => {
              const s = ctx.viewer.scene;
              s.setObjectsVisible(s.objectIds, true);
              s.setObjectsXRayed(s.xrayedObjectIds, false);
              s.setObjectsSelected(s.selectedObjectIds, false);
            },
          },
        ],
        [
          {
            title: 'X-Ray',
            doAction: (ctx: any) => {
              ctx.treeViewPlugin.withNodeTree(ctx.treeViewNode, (n: any) => {
                if (!n.objectId) return;
                const e = ctx.viewer.scene.objects[n.objectId];
                if (e) {
                  e.xrayed = true;
                  e.visible = true;
                }
              });
            },
          },
          {
            title: 'Undo X-Ray',
            doAction: (ctx: any) => {
              ctx.treeViewPlugin.withNodeTree(ctx.treeViewNode, (n: any) => {
                if (!n.objectId) return;
                const e = ctx.viewer.scene.objects[n.objectId];
                if (e) e.xrayed = false;
              });
            },
          },
          {
            title: 'X-Ray Others',
            doAction: (ctx: any) => {
              const s = ctx.viewer.scene;
              s.setObjectsVisible(s.objectIds, true);
              s.setObjectsXRayed(s.objectIds, true);
              s.setObjectsSelected(s.selectedObjectIds, false);
              s.setObjectsHighlighted(s.highlightedObjectIds, false);
              ctx.treeViewPlugin.withNodeTree(ctx.treeViewNode, (n: any) => {
                if (!n.objectId) return;
                const e = s.objects[n.objectId];
                if (e) e.xrayed = false;
              });
            },
          },
          {
            title: 'Reset X-Ray',
            getEnabled: (ctx: any) => ctx.viewer.scene.numXRayedObjects > 0,
            doAction: (ctx: any) =>
              ctx.viewer.scene.setObjectsXRayed(
                ctx.viewer.scene.xrayedObjectIds,
                false
              ),
          },
        ],
        [
          {
            title: 'Select',
            doAction: (ctx: any) => {
              ctx.treeViewPlugin.withNodeTree(ctx.treeViewNode, (n: any) => {
                if (!n.objectId) return;
                const e = ctx.viewer.scene.objects[n.objectId];
                if (e) {
                  e.selected = true;
                  e.visible = true;
                }
              });
            },
          },
          {
            title: 'Deselect',
            doAction: (ctx: any) => {
              ctx.treeViewPlugin.withNodeTree(ctx.treeViewNode, (n: any) => {
                if (!n.objectId) return;
                const e = ctx.viewer.scene.objects[n.objectId];
                if (e) e.selected = false;
              });
            },
          },
          {
            title: 'Clear Selection',
            getEnabled: (ctx: any) => ctx.viewer.scene.numSelectedObjects > 0,
            doAction: (ctx: any) =>
              ctx.viewer.scene.setObjectsSelected(
                ctx.viewer.scene.selectedObjectIds,
                false
              ),
          },
        ],
      ],
    });

    // Tree 右鍵出選單；左鍵點節點→隔離+飛入
    treeView?.on('contextmenu', (e: any) => {
      treeMenu.context = {
        viewer: e.viewer,
        treeViewPlugin: e.treeViewPlugin,
        treeViewNode: e.treeViewNode,
        entity: e.viewer.scene.objects[e.treeViewNode.objectId],
      };
      treeMenu.show(e.event.pageX, e.event.pageY);
    });

    treeView?.on('nodeTitleClicked', (e: any) => {
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

    // 4-2 Canvas/Entity 選單（空白處 vs. 點到實體）
    const canvasMenu = new ContextMenu({
      enabled: true,
      context: { viewer },
      items: [
        [
          {
            title: 'Hide All',
            getEnabled: (ctx: any) => ctx.viewer.scene.numVisibleObjects > 0,
            doAction: (ctx: any) =>
              ctx.viewer.scene.setObjectsVisible(
                ctx.viewer.scene.visibleObjectIds,
                false
              ),
          },
          {
            title: 'Show All',
            getEnabled: (ctx: any) =>
              ctx.viewer.scene.numVisibleObjects < ctx.viewer.scene.numObjects,
            doAction: (ctx: any) => {
              const s = ctx.viewer.scene;
              s.setObjectsVisible(s.objectIds, true);
              s.setObjectsXRayed(s.xrayedObjectIds, false);
              s.setObjectsSelected(s.selectedObjectIds, false);
            },
          },
        ],
        [
          {
            title: 'View Fit All',
            doAction: (ctx: any) =>
              ctx.viewer.cameraFlight.flyTo({
                aabb: ctx.viewer.scene.getAABB(),
              }),
          },
        ],
      ],
    });

    const objectMenu = new ContextMenu({
      items: [
        [
          {
            title: 'View Fit',
            doAction: (ctx: any) => {
              const { viewer, entity } = ctx;
              const scene = viewer.scene;
              viewer.cameraFlight.flyTo(
                { aabb: entity.aabb, duration: 0.5 },
                () =>
                  setTimeout(
                    () =>
                      scene.setObjectsHighlighted(
                        scene.highlightedObjectIds,
                        false
                      ),
                    500
                  )
              );
            },
          },
          {
            title: 'View Fit All',
            doAction: (ctx: any) =>
              ctx.viewer.cameraFlight.flyTo({
                projection: 'perspective',
                aabb: ctx.viewer.scene.getAABB(),
                duration: 0.5,
              }),
          },
          {
            title: 'Show in Tree',
            doAction: (ctx: any) => ctx.treeViewPlugin.showNode(ctx.entity.id),
          },
        ],
        [
          {
            title: 'Hide',
            getEnabled: (ctx: any) => ctx.entity.visible,
            doAction: (ctx: any) => (ctx.entity.visible = false),
          },
          {
            title: 'Hide Others',
            doAction: (ctx: any) => {
              const { viewer, entity } = ctx;
              const s = viewer.scene;
              const mo = viewer.metaScene.metaObjects[entity.id];
              if (!mo) return;
              s.setObjectsVisible(s.visibleObjectIds, false);
              s.setObjectsXRayed(s.xrayedObjectIds, false);
              s.setObjectsSelected(s.selectedObjectIds, false);
              s.setObjectsHighlighted(s.highlightedObjectIds, false);
              mo.withMetaObjectsInSubtree((m: any) => {
                const e = s.objects[m.id];
                if (e) e.visible = true;
              });
            },
          },
          {
            title: 'Hide All',
            getEnabled: (ctx: any) => ctx.viewer.scene.numVisibleObjects > 0,
            doAction: (ctx: any) =>
              ctx.viewer.scene.setObjectsVisible(
                ctx.viewer.scene.visibleObjectIds,
                false
              ),
          },
          {
            title: 'Show All',
            getEnabled: (ctx: any) =>
              ctx.viewer.scene.numVisibleObjects < ctx.viewer.scene.numObjects,
            doAction: (ctx: any) =>
              ctx.viewer.scene.setObjectsVisible(
                ctx.viewer.scene.objectIds,
                true
              ),
          },
        ],
        [
          {
            title: 'X-Ray',
            getEnabled: (ctx: any) => !ctx.entity.xrayed,
            doAction: (ctx: any) => (ctx.entity.xrayed = true),
          },
          {
            title: 'Undo X-Ray',
            getEnabled: (ctx: any) => ctx.entity.xrayed,
            doAction: (ctx: any) => (ctx.entity.xrayed = false),
          },
          {
            title: 'X-Ray Others',
            doAction: (ctx: any) => {
              const { viewer, entity } = ctx;
              const s = viewer.scene;
              const mo = viewer.metaScene.metaObjects[entity.id];
              if (!mo) return;
              s.setObjectsVisible(s.objectIds, true);
              s.setObjectsXRayed(s.objectIds, true);
              s.setObjectsSelected(s.selectedObjectIds, false);
              s.setObjectsHighlighted(s.highlightedObjectIds, false);
              mo.withMetaObjectsInSubtree((m: any) => {
                const e = s.objects[m.id];
                if (e) e.xrayed = false;
              });
            },
          },
          {
            title: 'Reset X-Ray',
            getEnabled: (ctx: any) => ctx.viewer.scene.numXRayedObjects > 0,
            doAction: (ctx: any) =>
              ctx.viewer.scene.setObjectsXRayed(
                ctx.viewer.scene.xrayedObjectIds,
                false
              ),
          },
        ],
        [
          {
            title: 'Select',
            getEnabled: (ctx: any) => !ctx.entity.selected,
            doAction: (ctx: any) => (ctx.entity.selected = true),
          },
          {
            title: 'Undo select',
            getEnabled: (ctx: any) => ctx.entity.selected,
            doAction: (ctx: any) => (ctx.entity.selected = false),
          },
          {
            title: 'Clear Selection',
            getEnabled: (ctx: any) => ctx.viewer.scene.numSelectedObjects > 0,
            doAction: (ctx: any) =>
              ctx.viewer.scene.setObjectsSelected(
                ctx.viewer.scene.selectedObjectIds,
                false
              ),
          },
        ],
      ],
    });

    // 右鍵（或觸控長按）分流：如果有 pick 到 entity → objectMenu，否則 canvasMenu
    const canvasEl = sceneCanvasRef.current as HTMLCanvasElement;

    const getCanvasPos = (pageX: number, pageY: number) => {
      const rect = canvasEl.getBoundingClientRect();
      const x = pageX - (rect.left + window.scrollX);
      const y = pageY - (rect.top + window.scrollY);
      return [x, y] as [number, number];
    };

    const openMenuAt = (pageX: number, pageY: number) => {
      const hit = viewer.scene.pick({ canvasPos: getCanvasPos(pageX, pageY) });
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

    // 滑鼠右鍵

    // 觸控長按
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

    // 5) hover 高亮（沿用你 TreeViewStoreys 的寫法）
    let lastEntity: any = null;
    const onMouseMove = (e: MouseEvent) => {
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
    canvasEl.addEventListener('mousemove', onMouseMove);

    // ✅ 新增：右鍵按下→移動→放開 的判斷式
    let rmbDown = false;
    let rmbStartX = 0,
      rmbStartY = 0;
    let rmbMoved = false;

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 2) return; // 只處理右鍵
      rmbDown = true;
      rmbMoved = false;
      rmbStartX = e.pageX;
      rmbStartY = e.pageY;
      // 先擋掉瀏覽器原生選單（有些瀏覽器會在 mouseup 觸發）
      // 不在這裡打開自訂選單，等待 mouseup 時依距離判定
    };

    const onMouseMove2 = (e: MouseEvent) => {
      if (!rmbDown) return;
      const dx = e.pageX - rmbStartX;
      const dy = e.pageY - rmbStartY;
      if (dx * dx + dy * dy > MOVE_TOL * MOVE_TOL) {
        rmbMoved = true;
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      if (e.button !== 2) return;
      // 在 mouseup 時才決定要不要開選單
      if (!rmbMoved) {
        openMenuAt(e.pageX, e.pageY);
      }
      rmbDown = false;
      rmbMoved = false;
    };

    // 完全阻止瀏覽器原生 contextmenu（避免拖動後仍被觸發）
    const onNativeContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    canvasEl.addEventListener('mousedown', onMouseDown);
    canvasEl.addEventListener('mousemove', onMouseMove2);
    canvasEl.addEventListener('mouseup', onMouseUp);
    canvasEl.addEventListener('contextmenu', onNativeContextMenu);

    // 清理
    return () => {
      try {
        canvasEl.removeEventListener('mousemove', onMouseMove);
        canvasEl.removeEventListener('mousemove', onMouseMove2);
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
      treeViewRef.current = null;
    };
  }, [src, infoType]);

  return (
    <>
      {/* 主畫布 */}
      <canvas
        ref={sceneCanvasRef}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />

      {/* NavCube */}
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

      {/* Tree 容器（左側） */}
      <div className="absolute top-23 left-10">
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
      <div
        ref={treeRef}
        className="pt-2 pointer-events-auto h-[75%] overflow-y-auto absolute bg-white/20 text-black top-35 z-[200000] left-10 pl-[10px] font-roboto text-[15px] select-none"
        style={{ width: treeWidth }}
      />

      {/* 簡易資訊 */}
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

      {/* 補 Tree/ContextMenu 必要樣式（從 HTML 摘要而來） */}
    </>
  );
}
