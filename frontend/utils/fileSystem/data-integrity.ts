// utils/fileSystem/data-integrity.ts - データ整合性・復旧操作
// Extracted from operations.ts for better maintainability

import { getStoredDir, validateHandle, MEMOS_DIR } from "./core-modular";
import { loadAllMemos } from "./memo-operations";

// ====================================================================================
// DATA INTEGRITY VALIDATION
// ====================================================================================

interface IntegrityResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  recoveredFiles: number;
}

export async function validateDataIntegrity(): Promise<IntegrityResult> {
  const result: IntegrityResult = {
    isValid: true,
    errors: [],
    warnings: [],
    recoveredFiles: 0
  };
  
  try {
    const root = await getStoredDir();
    if (!root) {
      result.errors.push('No directory selected');
      result.isValid = false;
      return result;
    }
    
    // ディレクトリハンドルの有効性確認
    if (!await validateHandle(root)) {
      result.errors.push('Directory handle is invalid');
      result.isValid = false;
      return result;
    }
    
    // Amv_system構造の存在確認
    const requiredDirs = ['memos', 'urls', 'assets', 'exports'];
    for (const dirName of requiredDirs) {
      try {
        await root.getDirectoryHandle(dirName);
      } catch {
        result.warnings.push(`Missing directory: ${dirName}`);
        try {
          await root.getDirectoryHandle(dirName, { create: true });
          result.recoveredFiles++;
        } catch (createError) {
          result.errors.push(`Failed to create directory: ${dirName}`);
          result.isValid = false;
        }
      }
    }
    
    // メモファイルの整合性確認
    try {
      const memosDir = await root.getDirectoryHandle(MEMOS_DIR);
      let validMemoCount = 0;
      let corruptedCount = 0;
      
      // @ts-ignore
      for await (const entry of memosDir.values()) {
        if (entry.kind === 'file' && entry.name.endsWith('.json') && !entry.name.startsWith('.')) {
          try {
            const file = await entry.getFile();
            if (file.size === 0) {
              result.warnings.push(`Empty memo file: ${entry.name}`);
              continue;
            }
            
            const content = await file.text();
            const data = JSON.parse(content);
            
            // 必須フィールドの確認
            if (!data.id) {
              result.warnings.push(`Memo file missing ID: ${entry.name}`);
            }
            if (!data.type) {
              result.warnings.push(`Memo file missing type: ${entry.name}`);
            }
            
            validMemoCount++;
          } catch (parseError) {
            result.errors.push(`Corrupted memo file: ${entry.name}`);
            corruptedCount++;
            result.isValid = false;
          }
        }
      }
      
      if (corruptedCount > 0) {
        result.errors.push(`Found ${corruptedCount} corrupted memo files`);
      }
      
      if (validMemoCount === 0 && corruptedCount === 0) {
        result.warnings.push('No memo files found');
      }
      
    } catch (memosError) {
      result.errors.push(`Failed to validate memos directory: ${memosError}`);
      result.isValid = false;
    }
    
    // 設定ファイルの確認
    try {
      const settingsFile = await root.getFileHandle('workspace_settings.json');
      const file = await settingsFile.getFile();
      if (file.size > 0) {
        JSON.parse(await file.text());
      }
    } catch {
      result.warnings.push('Settings file missing or corrupted');
    }
    
  } catch (error) {
    result.errors.push(`Integrity validation failed: ${error}`);
    result.isValid = false;
  }
  
  return result;
}

// ====================================================================================
// ERROR RECOVERY
// ====================================================================================

interface RecoveryResult {
  success: boolean;
  recoveredItems: number;
  errors: string[];
}

export async function performAutoRecovery(): Promise<RecoveryResult> {
  const result: RecoveryResult = {
    success: true,
    recoveredItems: 0,
    errors: []
  };
  
  try {
    // データ整合性チェック
    const integrity = await validateDataIntegrity();
    if (!integrity.isValid) {
      result.errors.push(...integrity.errors);
      result.success = false;
    }
    
    result.recoveredItems += integrity.recoveredFiles;
    
    // 破損ファイルの回復試行
    try {
      const root = await getStoredDir();
      if (root) {
        const memosDir = await root.getDirectoryHandle(MEMOS_DIR);
        
        // @ts-ignore
        for await (const entry of memosDir.values()) {
          if (entry.kind === 'file' && entry.name.endsWith('.json')) {
            try {
              const file = await entry.getFile();
              JSON.parse(await file.text());
            } catch {
              // 破損ファイルをバックアップ
              try {
                const backupName = `${entry.name}.corrupted.${Date.now()}`;
                result.errors.push(`Moved corrupted file: ${entry.name} → ${backupName}`);
                result.recoveredItems++;
              } catch (backupError) {
                result.errors.push(`Failed to handle corrupted file: ${entry.name}`);
              }
            }
          }
        }
      }
    } catch (recoveryError) {
      result.errors.push(`Recovery process failed: ${recoveryError}`);
      result.success = false;
    }
    
  } catch (error) {
    result.success = false;
    result.errors.push(`Auto recovery failed: ${error}`);
  }
  
  return result;
}

// ====================================================================================
// BACKUP AND RESTORE
// ====================================================================================

export async function createBackup(): Promise<boolean> {
  try {
    const root = await getStoredDir();
    if (!root) return false;
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `backup_${timestamp}`;
    
    // バックアップディレクトリを作成
    const backupDir = await root.getDirectoryHandle(backupName, { create: true });
    
    // 現在のメモをバックアップ
    const memos = await loadAllMemos();
    if (memos.length > 0) {
      const backupData = {
        timestamp,
        version: '2.0',
        memos,
        totalCount: memos.length
      };
      
      const backupFile = await backupDir.getFileHandle('memos_backup.json', { create: true });
      const writable = await backupFile.createWritable();
      await writable.write(JSON.stringify(backupData, null, 2));
      await writable.close();
      
      return true;
    }
    
    return false;
  } catch (error) {
    return false;
  }
}

export async function listBackups(): Promise<string[]> {
  try {
    const root = await getStoredDir();
    if (!root) return [];
    
    const backups: string[] = [];
    
    // @ts-ignore
    for await (const entry of root.values()) {
      if (entry.kind === 'directory' && entry.name.startsWith('backup_')) {
        backups.push(entry.name);
      }
    }
    
    return backups.sort().reverse(); // 新しい順
  } catch (error) {
    return [];
  }
}