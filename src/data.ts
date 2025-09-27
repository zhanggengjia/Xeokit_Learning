// data.ts
import LoadXKT2 from './examples/LoadXKT2';
import TypeTreeIFC from './examples/TypeTreeIFC';
import TypeTreeIFC2 from './examples/TypeTreeIFC2';
import IFCPick from './examples/IFCPick';
import IFCSelect from './examples/IFCSelect';
import LoadIFC2 from './examples/LoadIFC2';
import XktModelViewer from './examples/XktModelViewer';
import TreeViewStoreys from './examples/TreeViewStoreys';
// import LoadLargeIFC from './examples/LoadLargeIFC';

type pageType = {
  label: string;
  element: React.ComponentType<any>;
  format: 'ifc' | 'xkt';
};

export const pages: pageType[] = [
  // { label: 'LoadLargeIFC', element: LoadLargeIFC },
  { label: 'LoadIFC', element: LoadIFC2, format: 'ifc' },
  { label: 'TypeTreeIFC', element: TypeTreeIFC, format: 'ifc' },
  { label: 'TypeTreeIFC2', element: TypeTreeIFC2, format: 'ifc' },
  { label: 'IFCPick', element: IFCPick, format: 'ifc' },
  { label: 'IFCSelect', element: IFCSelect, format: 'ifc' },
  { label: 'LoadXKT2', element: LoadXKT2, format: 'xkt' },
  { label: 'XktModelViewer', element: XktModelViewer, format: 'xkt' },
  { label: 'TreeViewStoreys', element: TreeViewStoreys, format: 'xkt' },
];

type ifcModel = {
  label: string;
  path: string;
  format: 'ifc' | 'xkt';
};

export const ifcModels: ifcModel[] = [
  { label: 'Duplex_ifc', path: '/models/ifc/Duplex.ifc', format: 'ifc' },
  // { label: 'SampleCastle', name: 'Ifc2x3_SampleCastle.ifc' },
  {
    label: 'OpenHouse_ifc',
    path: '/models/ifc/IfcOpenHouse4.ifc',
    format: 'ifc',
  },
  // { label: 'Rac_Advanced_Sample', name: 'rac_advanced_sample_project.ifc' },
  {
    label: 'Marc_Antoine_Petit_ifc',
    path: '/models/ifc/19_rue_Marc_Antoine_Petit_Ground_floor.ifc',
    format: 'ifc',
  },
  // {
  //   label: 'Duplex',
  //   path: '/models/xkt/v8/ifc/Duplex.ifc.xkt',
  //   format: 'xkt',
  // },
  {
    label: 'Schependomlann',
    path: '/models/xkt/v8/ifc/Schependomlaan.ifc.xkt',
    format: 'xkt',
  },
  {
    label: 'Duplex2',
    path: '/models/xkt/Duplex_A_20110505.glTFEmbedded.xkt',
    format: 'xkt',
  },
  {
    label: 'HolterTower',
    path: '/models/xkt/v8/ifc/HolterTower.ifc.xkt',
    format: 'xkt',
  },
  {
    label: 'Rac_Advanced_Project',
    path: '/models/xkt/v8/ifc/rac_advanced_sample_project.ifc.xkt',
    format: 'xkt',
  },
];
