// utils/fileSystem/file-operations.ts - File CRUD Operations and Utilities
// Individual file operations, workspace/settings management, and utilities

import { useEncryptionStore } from "../../app/hooks/useEncryptionStore";
import { encryptData, decryptData } from "../encryption";
import { getStoredDir, ensureDir, WORKSPACE_FILENAME, SETTINGS_FILENAME } from './directory-operations';

// File operation types
interface FileContent {
  name: string;
  content: string | object | Uint8Array;
  size: number;
}

interface WorkspaceData {
  memos: object[];
  layout: object;
  version: string;
  lastSaved: string;
}

interface SettingsData {
  theme: object;
  canvas: object;
  general: object;
  version: string;
}

interface FileOperation {
  type: 'save' | 'delete' | 'copy' | 'move';
  filename: string;
  content?: string | object | Uint8Array;
  targetFilename?: string;
  dirName?: string;
  targetDirName?: string;
}

/**
 * Sanitize filename for safe file system usage
 */
export const sanitizeFilename = (filename: string | undefined): string => {
  if (!filename) return "untitled";
  
  // 禁止文字を安全な文字に置換
  const forbidden = /[<>:"/\\|?*\[\]\{\}\(\)#]/g;
  const sanitized = filename
    .replace(forbidden, "_")
    .replace(/\s+/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 100);
  
  return sanitized || "untitled";
};

/**
 * Check if file exists in directory
 */
export const checkFileExists = async (
  filename: string,
  dirName?: string
): Promise<boolean> => {
  try {
    const root = await getStoredDir();
    if (!root) return false;
    
    const targetDir = dirName ? await root.getDirectoryHandle(dirName) : root;
    await targetDir.getFileHandle(filename);
    return true;
  } catch {
    return false;
  }
};

/**
 * Remove file if it exists
 */
export const removeFileIfExists = async (
  filename: string,
  dirName?: string
): Promise<boolean> => {
  try {
    const root = await getStoredDir();
    if (!root) return false;
    
    const targetDir = dirName ? await root.getDirectoryHandle(dirName) : root;
    await targetDir.removeEntry(filename);
    return true;
  } catch {
    return false;
  }
};

/**
 * Save individual file with optional encryption
 */
export const saveIndividualFile = async (
  filename: string,
  content: string | object | Uint8Array,
  dirName?: string,
  encrypt: boolean = false
): Promise<void> => {
  const root = await ensureDir();
  const targetDir = dirName ? await root.getDirectoryHandle(dirName, { create: true }) : root;
  
  // Remove existing file
  await removeFileIfExists(filename, dirName);
  
  // Prepare content
  let dataToSave = content;
  
  if (encrypt) {
    const { password } = useEncryptionStore.getState();
    if (password) {
      dataToSave = await encryptData(content, password);
    }
  }
  
  // Write file
  const fileHandle = await targetDir.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  
  try {
    const textContent = typeof dataToSave === 'string' 
      ? dataToSave 
      : JSON.stringify(dataToSave, null, 2);
    
    await writable.write(textContent);
    await writable.close();
  } catch (error) {
    await writable.abort();
    throw error;
  }
};

/**
 * Load individual file with optional decryption
 */
export const loadIndividualFile = async (
  filename: string,
  dirName?: string,
  decrypt: boolean = false
): Promise<any> => {
  const root = await getStoredDir();
  if (!root) return null;
  
  try {
    const targetDir = dirName ? await root.getDirectoryHandle(dirName) : root;
    const fileHandle = await targetDir.getFileHandle(filename);
    const file = await fileHandle.getFile();
    
    if (file.size === 0) return null;
    
    let content = await file.text();
    
    // Try to parse as JSON
    try {
      content = JSON.parse(content);
    } catch {
      // Keep as string if not valid JSON
    }
    
    // Decrypt if needed
    if (decrypt && content) {
      const { password } = useEncryptionStore.getState();
      if (password) {
        try {
          content = await decryptData(JSON.parse(content), password);
        } catch (decryptError) {
          console.warn('Failed to decrypt file:', filename, decryptError);
        }
      }
    }
    
    return content;
  } catch {
    return null;
  }
};

/**
 * Load all files from a directory
 */
export const loadAllFiles = async (
  dirName: string,
  filterExtension?: string
): Promise<FileContent[]> => {
  const root = await getStoredDir();
  if (!root) return [];
  
  const files: FileContent[] = [];
  
  try {
    const targetDir = await root.getDirectoryHandle(dirName);
    
    // @ts-ignore
    for await (const entry of targetDir.values()) {
      if (entry.kind === 'file') {
        if (filterExtension && !entry.name.endsWith(filterExtension)) {
          continue;
        }
        
        try {
          const fileHandle = entry as FileSystemFileHandle;
          const file = await fileHandle.getFile();
          
          if (file.size > 0) {
            let content = await file.text();
            
            // Try to parse as JSON
            try {
              content = JSON.parse(content);
            } catch {
              // Keep as string
            }
            
            files.push({
              name: entry.name,
              content,
              size: file.size
            });
          }
        } catch (fileError) {
          console.warn(`Failed to load file ${entry.name}:`, fileError);
        }
      }
    }
  } catch (dirError) {
    console.error(`Failed to access directory ${dirName}:`, dirError);
  }
  
  return files;
};

/**
 * Save workspace configuration
 */
export const saveWorkspace = async (workspaceData: WorkspaceData): Promise<void> => {
  await saveIndividualFile(WORKSPACE_FILENAME, workspaceData, undefined, false);
};

/**
 * Load workspace configuration
 */
export const loadWorkspace = async (): Promise<WorkspaceData | null> => {
  return await loadIndividualFile(WORKSPACE_FILENAME, undefined, false);
};

/**
 * Save settings configuration
 */
export const saveSettings = async (settingsData: SettingsData): Promise<void> => {
  await saveIndividualFile(SETTINGS_FILENAME, settingsData, undefined, false);
};

/**
 * Load settings configuration
 */
export const loadSettings = async (): Promise<SettingsData | null> => {
  return await loadIndividualFile(SETTINGS_FILENAME, undefined, false);
};

/**
 * Generate unique filename
 */
export const generateUniqueFilename = async (
  baseName: string,
  extension: string,
  dirName?: string
): Promise<string> => {
  let counter = 0;
  let filename = `${baseName}.${extension}`;
  
  while (await checkFileExists(filename, dirName)) {
    counter++;
    filename = `${baseName}_${counter}.${extension}`;
  }
  
  return filename;
};

/**
 * Copy file within file system
 */
export const copyFile = async (
  sourceFilename: string,
  targetFilename: string,
  sourceDirName?: string,
  targetDirName?: string
): Promise<void> => {
  const content = await loadIndividualFile(sourceFilename, sourceDirName);
  if (content !== null) {
    await saveIndividualFile(targetFilename, content, targetDirName);
  } else {
    throw new Error(`Source file ${sourceFilename} not found`);
  }
};

/**
 * Move file (copy + delete)
 */
export const moveFile = async (
  sourceFilename: string,
  targetFilename: string,
  sourceDirName?: string,
  targetDirName?: string
): Promise<void> => {
  await copyFile(sourceFilename, targetFilename, sourceDirName, targetDirName);
  await removeFileIfExists(sourceFilename, sourceDirName);
};

/**
 * Get file metadata
 */
export const getFileMetadata = async (
  filename: string,
  dirName?: string
): Promise<{
  name: string;
  size: number;
  lastModified: number;
  type: string;
} | null> => {
  try {
    const root = await getStoredDir();
    if (!root) return null;
    
    const targetDir = dirName ? await root.getDirectoryHandle(dirName) : root;
    const fileHandle = await targetDir.getFileHandle(filename);
    const file = await fileHandle.getFile();
    
    return {
      name: file.name,
      size: file.size,
      lastModified: file.lastModified,
      type: file.type
    };
  } catch {
    return null;
  }
};

/**
 * Batch file operations
 */
export const batchFileOperation = async (
  operations: FileOperation[]
): Promise<{
  successful: string[];
  failed: Array<{ filename: string; error: string }>;
}> => {
  const result = {
    successful: [] as string[],
    failed: [] as Array<{ filename: string; error: string }>
  };
  
  for (const operation of operations) {
    try {
      switch (operation.type) {
        case 'save':
          if (operation.content !== undefined) {
            await saveIndividualFile(
              operation.filename,
              operation.content,
              operation.dirName
            );
          }
          break;
          
        case 'delete':
          await removeFileIfExists(operation.filename, operation.dirName);
          break;
          
        case 'copy':
          if (operation.targetFilename) {
            await copyFile(
              operation.filename,
              operation.targetFilename,
              operation.dirName,
              operation.targetDirName
            );
          }
          break;
          
        case 'move':
          if (operation.targetFilename) {
            await moveFile(
              operation.filename,
              operation.targetFilename,
              operation.dirName,
              operation.targetDirName
            );
          }
          break;
      }
      
      result.successful.push(operation.filename);
    } catch (error) {
      result.failed.push({
        filename: operation.filename,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  return result;
};

/**
 * Clean up temporary files
 */
export const cleanupTempFiles = async (
  dirName?: string,
  maxAge: number = 24 * 60 * 60 * 1000 // 24 hours
): Promise<number> => {
  const cutoffTime = Date.now() - maxAge;
  let cleanedCount = 0;
  
  try {
    const files = await loadAllFiles(dirName || '');
    
    for (const file of files) {
      if (file.name.startsWith('temp_') || file.name.includes('.tmp')) {
        const metadata = await getFileMetadata(file.name, dirName);
        
        if (metadata && metadata.lastModified < cutoffTime) {
          const success = await removeFileIfExists(file.name, dirName);
          if (success) {
            cleanedCount++;
          }
        }
      }
    }
  } catch (error) {
    console.error('Failed to cleanup temp files:', error);
  }
  
  return cleanedCount;
};