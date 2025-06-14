// app/hooks/collaboration/user-presence.ts - User Presence Management

import { useState, useCallback, useRef } from 'react';
import type { UserPresence, WebSocketMessage } from './types';
import { USER_COLORS } from './types';

export const useUserPresence = (
  currentUserId: string,
  sendMessage: (message: WebSocketMessage) => boolean
) => {
  const [users, setUsers] = useState<UserPresence[]>([]);
  const [currentUser, setCurrentUser] = useState<UserPresence | null>(null);
  const presenceUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ユーザー参加処理
  const handleUserJoined = useCallback((user: UserPresence) => {
    setUsers(prev => {
      const existingUserIndex = prev.findIndex(u => u.userId === user.userId);
      if (existingUserIndex >= 0) {
        const updated = [...prev];
        updated[existingUserIndex] = { ...updated[existingUserIndex], ...user };
        return updated;
      }
      return [...prev, user];
    });
  }, []);

  // ユーザー離脱処理
  const handleUserLeft = useCallback((userId: string) => {
    setUsers(prev => prev.filter(u => u.userId !== userId));
  }, []);

  // ユーザー存在状況更新
  const handleUserPresence = useCallback((presence: UserPresence) => {
    setUsers(prev => prev.map(user => 
      user.userId === presence.userId 
        ? { ...user, ...presence, lastSeen: Date.now() }
        : user
    ));
  }, []);

  // 自分のプレゼンス情報を初期化
  const initializeCurrentUser = useCallback((email: string) => {
    const colorIndex = Math.floor(Math.random() * USER_COLORS.length);
    const newCurrentUser: UserPresence = {
      userId: currentUserId,
      email,
      cursor: { x: 0, y: 0 },
      color: USER_COLORS[colorIndex] || '#FF6B6B',
      lastSeen: Date.now(),
      isActive: true
    };
    
    setCurrentUser(newCurrentUser);
    return newCurrentUser;
  }, [currentUserId]);

  // カーソル位置送信
  const sendCursorPosition = useCallback((x: number, y: number) => {
    if (!currentUser) return;

    const updatedUser = {
      ...currentUser,
      cursor: { x, y },
      lastSeen: Date.now()
    };

    setCurrentUser(updatedUser);

    // プレゼンス更新の送信をデバウンス
    if (presenceUpdateTimeoutRef.current) {
      clearTimeout(presenceUpdateTimeoutRef.current);
    }

    presenceUpdateTimeoutRef.current = setTimeout(() => {
      const message: WebSocketMessage = {
        type: 'presence',
        data: { presence: updatedUser },
        userId: currentUserId,
        timestamp: Date.now()
      };
      sendMessage(message);
    }, 100);
  }, [currentUser, currentUserId, sendMessage]);

  // メモ選択状態送信
  const sendMemoSelection = useCallback((memoId?: string) => {
    if (!currentUser) return;

    const updatedUser = {
      ...currentUser,
      selectedMemoId: memoId,
      lastSeen: Date.now()
    };

    setCurrentUser(updatedUser);

    const message: WebSocketMessage = {
      type: 'presence',
      data: { presence: updatedUser },
      userId: currentUserId,
      timestamp: Date.now()
    };
    sendMessage(message);
  }, [currentUser, currentUserId, sendMessage]);

  // アクティブユーザーの取得
  const getActiveUsers = useCallback(() => {
    const now = Date.now();
    const fiveMinutesAgo = now - 5 * 60 * 1000;
    
    return users.filter(user => 
      user.isActive && user.lastSeen > fiveMinutesAgo
    );
  }, [users]);

  // 特定メモを編集中のユーザー取得
  const getUsersEditingMemo = useCallback((memoId: string) => {
    return getActiveUsers().filter(user => user.selectedMemoId === memoId);
  }, [getActiveUsers]);

  // プレゼンス情報のクリーンアップ
  const cleanupInactiveUsers = useCallback(() => {
    const now = Date.now();
    const tenMinutesAgo = now - 10 * 60 * 1000;
    
    setUsers(prev => prev.filter(user => user.lastSeen > tenMinutesAgo));
  }, []);

  // ユーザー色の取得
  const getUserColor = useCallback((userId: string) => {
    const user = users.find(u => u.userId === userId);
    return user?.color || '#999999';
  }, [users]);

  return {
    users,
    currentUser,
    activeUsers: getActiveUsers(),
    handleUserJoined,
    handleUserLeft,
    handleUserPresence,
    initializeCurrentUser,
    sendCursorPosition,
    sendMemoSelection,
    getUsersEditingMemo,
    cleanupInactiveUsers,
    getUserColor
  };
};