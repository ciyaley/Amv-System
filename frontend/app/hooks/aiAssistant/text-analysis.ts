// app/hooks/aiAssistant/text-analysis.ts - Text Analysis Engine

import { useCallback } from 'react';
import { 
  IMPORTANT_WORDS_JA, 
  IMPORTANT_WORDS_EN, 
  CATEGORY_RULES,
  POSITIVE_WORDS_JA,
  NEGATIVE_WORDS_JA,
  POSITIVE_WORDS_EN,
  NEGATIVE_WORDS_EN,
  TOPIC_SEEDS
} from './dictionaries';
import type { AIAnalysis, TextAnalysisOptions } from './types';

export const useTextAnalysis = () => {
  // 言語検出
  const detectLanguage = useCallback((text: string): 'ja' | 'en' | 'mixed' => {
    const japaneseChars = text.match(/[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/g) || [];
    const englishChars = text.match(/[a-zA-Z]/g) || [];
    
    const japaneseRatio = japaneseChars.length / text.length;
    const englishRatio = englishChars.length / text.length;
    
    if (japaneseRatio > 0.3 && englishRatio > 0.3) return 'mixed';
    if (japaneseRatio > englishRatio) return 'ja';
    return 'en';
  }, []);

  // キーワード抽出
  const extractKeywords = useCallback((text: string, language: 'ja' | 'en' | 'mixed'): string[] => {
    const words = text.toLowerCase()
      .replace(/[^\w\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 1);

    const importantWords = language === 'ja' || language === 'mixed' 
      ? IMPORTANT_WORDS_JA 
      : IMPORTANT_WORDS_EN;

    // TF-IDF風のスコアリング
    const wordFreq = new Map<string, number>();
    words.forEach(word => {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    });

    const keywords = Array.from(wordFreq.entries())
      .map(([word, freq]) => ({
        word,
        score: freq * (importantWords.has(word) ? 2.0 : 1.0) * Math.log(words.length / freq)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(item => item.word);

    return keywords;
  }, []);

  // カテゴリ分類
  const categorizeText = useCallback((text: string, keywords: string[]): string[] => {
    const categoryScores = CATEGORY_RULES.map(rule => {
      const matchCount = rule.keywords.filter(keyword => 
        text.toLowerCase().includes(keyword) || 
        keywords.some(kw => kw.includes(keyword))
      ).length;
      
      return {
        name: rule.name,
        score: matchCount * rule.weight
      };
    });

    return categoryScores
      .filter(cat => cat.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(cat => cat.name);
  }, []);

  // 感情分析（簡易版）
  const analyzeSentiment = useCallback((
    text: string, 
    language: 'ja' | 'en' | 'mixed'
  ): 'positive' | 'neutral' | 'negative' => {
    const positiveWords = language === 'ja' || language === 'mixed'
      ? [...POSITIVE_WORDS_JA, ...POSITIVE_WORDS_EN]
      : [...POSITIVE_WORDS_EN];

    const negativeWords = language === 'ja' || language === 'mixed'
      ? [...NEGATIVE_WORDS_JA, ...NEGATIVE_WORDS_EN]
      : [...NEGATIVE_WORDS_EN];

    const positiveCount = positiveWords.filter(word => 
      text.toLowerCase().includes(word)
    ).length;

    const negativeCount = negativeWords.filter(word => 
      text.toLowerCase().includes(word)
    ).length;

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }, []);

  // トピック抽出
  const extractTopics = useCallback((text: string, keywords: string[]): Array<{ name: string; relevance: number }> => {
    const topics = Object.entries(TOPIC_SEEDS).map(([topicName, seeds]) => {
      const relevance = seeds.filter(seed => 
        text.toLowerCase().includes(seed) || 
        keywords.some(kw => kw.includes(seed))
      ).length / seeds.length;

      return { name: topicName, relevance };
    });

    return topics
      .filter(topic => topic.relevance > 0)
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 5);
  }, []);

  // 信頼度計算
  const calculateConfidence = useCallback((
    text: string, 
    keywords: string[], 
    categories: string[]
  ): number => {
    const textLength = text.length;
    const keywordCoverage = keywords.length / Math.max(textLength / 50, 1);
    const categoryStrength = categories.length / CATEGORY_RULES.length;
    
    let confidence = (keywordCoverage * 0.4 + categoryStrength * 0.6) * 100;
    confidence = Math.min(95, Math.max(10, confidence));
    
    return Math.round(confidence);
  }, []);

  // メイン分析関数
  const performTextAnalysis = useCallback(async (
    text: string, 
    options: TextAnalysisOptions = {}
  ): Promise<AIAnalysis> => {
    const {
      language: forcedLanguage,
      includeKeywords = true,
      includeSentiment = true,
      includeTopics = true
    } = options;

    // 言語検出
    const detectedLanguage = forcedLanguage || detectLanguage(text);
    const language = detectedLanguage === 'auto' ? 'ja' : detectedLanguage;
    
    // キーワード抽出
    const keywords = includeKeywords ? extractKeywords(text, language) : [];
    
    // カテゴリ分類
    const categories = categorizeText(text, keywords);
    
    // 感情分析
    const sentiment = includeSentiment ? analyzeSentiment(text, language) : 'neutral';
    
    // トピック抽出
    const topics = includeTopics ? extractTopics(text, keywords) : [];
    
    // 信頼度計算
    const confidence = calculateConfidence(text, keywords, categories);

    return {
      categories,
      keywords,
      sentiment,
      confidence,
      language,
      topics
    };
  }, [
    detectLanguage,
    extractKeywords,
    categorizeText,
    analyzeSentiment,
    extractTopics,
    calculateConfidence
  ]);

  return {
    detectLanguage,
    extractKeywords,
    categorizeText,
    analyzeSentiment,
    extractTopics,
    calculateConfidence,
    performTextAnalysis
  };
};