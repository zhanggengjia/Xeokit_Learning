import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Viewer, WebIFCLoaderPlugin } from '@xeokit/xeokit-sdk';
import * as WebIFC from 'web-ifc';

/** 樹節點資料結構 */
interface TreeNode {
  key: string; // 節點唯一鍵（type 或 objectId）
  label: string; // 顯示名稱
  isDir: boolean; // 目錄節點 = true；葉節點(實例) = false
  objectIds: string[]; // 該節點涵蓋的 objectIds（目錄=聚合，葉=單一）
  children?: TreeNode[]; // 子節點
}

type Props = {
  /** IFC 檔案路徑 */
  src?: string;
  /** web-ifc.wasm 的可存取目錄（結尾保留斜線），預設用 /web-ifc/，抓不到時自動退 CDN */
  wasmBase?: string;
  /** 左側樹高度 */
  treeHeight?: number;
};

const TypeTreeWithChecks: React.FC<Props> = ({
  src = '/models/Duplex.ifc',
  wasmBase,
  treeHeight = 520,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewerRef = useRef<Viewer | null>(null);

  /** 整棵樹（Types → Instances） */
  const [tree, setTree] = useState<TreeNode[]>([]);
  /** 展開狀態 */
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  /**
   * 勾選狀態：key -> boolean
   * - 對葉節點儲存 true/false
   * - 目錄節點不直接儲存，由子節點狀態即時計算（並呈現 indeterminate）
   * - 初始預設全勾（在樹建立完成後設定）
   */
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  /** 便捷：把所有節點拍平成 map，方便查找 */
  const flatMap = useMemo(() => {
    const map = new Map<string, TreeNode>();
    const walk = (nodes: TreeNode[]) => {
      for (const n of nodes) {
        map.set(n.key, n);
        if (n.children?.length) walk(n.children);
      }
    };
    walk(tree);
    return map;
  }, [tree]);

  /** 建立 Viewer + 載入 IFC + 轉樹 */
  useEffect(() => {
    if (!canvasRef.current) return;

    let destroyed = false;

    const viewer = new Viewer({
      canvasElement: canvasRef.current,
      transparent: true,
    });
    viewer.cameraControl.navMode = 'orbit';
    viewer.cameraControl.followPointer = true;
    viewerRef.current = viewer;

    (async () => {
      // IfcAPI 準備 + WASM 路徑
      const IfcAPI = new WebIFC.IfcAPI();

      // 優先用指定/預設的本地路徑，抓不到就退 CDN
      const baseLocal =
        wasmBase ?? `${import.meta.env.BASE_URL ?? '/'}web-ifc/`;
      const ensureWasmReachable = async (base: string) => {
        const url = `${base}web-ifc.wasm`;
        const r = await fetch(url, { method: 'HEAD' });
        if (!r.ok) throw new Error(`WASM not reachable: ${url}`);
      };
      let finalBase = baseLocal;
      try {
        await ensureWasmReachable(finalBase);
      } catch {
        finalBase = 'https://unpkg.com/web-ifc@0.0.62/';
      }
      IfcAPI.SetWasmPath(finalBase);
      await IfcAPI.Init();
      if (destroyed) return;

      // 載 IFC
      const ifcLoader = new WebIFCLoaderPlugin(viewer, { WebIFC, IfcAPI });
      const model = ifcLoader.load({ id: 'IFC_Model_1', src, edges: true });

      model.on('loaded', () => {
        if (destroyed) return;

        const metaScene: any = viewer.metaScene;
        // 建 types -> instances 的樹
        const typeDict = new Map<string, TreeNode>();
        const instanceNodes: TreeNode[] = [];

        Object.values(metaScene.metaObjects).forEach((mo: any) => {
          if (!mo.type || !mo.id) return;
          // type 節點
          let typeNode = typeDict.get(mo.type);
          if (!typeNode) {
            typeNode = {
              key: `type:${mo.type}`,
              label: mo.type,
              isDir: true,
              objectIds: [], // 聚合 children 的 ids
              children: [],
            };
            typeDict.set(mo.type, typeNode);
          }
          // 實例葉節點
          const leaf: TreeNode = {
            key: `obj:${mo.id}`,
            label: mo.name || mo.id,
            isDir: false,
            objectIds: [mo.id],
          };
          typeNode.children!.push(leaf);
          typeNode.objectIds.push(mo.id);
          instanceNodes.push(leaf);
        });

        const builtTree = [...typeDict.values()].sort((a, b) =>
          a.label.localeCompare(b.label)
        );
        setTree(builtTree);

        // 預設：全部展開 type（可自行調整）
        const exp: Record<string, boolean> = {};
        for (const t of builtTree) exp[t.key] = true;
        setExpanded(exp);

        // 預設：所有葉節點都勾選（= 全部可見）
        const initChecked: Record<string, boolean> = {};
        for (const leaf of instanceNodes) initChecked[leaf.key] = true;
        setChecked(initChecked);

        // 確保全可見
        viewer.scene.setObjectsVisible(
          instanceNodes.map((n) => n.objectIds[0]),
          true
        );
        viewer.cameraFlight.flyTo(model);
      });
    })().catch((e) => console.error('[Tree init error]', e));

    return () => {
      destroyed = true;
      try {
        viewer.destroy();
      } catch {}
    };
  }, [src, wasmBase]);

  /** 計算節點勾選狀態：checked / unchecked / indeterminate */
  const getNodeState = (
    node: TreeNode
  ): 'checked' | 'unchecked' | 'indeterminate' => {
    if (!node.isDir) {
      return checked[node.key] ? 'checked' : 'unchecked';
    }
    if (!node.children || node.children.length === 0) return 'unchecked';
    let hasChecked = false;
    let hasUnchecked = false;
    for (const c of node.children) {
      const s = getNodeState(c);
      if (s === 'indeterminate') return 'indeterminate';
      if (s === 'checked') hasChecked = true;
      if (s === 'unchecked') hasUnchecked = true;
      if (hasChecked && hasUnchecked) return 'indeterminate';
    }
    if (hasChecked && !hasUnchecked) return 'checked';
    if (!hasChecked && hasUnchecked) return 'unchecked';
    return 'unchecked';
  };

  /** 批次設定某節點（及其子孫）的勾選狀態 */
  const setSubtreeChecked = (
    node: TreeNode,
    value: boolean,
    next = { ...checked }
  ) => {
    if (!node.isDir) {
      next[node.key] = value;
    } else if (node.children?.length) {
      for (const c of node.children) setSubtreeChecked(c, value, next);
    }
    return next;
  };

  /** 把某節點（聚合的 objectIds）設定可見性 */
  const applyVisibilityForNode = (node: TreeNode, visible: boolean) => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    if (node.objectIds.length > 0) {
      viewer.scene.setObjectsVisible(node.objectIds, visible);
    }
  };

  /** 當使用者在 checkbox 勾/取消 */
  const onToggleCheck = (node: TreeNode, value: boolean) => {
    // 1) 更新勾選狀態（葉節點或整個子樹）
    let next = { ...checked };
    next = setSubtreeChecked(node, value, next);
    setChecked(next);

    // 2) 套用可見性
    applyVisibilityForNode(node, value);
  };

  /** 展開/收合 */
  const toggleExpand = (key: string) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  /** 點擊葉節點文字 → 高亮 + 飛到該物件 */
  const onClickLeafLabel = (node: TreeNode) => {
    if (node.isDir) return;
    const viewer = viewerRef.current;
    if (!viewer) return;
    const id = node.objectIds[0];
    viewer.scene.setObjectsHighlighted([id], true);

    // 嘗試抓 component；不行就用 AABB
    const obj = (viewer.scene as any).objects?.[id];
    if (obj) {
      viewer.cameraFlight.flyTo(obj);
    } else {
      const aabb = (viewer.scene as any).getAABB
        ? (viewer.scene as any).getAABB(id)
        : null;
      if (aabb) viewer.cameraFlight.flyTo({ aabb });
    }
  };

  /** Checkbox 元件（支援 indeterminate） */
  const TriCheckbox: React.FC<{
    state: 'checked' | 'unchecked' | 'indeterminate';
    onChange: (val: boolean) => void;
  }> = ({ state, onChange }) => {
    const ref = useRef<HTMLInputElement | null>(null);
    useEffect(() => {
      if (ref.current) {
        ref.current.indeterminate = state === 'indeterminate';
      }
    }, [state]);
    return (
      <input
        ref={ref}
        type="checkbox"
        className="mr-2 h-4 w-4 accent-blue-600"
        checked={state === 'checked'}
        onChange={(e) => onChange(e.target.checked)}
      />
    );
  };

  /** 遞迴渲染樹 */
  const renderNodes = (nodes: TreeNode[]) => (
    <div className="ml-2">
      {nodes.map((node) => {
        const state = getNodeState(node);
        return (
          <div key={node.key} className="py-0.5">
            {node.isDir ? (
              <div>
                <div className="flex items-center">
                  <button
                    className="mr-1 text-sm px-1 rounded hover:bg-gray-100"
                    onClick={() => toggleExpand(node.key)}
                    title={expanded[node.key] ? '收合' : '展開'}
                  >
                    {expanded[node.key] ? '▾' : '▸'}
                  </button>
                  <TriCheckbox
                    state={state}
                    onChange={(val) => onToggleCheck(node, val)}
                  />
                  <span className="font-semibold select-none">
                    {node.label}
                  </span>
                </div>
                {expanded[node.key] && node.children?.length ? (
                  <div className="ml-5">{renderNodes(node.children)}</div>
                ) : null}
              </div>
            ) : (
              <div className="flex items-center pl-6 hover:bg-gray-50 rounded">
                <TriCheckbox
                  state={state}
                  onChange={(val) => onToggleCheck(node, val)}
                />
                <button
                  className="text-left select-none"
                  onClick={() => onClickLeafLabel(node)}
                  title="高亮並飛到該物件"
                >
                  {node.label}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* 左：樹 */}
      <div
        className="border rounded p-2 overflow-auto bg-white"
        style={{ height: treeHeight }}
      >
        <div className="mb-2 font-bold">Types（可見性勾選）</div>
        {tree.length ? (
          renderNodes(tree)
        ) : (
          <div className="text-sm text-gray-500">載入中…</div>
        )}
      </div>

      {/* 右：Viewer */}
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: treeHeight,
          border: '1px solid #e5e7eb',
          borderRadius: 6,
          background: 'transparent',
        }}
      />
    </div>
  );
};

export default TypeTreeWithChecks;
