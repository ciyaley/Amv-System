// frontend/app/hooks/useCanvasStore.ts
"use client";

import { create } from "zustand";
import { saveEncrypted, loadEncrypted } from "../../utils/fileAccess";

const MIN_ZOOM = 1.2;
const MAX_ZOOM = 5;

interface CanvasState {
  width: number;
  height: number;
  zoom: number;
  offsetX: number;
  offsetY: number;
  setOffset: (x: number, y: number) => void;
  setWidth: (w: number) => void;
  setHeight: (h: number) => void;
  setZoom: (z: number) => void;
  panBy: (dx: number, dy: number) => void;
  resetPan: () => void;
}

export const useCanvasStore = create<CanvasState>((set, get) => {
  // 起動時に前回レイアウトを復元
  (async () => {
    try {
      const loaded = await loadEncrypted<{
        width: number;
        height: number;
        zoom: number;
        offsetX: number;
        offsetY: number;
      }>("layout");
      if (loaded) {
        set({
          width: loaded.width,
          height: loaded.height,
          zoom: loaded.zoom,
          offsetX: loaded.offsetX,
          offsetY: loaded.offsetY,
        });
      }
    } catch (e) {
      console.error("layout load error", e);
    }
  })();

  return {
    width: 1600,
    height: 900,
    zoom: 5,
    offsetX: 0,
    offsetY: 0,

    setOffset: (x, y) => {
      set({ offsetX: x, offsetY: y });
      saveEncrypted("layout", {
        width: get().width,
        height: get().height,
        zoom: get().zoom,
        offsetX: x,
        offsetY: y,
      }).catch(console.error);
    },

    setWidth: (w) => {
      set({ width: w });
      saveEncrypted("layout", {
        width: w,
        height: get().height,
        zoom: get().zoom,
        offsetX: get().offsetX,
        offsetY: get().offsetY,
      }).catch(console.error);
    },

    setHeight: (h) => {
      set({ height: h });
      saveEncrypted("layout", {
        width: get().width,
        height: h,
        zoom: get().zoom,
        offsetX: get().offsetX,
        offsetY: get().offsetY,
      }).catch(console.error);
    },

    setZoom: (z) => {
      const clamped = Math.min(Math.max(z, MIN_ZOOM), MAX_ZOOM);
      set({ zoom: clamped });
      saveEncrypted("layout", {
        width: get().width,
        height: get().height,
        zoom: clamped,
        offsetX: get().offsetX,
        offsetY: get().offsetY,
      }).catch(console.error);
    },

    panBy: (dx, dy) => {
      set((s) => ({ offsetX: s.offsetX + dx, offsetY: s.offsetY + dy }));
      const { width, height, zoom, offsetX, offsetY } = get();
      saveEncrypted("layout", { width, height, zoom, offsetX, offsetY }).catch(console.error);
    },

    resetPan: () => {
      set({ offsetX: 0, offsetY: 0 });
      saveEncrypted("layout", {
        width: get().width,
        height: get().height,
        zoom: get().zoom,
        offsetX: 0,
        offsetY: 0,
      }).catch(console.error);
    },
  };
});