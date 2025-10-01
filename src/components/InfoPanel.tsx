import { FaTimes } from 'react-icons/fa';
import type { DoorWindowInfo } from '../utils/xeokit/extractDoorWindowInfo';

type Props = {
  info: DoorWindowInfo;
  onClose: () => void;
};

export default function InfoPanel({ info, onClose }: Props) {
  return (
    <div
      className="
      absolute top-5 right-5 w-70
      bg-white/60  rounded-xl
      p-4 z-[200010] shadow-lg
      text-sm leading-relaxed text-black
      "
    >
      {/* 關閉 X（圓形） */}
      <button
        onClick={onClose}
        className="btn btn-circle! btn-ghost! absolute top-4 right-4 z-11 size-6! bg-gray-300! hover:bg-gray-50! transition! duration-200!"
        aria-label="Close info panel"
        title="Close"
      >
        <FaTimes />
      </button>

      {/* 標題 */}
      <div className="font-bold mb-2">{info.type.replace(/^Ifc/, '')} Info</div>

      {/* 基本屬性 */}
      <div>
        <span className="font-semibold">ID:</span> {info.id}
      </div>
      {info.globalId && (
        <div>
          <span className="font-semibold">GlobalId:</span> {info.globalId}
        </div>
      )}
      {info.name && (
        <div>
          <span className="font-semibold">Name:</span> {info.name}
        </div>
      )}

      {/* IFC 尺寸 */}
      {(info.overallWidthMM || info.overallHeightMM) && (
        <>
          <hr className="my-2 border-gray-300" />
          <div className="font-semibold mb-1">IFC Size</div>
          {info.overallWidthMM && <div>Width: {info.overallWidthMM} mm</div>}
          {info.overallHeightMM && <div>Height: {info.overallHeightMM} mm</div>}
        </>
      )}

      {/* AABB 尺寸 */}
      {info.aabbDimsMM && (
        <>
          <hr className="my-2 border-gray-300" />
          <div className="font-semibold mb-1">AABB (approx.)</div>
          <div>
            LxWxH ≈ {info.aabbDimsMM.x} × {info.aabbDimsMM.y} ×{' '}
            {info.aabbDimsMM.z} mm
          </div>
        </>
      )}
    </div>
  );
}
