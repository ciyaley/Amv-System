/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { persistMemo, stopAutoSave, clearAutoSaveTimers, getAutoSaveStats } from '../memoAutoSave';
import { useEncryptionStore } from '../useEncryptionStore';
import type { MemoData } from '../../types/tools';

// Mock dependencies
vi.mock('../useEncryptionStore');
vi.mock('../../../utils/fileAccess', () => ({
  saveIndividualMemo: vi.fn()
}));

describe('memoAutoSave', () => {
  const mockMemo: MemoData = {
    id: 'test-memo-1',
    type: 'memo',
    title: 'Test Memo',
    text: 'Test content',
    content: 'Test content',
    x: 100, y: 100, w: 200, h: 150, zIndex: 1,
    created: '2023-01-01',
    updated: '2023-01-01',
    sourceType: 'authenticated'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    clearAutoSaveTimers();
    
    // Mock useEncryptionStore to return a password (logged in state)
    vi.mocked(useEncryptionStore).mockReturnValue({
      getState: () => ({ password: 'test-password' })
    } as ReturnType<typeof useEncryptionStore>);
  });

  afterEach(() => {
    clearAutoSaveTimers();
  });

  describe('persistMemo', () => {
    it('should not save when not logged in', async () => {
      // Mock no password (not logged in)
      vi.mocked(useEncryptionStore).mockReturnValue({
        getState: () => ({ password: null })
      } as ReturnType<typeof useEncryptionStore>);

      await persistMemo(mockMemo);
      
      // Should return early without setting timers
      const stats = getAutoSaveStats();
      expect(stats.activeTimers).toBe(0);
    });

    it('should schedule save when logged in', async () => {
      await persistMemo(mockMemo);
      
      // Should have active timer
      const stats = getAutoSaveStats();
      expect(stats.activeTimers).toBe(1);
    });

    it('should clear existing timer when called multiple times', async () => {
      await persistMemo(mockMemo);
      await persistMemo(mockMemo); // Same memo ID
      
      // Should still have only 1 timer
      const stats = getAutoSaveStats();
      expect(stats.activeTimers).toBe(1);
    });
  });

  describe('stopAutoSave', () => {
    it('should clear all active timers', async () => {
      // Set up multiple timers
      await persistMemo(mockMemo);
      await persistMemo({ ...mockMemo, id: 'test-memo-2' });
      
      expect(getAutoSaveStats().activeTimers).toBe(2);
      
      stopAutoSave();
      
      expect(getAutoSaveStats().activeTimers).toBe(0);
    });
  });

  describe('clearAutoSaveTimers', () => {
    it('should reset all counters', async () => {
      await persistMemo(mockMemo);
      
      expect(getAutoSaveStats().activeTimers).toBe(1);
      
      clearAutoSaveTimers();
      
      const stats = getAutoSaveStats();
      expect(stats.activeTimers).toBe(0);
      expect(stats.activeSaveCount).toBe(0);
    });
  });

  describe('getAutoSaveStats', () => {
    it('should return correct statistics', () => {
      const stats = getAutoSaveStats();
      
      expect(stats).toEqual({
        activeTimers: 0,
        activeSaveCount: 0,
        maxConcurrentSaves: 3,
        batchSaveDelay: 500
      });
    });
  });
});