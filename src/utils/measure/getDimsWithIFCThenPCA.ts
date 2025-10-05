// utils/xeokit/measure/getDimsWithIFCThenPCA.ts
import type { DimsResult } from './types';
import { readIFCDimensions } from './readIFCDimensions';
import { measureByPCA } from './pcaOBB';

// 由 async → 同步：回傳 DimsResult | null
export function getDimsWithIFCThenPCA(
  viewer: any,
  entityId: string,
  unitScaleForPCA = 1000
): DimsResult | null {
  // A) 先試 IFC 語義（同步）
  const a = readIFCDimensions(viewer, entityId);
  if (a) return a;

  // B) 退路：PCA（同步）
  const b = measureByPCA(viewer, entityId, unitScaleForPCA);
  console.log(b);
  return b;
}
