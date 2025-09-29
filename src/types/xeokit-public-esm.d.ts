declare module '*xeokit-sdk.min.es.js' {
  // 只宣告你會用到的東西即可
  export class Viewer {
    constructor(options: any);
    scene: any;
    camera: any;
    cameraControl: any;
    destroy(): void;
  }
}
