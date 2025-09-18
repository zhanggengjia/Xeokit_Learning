// src/examples/MetaIFC.tsx
import { useEffect, useRef, useState } from 'react';
import { WebIFCLoaderPlugin } from '@xeokit/xeokit-sdk';
import { makeViewer, MetaRow } from '../xeokit-common';

export default function MetaIFC() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [rows, setRows] = useState<MetaRow[]>([]);
  const [header, setHeader] = useState<{
    id?: string;
    name?: string;
    type?: string;
  }>({});

  useEffect(() => {
    if (!canvasRef.current) return;

    const viewer = makeViewer(canvasRef.current);
    const ifc = new WebIFCLoaderPlugin(viewer);
    const model = ifc.load({
      id: 'ifcModel',
      src: '/models/Duplex_A_20110907.ifc',
    });

    // 滑鼠點擊拾取
    const onClick = (ev: MouseEvent) => {
      const rect = (ev.target as HTMLCanvasElement).getBoundingClientRect();
      const x = ev.clientX - rect.left;
      const y = ev.clientY - rect.top;

      const pick = viewer.scene.pick({ canvasPos: [x, y], pickSurface: true });
      if (!pick) return;

      const entity = pick.entity;
      const objId = entity.id;

      // 透過 MetaScene 取得 MetaObject（含 propertySets）
      const metaObj = (viewer as any).metaScene?.metaObjects?.[objId];
      if (!metaObj) {
        setHeader({ id: objId });
        setRows([]);
        return;
      }

      setHeader({ id: String(objId), name: metaObj.name, type: metaObj.type });

      // 展開所有 Pset → 屬性
      const next: MetaRow[] = [];
      (metaObj.propertySets || []).forEach((ps: any) => {
        // PropertySet#name 與其 properties 鍵值
        const setName = ps.name || ps.id || 'Pset';
        const props = ps.properties || ps._properties || {}; // 版本差異做防呆
        Object.entries(props).forEach(([k, v]) => {
          next.push({
            set: setName,
            name: k,
            value:
              typeof v === 'object' && v?.value !== undefined
                ? v.value
                : (v as any),
          });
        });
      });
      setRows(next);
    };

    canvasRef.current.addEventListener('click', onClick);

    return () => {
      canvasRef.current?.removeEventListener('click', onClick);
      model?.destroy?.();
      viewer?.destroy?.();
    };
  }, []);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 420px',
        height: '100vh',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
      <div
        style={{ borderLeft: '1px solid #ddd', padding: 16, overflow: 'auto' }}
      >
        <h3 style={{ marginTop: 0 }}>選取元素屬性</h3>
        <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>
          {header.id && <>ID: {header.id} · </>}
          {header.type && <>Type: {header.type} · </>}
          {header.name && <>Name: {header.name}</>}
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Property Set</th>
              <th style={{ textAlign: 'left' }}>Name</th>
              <th style={{ textAlign: 'left' }}>Value</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td style={{ paddingRight: 8 }}>{r.set}</td>
                <td style={{ paddingRight: 8 }}>{r.name}</td>
                <td>{String(r.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && (
          <div style={{ marginTop: 8, color: '#888' }}>
            點模型任何地方以查看屬性
          </div>
        )}
      </div>
    </div>
  );
}
