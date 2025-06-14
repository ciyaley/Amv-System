// utils/messageSystem/message-templates.ts - メッセージテンプレート定義

export interface MessageContext {
  operation: string;
  component?: string;
  errorCode?: string;
  details?: Record<string, any>;
  timestamp?: string;
}

export interface StandardMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  context: MessageContext;
  duration?: number;
  actions?: Array<{
    label: string;
    action: () => void;
  }>;
}

// メッセージテンプレート定義
export const MESSAGE_TEMPLATES = {
  // ファイルシステム関連
  FILE_SYSTEM: {
    DIRECTORY_SELECTED: {
      type: 'success' as const,
      title: 'ディレクトリ設定完了',
      message: 'ワークスペース用ディレクトリが正常に選択されました'
    },
    DIRECTORY_SELECTION_CANCELLED: {
      type: 'info' as const,
      title: 'ディレクトリ選択キャンセル',
      message: 'フォルダ選択がキャンセルされました。設定からいつでも指定できます'
    },
    PERMISSION_DENIED: {
      type: 'error' as const,
      title: 'アクセス権限エラー',
      message: 'フォルダアクセス権限が拒否されました。別のフォルダを選択してください'
    },
    SECURITY_ERROR: {
      type: 'error' as const,
      title: 'セキュリティエラー',
      message: 'セキュリティエラーが発生しました。ブラウザ設定をご確認ください'
    },
    API_NOT_SUPPORTED: {
      type: 'error' as const,
      title: 'ブラウザ非対応',
      message: 'お使いのブラウザはFile System Access APIに対応していません'
    }
  },

  // データ操作関連
  DATA_OPERATIONS: {
    MEMO_SAVED: {
      type: 'success' as const,
      title: 'メモ保存完了',
      message: 'メモが正常に保存されました'
    },
    MEMO_DELETED: {
      type: 'success' as const,
      title: 'メモ削除完了',
      message: 'メモが正常に削除されました'
    },
    MEMO_LOAD_ERROR: {
      type: 'error' as const,
      title: 'メモ読み込みエラー',
      message: 'メモの読み込み中にエラーが発生しました'
    },
    BULK_SAVE_COMPLETED: {
      type: 'success' as const,
      title: '一括保存完了',
      message: '{count}個のメモを正常に保存しました'
    }
  },

  // 認証関連
  AUTHENTICATION: {
    LOGIN_SUCCESS: {
      type: 'success' as const,
      title: 'ログイン成功',
      message: 'アカウントに正常にログインしました'
    },
    REGISTER_SUCCESS: {
      type: 'success' as const,
      title: '登録成功',
      message: 'アカウントが正常に作成されました'
    },
    LOGIN_FAILED: {
      type: 'error' as const,
      title: 'ログイン失敗',
      message: 'ログインに失敗しました。認証情報をご確認ください'
    },
    REGISTER_FAILED: {
      type: 'error' as const,
      title: '登録失敗',
      message: 'アカウント登録に失敗しました。入力内容をご確認ください'
    },
    LOGOUT_SUCCESS: {
      type: 'info' as const,
      title: 'ログアウト完了',
      message: 'アカウントからログアウトしました'
    },
    PASSWORD_REQUIRED: {
      type: 'warning' as const,
      title: 'パスワード必須',
      message: 'パスワード情報がありません。設定から再ログインしてください'
    }
  },

  // ゲストモード関連
  GUEST_MODE: {
    AUTO_RESTORE_SUCCESS: {
      type: 'success' as const,
      title: 'データ自動復元完了',
      message: '前回保存したデータを自動復元しました（{count}個のメモ）'
    },
    MANUAL_SAVE_SUCCESS: {
      type: 'success' as const,
      title: '手動保存完了',
      message: '{count}個のメモを保存しました'
    },
    EXISTING_DATA_MERGED: {
      type: 'success' as const,
      title: 'データマージ完了',
      message: '前回のデータを復元し、{newCount}個の新規メモを追加保存しました'
    }
  },

  // データ整合性関連
  DATA_INTEGRITY: {
    VALIDATION_SUCCESS: {
      type: 'success' as const,
      title: 'データ整合性確認完了',
      message: 'すべてのデータが正常な状態です'
    },
    VALIDATION_ISSUES_FOUND: {
      type: 'warning' as const,
      title: 'データ整合性の問題検出',
      message: '{issueCount}個の問題が検出されました。自動修復を実行しますか？'
    },
    AUTO_RECOVERY_SUCCESS: {
      type: 'success' as const,
      title: '自動復旧完了',
      message: '{actionCount}個の修復アクションを実行しました'
    },
    AUTO_RECOVERY_PARTIAL: {
      type: 'warning' as const,
      title: '部分的復旧完了',
      message: '{actionCount}個のアクションを実行、{remainingCount}個の問題が残っています'
    }
  },

  // システム関連
  SYSTEM: {
    HEALTH_CHECK_PASSED: {
      type: 'success' as const,
      title: 'システム健全性チェック完了',
      message: 'システムは正常に動作しています'
    },
    HEALTH_CHECK_FAILED: {
      type: 'warning' as const,
      title: 'システム問題検出',
      message: '{issueCount}個の問題が検出されました'
    },
    EMERGENCY_RECOVERY_ACTIVATED: {
      type: 'warning' as const,
      title: 'エマージェンシー復旧モード',
      message: 'システム緊急復旧を実行しています...'
    },
    EMERGENCY_RECOVERY_SUCCESS: {
      type: 'success' as const,
      title: '緊急復旧完了',
      message: 'システムが正常に復旧されました'
    }
  },

  // エラー関連
  ERRORS: {
    UNEXPECTED_ERROR: {
      type: 'error' as const,
      title: '予期しないエラー',
      message: '予期しないエラーが発生しました。再試行してください'
    },
    OPERATION_FAILED: {
      type: 'error' as const,
      title: '操作失敗',
      message: '{operation}の実行中にエラーが発生しました'
    },
    NETWORK_ERROR: {
      type: 'error' as const,
      title: 'ネットワークエラー',
      message: 'ネットワークエラーが発生しました。接続を確認してください'
    }
  }
} as const;

// タイプに応じたデフォルト表示時間
export function getDurationForType(type: StandardMessage['type']): number {
  switch (type) {
    case 'success':
      return 4000;
    case 'info':
      return 5000;
    case 'warning':
      return 6000;
    case 'error':
      return 8000;
    default:
      return 5000;
  }
}

// メッセージ作成関数
export function createMessage(
  categoryPath: string,
  context: MessageContext,
  replacements: Record<string, string | number> = {}
): StandardMessage {
  const [category, messageKey] = categoryPath.split('.');
  if (!category || !messageKey) {
    return createMessage('ERRORS.UNEXPECTED_ERROR', context);
  }
  const template = (MESSAGE_TEMPLATES as any)[category]?.[messageKey];
  
  if (!template) {
    return createMessage('ERRORS.UNEXPECTED_ERROR', context);
  }

  // プレースホルダーの置換
  let processedMessage = template.message;
  Object.entries(replacements).forEach(([key, value]) => {
    processedMessage = processedMessage.replace(`{${key}}`, String(value));
  });

  return {
    id: `${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
    type: template.type,
    title: template.title,
    message: processedMessage,
    context: {
      ...context,
      timestamp: new Date().toISOString()
    },
    duration: getDurationForType(template.type)
  };
}