import { ContextMenu, TreeViewPlugin } from '@xeokit/xeokit-sdk';

export type MenuCtxDeps = {
  treeView?: TreeViewPlugin | null;
  showInfoFor: (id: string) => void;
  clearInfo: () => void;
  getCanvasPos?: (x: number, y: number) => [number, number];
};

export type MenuBuilder = (deps: MenuCtxDeps) => ContextMenu;

// 預設 Tree 選單
export const createDefaultTreeMenu: MenuBuilder = ({
  showInfoFor,
  clearInfo,
}) => {
  return new ContextMenu({
    items: [
      [
        {
          title: 'View Fit',
          doAction: (ctx: any) => {
            const scene = ctx.viewer.scene;
            const objectIds: string[] = [];
            ctx.treeViewPlugin.withNodeTree(ctx.treeViewNode, (node: any) => {
              if (node.objectId) objectIds.push(node.objectId);
            });
            scene.setObjectsVisible(objectIds, true);
            scene.setObjectsHighlighted(objectIds, true);
            ctx.viewer.cameraFlight.flyTo(
              {
                projection: 'perspective',
                aabb: scene.getAABB(objectIds),
                duration: 0.5,
              },
              () =>
                setTimeout(
                  () =>
                    scene.setObjectsHighlighted(
                      scene.highlightedObjectIds,
                      false
                    ),
                  500
                )
            );
          },
        },
        {
          title: 'View Fit All',
          doAction: (ctx: any) =>
            ctx.viewer.cameraFlight.flyTo({
              projection: 'perspective',
              aabb: ctx.viewer.scene.getAABB(),
              duration: 0.5,
            }),
        },
      ],
      [
        {
          title: 'Hide',
          doAction: (ctx: any) =>
            ctx.treeViewPlugin.withNodeTree(ctx.treeViewNode, (n: any) => {
              if (!n.objectId) return;
              const e = ctx.viewer.scene.objects[n.objectId];
              if (e) e.visible = false;
            }),
        },
        // Second way for hidding
        // {
        //   title: 'Hide2',
        //   doAction: (ctx: any) => {
        //     const scene = ctx.viewer.scene;
        //     const objectIds: string[] = [];
        //     ctx.treeViewPlugin.withNodeTree(ctx.treeViewNode, (n: any) => {
        //       if (!n.objectId) return;
        //       objectIds.push(n.objectId);
        //     });
        //     scene.setObjectsVisible(objectIds, false);
        //   },
        // },
        {
          title: 'Hide Others',
          doAction: (ctx: any) => {
            const s = ctx.viewer.scene;
            s.setObjectsVisible(s.visibleObjectIds, false);
            s.setObjectsXRayed(s.xrayedObjectIds, false);
            s.setObjectsSelected(s.selectedObjectIds, false);
            s.setObjectsHighlighted(s.highlightedObjectIds, false);
            ctx.treeViewPlugin.withNodeTree(ctx.treeViewNode, (n: any) => {
              if (!n.objectId) return;
              const e = s.objects[n.objectId];
              if (e) e.visible = true;
            });
          },
        },
        {
          title: 'Hide All',
          getEnabled: (ctx: any) =>
            ctx.viewer.scene.visibleObjectIds.length > 0,
          doAction: (ctx: any) =>
            ctx.viewer.scene.setObjectsVisible(
              ctx.viewer.scene.visibleObjectIds,
              false
            ),
        },
      ],
      [
        {
          title: 'Show',
          doAction: (ctx: any) =>
            ctx.treeViewPlugin.withNodeTree(ctx.treeViewNode, (n: any) => {
              if (!n.objectId) return;
              const e = ctx.viewer.scene.objects[n.objectId];
              if (e) {
                e.visible = true;
                e.xrayed = false;
                e.selected = false;
              }
            }),
        },
        {
          title: 'Show Others',
          doAction: (ctx: any) => {
            const s = ctx.viewer.scene;
            s.setObjectsVisible(s.objectIds, true);
            s.setObjectsXRayed(s.xrayedObjectIds, false);
            s.setObjectsSelected(s.selectedObjectIds, false);
            ctx.treeViewPlugin.withNodeTree(ctx.treeViewNode, (n: any) => {
              if (!n.objectId) return;
              const e = s.objects[n.objectId];
              if (e) e.visible = false;
            });
          },
        },
        {
          title: 'Show All',
          getEnabled: (ctx: any) =>
            ctx.viewer.scene.numVisibleObjects < ctx.viewer.scene.numObjects,
          doAction: (ctx: any) => {
            const s = ctx.viewer.scene;
            s.setObjectsVisible(s.objectIds, true);
            s.setObjectsXRayed(s.xrayedObjectIds, false);
            s.setObjectsSelected(s.selectedObjectIds, false);
          },
        },
      ],
      [
        {
          title: 'X-Ray',
          doAction: (ctx: any) =>
            ctx.treeViewPlugin.withNodeTree(ctx.treeViewNode, (n: any) => {
              if (!n.objectId) return;
              const e = ctx.viewer.scene.objects[n.objectId];
              if (e) {
                e.xrayed = true;
                e.visible = true;
              }
            }),
        },
        {
          title: 'Undo X-Ray',
          doAction: (ctx: any) =>
            ctx.treeViewPlugin.withNodeTree(ctx.treeViewNode, (n: any) => {
              if (!n.objectId) return;
              const e = ctx.viewer.scene.objects[n.objectId];
              if (e) e.xrayed = false;
            }),
        },
        {
          title: 'X-Ray Others',
          doAction: (ctx: any) => {
            const s = ctx.viewer.scene;
            s.setObjectsVisible(s.objectIds, true);
            s.setObjectsXRayed(s.objectIds, true);
            s.setObjectsSelected(s.selectedObjectIds, false);
            s.setObjectsHighlighted(s.highlightedObjectIds, false);
            ctx.treeViewPlugin.withNodeTree(ctx.treeViewNode, (n: any) => {
              if (!n.objectId) return;
              const e = s.objects[n.objectId];
              if (e) e.xrayed = false;
            });
          },
        },
        {
          title: 'Reset X-Ray',
          getEnabled: (ctx: any) => ctx.viewer.scene.numXRayedObjects > 0,
          doAction: (ctx: any) =>
            ctx.viewer.scene.setObjectsXRayed(
              ctx.viewer.scene.xrayedObjectIds,
              false
            ),
        },
      ],
      [
        {
          title: 'Select',
          doAction: (ctx: any) => {
            ctx.treeViewPlugin.withNodeTree(ctx.treeViewNode, (n: any) => {
              if (!n.objectId) return;
              const e = ctx.viewer.scene.objects[n.objectId];
              if (e) {
                e.selected = true;
                e.visible = true;
                showInfoFor(n.objectId);
              }
            });
          },
        },
        {
          title: 'Deselect',
          doAction: (ctx: any) => {
            ctx.treeViewPlugin.withNodeTree(ctx.treeViewNode, (n: any) => {
              if (!n.objectId) return;
              const e = ctx.viewer.scene.objects[n.objectId];
              if (e) {
                e.selected = false;
              }
            });
            clearInfo();
          },
        },
        {
          title: 'Clear Selection',
          getEnabled: (ctx: any) => ctx.viewer.scene.numSelectedObjects > 0,
          doAction: (ctx: any) => {
            ctx.viewer.scene.setObjectsSelected(
              ctx.viewer.scene.selectedObjectIds,
              false
            );
            clearInfo();
          },
        },
      ],
    ],
  });
};

