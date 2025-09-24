import { useEffect, useRef } from 'react';
import {
  Viewer,
  WebIFCLoaderPlugin,
  Mesh,
  VBOGeometry,
  buildGridGeometry,
  PhongMaterial,
  NavCubePlugin,
} from '@xeokit/xeokit-sdk';
import * as WebIFC from 'web-ifc';

export default function CameraControlOrbitDuplex() {
  const sceneCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const navCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pivotRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!sceneCanvasRef.current || !navCanvasRef.current) return;

    let destroyed = false;
    let sceneModel: any | undefined;
    let navCube: NavCubePlugin | undefined;
    let lastEntity: any = null;
    let lastColor: number[] | undefined;

    // === 1) 建 Viewer ===
    const viewer = new Viewer({
      canvasElement: sceneCanvasRef.current,
      transparent: true,
    });

    viewer.camera.eye = [-8.23, 10.67, 35.26];
    viewer.camera.look = [4.39, 3.72, 8.89];
    viewer.camera.up = [0.1, 0.97, -0.2];

    const cameraControl = viewer.cameraControl;
    cameraControl.navMode = 'orbit';
    cameraControl.followPointer = true;

    // Pivot 視覺元素
    const pivot = document.createElement('div');
    pivot.style.color = '#ffffff';
    pivot.style.position = 'absolute';
    pivot.style.width = '25px';
    pivot.style.height = '25px';
    pivot.style.borderRadius = '15px';
    pivot.style.border = '2px solid #ebebeb';
    pivot.style.background = 'red';
    pivot.style.visibility = 'hidden';
    pivot.style.boxShadow = '5px 5px 15px 1px #000000';
    pivot.style.zIndex = '10000';
    pivot.style.pointerEvents = 'none';
    document.body.appendChild(pivot);
    pivotRef.current = pivot;
    cameraControl.pivotElement = pivot;

    // === 2) NavCube ===
    navCube = new NavCubePlugin(viewer, {
      canvasElement: navCanvasRef.current!,
      visible: true,
      cameraFly: true,
      cameraFitFOV: 45,
      cameraFlyDuration: 0.5,
    });

    // === 3) 地面格線 ===
    new Mesh(viewer.scene, {
      geometry: new VBOGeometry(
        viewer.scene,
        buildGridGeometry({ size: 300, divisions: 60 })
      ),
      material: new PhongMaterial(viewer.scene, {
        color: [0.0, 0.0, 0.0],
        emissive: [0.4, 0.4, 0.4],
      }),
      position: [0, -1.6, 0],
      collidable: false,
    });

    // === 4) IFC 載入 ===
    (async () => {
      try {
        const IfcAPI = new (WebIFC as any).IfcAPI();
        let wasmBase = `${import.meta.env.BASE_URL}web-ifc/`;
        const ensureWasmReachable = async (base: string) => {
          const url = `${base}web-ifc.wasm`;
          const res = await fetch(url, { method: 'HEAD' });
          if (!res.ok) throw new Error(`WASM not reachable: ${url}`);
        };
        try {
          await ensureWasmReachable(wasmBase);
        } catch {
          wasmBase = 'https://unpkg.com/web-ifc@0.0.62/';
        }
        IfcAPI.SetWasmPath(wasmBase);
        await IfcAPI.Init();
        if (destroyed) return;

        const ifcLoader = new WebIFCLoaderPlugin(viewer, { WebIFC, IfcAPI });
        sceneModel = ifcLoader.load({
          id: 'myIFC',
          src: '/models/Duplex.ifc',
          edges: true,
        });

        sceneModel.on?.('loaded', () => {
          viewer.cameraFlight?.flyTo(sceneModel);
        });
      } catch (err) {
        console.error('IFC load failed:', err);
      }
    })();

    // === 5) Hover 高亮事件 ===
    const onMove = (ev: MouseEvent) => {
      const rect = (ev.target as HTMLCanvasElement).getBoundingClientRect();
      const x = ev.clientX - rect.left;
      const y = ev.clientY - rect.top;

      const pick = viewer.scene.pick({ canvasPos: [x, y], pickSurface: true });
      const entity = pick?.entity;

      // 還原上一次
      if (lastEntity && lastEntity !== entity) {
        lastEntity.colorize = lastColor;
        lastEntity = null;
        lastColor = undefined;
      }

      // 新的 hover
      const ent = pick?.entity as any;
      if (ent && ent.isObject) {
        if (lastEntity !== ent) {
          lastEntity = ent;
          lastColor = ent.colorize;
          ent.colorize = [1, 1, 0]; // 黃色高亮
        }
      }
    };

    sceneCanvasRef.current.addEventListener('mousemove', onMove);

    // === 6) 清理 ===
    return () => {
      destroyed = true;
      try {
        sceneCanvasRef.current?.removeEventListener('mousemove', onMove);
        navCube?.destroy?.();
        sceneModel?.destroy?.();
        viewer?.destroy?.();
      } finally {
        if (pivotRef.current) {
          document.body.removeChild(pivotRef.current);
          pivotRef.current = null;
        }
      }
    };
  }, []);

  return (
    <div className="relative h-full">
      <canvas
        ref={sceneCanvasRef}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
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
    </div>
  );
}
