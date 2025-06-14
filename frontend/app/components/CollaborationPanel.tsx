/**
 * Collaboration Panel Component
 * Real-time collaboration UI and controls
 */

"use client";

import React from 'react';
import { X, Users, Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import type { CollaborationHookReturnType } from '../hooks/collaboration/types';

interface CollaborationPanelProps {
  isVisible: boolean;
  onClose: () => void;
  collaboration: CollaborationHookReturnType;
  currentMemoId?: string;
}

export const CollaborationPanel: React.FC<CollaborationPanelProps> = ({
  isVisible,
  onClose,
  collaboration,
  currentMemoId
}) => {
  if (!isVisible) return null;

  const {
    isConnected,
    activeUsers,
    userCount,
    connectionQuality,
    latency,
    conflictCount,
    showConflictDialog,
    pendingConflict,
    resolveConflict,
    connect,
    disconnect
  } = collaboration;

  const getConnectionIcon = () => {
    if (!isConnected) return <WifiOff className="w-5 h-5 text-red-500" />;
    if (connectionQuality === 'poor') return <AlertTriangle className="w-5 h-5 text-orange-500" />;
    return <Wifi className="w-5 h-5 text-green-500" />;
  };

  const getConnectionStatus = () => {
    if (!isConnected) return 'Disconnected';
    return `Connected (${connectionQuality})`;
  };

  return (
    <>
      {/* Main Panel */}
      <div className="fixed top-20 right-4 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" />
            <h3 className="font-semibold">Collaboration</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Connection Status */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {getConnectionIcon()}
              <span className="text-sm font-medium">{getConnectionStatus()}</span>
            </div>
            <div className="flex gap-1">
              <button
                onClick={isConnected ? disconnect : () => connect('ws://localhost:8080')}
                className={`px-2 py-1 text-xs rounded ${
                  isConnected 
                    ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
              >
                {isConnected ? 'Disconnect' : 'Connect'}
              </button>
            </div>
          </div>
          
          {isConnected && (
            <div className="text-xs text-gray-500 space-y-1">
              <div>Latency: {latency}ms</div>
              <div>Active Users: {userCount}</div>
              {conflictCount > 0 && (
                <div className="text-orange-600">
                  Conflicts resolved: {conflictCount}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Active Users */}
        <div className="p-4 border-b border-gray-200">
          <h4 className="text-sm font-medium mb-2">Active Users ({activeUsers.length})</h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {activeUsers.length === 0 ? (
              <div className="text-xs text-gray-500">No other users online</div>
            ) : (
              activeUsers.map((user) => (
                <div key={user.userId} className="flex items-center gap-2 text-sm">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: user.color }}
                  />
                  <span className="truncate">{user.email}</span>
                  {user.selectedMemoId === currentMemoId && (
                    <span className="text-xs text-blue-500">viewing same memo</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* User Cursors Indicator */}
        <div className="p-4">
          <h4 className="text-sm font-medium mb-2">Real-time Features</h4>
          <div className="space-y-2 text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full" />
              Cursor positions shared
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full" />
              Memo selections synchronized
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-400 rounded-full" />
              Text changes in real-time
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-orange-400 rounded-full" />
              Conflict resolution enabled
            </div>
          </div>
        </div>
      </div>

      {/* Conflict Resolution Dialog */}
      {showConflictDialog && pendingConflict && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60">
          <div className="bg-white rounded-lg shadow-xl w-96 p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Resolve Conflict
            </h3>
            
            <p className="text-sm text-gray-600 mb-4">
              Multiple users edited the same memo simultaneously. Choose how to resolve:
            </p>
            
            <div className="space-y-2 mb-4">
              <button
                onClick={() => resolveConflict(0, 'last_write_wins')}
                className="w-full p-2 text-left text-sm bg-gray-50 hover:bg-gray-100 rounded border"
              >
                Use latest version (recommended)
              </button>
              <button
                onClick={() => resolveConflict(0, 'operational_transform')}
                className="w-full p-2 text-left text-sm bg-gray-50 hover:bg-gray-100 rounded border"
              >
                Merge changes automatically
              </button>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => resolveConflict(0, 'last_write_wins')}
                className="flex-1 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Resolve
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};