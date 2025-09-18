import { useEffect, useRef } from 'react';
import {
  Viewer, // 核心：建立 3D Viewer（管理 Scene/Camera/Render）
  WebIFCLoaderPlugin, // 載入 IFC 的外掛（內部透過 web-ifc 解析）
  Mesh, // 可手動加一個幾何物件（這裡用來做地面格線）
  VBOGeometry, // 頂點緩衝幾何
  buildGridGeometry, // 產生格線幾何的 helper
  PhongMaterial, // 簡單材質（有環境光/漫反射等）
  NavCubePlugin, // 右下角的方塊導航（切視角用）
} from '@xeokit/xeokit-sdk';
import * as WebIFC from 'web-ifc'; // web-ifc 模組：提供 IfcAPI 與常數（IFC 類型等）

/**
 * CameraControlOrbitDuplex（IFC 版）
 * ------------------------------------------------------------
 * 這個元件做了幾件事：
 * 1) 建立 Viewer，設定初始相機與相機控制（orbit + followPointer）
 * 2) 加入 NavCube（用一顆獨立的 <canvas> 控制大小與位置）
 * 3) 加地面格線（純視覺輔助）
 * 4) 透過 WebIFCLoaderPlugin + web-ifc 載入 IFC 檔
 * 5) 載入完成後，自動飛到模型視角
 *
 * 常見注意事項：
 * - web-ifc 的 WASM 檔要能被瀏覽器讀到（public/web-ifc/web-ifc.wasm）
 * - IFC 路徑必須正確（public/models/xxx.ifc），否則會把 HTML 當檔案讀入造成崩潰
 * - NavCube 的尺寸靠 canvas 本身寬高控制，不是傳 size 參數
 */
