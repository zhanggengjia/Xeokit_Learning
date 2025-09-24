// import LoadXKT2 from './examples/LoadXKT2';
// import ChangeModels from './component-demos/ChangeModels';
// import BCFViewpoint from './component-demos/BCFViewpoint';
// import Highlighting from './component-demos/Highlighting';
// import NavCube from './component-demos/NavCube';
// import Screenshot from './component-demos/Screenshot';
// import ConditionalRender from './component-demos/ConditionalRender';
// import GLTFModel from './component-demos/GLTFModel';
import XKTModel from './component-demos/XKTModel';

export default function App() {
  return (
    // <div className="pt-3 mx-auto max-w-6xl xl:max-w-7xl px-8 h-full block justify-center items-center">
    //   <h1 className="text-3xl">Xeokit Learning</h1>
    //   <LoadXKT2 />
    // </div>

    <div className="container my-5">
      <h1 className="text-center text-light my-5">
        Xeokit-SDK React integration demo
      </h1>
      <div className="card bg-light my-5">
        <div className="card-header">Feature</div>
        <div className="card-body">
          <h4 className="card-title mb-5">GLTF Model</h4>
          {/* <GLTFModel /> */}
        </div>
      </div>
      <div className="card bg-light my-5">
        <div className="card-header">Feature</div>
        <div className="card-body">
          <h4 className="card-title mb-5">XKT Model</h4>
          <XKTModel />
        </div>
      </div>
      <div className="card bg-light my-5">
        <div className="card-header">Feature</div>
        <div className="card-body">
          <h4 className="card-title mb-5">Changing models</h4>
          {/* <ChangeModels /> */}
        </div>
      </div>
      <div className="card bg-light my-5">
        <div className="card-header">Feature</div>
        <div className="card-body">
          <h4 className="card-title mb-5">Load BCF Viewpoint</h4>
          {/* <BCFViewpoint /> */}
        </div>
      </div>
      <div className="card bg-light my-5">
        <div className="card-header">Feature</div>
        <div className="card-body">
          <h4 className="card-title mb-5">Highlight/pick entities</h4>
          {/* <Highlighting /> */}
        </div>
      </div>
      <div className="card bg-light my-5">
        <div className="card-header">Feature</div>
        <div className="card-body">
          <h4 className="card-title mb-5">Camera control with NavCube</h4>
          {/* <NavCube /> */}
        </div>
      </div>
      <div className="card bg-light my-5">
        <div className="card-header">Feature</div>
        <div className="card-body">
          <h4 className="card-title mb-5">Take screenshot of scene</h4>
          {/* <Screenshot /> */}
        </div>
      </div>
      <div className="card bg-light my-5">
        <div className="card-header">Feature</div>
        <div className="card-body">
          <h4 className="card-title mb-5">Open/close viewer</h4>
          {/* <ConditionalRender /> */}
        </div>
      </div>
    </div>
  );
}
