import type { Viewer } from '@xeokit/xeokit-sdk';

export function setupPivot(viewer: Viewer) {
  const pivot = document.createElement('div');
  Object.assign(pivot.style, {
    position: 'absolute',
    width: '25px',
    height: '25px',
    borderRadius: '15px',
    border: '2px solid #ebebeb',
    background: 'red',
    visibility: 'hidden',
    pointerEvents: 'none',
    boxShadow: '5px 5px 15px 1px #000000',
    zIndex: '10000',
  } as CSSStyleDeclaration);
  document.body.appendChild(pivot);
  (viewer.cameraControl as any).pivotElement = pivot;

  return () => {
    try {
      document.body.removeChild(pivot);
    } catch {}
  };
}
