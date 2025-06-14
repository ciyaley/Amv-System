// app/hooks/collaboration/conflict-resolution.ts - Conflict Resolution System

import { useState, useCallback } from 'react';
import type { ConflictResolution, Operation, WebSocketMessage, ConflictState } from './types';

export const useConflictResolution = (
  sendMessage: (message: WebSocketMessage) => boolean,
  currentUserId: string
) => {
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [pendingConflict, setPendingConflict] = useState<ConflictResolution | null>(null);
  const [conflictCount, setConflictCount] = useState(0);

  // 競合検出と処理
  const handleConflict = useCallback((conflictData: ConflictState) => {
    const conflict: ConflictResolution = {
      strategy: 'user_choice',
      resolved: false,
      finalState: conflictData
    };

    setPendingConflict(conflict);
    setShowConflictDialog(true);
    setConflictCount(prev => prev + 1);
  }, []);

  // 競合解決
  const resolveConflict = useCallback((
    strategy: ConflictResolution['strategy'],
    userChoice?: ConflictState
  ) => {
    if (!pendingConflict) return;

    let resolvedData: ConflictState;

    switch (strategy) {
      case 'last_write_wins':
        resolvedData = pendingConflict.finalState;
        break;
      
      case 'operational_transform':
        // OT アルゴリズムによる自動解決
        resolvedData = applyOperationalTransform(pendingConflict.finalState);
        break;
      
      case 'user_choice':
        resolvedData = userChoice || pendingConflict.finalState;
        break;
      
      default:
        resolvedData = pendingConflict.finalState;
    }

    // 解決結果をブロードキャスト
    const resolutionMessage: WebSocketMessage = {
      type: 'conflict',
      data: {
        type: 'resolution',
        strategy,
        resolvedData,
        conflictId: Date.now()
      },
      userId: currentUserId,
      timestamp: Date.now()
    };

    sendMessage(resolutionMessage);

    // ローカル状態をクリア
    setPendingConflict(null);
    setShowConflictDialog(false);

    return resolvedData;
  }, [pendingConflict, currentUserId, sendMessage]);

  // 自動競合解決 (Last Write Wins)
  const autoResolveConflict = useCallback((
    operations: Operation[]
  ): Operation => {
    if (operations.length === 0) {
      throw new Error('No operations to resolve');
    }

    // 最新のタイムスタンプを持つ操作を選択
    return operations.reduce((latest, current) => 
      current.timestamp > latest.timestamp ? current : latest
    );
  }, []);

  // Operational Transform による解決
  const applyOperationalTransform = useCallback((data: ConflictState): ConflictState => {
    // 簡易的なOT実装
    // 実際の実装では、より複雑な変換アルゴリズムが必要
    return data;
  }, []);

  // 競合回避のための予防策
  const preventConflict = useCallback((operation: Operation): boolean => {
    // 操作が競合を引き起こす可能性があるかチェック
    const isHighRiskOperation = operation.type === 'memo_move' || 
                               operation.type === 'memo_delete';
    
    if (isHighRiskOperation && pendingConflict) {
      // 既に競合がある場合は操作を延期
      return false;
    }

    return true;
  }, [pendingConflict]);

  // 競合統計の取得
  const getConflictStats = useCallback(() => {
    return {
      totalConflicts: conflictCount,
      pendingConflicts: pendingConflict ? 1 : 0,
      hasActiveConflict: showConflictDialog
    };
  }, [conflictCount, pendingConflict, showConflictDialog]);

  // 競合履歴のクリア
  const clearConflictHistory = useCallback(() => {
    setConflictCount(0);
    setPendingConflict(null);
    setShowConflictDialog(false);
  }, []);

  return {
    showConflictDialog,
    pendingConflict,
    conflictCount,
    handleConflict,
    resolveConflict,
    autoResolveConflict,
    preventConflict,
    getConflictStats,
    clearConflictHistory
  };
};