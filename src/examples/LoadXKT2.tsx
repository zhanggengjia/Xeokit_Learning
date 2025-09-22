import { useEffect, useRef } from 'react';

import {
  Viewer, // xeokit核心Viewer
  Mesh,
  VBOGeometry,
  buildGridGeometry,
  PhongMaterial,
  NavCubePlugin,
  SectionPlanesPlugin,
  math,
  XKTLoaderPlugin,
} from '@xeokit/xeokit-sdk';

// 你的React元件
export default function CameraControlOrbitDuplex() {
  // DOM 參考
  const sceneCanvasRef = useRef<HTMLCanvasElement>(null);
  const navCanvasRef = useRef<HTMLCanvasElement>(null);
  const pivotRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!sceneCanvasRef.current || !navCanvasRef.current) return;

    let destroyed = false;
    let sceneModel: any | undefined;
    let navCube: NavCubePlugin | undefined;

    // 同步canvas像素解析度
    const syncCanvasResolution = (canvas: HTMLCanvasElement) => {
      const dpr = window.devicePixelRatio || 1;
      const targetW = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const targetH = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
    };

    // 建Viewer
    const viewer = new Viewer({
      canvasElement: sceneCanvasRef.current!,
      transparent: true,
    });

    syncCanvasResolution(sceneCanvasRef.current);
    syncCanvasResolution(navCanvasRef.current);

    // ResizeObserver同解析度同步
    const roScene = new ResizeObserver(() => {
      if (destroyed || !sceneCanvasRef.current) return;
      syncCanvasResolution(sceneCanvasRef.current);
      viewer.scene.render();
    });
    roScene.observe(sceneCanvasRef.current);

    const roNav = new ResizeObserver(() => {
      if (destroyed || !navCanvasRef.current) return;
      syncCanvasResolution(navCanvasRef.current);
      viewer.scene.render();
    });
    roNav.observe(navCanvasRef.current);

    const onWinResize = () => {
      if (destroyed) return;
      if (sceneCanvasRef.current) syncCanvasResolution(sceneCanvasRef.current);
      if (navCanvasRef.current) syncCanvasResolution(navCanvasRef.current);
      viewer.scene.render();
    };
    window.addEventListener('resize', onWinResize);

    // 相機參數設置
    viewer.camera.eye = [-8.23, 10.67, 35.26];
    viewer.camera.look = [4.39, 3.72, 8.89];
    viewer.camera.up = [0.1, 0.97, -0.2];

    // 相機控制器設定
    const cameraControl = viewer.cameraControl;
    cameraControl.navMode = 'orbit';
    cameraControl.followPointer = true;

    // 建立pivot DOM (小圓點)
    const pivot = document.createElement('div');
    pivot.style.position = 'absolute';
    pivot.style.width = '25px';
    pivot.style.height = '25px';
    pivot.style.borderRadius = '15px';
    pivot.style.border = '2px solid #ebebeb';
    pivot.style.background = 'red';
    pivot.style.visibility = 'hidden';
    pivot.style.pointerEvents = 'none';
    pivot.style.boxShadow = '5px 5px 15px 1px #000000';
    pivot.style.zIndex = '10000';
    document.body.appendChild(pivot);
    pivotRef.current = pivot;
    cameraControl.pivotElement = pivot;

    // NavCube插件
    navCube = new NavCubePlugin(viewer, {
      canvasElement: navCanvasRef.current!,
      visible: true,
      cameraFly: true,
      cameraFitFOV: 45,
      cameraFlyDuration: 0.5,
    });

    // 建地面格線
    new Mesh(viewer.scene, {
      geometry: new VBOGeometry(
        viewer.scene,
        buildGridGeometry({ size: 300, divisions: 60 })
      ),
      material: new PhongMaterial(viewer.scene, {
        color: [0, 0, 0],
        emissive: [0.4, 0.4, 0.4],
      }),
      position: [0, -1.6, 0],
      collidable: false,
    });

    // C) 建立 SectionPlanes
    const sectionPlanes = new SectionPlanesPlugin(viewer);

    // Load XKT
    (async () => {
      try {
        const xktLoader = new XKTLoaderPlugin(viewer);

        sceneModel = xktLoader.load({
          id: 'myModel',
          src: '/models/Duplex_A_20110505.glTFEmbedded.xkt',
          edges: true,
        });

        sceneModel.on?.('loaded', () => {
          (viewer.scene as any).sectionPlanesEnabled = true;

          // 建 cap material（與示例同：重點 backfaces: true）
          const capMat = new PhongMaterial(viewer.scene, {
            diffuse: [1.0, 0.0, 0.0],
            backfaces: true,
          });

          // 逐一套 capMaterial / clippable
          const objs = (sceneModel as any).objects;
          for (const id in objs) {
            if (!Object.hasOwn(objs, id)) continue;
            const entity = objs[id];
            if (!entity) continue;
            (entity as any).capMaterial = capMat; // 保留
            (entity as any).capMaterialId = capMat.id; // 新增這行
            (entity as any).clippable = true;

            // 1) 先確認 setter 有被呼叫：讀取 prototype 的屬性描述
            const desc = Object.getOwnPropertyDescriptor(
              Object.getPrototypeOf(entity),
              'capMaterial'
            );
            console.log('capMaterial descriptor:', desc); // 看看有沒有 set / get

            // 2) 不要讀 entity.capMaterial 了，直接印你手上的 capMat（一定有值）
            console.log('local capMat.diffuse =', capMat.diffuse);

            // 3) 如果有 capMaterialId 這個欄位，同步一下（某些版本需要）
            (entity as any).capMaterialId = capMat.id;
            console.log(
              'entity.capMaterialId after set =',
              (entity as any).capMaterialId
            );
          }

          // 建一個切面 + 控制器
          const sectionPlane = sectionPlanes!.createSectionPlane({
            id: 'mainPlane',
            pos: [0.5, 2.5, 5.0],
            dir: math.normalizeVec3([0, 0, -0.5]),
          });
          sectionPlanes!.showControl(sectionPlane.id);

          console.log(sectionPlanes);

          console.log(
            'planes count =',
            (sectionPlanes as any)._sectionPlanes?.length
          );
          console.log(
            'plane active =',
            (sectionPlanes as any)._sectionPlanes?.mainPlane?.active
          );

          // 為避免邊線蓋住截面填色，先關閉邊線觀察一次
          (viewer.scene as any).edgesEnabled = false;
          (viewer.scene as any).setDirty?.(true);

          viewer.cameraFlight?.flyTo(sceneModel);
          viewer.scene.render();
        });
      } catch (err) {
        console.error('IFC load failed:', err);
      }
    })();

    // 清理
    return () => {
      destroyed = true;
      try {
        window.removeEventListener('resize', onWinResize);
        roScene.disconnect();
        roNav.disconnect();
        navCube?.destroy?.();
        sceneModel?.destroy?.();
        sectionPlanes?.destroy?.();
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
    <>
      {/* 主場景canvas */}
      <canvas
        ref={sceneCanvasRef}
        style={{ width: '100%', height: '80%', display: 'block' }}
      />
      {/* NavCube canvas */}
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
      {/* SectionPlanes overview canvas */}
      <canvas
        id="mySectionPlanesOverviewCanvas"
        width={220}
        height={120}
        style={{
          position: 'absolute',
          right: 10,
          bottom: 10,
          zIndex: 200001,
          pointerEvents: 'auto',
        }}
      />
    </>
  );
}
