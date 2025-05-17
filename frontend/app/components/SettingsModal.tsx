// frontend/app/components/SettingsModal.tsx
"use client";

import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import { useModalStore } from "@/app/hooks/useModal";
import { SettingsSidebar } from "./SettingsSidebar";
import { GeneralSettings }    from "./GeneralSettings";
import { AppearanceSettings } from "./AppearanceSettings";
import { AccountSettings }    from "./AccountSettings";
import { useSettingsStore }   from "@/app/hooks/useSettings";

export const SettingsModal = () => {
  const isOpen = useModalStore((s) => s.isOpen);
  const close  = useModalStore((s) => s.close);
  const tab    = useSettingsStore((s) => s.activeTab);

  if (!isOpen) return null;
  return (
    <Dialog open={isOpen} onClose={close} className="fixed inset-0 z-50">
      <DialogBackdrop className="fixed inset-0 bg-black/30" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="flex w-full max-w-4xl rounded bg-white dark:bg-slate-800 shadow-lg overflow-hidden">
          <SettingsSidebar />
          <div className="flex-grow p-6 overflow-y-auto text-black dark:text-white">
            {tab === "general"    && <GeneralSettings />}
            {tab === "appearance" && <AppearanceSettings />}
            {tab === "account"    && <AccountSettings />}
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
};