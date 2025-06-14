// app/hooks/collaboration/types.ts - Collaboration Type Definitions

export interface UserPresence {
  userId: string;
  email: string;
  cursor: { x: number; y: number };
  selectedMemoId?: string;
  color: string;
  lastSeen: number;
  isActive: boolean;
}

export interface Operation {
  type: 'insert' | 'delete' | 'retain' | 'memo_move' | 'memo_create' | 'memo_delete';
  data: OperationData;
  userId: string;
  timestamp: number;
  memoId?: string;
  position?: number;
  content?: string;
}

export interface OperationData {
  x?: number;
  y?: number;
  position?: { x: number; y: number };
  text?: string;
  index?: number;
  length?: number;
  [key: string]: unknown;
}

export interface CollaborationState {
  isConnected: boolean;
  users: UserPresence[];
  connectionQuality: 'excellent' | 'good' | 'poor' | 'offline';
  latency: number;
  operationQueue: Operation[];
  conflictCount: number;
}

export interface ConflictResolution {
  strategy: 'last_write_wins' | 'operational_transform' | 'user_choice';
  resolved: boolean;
  finalState: ConflictState;
}

export interface ConflictState {
  data: OperationData;
  timestamp: number;
  userId: string;
  conflictType?: string;
}

export interface WebSocketMessage {
  type: 'operation' | 'presence' | 'user_joined' | 'user_left' | 'heartbeat' | 'conflict';
  data: MessageData;
  userId?: string;
  timestamp: number;
}

export interface MessageData {
  operation?: Operation;
  user?: UserPresence;
  presence?: UserPresence;
  conflictId?: number;
  strategy?: ConflictResolution['strategy'];
  resolvedData?: ConflictState;
  type?: string;
  [key: string]: unknown;
}

export interface ConnectionConfig {
  url: string;
  reconnectAttempts: number;
  heartbeatInterval: number;
  timeout: number;
}

export interface OperationTransformResult {
  transformedOp: Operation;
  conflicts: Operation[];
}

export const USER_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
] as const;

export interface CollaborationHookReturnType {
  // Connection state
  isConnected: boolean;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'offline';
  latency: number;
  
  // User management
  activeUsers: UserPresence[];
  userCount: number;
  currentUser: UserPresence | null;
  
  // Operations
  operationQueue: Operation[];
  conflictCount: number;
  showConflictDialog: boolean;
  pendingConflict: ConflictResolution | null;
  
  // Functions
  connect: (url: string) => Promise<void>;
  disconnect: () => void;
  sendOperation: (operation: Operation) => void;
  updatePresence: (presence: Partial<UserPresence>) => void;
  resolveConflict: (conflictId: number, strategy: ConflictResolution['strategy']) => void;
  
  // User Presence
  broadcastCursorPosition: (position: { x: number; y: number }) => void;
  broadcastMemoSelection: (memoId: string) => void;
  getUsersEditingMemo: (memoId: string) => UserPresence[];
  getUserColor: (userId: string) => string;
  
  // Conflict Resolution
  getConflictStats: () => { totalConflicts: number; pendingConflicts: number; hasActiveConflict: boolean };
  
  // Utils
  initializeUser: (userInfo: { userId: string; email: string }) => void;
  isReady: boolean;
}