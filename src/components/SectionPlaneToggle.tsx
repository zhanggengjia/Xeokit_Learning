import {
  useEffect,
  useRef,
  useState,
  useCallback,
  type RefObject,
} from 'react';
import type { CSSProperties } from 'react';
import { SectionPlanesPlugin, PhongMaterial, Viewer } from '@xeokit/xeokit-sdk';

export type SectionPlaneToggleProps = {
  /** 你現有的 viewerRef（必填） */
  viewerRef: RefObject<Viewer | null>;
  /** 如果有保留 sceneModelRef，就傳進來（用來套 capMaterial 與 clippable） */
  sceneModelRef?: RefObject<any | null>;
  /** resetKey 變動時會自動關閉截面（例如傳 src） */
  resetKey?: any;
  /** 初始是否開啟 */
  defaultOn?: boolean;
  /** 主要平面的參數 */
  plane?: {
    id?: string;
    pos?: [number, number, number];
    dir?: [number, number, number];
    showControl?: boolean;
  };
  /** cap 填色（RGB，0–1） */
  capColor?: [number, number, number];
  /** 自訂按鈕樣式 / className */
  style?: CSSProperties;
  className?: string;
  /** 受控模式（可選）：外部傳入 on/off 與變更通知 */
  value?: boolean;
  onChange?: (next: boolean) => void;
  /** 自訂按鈕文字（可選） */
  labels?: { on: string; off: string };
};

export default function SectionPlaneToggle({
  viewerRef,
  sceneModelRef,
  resetKey,
  defaultOn = false,
  plane,
  capColor = [0.9, 0.2, 0.2],
  style,
  className,
  value,
  onChange,
  labels = { on: 'Disable Section', off: 'Enable Section' },
}: SectionPlaneToggleProps) {
  const sectionRef = useRef<SectionPlanesPlugin | null>(null);
  const [internalOn, setInternalOn] = useState(defaultOn);
  const isControlled = typeof value === 'boolean';
  const sectionOn = isControlled ? (value as boolean) : internalOn;

  const setOn = useCallback(
    (next: boolean) => {
      if (isControlled) {
        onChange?.(next);
      } else {
        setInternalOn(next);
      }
    },
    [isControlled, onChange]
  );

  const applyCapsToAll = useCallback(() => {
    const viewer = viewerRef.current;
    const sm = sceneModelRef?.current;
    if (!viewer || !sm) return;

    const capMat = new PhongMaterial(viewer.scene, {
      diffuse: capColor,
      backfaces: true,
    });

    const objs = (sm as any).objects || {};
    for (const id in objs) {
      const e = objs[id];
      if (!e) continue;
      e.capMaterial = capMat;
      e.clippable = true;
    }
  }, [viewerRef, sceneModelRef, capColor]);

  // 依 sectionOn 建立/清理 plugin
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    if (sectionOn) {
      if (!sectionRef.current) {
        sectionRef.current = new SectionPlanesPlugin(viewer);
      }
      (viewer.scene as any).sectionPlanesEnabled = true;

      const id = plane?.id ?? 'mainPlane';
      const pos = plane?.pos ?? [0, 0, 0];
      const dir = plane?.dir ?? [1, 0, 0];

      // 先清一次，避免重複堆平面
      try {
        sectionRef.current.clear?.();
      } catch {}

      sectionRef.current.createSectionPlane({ id, pos, dir });
      if (plane?.showControl !== false) {
        (sectionRef.current as any).showControl?.(id);
      }

      // 若有模型，套 cap
      applyCapsToAll();

      viewer.scene.render();

      // 清理當前平面（切換 off 或重建時會跑）
      return () => {
        try {
          sectionRef.current?.clear?.();
        } catch {}
      };
    } else {
      try {
        sectionRef.current?.clear?.();
      } catch {}
      try {
        sectionRef.current?.destroy?.();
      } catch {}
      sectionRef.current = null;

      const viewer = viewerRef.current;
      if (viewer) {
        (viewer.scene as any).sectionPlanesEnabled = false;
        viewer.scene.render();
      }
    }
  }, [
    sectionOn,
    viewerRef,
    applyCapsToAll,
    plane?.id,
    plane?.pos,
    plane?.dir,
    plane?.showControl,
  ]);

  // resetKey（例如 src）變動時，強制關閉
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    if (sectionRef.current) {
      try {
        sectionRef.current.clear?.();
      } catch {}
      try {
        sectionRef.current.destroy?.();
      } catch {}
      sectionRef.current = null;
    }
    (viewer.scene as any).sectionPlanesEnabled = false;
    viewer.scene.render();

    setOn(false);
  }, [resetKey]);

  return (
    <button
      onClick={() => setOn(!sectionOn)}
      className={className}
      style={{
        position: 'absolute',
        top: 90,
        left: 12,
        padding: '8px 12px',
        borderRadius: 8,
        border: '1px solid #ddd',
        background: '#fff',
        cursor: 'pointer',
        zIndex: 200001,
        ...style,
      }}
    >
      {sectionOn ? labels.on : labels.off}
    </button>
  );
}
