// frontend/app/hooks/useLocalFile.ts
"use client";

import { useCallback } from "react";
import { saveEncrypted, loadEncrypted } from "@/utils/fileAccess";

export const useLocalFile = () => {
  const saveMemos   = useCallback((memoState: unknown) => saveEncrypted("memo", memoState), []);
  const saveLayout  = useCallback((layoutState: unknown) => saveEncrypted("layout", layoutState), []);
  const loadMemos   = useCallback(<T>() => loadEncrypted<T>("memo"), []);
  const loadLayout  = useCallback(<T>() => loadEncrypted<T>("layout"), []);

  return { saveMemos, saveLayout, loadMemos, loadLayout };
};