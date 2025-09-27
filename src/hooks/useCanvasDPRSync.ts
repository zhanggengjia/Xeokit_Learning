import { useEffect } from 'react';

export function useCanvasDPRSync(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  onAfterResize?: () => void
) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ensureCanvasDPR = (c: HTMLCanvasElement) => {
      const dpr = window.devicePixelRatio || 1;
      const targetW = Math.max(1, Math.round(c.clientWidth * dpr));
      const targetH = Math.max(1, Math.round(c.clientHeight * dpr));
      if (c.width !== targetW || c.height !== targetH) {
        c.width = targetW;
        c.height = targetH;
        onAfterResize?.();
      }
    };

    // 初次同步
    ensureCanvasDPR(canvas);

    const ro = new ResizeObserver(() => ensureCanvasDPR(canvas));
    ro.observe(canvas);

    const onWinResize = () => ensureCanvasDPR(canvas);
    window.addEventListener('resize', onWinResize);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', onWinResize);
    };
  }, [canvasRef, onAfterResize]);
}