// 預設 Canvas 選單
export const createDefaultCanvasMenu: MenuBuilder = () =>
  new ContextMenu({
    items: [
      [
        {
          title: 'Hide All',
          getEnabled: (ctx: any) => ctx.viewer.scene.numVisibleObjects > 0,
          doAction: (ctx: any) =>
            ctx.viewer.scene.setObjectsVisible(
              ctx.viewer.scene.visibleObjectIds,
              false
            ),
        },
        {
          title: 'Show All',
          getEnabled: (ctx: any) =>
            ctx.viewer.scene.numVisibleObjects < ctx.viewer.scene.numObjects,
          doAction: (ctx: any) => {
            const s = ctx.viewer.scene;
            s.setObjectsVisible(s.objectIds, true);
            s.setObjectsXRayed(s.xrayedObjectIds, false);
            s.setObjectsSelected(s.selectedObjectIds, false);
          },
        },
      ],
      [
        {
          title: 'View Fit All',
          doAction: (ctx: any) =>
            ctx.viewer.cameraFlight.flyTo({ aabb: ctx.viewer.scene.getAABB() }),
        },
      ],
    ],
  });

// 預設 Object 選單
export const createDefaultObjectMenu: MenuBuilder = ({
  showInfoFor,
  clearInfo,
}) =>
  new ContextMenu({
    items: [
      [
        {
          title: 'View Fit',
          doAction: (ctx: any) => {
            const { viewer, entity } = ctx;
            const scene = viewer.scene;
            viewer.cameraFlight.flyTo(
              { aabb: entity.aabb, duration: 0.5 },
              () =>
                setTimeout(
                  () =>
                    scene.setObjectsHighlighted(
                      scene.highlightedObjectIds,
                      false
                    ),
                  500
                )
            );
          },
        },
        {
          title: 'View Fit All',
          doAction: (ctx: any) =>
            ctx.viewer.cameraFlight.flyTo({
              projection: 'perspective',
              aabb: ctx.viewer.scene.getAABB(),
              duration: 0.5,
            }),
        },
        {
          title: 'Show in Tree',
          doAction: (ctx: any) => ctx.treeViewPlugin.showNode(ctx.entity.id),
        },
      ],
      [
        {
          title: 'Hide',
          getEnabled: (ctx: any) => ctx.entity.visible,
          doAction: (ctx: any) => (ctx.entity.visible = false),
        },
        {
          title: 'Hide Others',
          doAction: (ctx: any) => {
            const { viewer, entity } = ctx;
            const s = viewer.scene;
            const mo = viewer.metaScene.metaObjects[entity.id];
            if (!mo) return;
            s.setObjectsVisible(s.visibleObjectIds, false);
            s.setObjectsXRayed(s.xrayedObjectIds, false);
            s.setObjectsSelected(s.selectedObjectIds, false);
            s.setObjectsHighlighted(s.highlightedObjectIds, false);
            mo.withMetaObjectsInSubtree((m: any) => {
              const e = s.objects[m.id];
              if (e) e.visible = true;
            });
          },
        },
        {
          title: 'Hide All',
          getEnabled: (ctx: any) => ctx.viewer.scene.numVisibleObjects > 0,
          doAction: (ctx: any) =>
            ctx.viewer.scene.setObjectsVisible(
              ctx.viewer.scene.visibleObjectIds,
              false
            ),
        },
        {
          title: 'Show All',
          getEnabled: (ctx: any) =>
            ctx.viewer.scene.numVisibleObjects < ctx.viewer.scene.numObjects,
          doAction: (ctx: any) =>
            ctx.viewer.scene.setObjectsVisible(
              ctx.viewer.scene.objectIds,
              true
            ),
        },
      ],
      [
        {
          title: 'X-Ray',
          getEnabled: (ctx: any) => !ctx.entity.xrayed,
          doAction: (ctx: any) => (ctx.entity.xrayed = true),
        },
        {
          title: 'Undo X-Ray',
          getEnabled: (ctx: any) => ctx.entity.xrayed,
          doAction: (ctx: any) => (ctx.entity.xrayed = false),
        },
        {
          title: 'X-Ray Others',
          doAction: (ctx: any) => {
            const { viewer, entity } = ctx;
            const s = viewer.scene;
            const mo = viewer.metaScene.metaObjects[entity.id];
            if (!mo) return;
            s.setObjectsVisible(s.objectIds, true);
            s.setObjectsXRayed(s.objectIds, true);
            s.setObjectsSelected(s.selectedObjectIds, false);
            s.setObjectsHighlighted(s.highlightedObjectIds, false);
            mo.withMetaObjectsInSubtree((m: any) => {
              const e = s.objects[m.id];
              if (e) e.xrayed = false;
            });
          },
        },
        {
          title: 'Reset X-Ray',
          getEnabled: (ctx: any) => ctx.viewer.scene.numXRayedObjects > 0,
          doAction: (ctx: any) =>
            ctx.viewer.scene.setObjectsXRayed(
              ctx.viewer.scene.xrayedObjectIds,
              false
            ),
        },
      ],
      [
        {
          title: 'Select',
          getEnabled: (ctx: any) => !ctx.entity.selected,
          doAction: (ctx: any) => {
            ctx.entity.selected = true;
            showInfoFor(ctx.entity.id);
          },
        },
        {
          title: 'Undo select',
          getEnabled: (ctx: any) => ctx.entity.selected,
          doAction: (ctx: any) => {
            ctx.entity.selected = false;
            clearInfo();
          },
        },
        {
          title: 'Clear Selection',
          getEnabled: (ctx: any) => ctx.viewer.scene.numSelectedObjects > 0,
          doAction: (ctx: any) => {
            ctx.viewer.scene.setObjectsSelected(
              ctx.viewer.scene.selectedObjectIds,
              false
            );
            clearInfo();
          },
        },
      ],
    ],
  });