export default function CameraControlOrbitDuplex() {
  // 「主場景」用的 <canvas>
  const sceneCanvasRef = useRef<HTMLCanvasElement | null>(null);
  // NavCube 專用 <canvas>
  const navCanvasRef = useRef<HTMLCanvasElement | null>(null);
  // 顯示「相機樞紐點」的小圓點（原範例視覺元素）
  const pivotRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!sceneCanvasRef.current || !navCanvasRef.current) return;

    // 這三個變數供 async 載入與卸載時共用
    let destroyed = false; // 組件是否已卸載（避免卸載後續寫入）
    let sceneModel: any | undefined; // 載入後的模型引用（供清理與飛行）
    let navCube: NavCubePlugin | undefined;

    // === 1) 建 Viewer =======================================================
    const viewer = new Viewer({
      canvasElement: sceneCanvasRef.current, // 指向主 <canvas>，React 用 ref 最穩
      transparent: true, // 與官方範例一致（背景透明）
    });

    // 初始相機（取自官方 CameraControl_orbit 範例）
    viewer.camera.eye = [-8.23, 10.67, 35.26]; // 眼睛位置
    viewer.camera.look = [4.39, 3.72, 8.89]; // 注視點
    viewer.camera.up = [0.1, 0.97, -0.2]; // 上方向（非必要用 [0,1,0] 也可）

    // === 2) 設定相機控制 =====================================================
    const cameraControl = viewer.cameraControl;
    cameraControl.navMode = 'orbit'; // orbit: 以樞紐點為中心繞行
    cameraControl.followPointer = true; // 滑鼠移動時，樞紐點跟隨指標

    // 建立 pivot 視覺元素（原例用一個圓點 div 指示旋轉樞紐）
    const pivot = document.createElement('div');
    pivot.style.color = '#ffffff';
    pivot.style.position = 'absolute';
    pivot.style.width = '25px';
    pivot.style.height = '25px';
    pivot.style.borderRadius = '15px';
    pivot.style.border = '2px solid #ebebeb';
    pivot.style.background = 'red';
    pivot.style.visibility = 'hidden'; // 需要時才顯示
    pivot.style.boxShadow = '5px 5px 15px 1px #000000';
    pivot.style.zIndex = '10000';
    pivot.style.pointerEvents = 'none'; // 不阻擋滑鼠事件
    document.body.appendChild(pivot);
    pivotRef.current = pivot;
    cameraControl.pivotElement = pivot; // 把此元素交給相機控制做顯示位置

    // === 3) NavCube（右下角視角方塊） =======================================
    // 重要：NavCubePlugin 沒有 size/alignment 這類參數；
    // 大小用這顆 canvas 的寬高控制，位置用 CSS 定位。
    navCube = new NavCubePlugin(viewer, {
      canvasElement: navCanvasRef.current!, // 專用 canvas
      visible: true,
      cameraFly: true, // 點方塊面時相機平滑飛行
      cameraFitFOV: 45,
      cameraFlyDuration: 0.5,
      // 還有 fitVisible/synchProjection/color/textColor… 可視需求加
    });

    // === 4) 地面格線（純視覺參考） ==========================================
    // 用 xeokit 的 Mesh + 幾何/材質自己拼一塊大格線
    new Mesh(viewer.scene, {
      geometry: new VBOGeometry(
        viewer.scene,
        buildGridGeometry({ size: 300, divisions: 60 }) // 300×300，分 60 等分
      ),
      material: new PhongMaterial(viewer.scene, {
        color: [0.0, 0.0, 0.0],
        emissive: [0.4, 0.4, 0.4],
      }),
      position: [0, -1.6, 0], // 稍微壓低到模型下方
      collidable: false, // 不參與碰撞
    });

    // === 5) 透過 web-ifc 載入 IFC ===========================================
    (async () => {
      try {
        // 5-1 建 IfcAPI：web-ifc 的核心入口
        const IfcAPI = new (WebIFC as any).IfcAPI();

        // 5-2 設定 WASM 目錄：Vite 需把 wasm 檔放在 public/web-ifc/
        //     並用 BASE_URL 以兼容子路徑部署（/foo/）
        let wasmBase = `${import.meta.env.BASE_URL}web-ifc/`;

        // 5-3 「健檢」：HEAD 一下 wasm 是否能直連（避免被 SPA fallback 成 index.html）
        const ensureWasmReachable = async (base: string) => {
          const url = `${base}web-ifc.wasm`;
          const res = await fetch(url, { method: 'HEAD' });
          if (!res.ok) {
            throw new Error(`WASM not reachable: ${url} (HTTP ${res.status})`);
          }
        };

        try {
          await ensureWasmReachable(wasmBase);
        } catch {
          // 若本地路徑失敗，可「暫時」用 CDN 讓你先跑起來（正式上建議還是放本地）
          wasmBase = 'https://unpkg.com/web-ifc@0.0.62/';
        }

        // 5-4 初始化 web-ifc
        IfcAPI.SetWasmPath(wasmBase);
        await IfcAPI.Init();
        if (destroyed) return;

        // 5-5 建 IFC Loader（傳入 WebIFC 與 IfcAPI）
        const ifcLoader = new WebIFCLoaderPlugin(viewer, { WebIFC, IfcAPI });

        // 5-6 載入 IFC：
        //     - 用 src 直接給 URL（也可先 fetch.arrayBuffer() 改成 data: buf，更穩）
        //     - 初期建議 edges: false，確定通了再開描邊避免額外負載
        sceneModel = ifcLoader.load({
          id: 'myIFC',
          src: '/models/Duplex.ifc', // 你的檔案路徑（放在 public/models/ 下）
          edges: true,
          // excludeTypes: ["IfcSpace"], // 若檔大可先排除空間來加速
        });

        // 5-7 載入完成 → 飛到模型（flyTo 可吃元件或物件 { aabb, eye, look... }）
        sceneModel.on?.('loaded', () => {
          viewer.cameraFlight?.flyTo(sceneModel);
        });
      } catch (err) {
        // 如果看到 MIME/type/HTML/ZIP 等錯誤，多半是路徑或檔案格式問題
        console.error('IFC load failed:', err);
      }
    })();

    // === 6) 清理：React 元件卸載時釋放資源 ================================
    return () => {
      destroyed = true;
      try {
        navCube?.destroy?.(); // 先清 NavCube
        sceneModel?.destroy?.(); // 再清模型
        viewer?.destroy?.(); // 最後清 Viewer（會釋放 GL 資源）
      } finally {
        if (pivotRef.current) {
          document.body.removeChild(pivotRef.current); // 把 pivot 視覺元素移除
          pivotRef.current = null;
        }
      }
    };
  }, []);

  return (
    <div style={{ position: 'relative', height: '100vh' }}>
      {/* 主 3D 場景的 canvas（鋪滿整頁） */}
      <canvas
        ref={sceneCanvasRef}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
      {/* NavCube 專用 canvas（用這顆的寬高控制大小，用 CSS 決定位置） */}
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
