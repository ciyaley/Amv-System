// app/hooks/collaboration/connection.ts - WebSocket Connection Management

import { useState, useRef, useCallback } from 'react';
import type { CollaborationState, WebSocketMessage } from './types';

export const useWebSocketConnection = (
  workspaceId: string,
  enabled: boolean = false
) => {
  const [connectionState, setConnectionState] = useState<Pick<CollaborationState, 'isConnected' | 'connectionQuality' | 'latency'>>({
    isConnected: false,
    connectionQuality: 'offline',
    latency: 0
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const messageHandlersRef = useRef<((message: WebSocketMessage) => void)[]>([]);

  // メッセージハンドラー登録
  const addMessageHandler = useCallback((handler: (message: WebSocketMessage) => void) => {
    messageHandlersRef.current.push(handler);
    
    return () => {
      messageHandlersRef.current = messageHandlersRef.current.filter(h => h !== handler);
    };
  }, []);

  // WebSocket接続
  const connect = useCallback(async () => {
    if (!enabled || !workspaceId) return;

    try {
      const wsUrl = process.env.NODE_ENV === 'development' 
        ? `ws://localhost:8787/ws/collaboration/${workspaceId}`
        : `wss://api.amv-system.com/ws/collaboration/${workspaceId}`;

      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        setConnectionState(prev => ({ 
          ...prev, 
          isConnected: true, 
          connectionQuality: 'excellent' 
        }));

        // ハートビート開始
        heartbeatIntervalRef.current = setInterval(() => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            const pingMessage: WebSocketMessage = {
              type: 'heartbeat',
              data: { ping: Date.now() },
              timestamp: Date.now()
            };
            wsRef.current.send(JSON.stringify(pingMessage));
          }
        }, 30000);
      };

      wsRef.current.onmessage = (event) => {
        const message: WebSocketMessage = JSON.parse(event.data);
        
        // ハートビート処理
        if (message.type === 'heartbeat' && message.data.pong) {
          const latency = Date.now() - Number(message.data.pong);
          setConnectionState(prev => ({ 
            ...prev, 
            latency: Math.round(latency),
            connectionQuality: latency < 50 ? 'excellent' : latency < 150 ? 'good' : 'poor'
          }));
          return;
        }

        // 他のハンドラーに通知
        messageHandlersRef.current.forEach(handler => {
          try {
            handler(message);
          } catch (error) {
            console.warn('Message handler error:', error);
          }
        });
      };

      wsRef.current.onclose = () => {
        setConnectionState(prev => ({ 
          ...prev, 
          isConnected: false, 
          connectionQuality: 'offline' 
        }));

        // 自動再接続
        if (enabled) {
          reconnectTimeoutRef.current = setTimeout(connect, 3000);
        }
      };

      wsRef.current.onerror = () => {
        setConnectionState(prev => ({ 
          ...prev, 
          connectionQuality: 'poor' 
        }));
      };

    } catch (error) {
      console.error('WebSocket connection error:', error);
    }
  }, [enabled, workspaceId]);

  // 切断
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setConnectionState({
      isConnected: false,
      connectionQuality: 'offline',
      latency: 0
    });
  }, []);

  // メッセージ送信
  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, []);

  // 接続状態チェック
  const isConnected = connectionState.isConnected && wsRef.current?.readyState === WebSocket.OPEN;

  return {
    connectionState,
    isConnected,
    connect,
    disconnect,
    sendMessage,
    addMessageHandler
  };
};