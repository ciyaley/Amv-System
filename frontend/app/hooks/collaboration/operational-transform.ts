// app/hooks/collaboration/operational-transform.ts - Operational Transform Engine

import { useCallback } from 'react';
import type { Operation, OperationTransformResult } from './types';

export const useOperationalTransform = () => {
  // 操作変換のメイン関数
  const transformOperation = useCallback(async (
    operation: Operation,
    pendingOperations: Operation[]
  ): Promise<Operation> => {
    const relevantOps = pendingOperations.filter(op => 
      op.memoId === operation.memoId && op.timestamp < operation.timestamp
    );

    let transformedOp = { ...operation };

    for (const pendingOp of relevantOps) {
      transformedOp = await transformOperationPair(transformedOp, pendingOp);
    }

    return transformedOp;
  }, []);

  // 操作ペア変換
  const transformOperationPair = useCallback(async (
    op1: Operation, 
    op2: Operation
  ): Promise<Operation> => {
    // 同じメモに対する操作のみ変換
    if (op1.memoId !== op2.memoId) {
      return op1;
    }

    // テキスト編集操作の変換
    if (op1.type === 'insert' && op2.type === 'insert') {
      return transformInsertInsert(op1, op2);
    }

    if (op1.type === 'insert' && op2.type === 'delete') {
      return transformInsertDelete(op1, op2);
    }

    if (op1.type === 'delete' && op2.type === 'insert') {
      return transformDeleteInsert(op1, op2);
    }

    if (op1.type === 'delete' && op2.type === 'delete') {
      return transformDeleteDelete(op1, op2);
    }

    // メモ位置変更の変換
    if (op1.type === 'memo_move' && op2.type === 'memo_move') {
      return transformMoveMove(op1, op2);
    }

    // メモ作成・削除の変換
    if (op1.type === 'memo_create' && op2.type === 'memo_delete') {
      return transformCreateDelete(op1, op2);
    }

    return op1;
  }, []);

  // Insert + Insert 変換
  const transformInsertInsert = useCallback((op1: Operation, op2: Operation): Operation => {
    if (!op1.position || !op2.position) return op1;

    if (op1.position <= op2.position) {
      return { ...op2, position: op2.position + (op1.content?.length || 0) };
    }
    return op1;
  }, []);

  // Insert + Delete 変換
  const transformInsertDelete = useCallback((op1: Operation, op2: Operation): Operation => {
    if (!op1.position || !op2.position) return op1;

    if (op2.position < op1.position) {
      return { ...op1, position: op1.position - 1 };
    }
    return op1;
  }, []);

  // Delete + Insert 変換
  const transformDeleteInsert = useCallback((op1: Operation, op2: Operation): Operation => {
    if (!op1.position || !op2.position) return op1;

    if (op1.position < op2.position) {
      return { ...op2, position: op2.position - 1 };
    }
    return op2;
  }, []);

  // Delete + Delete 変換
  const transformDeleteDelete = useCallback((op1: Operation, op2: Operation): Operation => {
    if (!op1.position || !op2.position) return op1;

    if (op1.position < op2.position) {
      return { ...op2, position: op2.position - 1 };
    } else if (op1.position > op2.position) {
      return { ...op1, position: op1.position - 1 };
    } else {
      // 同じ位置の削除は最初の操作を優先
      return op1.timestamp < op2.timestamp ? op1 : op2;
    }
  }, []);

  // Move + Move 変換 (Last Write Wins)
  const transformMoveMove = useCallback((op1: Operation, op2: Operation): Operation => {
    return op1.timestamp > op2.timestamp ? op1 : op2;
  }, []);

  // Create + Delete 変換
  const transformCreateDelete = useCallback((op1: Operation, op2: Operation): Operation => {
    if (op1.memoId === op2.memoId) {
      // 同じメモの作成と削除が競合した場合、タイムスタンプで判定
      return op1.timestamp < op2.timestamp ? op2 : op1;
    }
    return op1;
  }, []);

  // テキスト操作適用
  const applyTextOperation = useCallback((text: string, operation: Operation): string => {
    switch (operation.type) {
      case 'insert':
        if (operation.position !== undefined && operation.content) {
          return text.slice(0, operation.position) + 
                 operation.content + 
                 text.slice(operation.position);
        }
        break;
      
      case 'delete':
        if (operation.position !== undefined) {
          return text.slice(0, operation.position) + 
                 text.slice(operation.position + 1);
        }
        break;
      
      case 'retain':
        return text;
      
      default:
        return text;
    }
    return text;
  }, []);

  // 操作の競合検出
  const detectConflicts = useCallback(async (
    operations: Operation[]
  ): Promise<OperationTransformResult[]> => {
    const conflicts: OperationTransformResult[] = [];
    
    for (let i = 0; i < operations.length; i++) {
      for (let j = i + 1; j < operations.length; j++) {
        const op1 = operations[i];
        const op2 = operations[j];
        
        if (op1 && op2 && isConflicting(op1, op2)) {
          const transformedOp = transformOperationPair(op1, op2);
          conflicts.push({
            transformedOp: await transformedOp,
            conflicts: [op1, op2]
          });
        }
      }
    }
    
    return conflicts;
  }, [transformOperationPair]);

  // 競合判定
  const isConflicting = useCallback((op1: Operation, op2: Operation): boolean => {
    if (op1.memoId !== op2.memoId) return false;
    
    // 同時実行された操作の競合判定
    const timeDiff = Math.abs(op1.timestamp - op2.timestamp);
    const isSimultaneous = timeDiff < 1000; // 1秒以内
    
    if (!isSimultaneous) return false;
    
    // テキスト編集の位置重複
    if ((op1.type === 'insert' || op1.type === 'delete') && 
        (op2.type === 'insert' || op2.type === 'delete')) {
      return Math.abs((op1.position || 0) - (op2.position || 0)) < 3;
    }
    
    // メモ移動の競合
    if (op1.type === 'memo_move' && op2.type === 'memo_move') {
      return true;
    }
    
    return false;
  }, []);

  return {
    transformOperation,
    transformOperationPair,
    applyTextOperation,
    detectConflicts,
    isConflicting
  };
};