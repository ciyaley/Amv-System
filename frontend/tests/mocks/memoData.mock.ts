import { MemoData } from '../../app/types/tools'

const categories = ['Tech', 'Memo', 'Project', 'Personal', 'Work', 'Study']
const titles = [
  'React Hooks完全ガイド',
  'パフォーマンス改善メモ',
  'プロジェクト企画書',
  '買い物リスト',
  '会議メモ',
  'TypeScript学習ノート',
  'AWS構成メモ',
  'デザインレビュー',
  'TODOリスト',
  'アイデアメモ'
]

const contents = [
  'useStateとuseEffectの使い方について詳しく解説...',
  'レンダリングを最適化するためのベストプラクティス...',
  '新プロジェクトの概要と目標設定について...',
  '牛乳、パン、卵、野菜を買う...',
  '本日の会議での決定事項と次回までのアクション...',
  '型定義の基本から応用まで学習した内容...',
  'EC2, RDS, S3の構成について...',
  'UIデザインのフィードバックと改善点...',
  '今週中に完了すべきタスク一覧...',
  '新しいアプリのアイデアをメモ...'
]

export interface GenerateMemoOptions {
  withCategories?: boolean
  withLongContent?: boolean
  withTags?: boolean
}

export const generateMemos = (
  count: number,
  options: GenerateMemoOptions = {}
): MemoData[] => {
  const memos: MemoData[] = []
  
  for (let i = 0; i < count; i++) {
    const title = titles[i % titles.length]!
    const baseContent = contents[i % contents.length]!
    const content = options.withLongContent 
      ? baseContent + '\n\n' + baseContent.repeat(10)
      : baseContent
    
    const memo: MemoData = {
      id: `memo_${String(i + 1).padStart(3, '0')}`,
      type: 'memo',
      title: `${title}${count > titles.length ? ` ${Math.floor(i / titles.length) + 1}` : ''}`,
      content: content,
      text: content,
      x: (i % 5) * 250,
      y: Math.floor(i / 5) * 200,
      w: 240,
      h: 160,
      zIndex: i + 1,
      sourceType: 'guest',
      tags: options.withTags ? generateTags(i) : [],
      created: new Date(Date.now() - (count - i) * 3600000).toISOString(),
      updated: new Date(Date.now() - (count - i) * 1800000).toISOString(),
      appearance: {
        backgroundColor: generateColor(i),
        borderColor: generateBorderColor(i),
        cornerRadius: 8,
        shadowEnabled: true
      }
    }
    
    if (options.withCategories) {
      memo.category = categories[i % categories.length]
    }
    
    memos.push(memo)
  }
  
  return memos
}

const generateTags = (index: number): string[] => {
  const allTags = ['important', 'todo', 'idea', 'review', 'urgent', 'reference']
  const tagCount = (index % 3) + 1
  const tags: string[] = []
  
  for (let i = 0; i < tagCount; i++) {
    tags.push(allTags[(index + i) % allTags.length]!)
  }
  
  return tags
}

const generateColor = (index: number): string => {
  const colors = ['#ffeaa7', '#dfe6e9', '#fab1a0', '#a29bfe', '#81ecec']
  return colors[index % colors.length]!
}

const generateBorderColor = (index: number): string => {
  const colors = ['#fdcb6e', '#b2bec3', '#e17055', '#6c5ce7', '#00cec9']
  return colors[index % colors.length]!
}

// カテゴリ別にグループ化されたメモを生成
export const generateCategorizedMemos = (
  totalCount: number
): Record<string, MemoData[]> => {
  const memos = generateMemos(totalCount, { withCategories: true, withTags: true })
  const categorized: Record<string, MemoData[]> = {}
  
  memos.forEach(memo => {
    const category = memo.category || 'Uncategorized'
    if (!categorized[category]) {
      categorized[category] = []
    }
    categorized[category].push(memo)
  })
  
  return categorized
}