// utils/messageSystem/display-handlers.ts - メッセージ表示ハンドラー

import { StandardMessage } from './message-templates';
import { logMessage } from './message-utils';

// メッセージ表示用のインターフェース
export interface MessageDisplayHandler {
  show: (message: StandardMessage) => void;
  showWithActions: (message: StandardMessage, actions: StandardMessage['actions']) => void;
  dismiss: (messageId: string) => void;
  clear: () => void;
}

// Sonner統合のためのMessageDisplayHandler実装
export class SonnerMessageDisplayHandler implements MessageDisplayHandler {
  private toastFunction: any;
  private activeToasts = new Map<string, any>();

  constructor(toastFunction: any) {
    this.toastFunction = toastFunction;
  }

  show(message: StandardMessage): void {
    let toastId: any;
    
    switch (message.type) {
      case 'success':
        toastId = this.toastFunction.success(message.message, {
          duration: message.duration
        });
        break;
      case 'error':
        toastId = this.toastFunction.error(message.message, {
          duration: message.duration
        });
        break;
      case 'warning':
        toastId = this.toastFunction.warning(message.message, {
          duration: message.duration
        });
        break;
      case 'info':
      default:
        toastId = this.toastFunction.info(message.message, {
          duration: message.duration
        });
        break;
    }
    
    this.activeToasts.set(message.id, toastId);
    
    // 開発環境でのログ出力
    if (process.env.NODE_ENV === 'development') {
      logMessage(message, this.getLogLevel(message.type));
    }
  }

  showWithActions(message: StandardMessage, actions: StandardMessage['actions']): void {
    if (!actions || actions.length === 0) {
      this.show(message);
      return;
    }

    // Sonnerでアクションボタン付きメッセージ表示
    const toastId = this.toastFunction.message(message.message, {
      duration: message.duration || 10000, // アクション付きは長めに表示
      id: message.id,
      action: actions.length === 1 ? {
        label: actions[0]!.label,
        onClick: actions[0]!.action
      } : undefined,
      // 複数アクションの場合は説明文に追加
      description: actions.length > 1 ? 
        `利用可能なアクション: ${actions.map(a => a.label).join(', ')}` : 
        undefined
    });
    
    this.activeToasts.set(message.id, toastId);
    
    if (process.env.NODE_ENV === 'development') {
      logMessage(message, this.getLogLevel(message.type));
    }
  }

  dismiss(messageId: string): void {
    const toastId = this.activeToasts.get(messageId);
    if (toastId) {
      this.toastFunction.dismiss(toastId);
      this.activeToasts.delete(messageId);
    }
  }

  clear(): void {
    this.toastFunction.dismiss();
    this.activeToasts.clear();
  }

  private getLogLevel(messageType: StandardMessage['type']): 'debug' | 'info' | 'warn' | 'error' {
    switch (messageType) {
      case 'success':
      case 'info':
        return 'info';
      case 'warning':
        return 'warn';
      case 'error':
        return 'error';
      default:
        return 'info';
    }
  }
}

// グローバルメッセージハンドラーのシングルトン
let globalMessageHandler: MessageDisplayHandler | null = null;

export function setGlobalMessageHandler(handler: MessageDisplayHandler): void {
  globalMessageHandler = handler;
}

export function getGlobalMessageHandler(): MessageDisplayHandler | null {
  return globalMessageHandler;
}

// 便利な関数：グローバルハンドラーを使用したメッセージ表示
export function showMessage(message: StandardMessage): void {
  const handler = getGlobalMessageHandler();
  if (handler) {
    handler.show(message);
  } else {
    // フォールバック: コンソールログ
  }
}

export function showMessageWithActions(message: StandardMessage, actions: StandardMessage['actions']): void {
  const handler = getGlobalMessageHandler();
  if (handler) {
    handler.showWithActions(message, actions);
  } else {
  }
}