import { useState } from 'react';
import Navbar from './components/Navbar';

import LoadXKT2 from './examples/LoadXKT2';
import TypeTreeIFC from './examples/TypeTreeIFC';
import TypeTreeIFC2 from './examples/TypeTreeIFC2';
import IFCPick from './examples/IFCPick';
import IFCSelect from './examples/IFCSelect';
import LoadIFC2 from './examples/LoadIFC2';

export default function App() {
  // 目前被選擇的頁籤
  const [compId, setCompId] = useState<number>(0);

  // 導覽列項目 + 對應的頁面
  const pages = [
    { label: 'LoadIFC', element: <LoadIFC2 /> },
    { label: 'LoadXKT2', element: <LoadXKT2 /> },
    { label: 'TypeTreeIFC', element: <TypeTreeIFC /> },
    { label: 'TypeTreeIFC2', element: <TypeTreeIFC2 /> },
    { label: 'IFCPick', element: <IFCPick /> },
    { label: 'IFCSelect', element: <IFCSelect /> },
  ];

  return (
    <>
      <Navbar
        items={pages.map((p) => p.label)}
        current={compId}
        onSelect={setCompId}
      />
      <main className="pt-3 mx-auto max-w-6xl xl:max-w-7xl px-8 h-[80%] flex justify-center items-stretch">
        {pages[compId].element}
      </main>
    </>
  );
}
