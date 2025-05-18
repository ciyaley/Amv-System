// frontend/app/hooks/useLocalFile.ts
"use client";

import { useCallback } from "react";
import { saveEncrypted, loadEncrypted } from "../../utils/fileAccess";

export const useLocalFile = () => {
  const saveMemos   = useCallback((memoState: any) => saveEncrypted("memo", memoState), []);
  const saveLayout  = useCallback((layoutState: any) => saveEncrypted("layout", layoutState), []);
  const loadMemos   = useCallback(<T>() => loadEncrypted<T>("memo"), []);
  const loadLayout  = useCallback(<T>() => loadEncrypted<T>("layout"), []);

  return { saveMemos, saveLayout, loadMemos, loadLayout };
};