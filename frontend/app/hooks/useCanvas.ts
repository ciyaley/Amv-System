"use client";

import { create } from "zustand";
import { saveEncrypted, loadEncrypted } from "../../utils/fileAccess";

const MIN_ZOOM = 1.2;
const MAX_ZOOM = 5;

export interface LayoutState {
  width: number;
  height: number;
  zoom: number;
  offsetX: number;
  offsetY: number;
}

interface CanvasState extends LayoutState {
  setLayout: (l: LayoutState) => void;
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
      const data = await loadEncrypted<LayoutState>("layout");
      if (data) set({ ...data });
    } catch (e) {
      console.error("layout load error", e);
    }
  })();

  const persist = () => {
    const { width, height, zoom, offsetX, offsetY } = get();
    saveEncrypted("layout", { width, height, zoom, offsetX, offsetY }).catch(console.error);
  };

  return {
    // デフォルト値
    width: 1600,
    height: 900,
    zoom: 5,
    offsetX: 0,
    offsetY: 0,

    setLayout: (l) => {
      set({ ...l });
      persist();
    },

    setOffset: (x, y) => {
      set({ offsetX: x, offsetY: y });
      persist();
    },

    setWidth: (w) => {
      set({ width: w });
      persist();
    },

    setHeight: (h) => {
      set({ height: h });
      persist();
    },

    setZoom: (z) => {
      const clamped = Math.min(Math.max(z, MIN_ZOOM), MAX_ZOOM);
      set({ zoom: clamped });
      persist();
    },

    panBy: (dx, dy) => {
      set((s) => ({ offsetX: s.offsetX + dx, offsetY: s.offsetY + dy }));
      persist();
    },

    resetPan: () => {
      set({ offsetX: 0, offsetY: 0 });
      persist();
    },
  };
});