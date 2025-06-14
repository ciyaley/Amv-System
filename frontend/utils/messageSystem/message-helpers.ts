// utils/messageSystem/message-helpers.ts - メッセージヘルパー関数

import { createMessage, MessageContext } from './message-templates';

// よく使用されるメッセージのヘルパー関数
export const MessageHelpers = {
  // ファイルシステム操作
  directorySelected: (context: MessageContext) =>
    createMessage('FILE_SYSTEM.DIRECTORY_SELECTED', context),

  directorySelectionCancelled: (context: MessageContext) =>
    createMessage('FILE_SYSTEM.DIRECTORY_SELECTION_CANCELLED', context),

  permissionDenied: (context: MessageContext) =>
    createMessage('FILE_SYSTEM.PERMISSION_DENIED', context),

  securityError: (context: MessageContext) =>
    createMessage('FILE_SYSTEM.SECURITY_ERROR', context),

  // データ操作
  memoSaved: (context: MessageContext) =>
    createMessage('DATA_OPERATIONS.MEMO_SAVED', context),

  bulkSaveCompleted: (context: MessageContext, count: number) =>
    createMessage('DATA_OPERATIONS.BULK_SAVE_COMPLETED', context, { count }),

  // 認証
  loginSuccess: (context: MessageContext) =>
    createMessage('AUTHENTICATION.LOGIN_SUCCESS', context),

  registerSuccess: (context: MessageContext) =>
    createMessage('AUTHENTICATION.REGISTER_SUCCESS', context),

  loginFailed: (context: MessageContext) =>
    createMessage('AUTHENTICATION.LOGIN_FAILED', context),

  registerFailed: (context: MessageContext) =>
    createMessage('AUTHENTICATION.REGISTER_FAILED', context),

  passwordRequired: (context: MessageContext) =>
    createMessage('AUTHENTICATION.PASSWORD_REQUIRED', context),

  // ゲストモード
  autoRestoreSuccess: (context: MessageContext, count: number) =>
    createMessage('GUEST_MODE.AUTO_RESTORE_SUCCESS', context, { count }),

  manualSaveSuccess: (context: MessageContext, count: number) =>
    createMessage('GUEST_MODE.MANUAL_SAVE_SUCCESS', context, { count }),

  existingDataMerged: (context: MessageContext, newCount: number) =>
    createMessage('GUEST_MODE.EXISTING_DATA_MERGED', context, { newCount }),

  // データ整合性
  validationSuccess: (context: MessageContext) =>
    createMessage('DATA_INTEGRITY.VALIDATION_SUCCESS', context),

  validationIssuesFound: (context: MessageContext, issueCount: number) =>
    createMessage('DATA_INTEGRITY.VALIDATION_ISSUES_FOUND', context, { issueCount }),

  autoRecoverySuccess: (context: MessageContext, actionCount: number) =>
    createMessage('DATA_INTEGRITY.AUTO_RECOVERY_SUCCESS', context, { actionCount }),

  autoRecoveryPartial: (context: MessageContext, actionCount: number, remainingCount: number) =>
    createMessage('DATA_INTEGRITY.AUTO_RECOVERY_PARTIAL', context, { actionCount, remainingCount }),

  // システム
  healthCheckPassed: (context: MessageContext) =>
    createMessage('SYSTEM.HEALTH_CHECK_PASSED', context),

  healthCheckFailed: (context: MessageContext, issueCount: number) =>
    createMessage('SYSTEM.HEALTH_CHECK_FAILED', context, { issueCount }),

  emergencyRecoveryActivated: (context: MessageContext) =>
    createMessage('SYSTEM.EMERGENCY_RECOVERY_ACTIVATED', context),

  emergencyRecoverySuccess: (context: MessageContext) =>
    createMessage('SYSTEM.EMERGENCY_RECOVERY_SUCCESS', context),

  // エラー
  unexpectedError: (context: MessageContext) =>
    createMessage('ERRORS.UNEXPECTED_ERROR', context),

  operationFailed: (context: MessageContext, operation: string) =>
    createMessage('ERRORS.OPERATION_FAILED', context, { operation }),

  networkError: (context: MessageContext) =>
    createMessage('ERRORS.NETWORK_ERROR', context)
};