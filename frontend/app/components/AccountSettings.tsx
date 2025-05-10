// frontend/app/components/AccountSettings.tsx
"use client";

import { TabGroup, TabList, TabPanels, Tab, TabPanel } from "@headlessui/react";
import { AuthForm } from "./AuthForm";

export const AccountSettings = () => (
  <div role="tabpanel" className="space-y-4">
    <TabGroup>
      <TabList className="flex space-x-2">
        <Tab as="button">ログイン</Tab>
        <Tab as="button">登録</Tab>
      </TabList>
      <TabPanels className="mt-4">
        <TabPanel>
          <AuthForm mode="login" />
        </TabPanel>
        <TabPanel>
          <AuthForm mode="register" />
        </TabPanel>
      </TabPanels>
    </TabGroup>
  </div>
);