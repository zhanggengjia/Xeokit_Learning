// utils/xeokit/measure/pcaOBB.ts
import { EigenvalueDecomposition, Matrix } from 'ml-matrix';

export type DimsResult = {
  width: number;
  height: number;
  thickness?: number;
  source: 'pca';
};

export function measureByPCA(
  viewer: any,
  entityId: string,
  unitScale = 1000
): DimsResult | null {
  const entity =
    viewer?.scene?.objects?.[entityId] ??
    viewer?.scene?.entities?.[entityId] ??
    null;
  if (!entity) return null;

  const pts = collectWorldPositions(viewer, entity);
  if (!pts?.length) return null;

  // 1️⃣ 算均值
  const n = pts.length / 3;
  let mx = 0,
    my = 0,
    mz = 0;
  for (let i = 0; i < pts.length; i += 3) {
    mx += pts[i];
    my += pts[i + 1];
    mz += pts[i + 2];
  }
  mx /= n;
  my /= n;
  mz /= n;

  // 2️⃣ 算協方差矩陣
  let cxx = 0,
    cxy = 0,
    cxz = 0,
    cyy = 0,
    cyz = 0,
    czz = 0;
  for (let i = 0; i < pts.length; i += 3) {
    const x = pts[i] - mx,
      y = pts[i + 1] - my,
      z = pts[i + 2] - mz;
    cxx += x * x;
    cxy += x * y;
    cxz += x * z;
    cyy += y * y;
    cyz += y * z;
    czz += z * z;
  }
  const inv = 1 / Math.max(1, n - 1);
  const cov = new Matrix([
    [cxx * inv, cxy * inv, cxz * inv],
    [cxy * inv, cyy * inv, cyz * inv],
    [cxz * inv, cyz * inv, czz * inv],
  ]);

  // 3️⃣ Eigen decomposition
  const eig = new EigenvalueDecomposition(cov);
  const V = eig.eigenvectorMatrix;
  const λ = eig.realEigenvalues;
  const order = [0, 1, 2].sort((i, j) => λ[j] - λ[i]); // 降冪排序
  const axes = order.map((i) => V.getColumn(i));
  const mean = [mx, my, mz];

  // 4️⃣ 投影求範圍
  const mins = [Infinity, Infinity, Infinity],
    maxs = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < pts.length; i += 3) {
    const dx = pts[i] - mx,
      dy = pts[i + 1] - my,
      dz = pts[i + 2] - mz;
    for (let k = 0; k < 3; k++) {
      const a = axes[k];
      const t = dx * a[0] + dy * a[1] + dz * a[2];
      if (t < mins[k]) mins[k] = t;
      if (t > maxs[k]) maxs[k] = t;
    }
  }
  const extents = [maxs[0] - mins[0], maxs[1] - mins[1], maxs[2] - mins[2]];
  const sorted = [...extents].sort((a, b) => b - a);

  return {
    width: sorted[1] * unitScale,
    height: sorted[0] * unitScale,
    thickness: sorted[2] * unitScale,
    source: 'pca',
  };
}

// ⚙️ 幾何收集：跟之前一樣，只要一份
function collectWorldPositions(viewer: any, entity: any): Float32Array {
  const out: number[] = [];
  const pushMesh = (mesh: any) => {
    if (!mesh) return;
    const pos = mesh.geometry?.positions ?? mesh.positions;
    const mat = mesh.worldMatrix ?? mesh.matrixWorld;
    if (!pos || !mat || mat.length < 12) return;
    const m =
      mat.length === 16
        ? mat
        : [
            mat[0],
            mat[1],
            mat[2],
            0,
            mat[3],
            mat[4],
            mat[5],
            0,
            mat[6],
            mat[7],
            mat[8],
            0,
            mat[9],
            mat[10],
            mat[11],
            1,
          ];
    for (let i = 0; i < pos.length; i += 3) {
      const x = pos[i],
        y = pos[i + 1],
        z = pos[i + 2];
      const X = m[0] * x + m[4] * y + m[8] * z + m[12];
      const Y = m[1] * x + m[5] * y + m[9] * z + m[13];
      const Z = m[2] * x + m[6] * y + m[10] * z + m[14];
      out.push(X, Y, Z);
    }
  };
  const walk = (n: any) => {
    if (!n) return;
    if (n.mesh) pushMesh(n.mesh);
    if (Array.isArray(n.meshes)) n.meshes.forEach(pushMesh);
    if (Array.isArray(n.children)) n.children.forEach(walk);
    if (!n.mesh && n.geometry && n.worldMatrix) pushMesh(n);
  };
  walk(entity);
  return new Float32Array(out);
}
