/**
 * Memo Tool Configuration
 * 
 * シンプルなメモ作成ツール
 * Clean Architectureの複雑さを排除した直接的な実装
 */

import { SquarePen } from 'lucide-react';
import { ToolRegistry } from '../../registry/ToolRegistry';
import type { Tool, MemoData } from '../../../types/tools';

// シンプルなメモサービス
class SimpleMemoService {
  async createMemo(memoData: MemoData): Promise<void> {
    try {
      // 直接的にZustandストアを使用（useMemos互換）
      const { useMemos } = await import('../../../hooks/useMemos');
      const store = useMemos.getState();
      
      // メモ追加
      store.createMemo({ x: memoData.x, y: memoData.y });
      
    } catch (error) {
      throw error;
    }
  }
}

export const memoTool: Tool = {
  id: 'memo',
  label: 'メモ',
  description: '新しいメモを作成します',
  icon: SquarePen,
  category: 'core',
  priority: 1,
  enabled: true,
  
  action: {
    execute: async (context) => {
      const memoService = new SimpleMemoService();
      
      const newMemo: MemoData = {
        id: `memo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'memo' as const,
        title: '新しいメモ',
        content: '',
        text: '', // Legacy互換性
        x: context.canvasPosition.x,
        y: context.canvasPosition.y,
        w: 300,
        h: 200,
        zIndex: 1,
        visible: true,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        sourceType: context.user?.isLoggedIn ? 'authenticated' : 'guest'
      };
      
      await memoService.createMemo(newMemo);
    },
    
    canExecute: () => {
      // 常に実行可能
      return true;
    },
    
    shortcuts: ['Ctrl+N', 'Cmd+N']
  }
};

// 自動登録（ファイル読み込み時）
ToolRegistry.getInstance().registerTool(memoTool);