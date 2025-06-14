// utils/fileSystem/directory-operations.ts - Directory Management and Structure Operations
// Directory creation, handle management, and AMV system structure

import { saveDirectoryInfo, getLastDirectoryInfo } from "../dirHandleStore";
import { 
  validateHandle, 
  checkFileSystemEnabled, 
  setCurrentDirectoryHandle,
  getCurrentDirectoryHandle,
  clearCurrentDirectoryHandle
} from './system-control';

// Constants
export const FOLDER_NAME = "Amv_system";
export const MEMOS_DIR = "memos";
export const URLS_DIR = "urls";
export const ASSETS_DIR = "assets";
export const EXPORTS_DIR = "exports";
export const WORKSPACE_FILENAME = "workspace.json";
export const SETTINGS_FILENAME = "settings.json";

/**
 * Store directory handle in localStorage and state
 */
export const storeDirHandle = async (handle: FileSystemDirectoryHandle): Promise<void> => {
  if (typeof window === 'undefined') return;
  
  try {
    setCurrentDirectoryHandle(handle);
    await saveDirectoryInfo(handle);
  } catch (error) {
    console.error('Failed to store directory handle:', error);
    throw error;
  }
};

/**
 * Get stored directory handle
 */
export const getStoredDir = async (): Promise<FileSystemDirectoryHandle | null> => {
  if (!checkFileSystemEnabled()) {
    return null;
  }

  try {
    // Check in-memory handle first
    const currentHandle = getCurrentDirectoryHandle();
    if (currentHandle && await validateHandle(currentHandle)) {
      return currentHandle;
    }

    // Load from localStorage
    const dirInfo = getLastDirectoryInfo();
    if (!dirInfo) {
      return null;
    }

    // Try to get handle from stored directory
    const storedHandle = await getStoredDir();
    if (!storedHandle || !(await validateHandle(storedHandle))) {
      return null;
    }

    // Use the validated stored handle
    setCurrentDirectoryHandle(storedHandle);
    return storedHandle;
  } catch (error) {
    return null;
  }
};

/**
 * Request directory picker from user
 */
export const requestDirectory = async (): Promise<FileSystemDirectoryHandle> => {
  if (!checkFileSystemEnabled()) {
    throw new Error("File System Access API is not supported");
  }

  try {
    const dirHandle = await (window as any).showDirectoryPicker({
      mode: 'readwrite',
      startIn: 'documents',
      id: 'amv-workspace'
    });

    await storeDirHandle(dirHandle);
    return dirHandle;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error("Directory selection was cancelled");
    }
    throw error;
  }
};

/**
 * Clear file system cache and handles
 */
export const clearFileSystemCache = async (): Promise<void> => {
  try {
    clearCurrentDirectoryHandle();
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('amv_directory_handle');
      localStorage.removeItem('amv_directory_info');
    }
  } catch (error) {
    console.error('Failed to clear file system cache:', error);
  }
};

/**
 * Reset directory handle (for logout/cleanup)
 */
export const resetDirectoryHandle = async (): Promise<void> => {
  await clearFileSystemCache();
};

/**
 * Ensure directory exists and is accessible
 */
export const ensureDir = async (): Promise<FileSystemDirectoryHandle> => {
  let handle = await getStoredDir();
  
  if (!handle) {
    handle = await requestDirectory();
  }
  
  if (!await validateHandle(handle)) {
    throw new Error("Directory handle is no longer valid");
  }
  
  return handle;
};

/**
 * Create AMV system directory structure
 */
export const createAmvSystemStructure = async (): Promise<void> => {
  const rootHandle = await ensureDir();
  
  try {
    // Create required directories
    const requiredDirs = [MEMOS_DIR, URLS_DIR, ASSETS_DIR, EXPORTS_DIR];
    
    for (const dirName of requiredDirs) {
      try {
        await rootHandle.getDirectoryHandle(dirName, { create: true });
      } catch (error) {
        console.warn(`Failed to create directory ${dirName}:`, error);
      }
    }
  } catch (error) {
    console.error('Failed to create AMV system structure:', error);
    throw error;
  }
};

/**
 * Get or create specific directory
 */
export const getOrCreateDirectory = async (
  dirName: string,
  parentHandle?: FileSystemDirectoryHandle
): Promise<FileSystemDirectoryHandle> => {
  const parent = parentHandle || await ensureDir();
  
  try {
    return await parent.getDirectoryHandle(dirName, { create: true });
  } catch (error) {
    throw new Error(`Failed to get or create directory '${dirName}': ${error}`);
  }
};

/**
 * Check if directory exists
 */
