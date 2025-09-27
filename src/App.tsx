import { useState } from 'react';
import Navbar from './components/Navbar';
import { pages, ifcModels } from './data';

export default function App() {
  // 目前被選擇的頁籤
  const [compId, setCompId] = useState<number>(0);
  const [modelId, setModelId] = useState<number>(0);
  const [modelFormat, setModelFormat] = useState<'ifc' | 'xkt'>('xkt');

  let srcPath = ifcModels[modelId].path;
  const selectModelFormat = ifcModels[modelId].format;
  const selectPageFormat = pages[compId].format;

  if (selectPageFormat !== selectModelFormat && selectPageFormat == 'ifc') {
    srcPath = '/models/ifc/Duplex.ifc';
  }
  if (selectPageFormat !== selectModelFormat && selectPageFormat == 'xkt') {
    srcPath = '/models/xkt/Duplex_A_20110505.glTFEmbedded.xkt';
  }

  return (
    <div className="[scrollbar-gutter:stable] overflow-x-hidden h-full mx-2">
      <Navbar
        items={pages.map((p) => ({ label: p.label, format: p.format }))}
        current={compId}
        onSelect={setCompId}
        modelItems={ifcModels.map((p) => ({
          label: p.label,
          format: p.format,
        }))}
        modelCurrent={modelId}
        selectModel={setModelId}
        modelFormat={modelFormat}
        setModelFormat={setModelFormat}
      />
      <div className="flex justify-end">
        <h4>{srcPath}</h4>
      </div>
      <main className="pt-3 mx-auto max-w-6xl xl:max-w-7xl px-8 h-[80%] flex justify-center items-stretch">
        {(() => {
          const Comp = pages[compId].element;
          return <Comp src={srcPath} />;
        })()}
      </main>
    </div>
  );
}
