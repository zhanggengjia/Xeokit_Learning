import { NavCubePlugin, type Viewer } from '@xeokit/xeokit-sdk';

export function setupNavCube(
  viewer: Viewer,
  canvas: HTMLCanvasElement,
  opts: Partial<ConstructorParameters<typeof NavCubePlugin>[1]> = {}
) {
  const navCube = new NavCubePlugin(viewer, {
    canvasElement: canvas,
    visible: true,
    cameraFly: true,
    cameraFitFOV: 45,
    cameraFlyDuration: 0.5,
    ...opts,
  });
  return () => navCube.destroy?.();
}
