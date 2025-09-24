import React, { useEffect, useRef, useState } from 'react';
import { Viewer, WebIFCLoaderPlugin } from '@xeokit/xeokit-sdk';
import * as WebIFC from 'web-ifc';

/** 定義樹節點 */
interface TreeNode {
  value: string;
  isDir: boolean;
  objectId?: string;
  children?: TreeNode[];
}

type Props = {
  src?: string; // IFC 路徑
  treeHeight?: number;
};

const TypeTreeCustom: React.FC<Props> = ({
  src = '/models/Duplex.ifc',
  treeHeight = 500,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewerRef = useRef<Viewer | null>(null);

  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // 建立 Viewer + 載入 IFC
  useEffect(() => {
    if (!canvasRef.current) return;

    let destroyed = false;
    const viewer = new Viewer({
      canvasElement: canvasRef.current,
      transparent: true,
    });
    viewer.cameraControl.navMode = 'orbit';
    viewerRef.current = viewer;

    (async () => {
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

      const ifcLoader = new WebIFCLoaderPlugin(viewer, { WebIFC, IfcAPI });
      const model = ifcLoader.load({ id: 'Model_1', src, edges: true });

      model.on('loaded', () => {
        if (destroyed) return;

        // 取出 MetaScene 的 objectsByType
        const metaScene: any = viewer.metaScene;
        const typeTree: TreeNode[] = [];

        Object.values(metaScene.metaObjects).forEach((mo: any) => {
          if (!mo.type) return;

          // 找該 type 群組
          let typeNode = typeTree.find((t) => t.value === mo.type);
          if (!typeNode) {
            typeNode = { value: mo.type, isDir: true, children: [] };
            typeTree.push(typeNode);
          }

          // 加入 instance
          typeNode.children!.push({
            value: mo.name || mo.id,
            isDir: false,
            objectId: mo.id,
          });
        });

        setTreeData(typeTree);
        viewer.cameraFlight.flyTo(model);
      });
    })();

    return () => {
      destroyed = true;
      try {
        viewer.destroy();
      } catch {}
    };
  }, [src]);

  /** 點擊項目 → 高亮或顯示隱藏 */
  const onClickNode = (node: TreeNode) => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    if (!node.isDir && node.objectId) {
      // 1) 高亮
      viewer.scene.setObjectsHighlighted([node.objectId], true);

      // 2) 讓相機飛到該物件
      const obj = (viewer.scene as any).objects?.[node.objectId]; // 有些版本提供 objects 映射
      if (obj) {
        viewer.cameraFlight.flyTo(obj); // ✅ 直接給 Component
      } else {
        // 後備方案：用 AABB
        const aabb = (viewer.scene as any).getAABB
          ? (viewer.scene as any).getAABB(node.objectId)
          : null;
        if (aabb) {
          viewer.cameraFlight.flyTo({ aabb }); // ✅ 傳參數物件
        }
      }
    }
  };

  /** 展開/收合目錄 */
  const toggleExpand = (value: string) => {
    setExpanded((prev) => ({ ...prev, [value]: !prev[value] }));
  };

  /** 遞迴渲染樹 */
  const renderTree = (nodes: TreeNode[]) => (
    <div className="ml-4">
      {nodes.map((node) => (
        <div key={node.value}>
          {node.isDir ? (
            <div>
              <div
                className="flex items-center cursor-pointer py-0.5"
                onClick={() => toggleExpand(node.value)}
              >
                <span className="mr-2">
                  {expanded[node.value] ? '📂' : '📁'}
                </span>
                <span className="font-semibold">{node.value}</span>
              </div>
              {expanded[node.value] && node.children && (
                <div className="ml-4">{renderTree(node.children)}</div>
              )}
            </div>
          ) : (
            <div
              className="flex items-center cursor-pointer py-0.5 hover:bg-gray-100 rounded"
              onClick={() => onClickNode(node)}
            >
              <span className="mr-2">📄</span>
              <span>{node.value}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* 左側：自訂 Tree */}
      <div
        className="border rounded p-2 overflow-auto bg-white"
        style={{ height: treeHeight }}
      >
        <h2 className="font-bold mb-2">Types Tree</h2>
        {renderTree(treeData)}
      </div>

      {/* 右側：Viewer */}
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: treeHeight,
          border: '1px solid #ccc',
          borderRadius: 4,
        }}
      />
    </div>
  );
};

export default TypeTreeCustom;
