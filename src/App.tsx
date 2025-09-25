import { useState } from 'react';
import Navbar from './components/Navbar';
import { pages, ifcModels } from './data';

export default function App() {
  // 目前被選擇的頁籤
  const [compId, setCompId] = useState<number>(0);
  const [modelId, setModelId] = useState<number>(0);

  const srcPath = '/models/' + ifcModels[modelId].name;
  console.log(srcPath);

  return (
    <div className="[scrollbar-gutter:stable] overflow-x-hidden h-full mx-2">
      <Navbar
        items={pages.map((p) => p.label)}
        current={compId}
        onSelect={setCompId}
        modelItems={ifcModels.map((p) => p.label)}
        modelCurrent={modelId}
        selectModel={setModelId}
      />
      <main className="pt-3 mx-auto max-w-6xl xl:max-w-7xl px-8 h-[80%] flex justify-center items-stretch">
        {(() => {
          const Comp = pages[compId].element;
          return <Comp src={srcPath} />;
        })()}
      </main>
    </div>
  );
}
