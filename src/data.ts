// data.ts
import LoadXKT2 from './examples/LoadXKT2';
import TypeTreeIFC from './examples/TypeTreeIFC';
import TypeTreeIFC2 from './examples/TypeTreeIFC2';
import IFCPick from './examples/IFCPick';
import IFCSelect from './examples/IFCSelect';
import LoadIFC2 from './examples/LoadIFC2';
import LoadLargeIFC from './examples/LoadLargeIFC';

export const pages = [
  { label: 'LoadIFC', element: LoadIFC2 },
  // { label: 'LoadXKT2', element: LoadXKT2 },
  { label: 'TypeTreeIFC', element: TypeTreeIFC },
  { label: 'TypeTreeIFC2', element: TypeTreeIFC2 },
  { label: 'IFCPick', element: IFCPick },
  { label: 'IFCSelect', element: IFCSelect },
  { label: 'LoadLargeIFC', element: LoadLargeIFC },
];

export const ifcModels = [
  { label: 'Duplex', name: 'Duplex.ifc' },
  // { label: 'SampleCastle', name: 'Ifc2x3_SampleCastle.ifc' },
  { label: 'OpenHouse', name: 'IfcOpenHouse4.ifc' },
  // { label: 'Rac_Advanced_Sample', name: 'rac_advanced_sample_project.ifc' },
  {
    label: 'Marc_Antoine_Petit',
    name: '19_rue_Marc_Antoine_Petit_Ground_floor.ifc',
  },
];
