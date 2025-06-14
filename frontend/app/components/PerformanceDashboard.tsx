/**
 * Performance Dashboard Component
 * Real-time performance monitoring UI
 */

"use client";

import { useState } from 'react';
import { Activity, AlertTriangle, CheckCircle, XCircle, TrendingUp } from 'lucide-react';
import { usePerformanceMonitor } from '../hooks/usePerformanceMonitor';

interface PerformanceDashboardProps {
  isVisible: boolean;
  onClose: () => void;
  compact?: boolean;
}

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  isVisible,
  onClose,
  compact = false
}) => {
  const {
    metrics,
    alerts,
    isRecording,
    startRecording,
    stopRecording,
    clearAllAlerts,
    getPerformanceGrade,
    getOptimizationSuggestions,
    isHealthy,
    hasWarnings
  } = usePerformanceMonitor(isVisible);

  const [showDetails, setShowDetails] = useState(false);
  const performanceGrade = getPerformanceGrade();
  const suggestions = getOptimizationSuggestions();

  if (!isVisible) return null;

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'text-green-500';
      case 'B': return 'text-blue-500';
      case 'C': return 'text-yellow-500';
      case 'D': return 'text-orange-500';
      case 'F': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusIcon = () => {
    if (!isHealthy) return <XCircle className="w-5 h-5 text-red-500" />;
    if (hasWarnings) return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    return <CheckCircle className="w-5 h-5 text-green-500" />;
  };

  if (compact) {
    return (
      <div className="fixed top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-3 border border-gray-200 z-50">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <div className="text-sm font-medium">
            Performance: <span className={getGradeColor(performanceGrade)}>{performanceGrade}</span>
          </div>
          <div className="text-xs text-gray-500">
            {metrics.memoryUsage.used}MB | {metrics.renderMetrics.averageFPS}FPS
          </div>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs text-blue-500 hover:text-blue-700"
          >
            {showDetails ? 'Hide' : 'Details'}
          </button>
        </div>
        
        {showDetails && (
          <div className="mt-2 pt-2 border-t border-gray-200 text-xs space-y-1">
            <div>Search: {metrics.searchMetrics.averageSearchTime}ms avg</div>
            <div>Memos: {metrics.memoMetrics.totalMemos} total, {metrics.memoMetrics.renderingMemos} visible</div>
            {alerts.length > 0 && (
              <div className="text-yellow-600">
                {alerts.length} active alert{alerts.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-4/5 max-w-4xl h-4/5 max-h-[800px] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Activity className="w-6 h-6 text-blue-500" />
            <h2 className="text-xl font-semibold">Performance Dashboard</h2>
            {getStatusIcon()}
            <div className="text-lg font-bold">
              Grade: <span className={getGradeColor(performanceGrade)}>{performanceGrade}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`px-3 py-1 rounded text-sm font-medium ${
                isRecording 
                  ? 'bg-red-500 text-white hover:bg-red-600' 
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              {isRecording ? 'Stop Recording' : 'Start Recording'}
            </button>
            
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 h-full overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Memory Metrics */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Memory Usage
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Used:</span>
                  <span className="font-mono">{metrics.memoryUsage.used} MB</span>
                </div>
                <div className="flex justify-between">
                  <span>Total:</span>
                  <span className="font-mono">{metrics.memoryUsage.total} MB</span>
                </div>
                <div className="flex justify-between">
                  <span>Percentage:</span>
                  <span className="font-mono">{metrics.memoryUsage.percentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      metrics.memoryUsage.percentage > 80 ? 'bg-red-500' :
                      metrics.memoryUsage.percentage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(metrics.memoryUsage.percentage, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Render Metrics */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Rendering Performance
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Average FPS:</span>
                  <span className={`font-mono ${
                    metrics.renderMetrics.averageFPS >= 50 ? 'text-green-600' :
                    metrics.renderMetrics.averageFPS >= 30 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {metrics.renderMetrics.averageFPS}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Frame Drops:</span>
                  <span className="font-mono">{metrics.renderMetrics.frameDrops}</span>
                </div>
                <div className="flex justify-between">
                  <span>Render Time:</span>
                  <span className="font-mono">{metrics.renderMetrics.renderTime}ms</span>
                </div>
              </div>
            </div>

            {/* Search Metrics */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3">Search Performance</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Last Search:</span>
                  <span className="font-mono">{metrics.searchMetrics.lastSearchTime}ms</span>
                </div>
                <div className="flex justify-between">
                  <span>Average Time:</span>
                  <span className={`font-mono ${
                    metrics.searchMetrics.averageSearchTime <= 50 ? 'text-green-600' :
                    metrics.searchMetrics.averageSearchTime <= 100 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {metrics.searchMetrics.averageSearchTime}ms
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Search Count:</span>
                  <span className="font-mono">{metrics.searchMetrics.searchCount}</span>
                </div>
              </div>
            </div>

            {/* Memo Metrics */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3">Memo Performance</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Total Memos:</span>
                  <span className="font-mono">{metrics.memoMetrics.totalMemos}</span>
                </div>
                <div className="flex justify-between">
                  <span>Rendering:</span>
                  <span className={`font-mono ${
                    metrics.memoMetrics.renderingMemos <= 50 ? 'text-green-600' :
                    metrics.memoMetrics.renderingMemos <= 100 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {metrics.memoMetrics.renderingMemos}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Avg Update Time:</span>
                  <span className="font-mono">{metrics.memoMetrics.averageUpdateTime}ms</span>
                </div>
              </div>
            </div>
          </div>

          {/* Alerts */}
          {alerts.length > 0 && (
            <div className="mt-6 bg-yellow-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  Active Alerts ({alerts.length})
                </h3>
                <button
                  onClick={clearAllAlerts}
                  className="text-sm text-red-500 hover:text-red-700"
                >
                  Clear All
                </button>
              </div>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {alerts.map(alert => (
                  <div 
                    key={alert.id}
                    className={`flex items-center gap-2 p-2 rounded text-sm ${
                      alert.type === 'error' ? 'bg-red-100 text-red-800' :
                      alert.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {alert.type === 'error' ? <XCircle className="w-4 h-4" /> :
                     alert.type === 'warning' ? <AlertTriangle className="w-4 h-4" /> :
                     <CheckCircle className="w-4 h-4" />}
                    <span>{alert.message}</span>
                    <span className="text-xs opacity-75 ml-auto">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Optimization Suggestions */}
          {suggestions.length > 0 && (
            <div className="mt-6 bg-blue-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-500" />
                Optimization Suggestions
              </h3>
              <ul className="space-y-2">
                {suggestions.map((suggestion, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-blue-800">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Network Status */}
          <div className="mt-6 bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3">Network Status</h3>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${
                  metrics.networkMetrics.connectionQuality === 'excellent' ? 'bg-green-500' :
                  metrics.networkMetrics.connectionQuality === 'good' ? 'bg-yellow-500' :
                  metrics.networkMetrics.connectionQuality === 'poor' ? 'bg-orange-500' :
                  'bg-red-500'
                }`} />
                <span className="capitalize">{metrics.networkMetrics.connectionQuality}</span>
              </div>
              {metrics.networkMetrics.latency > 0 && (
                <span className="text-sm text-gray-600">
                  Latency: {metrics.networkMetrics.latency}ms
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};