import type { Viewer } from '@xeokit/xeokit-sdk';

export type DoorWindowInfo = {
  id: string;
  type: 'IfcWindow' | 'IfcDoor';
  name?: string;
  globalId?: string;
  overallWidthMM?: number;
  overallHeightMM?: number;
  aabbDimsMM?: { x: number; y: number; z: number };
};

export function extractDoorWindowInfo(
  viewer: Viewer,
  objectId: string
): DoorWindowInfo | null {
  const meta = (viewer as any).metaScene?.metaObjects?.[objectId];
  const entity = viewer.scene?.objects?.[objectId];
  if (!meta || !entity) return null;

  const type = meta.type || '';
  if (type !== 'IfcWindow' && type !== 'IfcDoor') return null;

  const props = (meta as any).properties || {};
  const allPairs: Array<[string, any]> = Object.entries(props);

  const widthKeys = ['OverallWidth', 'Overall width', 'Width', 'Overall_Width'];
  const heightKeys = [
    'OverallHeight',
    'Overall height',
    'Height',
    'Overall_Height',
  ];

  const findNumberByKeys = (keys: string[]) => {
    for (const k of keys) {
      const hit = allPairs.find(([kk]) => kk.toLowerCase() === k.toLowerCase());
      if (hit) {
        const num = Number(hit[1]);
        if (!isNaN(num) && num > 0) return num;
      }
    }
    return undefined;
  };

  const toMM = (v?: number) =>
    v == null ? undefined : v < 20 ? Math.round(v * 1000) : Math.round(v);
  const overallWidthMM = toMM(findNumberByKeys(widthKeys));
  const overallHeightMM = toMM(findNumberByKeys(heightKeys));

  const aabb = entity.aabb as [number, number, number, number, number, number];
  const dx = Math.abs(aabb[3] - aabb[0]);
  const dy = Math.abs(aabb[4] - aabb[1]);
  const dz = Math.abs(aabb[5] - aabb[2]);

  return {
    id: objectId,
    type,
    name: meta.name,
    globalId: meta?.properties?.GlobalId ?? meta?.properties?.GlobalID,
    overallWidthMM,
    overallHeightMM,
    aabbDimsMM: {
      x: Math.round(dx * 1000),
      y: Math.round(dy * 1000),
      z: Math.round(dz * 1000),
    },
  };
}
