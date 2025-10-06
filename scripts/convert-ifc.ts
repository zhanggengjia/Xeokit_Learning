// scripts/convert-ifc.ts
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

// ====== 可調參數 ======
const IN_DIR = path.resolve('ifc');
// 與 data.ts 一致：/models/xkt/xxx.ifc.xkt
const OUT_DIR = path.resolve('public/models/xkt');
const MANIFEST_PATH = path.resolve('scripts/.ifc2xkt-manifest.json');
const DATA_TS_PATH = path.resolve('src/data.ts');

// CLI 切換：--no-append 關閉寫入 data.ts；--sidecar 要求 .json 側檔存在（預設不要求）
const APPEND_TO_DATA_TS = !process.argv.includes('--no-append');
const REQUIRE_SIDECAR_JSON = process.argv.includes('--sidecar');

// ====== 型別 ======
type Manifest = {
  files: Record<
    string,
    {
      size: number;
      mtimeMs: number;
      outXKT: string;
      outMeta: string; // 可能不存在，保留欄位作為記錄
      convertedAt: string;
    }
  >;
};

// ====== 工具 ======
function loadManifest(): Manifest {
  try {
    return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')) as Manifest;
  } catch {
    return { files: {} };
  }
}

function saveManifest(m: Manifest) {
  fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(m, null, 2), 'utf8');
  console.log(`[manifest] saved -> ${MANIFEST_PATH}`);
}

function statInfo(absPath: string) {
  const st = fs.statSync(absPath);
  return { size: st.size, mtimeMs: st.mtimeMs };
}

function needsConvert(absIfcPath: string, manifest: Manifest) {
  const cur = statInfo(absIfcPath);
  const prev = manifest.files[absIfcPath];
  if (!prev) return true; // 沒轉過
  if (prev.size !== cur.size || prev.mtimeMs !== cur.mtimeMs) return true; // 檔案改過

  const outBase = path.basename(absIfcPath).replace(/\.ifc$/i, '.ifc.xkt');
  const xkt = path.join(OUT_DIR, outBase);
  const meta = xkt + '.json';
  if (!fs.existsSync(xkt)) return true;
  if (REQUIRE_SIDECAR_JSON && !fs.existsSync(meta)) return true;
  return false;
}

// 以 npx 呼叫（跨平台最穩定），加 -l 顯示日誌；使用完整字串＋引號避免 Windows shell 解析問題
function convertOne(absIfcPath: string) {
  const outName = path.basename(absIfcPath).replace(/\.ifc$/i, '.ifc.xkt');
  const outXKT = path.join(OUT_DIR, outName);

  console.log('Converting:', absIfcPath);
  const cmd = `npx -y @xeokit/xeokit-convert -l -s "${absIfcPath}" -o "${outXKT}"`;
  const r = spawnSync(cmd, {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: true,
  });

  if (r.error) throw new Error(`[spawn.error] ${r.error.message}`);
  if (r.status !== 0)
    throw new Error(
      `[spawn.status] ${r.status} (signal: ${r.signal ?? 'none'})`
    );

  const xktExists = fs.existsSync(outXKT);
  const metaSidecar = outXKT + '.json';
  const metaExists = fs.existsSync(metaSidecar);

  if (!xktExists) {
    const ls = fs.readdirSync(OUT_DIR);
    throw new Error(
      `XKT not found (expected: ${outXKT})\nOUT_DIR contains:\n- ${ls.join(
        '\n- '
      )}`
    );
  }
  if (REQUIRE_SIDECAR_JSON && !metaExists) {
    throw new Error(
      `Sidecar JSON not found (expected: ${metaSidecar}) — remove --sidecar if you don't need it.`
    );
  }

  return { outXKT, outMeta: metaSidecar };
}

// === 允許 const/let + 可選型別註記 的 ifcModels 陣列匹配 ===
// export const ifcModels = [
// export let ifcModels: ifcModel[] = [
const IFC_MODELS_REGEX =
  /(export\s+(?:const|let)\s+ifcModels\s*(?::[^=]+)?=\s*\[)([\s\S]*?)(\];)/m;

function appendToDataTs(label: string, relPath: string) {
  if (!fs.existsSync(DATA_TS_PATH)) {
    console.warn('[data.ts] 檔案不存在，略過自動追加：', DATA_TS_PATH);
    return;
  }
  let code = fs.readFileSync(DATA_TS_PATH, 'utf8');

  const m = code.match(IFC_MODELS_REGEX);
  if (!m) {
    console.warn(
      '[data.ts] 找不到 ifcModels 陣列，略過（請確認 data.ts 內容與變數名稱）'
    );
    return;
  }

  const before = m[1],
    body = m[2],
    after = m[3];
  const trimmed = body.trim();
  const comma = trimmed.endsWith(',') || trimmed.length === 0 ? '' : ',';
  const insert = `${comma}\n  { label: '${label}', path: '${relPath}', format: 'xkt' }`;

  const newCode = code.replace(
    IFC_MODELS_REGEX,
    `${before}${body}${insert}\n${after}`
  );
  fs.writeFileSync(DATA_TS_PATH, newCode, 'utf8');
  console.log(
    `[data.ts] appended -> { label: '${label}', path: '${relPath}', format: 'xkt' }`
  );
}

// ====== 主程式 ======
function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(IN_DIR, { recursive: true });

  const manifest = loadManifest();

  const ifcFiles = fs
    .readdirSync(IN_DIR)
    .filter((f) => f.toLowerCase().endsWith('.ifc'))
    .map((f) => path.join(IN_DIR, f));

  if (ifcFiles.length === 0) {
    console.log('ifc/ 內沒有 IFC 檔。');
    return;
  }

  const targets = ifcFiles.filter((p) => needsConvert(p, manifest));
  if (targets.length === 0) {
    console.log('沒有新或變更的 IFC，無需轉換。');
    return;
  }

  let ok = 0,
    fail = 0;
  for (const absIfcPath of targets) {
    try {
      const { outXKT, outMeta } = convertOne(absIfcPath);
      const { size, mtimeMs } = statInfo(absIfcPath);

      manifest.files[absIfcPath] = {
        size,
        mtimeMs,
        outXKT,
        outMeta,
        convertedAt: new Date().toISOString(),
      };

      if (APPEND_TO_DATA_TS) {
        // 與你的 data.ts 慣例一致：/models/xkt/xxx.ifc.xkt
        const publicRel = '/models/xkt/' + path.basename(outXKT);
        const label = path.basename(outXKT).replace(/\.ifc\.xkt$/i, '');
        appendToDataTs(label, publicRel);
      }

      ok++;
    } catch (e: any) {
      console.error('[ERROR]', e?.message || e);
      fail++;
    }
  }

  saveManifest(manifest);
  console.log(`完成：成功 ${ok}，失敗 ${fail}。`);
}

main();
