// import IFCPick from './examples/IFCPick';
// import IFCSelect from './examples/IFCSelect';
import Navbar from './components/Navbar';
import TypeTreeIFC from './examples/TypeTreeIFC';

export default function App() {
  return (
    <>
      <Navbar />
      <div className="pt-3 mx-auto max-w-6xl xl:max-w-7xl px-8 h-[80%] block justify-center items-center">
        {/* <LoadXKT2 /> */}
        {/* <IFCPick /> */}
        {/* <IFCSelect /> */}
        <TypeTreeIFC />
      </div>
    </>
  );
}
