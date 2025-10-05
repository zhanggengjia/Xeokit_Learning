// utils/xeokit/measure/types.ts
export type DimsResult = {
  width: number; // 單位：毫米 (mm)
  height: number; // 單位：毫米 (mm)
  thickness?: number; // 選填。若能估出就填
  source: 'ifc' | 'pca'; // 來源：語義 or 幾何
};
