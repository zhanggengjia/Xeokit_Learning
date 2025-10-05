// utils/xeokit/measure/readIFCDimensions.ts
import type { DimsResult } from './types';

function mm(val: number | undefined | null, scale = 1000) {
  // IFC/幾何有時是公尺 (m)，這裡預設轉 mm。若你的管線本來就是 mm，scale 改為 1
  return typeof val === 'number' ? val * scale : undefined;
}

// 嘗試從多種可能的位置取寬高：OverallWidth/OverallHeight、ProfileDef、Opening 等
export function readIFCDimensions(
  viewer: any,
  entityId: string
): DimsResult | null {
  // 1) 嘗試從 meta 物件找到 Ifc 類型與屬性集合
  const metaRoot =
    (viewer.metaModel ?? viewer.metaScene ?? {}).metaObjects || {};
  const metaObj = metaRoot[entityId];
  if (!metaObj) return null;

  const type = metaObj.type || metaObj.ifcType || '';
  const props = metaObj.properties || metaObj.props || {}; // 兼容不同轉檔器欄位命名

  // 2) 常見：IfcDoor / IfcWindow 的 OverallWidth / OverallHeight
  const ow = mm(props.OverallWidth ?? props['OverallWidth']);
  const oh = mm(props.OverallHeight ?? props['OverallHeight']);

  if (ow && oh) {
    return { width: ow, height: oh, source: 'ifc' };
  }

  // 3) 有些模型把尺寸放在 Type 或 Pset
  const psets = props.Psets || props.psets || {};
  const fromPsets = (() => {
    // 常見嘗試：Pset_DoorCommon / Pset_WindowCommon / 自定義 Pset
    const candidates = Object.values(psets) as any[];
    for (const p of candidates) {
      const _ow = mm(p.OverallWidth ?? p['OverallWidth']);
      const _oh = mm(p.OverallHeight ?? p['OverallHeight']);
      if (_ow && _oh)
        return { width: _ow, height: _oh, source: 'ifc' } as DimsResult;
    }
    return null;
  })();
  if (fromPsets) return fromPsets;

  // 4) 若幾何是由矩形截面 SweptSolid 而來：IfcRectangleProfileDef 的 XDim/YDim
  const profile = props.Profile || props.profile || props.ProfileDef || {};
  const xdim = mm(profile.XDim ?? profile['XDim']);
  const ydim = mm(profile.YDim ?? profile['YDim']);
  if (xdim && ydim) {
    // 哪條是 width/height 取決於局部座標，但對門窗通常都能對得上
    return { width: xdim, height: ydim, source: 'ifc' };
  }

  // 5) IfcOpeningElement（牆洞）有時會提供開口長寬高，可作淨開口參考
  if (type === 'IfcOpeningElement') {
    const w = mm(props.Width ?? props['Width']);
    const h = mm(props.Height ?? props['Height']);
    if (w && h) return { width: w, height: h, source: 'ifc' };
  }

  // 6) 都沒有 → 語義拿不到
  return null;
}
