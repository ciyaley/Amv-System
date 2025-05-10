// frontend/app/components/SettingsSidebar.tsx
"use client";

import { SettingsTab, useSettingsStore } from "../hooks/useSettings";
import { useId } from "react";

const TABS: { id: SettingsTab; label: string }[] = [
  { id: "general",    label: "一般設定"    },
  { id: "appearance", label: "外観設定"    },
  { id: "account",    label: "アカウント管理" },
];

export const SettingsSidebar = () => {
  const activeTab = useSettingsStore((s) => s.activeTab);
  const setTab    = useSettingsStore((s) => s.setTab);
  const baseId   = useId(); // for aria

  return (
    <nav
      aria-label="設定メニュー"
      className="w-1/2 max-w-xs bg-slate-700 text-white flex-shrink-0"
    >
      <ul role="tablist" className="space-y-1 p-4">
        {TABS.map(({ id, label }) => {
          const selected = id === activeTab;
          return (
            <li key={id}>
              <button
                role="tab"
                id={`${baseId}-${id}`}
                aria-selected={selected}
                aria-controls={`${baseId}-panel-${id}`}
                onClick={() => setTab(id)}
                className={`w-full text-left px-3 py-2 rounded transition
                  ${selected ? "bg-slate-500 font-bold" : "hover:bg-slate-600"}`}
              >
                {label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};