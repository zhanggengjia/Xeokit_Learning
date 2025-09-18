// src/examples/TreeViewIFC.tsx
import { useEffect, useRef } from 'react';
import { WebIFCLoaderPlugin, TreeViewPlugin } from '@xeokit/xeokit-sdk';
import { makeViewer } from '../xeokit-common';

export default function TreeViewIFC() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const treeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const viewer = makeViewer(canvasRef.current);

    // 建左側樹狀
    const tree = new TreeViewPlugin(viewer, {
      containerElement: treeRef.current!,
    });

    const ifc = new WebIFCLoaderPlugin(viewer);
    const model = ifc.load({
      id: 'ifcModel',
      src: '/models/Duplex_A_20110907.ifc',
    });

    return () => {
      model?.destroy?.();
      tree?.destroy?.();
      viewer?.destroy?.();
    };
  }, []);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '280px 1fr',
        height: '100vh',
      }}
    >
      <div style={{ overflow: 'auto', borderRight: '1px solid #ddd' }}>
        <div ref={treeRef} />
      </div>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
    </div>
  );
}
