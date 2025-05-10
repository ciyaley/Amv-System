// frontend/app/components/SettingsModal.tsx

"use client";

import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { useModalStore } from "@/app/hooks/useModal";
import { SettingsTabs } from "./SettingsTabs";

export const SettingsModal = () => {
  const isOpen = useModalStore((state) => state.isOpen);
  const closeModal = useModalStore((state) => state.close);

  if (!isOpen) return null;

  return (
    // Dialog がポータル先で fixed inset-0 z-50 を自動で担保します
    <Dialog
      open={isOpen}
      onClose={closeModal}
      className="fixed inset-0 z-50"
    >
      {/* ① 背景オーバーレイ */}
      <DialogBackdrop className="fixed inset-0 bg-black/30" />

      {/* ② 中央配置用コンテナ */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        {/* ③ パネル本体 */}
        <DialogPanel className="w-full max-w-md rounded bg-white p-6 shadow-lg dark:bg-slate-800">
          <DialogTitle className="text-lg font-bold text-center mb-4">
            設定
          </DialogTitle>
          <SettingsTabs />
        </DialogPanel>
      </div>
    </Dialog>
  );
};