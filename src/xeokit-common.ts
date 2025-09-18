// src/xeokit-common.ts
import { Viewer } from '@xeokit/xeokit-sdk';

export function makeViewer(canvas: HTMLCanvasElement) {
  const viewer = new Viewer({ canvasElement: canvas });
  viewer.camera.eye = [20, 15, 25];
  viewer.camera.look = [0, 3, 0];
  viewer.camera.up = [0, 1, 0];
  return viewer;
}

export type MetaRow = {
  set: string;
  name: string;
  value: string | number | boolean;
};
