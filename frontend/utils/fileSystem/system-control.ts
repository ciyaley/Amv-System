// utils/fileSystem/system-control.ts - File System Control and Validation
// System-level controls, authentication checks, and handle validation

import { useEncryptionStore } from "../../app/hooks/useEncryptionStore";

// Global file system state
let fileSystemEnabled = true;
let currentDirHandle: FileSystemDirectoryHandle | null = null;

/**
 * Stop all file system operations
 */
export const stopFileSystemOperations = async (): Promise<void> => {
  if (typeof window === 'undefined') return;
  
  try {
    // Clear stored directory handle
    localStorage.removeItem('amv_directory_handle');
    
    // Clear directory info
    const { clearDirectoryInfo } = await import('../dirHandleStore');
    clearDirectoryInfo();
    
    // Disable file system
    fileSystemEnabled = false;
    currentDirHandle = null;
    
  } catch (error) {
    console.error('Error stopping file system operations:', error);
  }
};

/**
 * Enable file system operations
 */
export const enableFileSystemOperations = (): void => {
  fileSystemEnabled = true;
};

/**
 * Check if file system operations are enabled
 */
export const checkFileSystemEnabled = (): boolean => {
  if (typeof window === 'undefined') return false;
  return fileSystemEnabled && 'showDirectoryPicker' in window;
};

/**
 * Check if user is authenticated for file access
 */
export const checkAuthenticationForFileAccess = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  try {
    const { password } = useEncryptionStore.getState();
    
    if (password) {
      return true; // 認証済み
    }
    
    // セッションストレージでのログアウト状態チェック
    const logoutInProgress = sessionStorage.getItem('logout_in_progress');
    if (logoutInProgress === 'true') {
      return false;
    }
    
    return false; // 未認証
  } catch (error) {
    return false;
  }
};

/**
 * Validate directory handle accessibility
 */
export async function validateHandle(handle: FileSystemDirectoryHandle): Promise<boolean> {
  if (!handle) return false;
  
  try {
    // 権限チェック
    const permission = await (handle as any).requestPermission({ mode: "readwrite" });
    if (permission !== "granted") {
      return false;
    }
    
    // ハンドルへのアクセステスト
    try {
      const valuesIterator = (handle as any).values();
      await valuesIterator.next();
      return true;
    } catch (iteratorError) {
      return false;
    }
  } catch (error) {
    return false;
  }
}

/**
 * Normalize error messages for consistent handling
 */
export const normalizeError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown error occurred';
};

/**
 * Check if browser supports File System Access API
 */
export const checkFileSystemSupport = (): boolean => {
  if (typeof window === 'undefined') return false;
  return 'showDirectoryPicker' in window;
};

/**
 * Check if current browser is in secure context
 */
export const checkSecureContext = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.isSecureContext;
};

/**
 * Get file system operation status
 */
export const getFileSystemStatus = (): {
  enabled: boolean;
  supported: boolean;
  authenticated: boolean;
  secureContext: boolean;
  hasDirectoryHandle: boolean;
} => {
  return {
    enabled: checkFileSystemEnabled(),
    supported: checkFileSystemSupport(),
    authenticated: checkAuthenticationForFileAccess(),
    secureContext: checkSecureContext(),
    hasDirectoryHandle: currentDirHandle !== null
  };
};

/**
 * Set current directory handle (internal use)
 */
export const setCurrentDirectoryHandle = (handle: FileSystemDirectoryHandle | null): void => {
  currentDirHandle = handle;
};

/**
 * Get current directory handle (internal use)
 */
export const getCurrentDirectoryHandle = (): FileSystemDirectoryHandle | null => {
  return currentDirHandle;
};

/**
 * Clear current directory handle
 */
export const clearCurrentDirectoryHandle = (): void => {
  currentDirHandle = null;
};

/**
 * Validate file system permissions
 */
export const validateFileSystemPermissions = async (
  handle: FileSystemDirectoryHandle
): Promise<{
  read: boolean;
  write: boolean;
  error?: string;
}> => {
  try {
    // Read permission check
    const readPermission = await (handle as any).requestPermission({ mode: "read" });
    const read = readPermission === "granted";
    
    // Write permission check
    const writePermission = await (handle as any).requestPermission({ mode: "readwrite" });
    const write = writePermission === "granted";
    
    return { read, write };
  } catch (error) {
    return {
      read: false,
      write: false,
      error: normalizeError(error)
    };
  }
};

/**
 * Check if handle is still accessible (not revoked)
 */
export const checkHandleAccessibility = async (
  handle: FileSystemDirectoryHandle
): Promise<boolean> => {
  try {
    // Try to access the handle's properties
    const name = handle.name;
    if (!name) return false;
    
    // Try to list entries (minimal operation)
    const iterator = (handle as any).values();
    await iterator.next();
    
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * File system error types
 */
export enum FileSystemErrorType {
  NOT_SUPPORTED = 'NOT_SUPPORTED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  NOT_FOUND = 'NOT_FOUND',
  INVALID_HANDLE = 'INVALID_HANDLE',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN = 'UNKNOWN'
}

/**
 * Classify file system errors
 */
export const classifyFileSystemError = (error: unknown): FileSystemErrorType => {
  const message = normalizeError(error).toLowerCase();
  
  if (message.includes('not supported') || message.includes('undefined')) {
    return FileSystemErrorType.NOT_SUPPORTED;
  }
  if (message.includes('permission') || message.includes('denied')) {
    return FileSystemErrorType.PERMISSION_DENIED;
  }
  if (message.includes('not found') || message.includes('does not exist')) {
    return FileSystemErrorType.NOT_FOUND;
  }
  if (message.includes('invalid') || message.includes('corrupted')) {
    return FileSystemErrorType.INVALID_HANDLE;
  }
  if (message.includes('quota') || message.includes('storage')) {
    return FileSystemErrorType.QUOTA_EXCEEDED;
  }
  if (message.includes('network') || message.includes('connection')) {
    return FileSystemErrorType.NETWORK_ERROR;
  }
  
  return FileSystemErrorType.UNKNOWN;
};