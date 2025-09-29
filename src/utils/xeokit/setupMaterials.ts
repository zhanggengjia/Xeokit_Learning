import type { Viewer } from '@xeokit/xeokit-sdk';

/**
 * 設定 Viewer 的 highlight 與 selected 材質
 */
export function setupHighlightAndSelectMaterials(viewer: Viewer) {
  // Highlight 材質
  viewer.scene.highlightMaterial.fill = true;
  viewer.scene.highlightMaterial.edges = true;
  viewer.scene.highlightMaterial.fillAlpha = 0.1;
  viewer.scene.highlightMaterial.edgeAlpha = 0.1;
  viewer.scene.highlightMaterial.edgeColor = [1, 1, 0];

  // Selected 材質
  viewer.scene.selectedMaterial.fill = true;
  viewer.scene.selectedMaterial.edges = true;
  viewer.scene.selectedMaterial.fillAlpha = 0.5;
  viewer.scene.selectedMaterial.edgeAlpha = 0.6;
  viewer.scene.selectedMaterial.edgeColor = [0, 1, 1];
}
