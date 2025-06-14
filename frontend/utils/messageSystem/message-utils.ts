// utils/messageSystem/message-utils.ts - メッセージユーティリティ関数

import { StandardMessage, MessageContext, createMessage } from './message-templates';
import { MessageHelpers } from './message-helpers';
import { MessageDisplayHandler } from './display-handlers';

// エラー処理とメッセージ生成の統一化
export function handleErrorWithMessage(
  error: unknown,
  context: MessageContext,
  displayHandler: MessageDisplayHandler
): StandardMessage {
  let message: StandardMessage;

  if (error instanceof Error) {
    switch (error.message) {
      case 'USER_CANCELLED':
        message = MessageHelpers.directorySelectionCancelled(context);
        break;
      case 'PERMISSION_DENIED':
        message = MessageHelpers.permissionDenied(context);
        break;
      case 'SECURITY_ERROR':
        message = MessageHelpers.securityError(context);
        break;
      case 'API_NOT_SUPPORTED':
        message = createMessage('FILE_SYSTEM.API_NOT_SUPPORTED', context);
        break;
      default:
        message = MessageHelpers.operationFailed(context, context.operation);
        break;
    }
  } else {
    message = MessageHelpers.unexpectedError(context);
  }

  // コンテキストにエラー詳細を追加
  message.context.details = {
    ...message.context.details,
    originalError: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined
  };

  displayHandler.show(message);
  return message;
}

// ログ出力の統一化
export function logMessage(message: StandardMessage, level: 'debug' | 'info' | 'warn' | 'error' = 'info'): void {
  const logData = {
    messageId: message.id,
    type: message.type,
    title: message.title,
    context: message.context,
    timestamp: message.context.timestamp
  };

  switch (level) {
    case 'debug':
      console.debug('Message:', logData);
      break;
    case 'info':
      console.info('Message:', logData);
      break;
    case 'warn':
      console.warn('Message:', logData);
      break;
    case 'error':
      console.error('Message:', logData);
      break;
  }
}

// メッセージの重要度判定
export function getMessageSeverity(message: StandardMessage): 'low' | 'medium' | 'high' | 'critical' {
  switch (message.type) {
    case 'success':
    case 'info':
      return 'low';
    case 'warning':
      return 'medium';
    case 'error':
      if (message.context?.operation === 'emergency_recovery' || 
          message.context?.errorCode?.includes('CRITICAL')) {
        return 'critical';
      }
      return 'high';
    default:
      return 'medium';
  }
}