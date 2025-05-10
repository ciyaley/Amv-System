// frontend/app/components/SettingsTabs.tsx
"use client";

import {TabGroup,TabList,Tab,TabPanels,TabPanel,} from "@headlessui/react";
import { AuthForm } from "./AuthForm";

const tabClassNames = (selected: boolean) =>
  `w-full rounded py-2 text-sm font-medium leading-5 transition ${
    selected ? "bg-white text-black" : "text-white hover:bg-white/10"
  }`;

export const SettingsTabs = () => {
  return (
    <TabGroup>
      {/* ① タブボタン群を TabList で包む */}
      <TabList className="flex space-x-2">
        <Tab className={({ selected }) => tabClassNames(selected)}>
          ログイン
        </Tab>
        <Tab className={({ selected }) => tabClassNames(selected)}>
          登録
        </Tab>
      </TabList>

      {/* ② パネル群を TabPanels で包む */}
      <TabPanels className="mt-4">
        <TabPanel>
          <AuthForm mode="login" />
        </TabPanel>
        <TabPanel>
          <AuthForm mode="register" />
        </TabPanel>
      </TabPanels>
    </TabGroup>
  );
};