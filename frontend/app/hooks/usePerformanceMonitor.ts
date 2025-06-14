/**
 * Performance Monitor Hook
 * Real-time performance tracking for AMV-System
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

interface PerformanceMemory {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

interface ExtendedPerformance extends Performance {
  memory?: PerformanceMemory;
}

interface PerformanceMetrics {
  // Memory metrics
  memoryUsage: {
    used: number;      // MB
    total: number;     // MB
    percentage: number;
  };
  
  // Rendering metrics
  renderMetrics: {
    averageFPS: number;
    frameDrops: number;
    renderTime: number; // ms
  };
  
  // Search performance
  searchMetrics: {
    lastSearchTime: number; // ms
    averageSearchTime: number; // ms
    searchCount: number;
  };
  
  // Memo operations
  memoMetrics: {
    totalMemos: number;
    renderingMemos: number;
    averageUpdateTime: number; // ms
  };
  
  // Network metrics (for future collaboration)
  networkMetrics: {
    latency: number;    // ms
    bandwidth: number;  // KB/s
    connectionQuality: 'excellent' | 'good' | 'poor' | 'offline';
  };
}

interface PerformanceThresholds {
  memoryWarning: number;     // MB
  memoryError: number;       // MB
  fpsWarning: number;        // FPS
  searchTimeWarning: number; // ms
  renderTimeWarning: number; // ms
}

interface PerformanceAlert {
  id: string;
  type: 'warning' | 'error' | 'info';
  message: string;
  timestamp: number;
  metric: keyof PerformanceMetrics;
}

const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  memoryWarning: 50,   // 50MB
  memoryError: 100,    // 100MB
  fpsWarning: 45,      // 45 FPS
  searchTimeWarning: 100, // 100ms
  renderTimeWarning: 16   // 16ms (60 FPS)
};

export const usePerformanceMonitor = (
  enabled: boolean = true,
  thresholds: Partial<PerformanceThresholds> = {}
) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    memoryUsage: { used: 0, total: 0, percentage: 0 },
    renderMetrics: { averageFPS: 60, frameDrops: 0, renderTime: 0 },
    searchMetrics: { lastSearchTime: 0, averageSearchTime: 0, searchCount: 0 },
    memoMetrics: { totalMemos: 0, renderingMemos: 0, averageUpdateTime: 0 },
    networkMetrics: { latency: 0, bandwidth: 0, connectionQuality: 'offline' }
  });

  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [isRecording, setIsRecording] = useState(false);

  // Performance tracking refs
  const frameTimeHistory = useRef<number[]>([]);
  const searchTimeHistory = useRef<number[]>([]);
  const updateTimeHistory = useRef<number[]>([]);
  const lastFrameTime = useRef<number>(performance.now());
  const frameCount = useRef<number>(0);

  const finalThresholds = useMemo(() => ({ ...DEFAULT_THRESHOLDS, ...thresholds }), [thresholds]);

  // Memory monitoring
  const updateMemoryMetrics = useCallback(() => {
    if (!enabled || typeof performance === 'undefined' || !('memory' in performance)) {
      return;
    }

    const memory = (performance as ExtendedPerformance).memory;
    if (!memory) return;
    
    const used = Math.round(memory.usedJSHeapSize / 1024 / 1024);
    const total = Math.round(memory.totalJSHeapSize / 1024 / 1024);
    const percentage = Math.round((used / total) * 100);

    setMetrics(prev => ({
      ...prev,
      memoryUsage: { used, total, percentage }
    }));

    // Check thresholds
    if (used > finalThresholds.memoryError) {
      addAlert('error', `Memory usage critical: ${used}MB`, 'memoryUsage');
    } else if (used > finalThresholds.memoryWarning) {
      addAlert('warning', `Memory usage high: ${used}MB`, 'memoryUsage');
    }
  }, [enabled, finalThresholds]);

  // FPS monitoring
  const updateRenderMetrics = useCallback(() => {
    if (!enabled) return;

    const now = performance.now();
    const frameTime = now - lastFrameTime.current;
    lastFrameTime.current = now;
    frameCount.current++;

    // Track frame times
    frameTimeHistory.current.push(frameTime);
    if (frameTimeHistory.current.length > 60) { // Keep last 60 frames
      frameTimeHistory.current.shift();
    }

    // Calculate average FPS
    const averageFrameTime = frameTimeHistory.current.reduce((a, b) => a + b, 0) / frameTimeHistory.current.length;
    const averageFPS = Math.round(1000 / averageFrameTime);

    // Count frame drops (> 16.67ms = below 60 FPS)
    const frameDrops = frameTimeHistory.current.filter(time => time > 16.67).length;

    setMetrics(prev => ({
      ...prev,
      renderMetrics: {
        averageFPS,
        frameDrops,
        renderTime: Math.round(averageFrameTime * 100) / 100
      }
    }));

    // Check FPS threshold
    if (averageFPS < finalThresholds.fpsWarning) {
      addAlert('warning', `Low FPS detected: ${averageFPS}`, 'renderMetrics');
    }

    if (averageFrameTime > finalThresholds.renderTimeWarning) {
      addAlert('warning', `High render time: ${averageFrameTime.toFixed(1)}ms`, 'renderMetrics');
    }
  }, [enabled, finalThresholds]);

  // Search performance tracking
  const trackSearchPerformance = useCallback((searchTime: number) => {
    if (!enabled) return;

    searchTimeHistory.current.push(searchTime);
    if (searchTimeHistory.current.length > 20) { // Keep last 20 searches
      searchTimeHistory.current.shift();
    }

    const averageSearchTime = searchTimeHistory.current.reduce((a, b) => a + b, 0) / searchTimeHistory.current.length;

    setMetrics(prev => ({
      ...prev,
      searchMetrics: {
        lastSearchTime: searchTime,
        averageSearchTime: Math.round(averageSearchTime * 100) / 100,
        searchCount: prev.searchMetrics.searchCount + 1
      }
    }));

    // Check search time threshold
    if (searchTime > finalThresholds.searchTimeWarning) {
      addAlert('warning', `Slow search: ${searchTime}ms`, 'searchMetrics');
    }
  }, [enabled, finalThresholds]);

  // Memo update performance tracking
  const trackMemoUpdate = useCallback((updateTime: number) => {
    if (!enabled) return;

    updateTimeHistory.current.push(updateTime);
    if (updateTimeHistory.current.length > 20) {
      updateTimeHistory.current.shift();
    }

    const averageUpdateTime = updateTimeHistory.current.reduce((a, b) => a + b, 0) / updateTimeHistory.current.length;

    setMetrics(prev => ({
      ...prev,
      memoMetrics: {
        ...prev.memoMetrics,
        averageUpdateTime: Math.round(averageUpdateTime * 100) / 100
      }
    }));
  }, [enabled]);

  // Update memo counts
  const updateMemoCount = useCallback((total: number, rendering: number) => {
    setMetrics(prev => ({
      ...prev,
      memoMetrics: {
        ...prev.memoMetrics,
        totalMemos: total,
        renderingMemos: rendering
      }
    }));
  }, []);

  // Network monitoring (basic ping test)
  const updateNetworkMetrics = useCallback(async () => {
    if (!enabled) return;

    try {
      const startTime = performance.now();
      await fetch('/api/ping', { method: 'HEAD', cache: 'no-cache' });
      const latency = performance.now() - startTime;

      let connectionQuality: PerformanceMetrics['networkMetrics']['connectionQuality'] = 'excellent';
      if (latency > 200) connectionQuality = 'poor';
      else if (latency > 100) connectionQuality = 'good';

      setMetrics(prev => ({
        ...prev,
        networkMetrics: {
          ...prev.networkMetrics,
          latency: Math.round(latency),
          connectionQuality
        }
      }));
    } catch {
      setMetrics(prev => ({
        ...prev,
        networkMetrics: {
          ...prev.networkMetrics,
          connectionQuality: 'offline'
        }
      }));
    }
  }, [enabled]);

  // Alert management
  const addAlert = useCallback((
    type: PerformanceAlert['type'], 
    message: string, 
    metric: keyof PerformanceMetrics
  ) => {
    const alert: PerformanceAlert = {
      id: `${Date.now()}-${Math.random()}`,
      type,
      message,
      timestamp: Date.now(),
      metric
    };

    setAlerts(prev => {
      // Avoid duplicate alerts for the same issue
      const isDuplicate = prev.some(existing => 
        existing.metric === metric && 
        existing.message === message &&
        Date.now() - existing.timestamp < 5000 // 5 seconds
      );

      if (isDuplicate) return prev;

      // Keep only last 10 alerts
      const newAlerts = [alert, ...prev].slice(0, 10);
      return newAlerts;
    });
  }, []);

  const clearAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  }, []);

  const clearAllAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  // Performance recording
  const startRecording = useCallback(() => {
    setIsRecording(true);
    frameTimeHistory.current = [];
    searchTimeHistory.current = [];
    updateTimeHistory.current = [];
    frameCount.current = 0;
  }, []);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
  }, []);

  // Export performance data
  const exportPerformanceData = useCallback(() => {
    return {
      metrics,
      alerts,
      rawData: {
        frameTimeHistory: frameTimeHistory.current,
        searchTimeHistory: searchTimeHistory.current,
        updateTimeHistory: updateTimeHistory.current,
        frameCount: frameCount.current
      },
      timestamp: new Date().toISOString()
    };
  }, [metrics, alerts]);

  // Performance grade calculation
  const getPerformanceGrade = useCallback((): 'A' | 'B' | 'C' | 'D' | 'F' => {
    const { memoryUsage, renderMetrics, searchMetrics } = metrics;
    
    let score = 100;
    
    // Memory penalty
    if (memoryUsage.used > finalThresholds.memoryError) score -= 30;
    else if (memoryUsage.used > finalThresholds.memoryWarning) score -= 15;
    
    // FPS penalty
    if (renderMetrics.averageFPS < 30) score -= 25;
    else if (renderMetrics.averageFPS < finalThresholds.fpsWarning) score -= 10;
    
    // Search penalty
    if (searchMetrics.averageSearchTime > 200) score -= 20;
    else if (searchMetrics.averageSearchTime > finalThresholds.searchTimeWarning) score -= 10;
    
    // Frame drops penalty
    score -= renderMetrics.frameDrops * 2;
    
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }, [metrics, finalThresholds]);

  // Optimization suggestions
  const getOptimizationSuggestions = useCallback((): string[] => {
    const suggestions: string[] = [];
    const { memoryUsage, renderMetrics, searchMetrics, memoMetrics } = metrics;

    if (memoryUsage.used > finalThresholds.memoryWarning) {
      suggestions.push('Consider clearing unused memos or reducing memo count');
    }

    if (renderMetrics.averageFPS < finalThresholds.fpsWarning) {
      suggestions.push('Enable virtual scrolling for large memo lists');
    }

    if (searchMetrics.averageSearchTime > finalThresholds.searchTimeWarning) {
      suggestions.push('Use search filters to narrow down results');
    }

    if (memoMetrics.renderingMemos > 100) {
      suggestions.push('Hide some memos to improve rendering performance');
    }

    if (renderMetrics.frameDrops > 10) {
      suggestions.push('Reduce visual effects or animations');
    }

    return suggestions;
  }, [metrics, finalThresholds]);

  // Setup monitoring intervals
  useEffect(() => {
    if (!enabled) return;

    const memoryInterval = setInterval(updateMemoryMetrics, 2000); // Every 2 seconds
    const networkInterval = setInterval(updateNetworkMetrics, 10000); // Every 10 seconds

    // Frame monitoring
    let animationFrame: number;
    const frameMonitor = () => {
      updateRenderMetrics();
      animationFrame = requestAnimationFrame(frameMonitor);
    };
    animationFrame = requestAnimationFrame(frameMonitor);

    return () => {
      clearInterval(memoryInterval);
      clearInterval(networkInterval);
      cancelAnimationFrame(animationFrame);
    };
  }, [enabled, updateMemoryMetrics, updateRenderMetrics, updateNetworkMetrics]);

  return {
    // Data
    metrics,
    alerts,
    isRecording,
    
    // Actions
    trackSearchPerformance,
    trackMemoUpdate,
    updateMemoCount,
    startRecording,
    stopRecording,
    clearAlert,
    clearAllAlerts,
    exportPerformanceData,
    
    // Analysis
    getPerformanceGrade,
    getOptimizationSuggestions,
    
    // Utils
    isHealthy: alerts.filter(a => a.type === 'error').length === 0,
    hasWarnings: alerts.filter(a => a.type === 'warning').length > 0
  };
};