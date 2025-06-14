// frontend/app/components/GeneralSettings.tsx
"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { runFullAutoTest, runJWTTest } from "../../utils/autoTestRunner";
import { getStoredDir, requestDirectory } from "../../utils/fileAccess";
import { 
  validateDataIntegrity, 
  performAutoRecovery
} from "../../utils/fileSystem";
import { MessageHelpers, SonnerMessageDisplayHandler, setGlobalMessageHandler } from "../../utils/messageSystem";
import { validateStorageState, formatValidationResult } from "../../utils/storageValidator";
import { useAuth } from "../hooks/useAuth";
import { useCanvasStore } from "../hooks/useCanvas";

export const GeneralSettings = () => {
  const { width, height, zoom, setWidth, setHeight, setZoom, resetPan } =
    useCanvasStore();
  const { isLoggedIn } = useAuth();
  const [directoryPath, setDirectoryPath] = useState<string>('未選択');
  const [isLoading, setIsLoading] = useState(false);
  const [validationResult, setValidationResult] = useState<string>('');
  
  // データ整合性検証機能用の状態
  const [integrityResult, setIntegrityResult] = useState<string>('');
  const [isIntegrityChecking, setIsIntegrityChecking] = useState(false);
  const [integrityReport, setIntegrityReport] = useState<string>('');

  // メッセージハンドラーの初期化
  useEffect(() => {
    const messageHandler = new SonnerMessageDisplayHandler(toast);
    setGlobalMessageHandler(messageHandler);
  }, []);

  // ディレクトリ情報を取得
  const checkCurrentDirectory = async () => {
    try {
      const dir = await getStoredDir();
      if (dir) {
        setDirectoryPath(dir.name || 'フォルダが選択済み');
      } else {
        setDirectoryPath('未選択');
      }
    } catch {
      setDirectoryPath('未選択');
    }
  };

  // コンポーネント初期化時にディレクトリ状態をチェック
  useEffect(() => {
    if (isLoggedIn) {
      checkCurrentDirectory();
    }
  }, [isLoggedIn]);

  const handleSelectDirectory = async () => {
    setIsLoading(true);
    try {
      await requestDirectory();
      await checkCurrentDirectory();
      toast.success('保存フォルダが設定されました');
    } catch {
      toast.error('フォルダの選択に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleValidateStorage = async () => {
    try {
      const result = await validateStorageState();
      const formatted = formatValidationResult(result);
      setValidationResult(formatted);
      
      if (result.isValid) {
        toast.success('ストレージ状態は正常です');
      } else {
        toast.warning('ストレージに問題が検出されました');
      }
    } catch (error) {
      toast.error('ストレージバリデーションに失敗しました');
      setValidationResult(`エラー: ${error}`);
    }
  };

  const handleRunAutoTest = async () => {
    try {
      toast.info('自動テストを実行中...');
      await runFullAutoTest();
      
      // JWT専用テストも実行
      const jwtResult = await runJWTTest();
      
      if (jwtResult.autologinWorks) {
        toast.success('自動テスト完了: 全て正常');
      } else {
        toast.warning('自動テスト完了: 一部問題あり（コンソール確認）');
      }
      
      // 結果をバリデーション結果にも反映
      await handleValidateStorage();
    } catch {
      toast.error('自動テストに失敗しました');
    }
  };

  // データ整合性検証ハンドラー
  const handleIntegrityCheck = async () => {
    setIsIntegrityChecking(true);
    try {
      toast.info('データ整合性を検証中...');
      
      const validation = await validateDataIntegrity();
      
      setIntegrityResult(JSON.stringify(validation, null, 2));
      setIntegrityReport(`整合性チェック完了: ${validation.errors.length}個のエラー, ${validation.warnings.length}個の警告`);
      
      if (validation.isValid) {
        const successMessage = MessageHelpers.validationSuccess({ 
          operation: 'data_integrity_check',
          component: 'GeneralSettings'
        });
        toast.success(successMessage.message);
      } else {
        const issues = validation.errors.length + validation.warnings.length;
        const warningMessage = MessageHelpers.validationIssuesFound({ 
          operation: 'data_integrity_check',
          component: 'GeneralSettings'
        }, issues);
        toast.warning(warningMessage.message);
      }
    } catch (error) {
      const errorMessage = MessageHelpers.operationFailed({ 
        operation: 'data_integrity_check',
        component: 'GeneralSettings'
      }, 'データ整合性検証');
      toast.error(errorMessage.message);
      setIntegrityResult(`エラー: ${error}`);
    } finally {
      setIsIntegrityChecking(false);
    }
  };

  // 自動回復ハンドラー
  const handleAutoRecovery = async () => {
    try {
      toast.info('自動回復システムを実行中...');
      
      const recovery = await performAutoRecovery();
      
      if (recovery.success) {
        const successMessage = MessageHelpers.autoRecoverySuccess({ 
          operation: 'auto_recovery',
          component: 'GeneralSettings'
        }, recovery.recoveredItems);
        toast.success(successMessage.message);
      } else {
        const partialMessage = MessageHelpers.autoRecoveryPartial({ 
          operation: 'auto_recovery',
          component: 'GeneralSettings'
        }, recovery.recoveredItems, recovery.errors.length);
        toast.warning(partialMessage.message);
      }
      
      // 回復後に再度整合性チェック
      await handleIntegrityCheck();
    } catch {
      const errorMessage = MessageHelpers.operationFailed({ 
        operation: 'auto_recovery',
        component: 'GeneralSettings'
      }, '自動回復');
      toast.error(errorMessage.message);
    }
  };

  // システム健全性チェックハンドラー
  const handleHealthCheck = async () => {
    try {
      toast.info('システム健全性をチェック中...');
      
      // Simplified health check using existing functions
      const integrity = await validateDataIntegrity();
      
      if (integrity.isValid) {
        const successMessage = MessageHelpers.healthCheckPassed({ 
          operation: 'health_check',
          component: 'GeneralSettings'
        });
        toast.success(successMessage.message);
      } else {
        const warningMessage = MessageHelpers.healthCheckFailed({ 
          operation: 'health_check',
          component: 'GeneralSettings'
        }, integrity.errors.length + integrity.warnings.length);
        toast.warning(warningMessage.message);
      }
      
      setIntegrityResult(JSON.stringify(integrity, null, 2));
    } catch {
      const errorMessage = MessageHelpers.operationFailed({ 
        operation: 'health_check',
        component: 'GeneralSettings'
      }, '健全性チェック');
      toast.error(errorMessage.message);
    }
  };

  // エマージェンシー復旧ハンドラー
  const handleEmergencyRecovery = async () => {
    if (!confirm('エマージェンシー復旧を実行しますか？この操作はシステムをリセットします。')) {
      return;
    }
    
    try {
      const activatedMessage = MessageHelpers.emergencyRecoveryActivated({ 
        operation: 'emergency_recovery',
        component: 'GeneralSettings'
      });
      toast.info(activatedMessage.message);
      
      // Use performAutoRecovery as emergency recovery
      const emergency = await performAutoRecovery();
      
      if (emergency.success) {
        const successMessage = MessageHelpers.emergencyRecoverySuccess({ 
          operation: 'emergency_recovery',
          component: 'GeneralSettings'
        });
        toast.success(successMessage.message);
      } else {
        const errorMessage = MessageHelpers.operationFailed({ 
          operation: 'emergency_recovery',
          component: 'GeneralSettings'
        }, 'エマージェンシー復旧');
        toast.error(errorMessage.message);
      }
      
      setIntegrityResult(JSON.stringify(emergency, null, 2));
    } catch {
      const errorMessage = MessageHelpers.operationFailed({ 
        operation: 'emergency_recovery',
        component: 'GeneralSettings'
      }, 'エマージェンシー復旧');
      toast.error(errorMessage.message);
    }
  };

  return (
    <div role="tabpanel" className="space-y-6">
      {/* ファイル保存場所設定（ログイン時のみ表示） */}
      {isLoggedIn && (
        <div className="border-b border-gray-200 pb-4">
          <h3 className="text-lg font-medium text-gray-900 mb-3">ファイル保存設定</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">保存フォルダ:</label>
                <p className="text-sm text-gray-500 mt-1">{directoryPath}</p>
              </div>
              <button
                onClick={handleSelectDirectory}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? '選択中...' : 'フォルダを選択'}
              </button>
            </div>
            <p className="text-xs text-gray-400">
              メモとワークスペースの保存先フォルダを選択できます。
            </p>
          </div>
        </div>
      )}

      {/* ストレージバリデーション */}
      <div className="border-b border-gray-200 pb-4">
        <h3 className="text-lg font-medium text-gray-900 mb-3">ストレージ診断</h3>
        <div className="space-y-3">
          <div className="flex gap-2">
            <button
              onClick={handleValidateStorage}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
            >
              ストレージ状態をチェック
            </button>
            <button
              onClick={handleRunAutoTest}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              完全自動テスト実行
            </button>
          </div>
          <p className="text-xs text-gray-400">
            認証状態、ファイルアクセス権限、ディレクトリ情報などを確認します。自動テストは詳細な結果をコンソールに出力します。
          </p>
          {validationResult && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono">
                {validationResult}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* データ整合性検証 */}
      <div className="border-b border-gray-200 pb-4">
        <h3 className="text-lg font-medium text-gray-900 mb-3">データ整合性検証 <span className="text-sm text-blue-600">(RDv1.1.5.1)</span></h3>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleIntegrityCheck}
              disabled={isIntegrityChecking}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isIntegrityChecking ? '検証中...' : 'データ整合性チェック'}
            </button>
            <button
              onClick={handleHealthCheck}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              システム健全性チェック
            </button>
            <button
              onClick={handleAutoRecovery}
              className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
            >
              自動回復実行
            </button>
            <button
              onClick={handleEmergencyRecovery}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              エマージェンシー復旧
            </button>
          </div>
          <p className="text-xs text-gray-400">
            データの整合性を検証し、重複メモ、孤立ファイル、破損ファイルを検出・修復します。RDv1.1.5.1の新機能です。
          </p>
          
          {/* 整合性チェック結果表示 */}
          {integrityResult && (
            <div className="mt-4 space-y-3">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-2">検証結果:</h4>
                <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono max-h-32 overflow-y-auto">
                  {integrityResult}
                </pre>
              </div>
              
              {/* レポート表示 */}
              {integrityReport && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-700 mb-2">詳細レポート:</h4>
                  <pre className="text-xs text-blue-700 whitespace-pre-wrap font-mono max-h-48 overflow-y-auto">
                    {integrityReport}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* キャンバス設定 */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-3">キャンバス設定</h3>
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <label htmlFor="canvas-width">幅:</label>
            <input
              id="canvas-width"
              type="number"
              value={width}
              onChange={(e) => setWidth(+e.target.value)}
              className="w-24 p-1 border rounded text-black"
            />
            px
          </div>

          <div className="flex items-center space-x-2">
            <label htmlFor="canvas-height">高さ:</label>
            <input
              id="canvas-height"
              type="number"
              value={height}
              onChange={(e) => setHeight(+e.target.value)}
              className="w-24 p-1 border rounded text-black"
            />
            px
          </div>

          <div className="flex items-center space-x-2">
            <label htmlFor="canvas-zoom">初期ズーム:</label>
            <input
              id="canvas-zoom"
              type="number"
              step="0.1"
              min="0.1"
              max="5"
              value={zoom}
              onChange={(e) => setZoom(+e.target.value)}
              className="w-20 p-1 border rounded text-black"
            />
            倍
          </div>

          <button
            onClick={resetPan}
            className="px-3 py-1 bg-slate-600 rounded hover:bg-slate-500"
          >
            初期位置に戻す
          </button>
        </div>
      </div>
    </div>
  );
};