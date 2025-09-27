import type { Viewer } from '@xeokit/xeokit-sdk';

export type CameraOptions = {
  eye?: number[];
  look?: number[];
  up?: number[];
  navMode?: 'orbit' | 'firstPerson' | 'planView';
  followPointer?: boolean;
};

export function setupCamera(viewer: Viewer, opts: CameraOptions = {}) {
  const { eye, look, up, navMode = 'orbit', followPointer = true } = opts;
  if (eye) viewer.camera.eye = eye;
  if (look) viewer.camera.look = look;
  if (up) viewer.camera.up = up;
  viewer.cameraControl.navMode = navMode;
  viewer.cameraControl.followPointer = followPointer;
}
