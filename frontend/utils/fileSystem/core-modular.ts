// utils/fileSystem/core-modular.ts - Modular Core Exports
// Unified exports from the new modular file system architecture

// System Control Exports
export {
  stopFileSystemOperations,
  enableFileSystemOperations,
  checkFileSystemEnabled,
  checkAuthenticationForFileAccess,
  validateHandle,
  normalizeError,
  checkFileSystemSupport,
  checkSecureContext,
  getFileSystemStatus,
  validateFileSystemPermissions,
  checkHandleAccessibility,
  FileSystemErrorType,
  classifyFileSystemError
} from './system-control';

// Directory Operations Exports
export {
  FOLDER_NAME,
  MEMOS_DIR,
  URLS_DIR,
  ASSETS_DIR,
  EXPORTS_DIR,
  WORKSPACE_FILENAME,
  SETTINGS_FILENAME,
  storeDirHandle,
  getStoredDir,
  requestDirectory,
  clearFileSystemCache,
  resetDirectoryHandle,
  ensureDir,
  createAmvSystemStructure,
  getOrCreateDirectory,
  checkDirectoryExists,
  listDirectoryContents,
  getDirectoryStats,
  validateDirectoryStructure,
  repairDirectoryStructure,
  getDirectoryInfo
} from './directory-operations';

// File Operations Exports
export {
  sanitizeFilename,
  checkFileExists,
  removeFileIfExists,
  saveIndividualFile,
  loadIndividualFile,
  loadAllFiles,
  saveWorkspace,
  loadWorkspace,
  saveSettings,
  loadSettings,
  generateUniqueFilename,
  copyFile,
  moveFile,
  getFileMetadata,
  batchFileOperation,
  cleanupTempFiles
} from './file-operations';

// Legacy compatibility types and interfaces
export interface DirectoryInfo {
  name: string;
  isAccessible: boolean;
  hasPermission: boolean;
  stats: {
    totalFiles: number;
    totalDirectories: number;
    totalSize?: number;
  };
}

export interface FileMetadata {
  name: string;
  size: number;
  lastModified: number;
  type: string;
}

export interface BatchOperationResult {
  successful: string[];
  failed: Array<{ filename: string; error: string }>;
}

// Module metadata
export const CORE_MODULE_INFO = {
  version: '2.0.0',
  architecture: 'Modular File System Core',
  modules: [
    'system-control.ts (validation, permissions)',
    'directory-operations.ts (handle management)',
    'file-operations.ts (CRUD operations)',
    'core-modular.ts (unified exports)'
  ],
  originalFileSize: '591 lines → 3 modular files',
  benefits: [
    'Separation of concerns',
    'Better testability', 
    'Reduced complexity',
    'Enhanced maintainability'
  ]
} as const;