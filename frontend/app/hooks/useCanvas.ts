"use client";

import { create } from "zustand";

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

export const useCanvasStore = create<CanvasState>((set) => ({
  width: 1600,
  height: 900,
  zoom: 5,
  offsetX: 0,
  offsetY: 0,

  setOffset: (x, y) =>
   set({
     offsetX: x,
     offsetY: y,
   }),

  setWidth: (w) => set({ width: w }),
  setHeight: (h) => set({ height: h }),
  setZoom: (z) =>
    set({
      zoom: Math.min(Math.max(z, MIN_ZOOM), MAX_ZOOM),
    }),
  panBy: (dx, dy) =>
    set((s) => ({
      offsetX: s.offsetX + dx,
      offsetY: s.offsetY + dy,
    })),
  resetPan: () => set({ offsetX: 0, offsetY: 0 }),
}));