export const checkDirectoryExists = async (
  dirName: string,
  parentHandle?: FileSystemDirectoryHandle
): Promise<boolean> => {
  try {
    const parent = parentHandle || await getStoredDir();
    if (!parent) return false;
    
    await parent.getDirectoryHandle(dirName);
    return true;
  } catch {
    return false;
  }
};

/**
 * List directory contents
 */
export const listDirectoryContents = async (
  handle?: FileSystemDirectoryHandle
): Promise<Array<{ name: string; kind: 'file' | 'directory' }>> => {
  const dir = handle || await getStoredDir();
  if (!dir) return [];
  
  const contents: Array<{ name: string; kind: 'file' | 'directory' }> = [];
  
  try {
    // @ts-ignore
    for await (const entry of dir.values()) {
      contents.push({
        name: entry.name,
        kind: entry.kind
      });
    }
  } catch (error) {
    console.error('Failed to list directory contents:', error);
  }
  
  return contents;
};

/**
 * Get directory statistics
 */
export const getDirectoryStats = async (
  handle?: FileSystemDirectoryHandle
): Promise<{
  totalFiles: number;
  totalDirectories: number;
  totalSize?: number;
}> => {
  const dir = handle || await getStoredDir();
  if (!dir) {
    return { totalFiles: 0, totalDirectories: 0 };
  }
  
  let totalFiles = 0;
  let totalDirectories = 0;
  let totalSize = 0;
  
  try {
    // @ts-ignore
    for await (const entry of dir.values()) {
      if (entry.kind === 'file') {
        totalFiles++;
        try {
          const file = await entry.getFile();
          totalSize += file.size;
        } catch {
          // Skip files that can't be accessed
        }
      } else if (entry.kind === 'directory') {
        totalDirectories++;
      }
    }
  } catch (error) {
    console.error('Failed to get directory stats:', error);
  }
  
  return { totalFiles, totalDirectories, totalSize };
};

/**
 * Validate directory structure integrity
 */
export const validateDirectoryStructure = async (): Promise<{
  valid: boolean;
  missingDirectories: string[];
  errors: string[];
}> => {
  const result = {
    valid: true,
    missingDirectories: [] as string[],
    errors: [] as string[]
  };
  
  try {
    const rootHandle = await getStoredDir();
    if (!rootHandle) {
      result.valid = false;
      result.errors.push('No root directory handle available');
      return result;
    }
    
    // Check required directories
    const requiredDirs = [MEMOS_DIR, URLS_DIR, ASSETS_DIR, EXPORTS_DIR];
    
    for (const dirName of requiredDirs) {
      try {
        await rootHandle.getDirectoryHandle(dirName);
      } catch {
        result.missingDirectories.push(dirName);
        result.valid = false;
      }
    }
    
    if (result.missingDirectories.length > 0) {
      result.errors.push(`Missing directories: ${result.missingDirectories.join(', ')}`);
    }
    
  } catch (error) {
    result.valid = false;
    result.errors.push(`Structure validation failed: ${error}`);
  }
  
  return result;
};

/**
 * Repair directory structure
 */
export const repairDirectoryStructure = async (): Promise<{
  success: boolean;
  repairedDirectories: string[];
  errors: string[];
}> => {
  const result = {
    success: true,
    repairedDirectories: [] as string[],
    errors: [] as string[]
  };
  
  try {
    const validation = await validateDirectoryStructure();
    
    if (validation.valid) {
      return result; // Nothing to repair
    }
    
    const rootHandle = await ensureDir();
    
    // Create missing directories
    for (const dirName of validation.missingDirectories) {
      try {
        await rootHandle.getDirectoryHandle(dirName, { create: true });
        result.repairedDirectories.push(dirName);
      } catch (error) {
        result.errors.push(`Failed to create directory '${dirName}': ${error}`);
        result.success = false;
      }
    }
    
  } catch (error) {
    result.success = false;
    result.errors.push(`Directory repair failed: ${error}`);
  }
  
  return result;
};

/**
 * Get directory handle info
 */
export const getDirectoryInfo = async (
  handle?: FileSystemDirectoryHandle
): Promise<{
  name: string;
  isAccessible: boolean;
  hasPermission: boolean;
  stats: {
    totalFiles: number;
    totalDirectories: number;
    totalSize?: number;
  };
} | null> => {
  const dir = handle || await getStoredDir();
  if (!dir) return null;
  
  try {
    const isAccessible = await validateHandle(dir);
    const hasPermission = isAccessible; // validateHandle checks permissions
    const stats = await getDirectoryStats(dir);
    
    return {
      name: dir.name,
      isAccessible,
      hasPermission,
      stats
    };
  } catch (error) {
    return null;
  }
};