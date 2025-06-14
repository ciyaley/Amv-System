"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { SonnerMessageDisplayHandler, setGlobalMessageHandler } from "../utils/messageSystem";

export function MessageSystemInitializer() {
  useEffect(() => {
    // Sonner統合のMessageDisplayHandlerを初期化
    const handler = new SonnerMessageDisplayHandler(toast);
    setGlobalMessageHandler(handler);
    
    if (process.env.NODE_ENV === 'development') {
      console.warn('✅ MessageSystem initialized with Sonner integration');
    }
  }, []);

  // このコンポーネントは何もレンダリングしない
  return null;
}