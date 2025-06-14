// app/hooks/aiAssistant/dictionaries.ts - Keyword Dictionaries and Classification Rules

import type { CategoryRule } from './types';

// 日本語キーワード抽出用の重要語リスト
export const IMPORTANT_WORDS_JA = new Set([
  'プロジェクト', '会議', 'タスク', '目標', '計画', '問題', '解決', '提案', 'アイデア',
  '開発', '設計', '実装', 'テスト', 'バグ', '機能', '要件', '仕様', 'レビュー',
  '売上', '利益', '予算', '投資', '市場', '顧客', 'ユーザー', 'サービス', '品質',
  '学習', '研究', '分析', 'データ', '統計', '結果', '評価', '改善', '最適化'
]);

export const IMPORTANT_WORDS_EN = new Set([
  'project', 'meeting', 'task', 'goal', 'plan', 'problem', 'solution', 'proposal', 'idea',
  'development', 'design', 'implementation', 'test', 'bug', 'feature', 'requirement', 'specification',
  'revenue', 'profit', 'budget', 'investment', 'market', 'customer', 'user', 'service', 'quality',
  'learning', 'research', 'analysis', 'data', 'statistics', 'result', 'evaluation', 'improvement'
]);

// カテゴリ分類ルール
export const CATEGORY_RULES: CategoryRule[] = [
  { 
    name: 'Work', 
    keywords: ['会議', '業務', 'プロジェクト', 'タスク', '仕事', 'meeting', 'work', 'project', 'task'],
    weight: 1.0 
  },
  { 
    name: 'Personal', 
    keywords: ['個人', '私的', '趣味', '家族', '健康', 'personal', 'private', 'hobby', 'family', 'health'],
    weight: 1.0 
  },
  { 
    name: 'Learning', 
    keywords: ['学習', '勉強', '研究', '教育', 'study', 'learning', 'research', 'education'],
    weight: 1.0 
  },
  { 
    name: 'Ideas', 
    keywords: ['アイデア', '発想', '創造', 'ブレスト', 'idea', 'creativity', 'brainstorm', 'innovation'],
    weight: 0.8 
  },
  { 
    name: 'Planning', 
    keywords: ['計画', '予定', 'スケジュール', '目標', 'plan', 'schedule', 'goal', 'objective'],
    weight: 0.9 
  }
];

// 感情分析用の語彙
export const POSITIVE_WORDS_JA = new Set([
  '良い', '素晴らしい', '成功', '達成', '完了', '満足', '嬉しい', '楽しい', '便利', '効果的'
]);

export const NEGATIVE_WORDS_JA = new Set([
  '悪い', '問題', '困難', '失敗', '遅れ', '不満', '心配', 'バグ', 'エラー', '課題'
]);

export const POSITIVE_WORDS_EN = new Set([
  'good', 'great', 'success', 'achieve', 'complete', 'satisfied', 'happy', 'effective', 'excellent'
]);

export const NEGATIVE_WORDS_EN = new Set([
  'bad', 'problem', 'difficult', 'fail', 'delay', 'unsatisfied', 'worry', 'bug', 'error', 'issue'
]);

// 品詞除外リスト（助詞、接続詞など）
export const STOP_WORDS_JA = new Set([
  'の', 'に', 'は', 'を', 'が', 'で', 'と', 'から', 'まで', 'より', 'して', 'する', 'した', 'である', 'です', 'ます'
]);

export const STOP_WORDS_EN = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were'
]);

// トピック抽出用のシード語
export const TOPIC_SEEDS = {
  technology: ['技術', 'システム', 'AI', 'アプリ', 'サービス', 'technology', 'system', 'application'],
  business: ['ビジネス', '事業', '売上', '利益', '顧客', 'business', 'revenue', 'customer', 'profit'],
  management: ['管理', '運用', 'マネジメント', '組織', 'チーム', 'management', 'organization', 'team'],
  development: ['開発', '実装', 'コード', 'プログラム', 'development', 'implementation', 'code', 'programming']
};