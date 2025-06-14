// app/hooks/collaboration/index.ts - Main Collaboration Hook

import { useEffect, useCallback } from 'react';
import { useMemos } from '../useMemos';
import { useConflictResolution } from './conflict-resolution';
import { useWebSocketConnection } from './connection';
import { useOperationalTransform } from './operational-transform';
import { useUserPresence } from './user-presence';
import type { Operation, WebSocketMessage, CollaborationState } from './types';

export const useCollaboration = (
  workspaceId: string,
  enabled: boolean = false
) => {
  const { memos, updateMemo, createMemo, deleteMemo, updateMemoPosition } = useMemos();
  
  // WebSocket接続管理
  const connection = useWebSocketConnection(workspaceId, enabled);
  
  // ユーザープレゼンス管理
  const presence = useUserPresence(
    'current-user-id', // TODO: 実際のユーザーIDを取得
    connection.sendMessage
  );
  
  // 操作変換エンジン
  const transform = useOperationalTransform();
  
  // 競合解決システム
  const conflict = useConflictResolution(
    connection.sendMessage,
    'current-user-id'
  );

  // 統合された状態
  const state: CollaborationState = {
    isConnected: connection.connectionState.isConnected,
    users: presence.users,
    connectionQuality: connection.connectionState.connectionQuality,
    latency: connection.connectionState.latency,
    operationQueue: [], // TODO: 操作キューの実装
    conflictCount: conflict.conflictCount
  };

  // メッセージハンドラーの設定
  useEffect(() => {
    const removeHandler = connection.addMessageHandler((message: WebSocketMessage) => {
      switch (message.type) {
        case 'user_joined':
          if (message.data.user) {
            presence.handleUserJoined(message.data.user);
          }
          break;
          
        case 'user_left':
          if (message.data.userId) {
            presence.handleUserLeft(String(message.data.userId));
          }
          break;
          
        case 'presence':
          if (message.data.presence) {
            presence.handleUserPresence(message.data.presence);
          }
          break;
          
        case 'operation':
          if (message.data.operation) {
            handleRemoteOperation(message.data.operation);
          }
          break;
          
        case 'conflict':
          if (message.data.resolvedData) {
            conflict.handleConflict(message.data.resolvedData);
          }
          break;
      }
    });

    return removeHandler;
  }, [connection, presence, conflict]);

  // 操作適用
  const applyOperation = useCallback(async (operation: Operation) => {
    switch (operation.type) {
      case 'memo_create':
        if (!memos.find(m => m.id === operation.memoId)) {
          createMemo(operation.data.position);
        }
        break;

      case 'memo_delete':
        if (memos.find(m => m.id === operation.memoId)) {
          await deleteMemo(operation.memoId!);
        }
        break;

      case 'memo_move':
        updateMemoPosition(
          operation.memoId!, 
          operation.data.x || 0, 
          operation.data.y || 0
        );
        break;

      case 'insert':
      case 'delete':
        const memo = memos.find(m => m.id === operation.memoId);
        if (memo) {
          const newText = transform.applyTextOperation(memo.text || '', operation);
          updateMemo(operation.memoId!, { text: newText });
        }
        break;
    }
  }, [memos, createMemo, deleteMemo, updateMemo, updateMemoPosition, transform]);

  // リモート操作処理
  const handleRemoteOperation = useCallback(async (operation: Operation) => {
    try {
      const transformedOp = await transform.transformOperation(operation, []);
      await applyOperation(transformedOp);
    } catch {
      // Remote operation error handled silently
    }
  }, [transform, applyOperation]);

  // 操作送信
  const sendOperation = useCallback((operation: Operation) => {
    // 競合防止チェック
    if (!conflict.preventConflict(operation)) {
      console.warn('Operation blocked due to conflict prevention');
      return;
    }

    const message: WebSocketMessage = {
      type: 'operation',
      data: { operation },
      userId: 'current-user-id',
      timestamp: Date.now()
    };

    if (!connection.sendMessage(message)) {
      // オフライン時の処理
      console.log('Operation queued for later transmission');
    }
  }, [connection, conflict]);

  // 接続開始
  const connect = useCallback(async () => {
    await connection.connect();
  }, [connection]);

  // 切断
  const disconnect = useCallback(() => {
    connection.disconnect();
  }, [connection]);

  // ユーザー初期化
  const initializeUser = useCallback((userInfo: { userId: string; email: string }) => {
    const user = presence.initializeCurrentUser(userInfo.email);
    
    // ユーザー参加を通知
    const message: WebSocketMessage = {
      type: 'user_joined',
      data: { user },
      userId: userInfo.userId,
      timestamp: Date.now()
    };
    
    connection.sendMessage(message);
  }, [presence, connection]);

  // 自動クリーンアップ
  useEffect(() => {
    if (!enabled) {
      disconnect();
    }
  }, [enabled, disconnect]);

  return {
    // State
    ...state,
    currentUser: presence.currentUser,
    activeUsers: presence.activeUsers,
    showConflictDialog: conflict.showConflictDialog,
    pendingConflict: conflict.pendingConflict,

    // Connection
    connect,
    disconnect,
    isConnected: connection.isConnected,

    // Operations
    sendOperation,
    
    // User Presence
    broadcastCursorPosition: presence.sendCursorPosition,
    broadcastMemoSelection: presence.sendMemoSelection,
    getUsersEditingMemo: presence.getUsersEditingMemo,
    getUserColor: presence.getUserColor,

    // Conflict Resolution
    resolveConflict: conflict.resolveConflict,
    getConflictStats: conflict.getConflictStats,

    // Utils
    initializeUser,
    isReady: connection.isConnected && presence.currentUser !== null
  };
};

// Export types and individual hooks for advanced usage
export type * from './types';
export { useWebSocketConnection } from './connection';
export { useUserPresence } from './user-presence';
export { useOperationalTransform } from './operational-transform';
export { useConflictResolution } from './conflict-resolution';