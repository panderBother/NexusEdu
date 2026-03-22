/**
 * 性能监控器
 * 监控AI分割系统的性能指标和资源使用情况
 */

export interface PerformanceMonitorOptions {
  // 监控间隔（毫秒）
  monitorInterval: number;
  // 是否启用详细监控
  enableDetailedMonitoring: boolean;
  // 性能阈值配置
  thresholds: {
    maxCPUUsage: number;
    maxMemoryUsage: number;
    minFPS: number;
    maxLatency: number;
  };
}

export interface PerformanceMetrics {
  // CPU使用率 (0-100)
  cpuUsage: number;
  // 内存使用量 (MB)
  memoryUsage: number;
  // 当前FPS
  currentFPS: number;
  // 平均延迟 (ms)
  averageLatency: number;
  // GPU使用率 (0-100, 如果可用)
  gpuUsage?: number;
  // 最后更新时间
  lastUpdate: number;
}

export interface PerformanceAlert {
  type: 'cpu' | 'memory' | 'fps' | 'latency';
  severity: 'warning' | 'critical';
  message: string;
  value: number;
  threshold: number;
  timestamp: number;
}

export class PerformanceMonitor {
  private options: PerformanceMonitorOptions;
  private metrics: PerformanceMetrics;
  private monitoringInterval: number | null = null;
  private isMonitoring: boolean = false;
  private alertCallbacks: ((alert: PerformanceAlert) => void)[] = [];

  private readonly DEFAULT_OPTIONS: PerformanceMonitorOptions = {
    monitorInterval: 1000,
    enableDetailedMonitoring: true,
    thresholds: {
      maxCPUUsage: 80,
      maxMemoryUsage: 500, // MB
      minFPS: 15,
      maxLatency: 100 // ms
    }
  };

  constructor(options?: Partial<PerformanceMonitorOptions>) {
    this.options = { ...this.DEFAULT_OPTIONS, ...options };
    this.metrics = this.initializeMetrics();
  }

  /**
   * 开始性能监控
   */
  startMonitoring(): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.monitoringInterval = window.setInterval(() => {
      this.updateMetrics();
      this.checkThresholds();
    }, this.options.monitorInterval);

    console.log('Performance monitoring started');
  }

  /**
   * 停止性能监控
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    console.log('Performance monitoring stopped');
  }

  /**
   * 获取当前性能指标
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * 更新配置
   */
  updateOptions(options: Partial<PerformanceMonitorOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * 添加性能警报回调
   */
  onAlert(callback: (alert: PerformanceAlert) => void): void {
    this.alertCallbacks.push(callback);
  }

  /**
   * 移除性能警报回调
   */
  removeAlert(callback: (alert: PerformanceAlert) => void): void {
    const index = this.alertCallbacks.indexOf(callback);
    if (index > -1) {
      this.alertCallbacks.splice(index, 1);
    }
  }

  /**
   * 手动记录FPS
   */
  recordFPS(fps: number): void {
    this.metrics.currentFPS = fps;
    this.metrics.lastUpdate = Date.now();
  }

  /**
   * 手动记录延迟
   */
  recordLatency(latency: number): void {
    // 计算移动平均
    this.metrics.averageLatency = (this.metrics.averageLatency * 0.9) + (latency * 0.1);
    this.metrics.lastUpdate = Date.now();
  }

  /**
   * 获取系统建议
   */
  getOptimizationSuggestions(): string[] {
    const suggestions: string[] = [];
    const metrics = this.metrics;

    if (metrics.cpuUsage > 70) {
      suggestions.push('CPU使用率较高，建议降低目标帧率');
    }

    if (metrics.memoryUsage > 300) {
      suggestions.push('内存使用量较大，建议减少缓存大小');
    }

    if (metrics.currentFPS < 20) {
      suggestions.push('帧率较低，建议降低处理精度或减少检测人数');
    }

    if (metrics.averageLatency > 50) {
      suggestions.push('处理延迟较高，建议启用GPU加速');
    }

    return suggestions;
  }

  /**
   * 初始化性能指标
   */
  private initializeMetrics(): PerformanceMetrics {
    return {
      cpuUsage: 0,
      memoryUsage: 0,
      currentFPS: 0,
      averageLatency: 0,
      lastUpdate: Date.now()
    };
  }

  /**
   * 更新性能指标
   */
  private updateMetrics(): void {
    const now = Date.now();

    // 更新内存使用情况
    if ('memory' in performance) {
      const memInfo = (performance as any).memory;
      this.metrics.memoryUsage = Math.round(memInfo.usedJSHeapSize / 1024 / 1024);
    }

    // 估算CPU使用率（简化实现）
    this.metrics.cpuUsage = this.estimateCPUUsage();

    this.metrics.lastUpdate = now;
  }

  /**
   * 检查性能阈值
   */
  private checkThresholds(): void {
    const { thresholds } = this.options;
    const metrics = this.metrics;

    // 检查CPU使用率
    if (metrics.cpuUsage > thresholds.maxCPUUsage) {
      this.triggerAlert({
        type: 'cpu',
        severity: metrics.cpuUsage > thresholds.maxCPUUsage * 1.2 ? 'critical' : 'warning',
        message: `CPU使用率过高: ${metrics.cpuUsage}%`,
        value: metrics.cpuUsage,
        threshold: thresholds.maxCPUUsage,
        timestamp: Date.now()
      });
    }

    // 检查内存使用量
    if (metrics.memoryUsage > thresholds.maxMemoryUsage) {
      this.triggerAlert({
        type: 'memory',
        severity: metrics.memoryUsage > thresholds.maxMemoryUsage * 1.5 ? 'critical' : 'warning',
        message: `内存使用量过高: ${metrics.memoryUsage}MB`,
        value: metrics.memoryUsage,
        threshold: thresholds.maxMemoryUsage,
        timestamp: Date.now()
      });
    }

    // 检查FPS
    if (metrics.currentFPS > 0 && metrics.currentFPS < thresholds.minFPS) {
      this.triggerAlert({
        type: 'fps',
        severity: metrics.currentFPS < thresholds.minFPS * 0.5 ? 'critical' : 'warning',
        message: `帧率过低: ${metrics.currentFPS} FPS`,
        value: metrics.currentFPS,
        threshold: thresholds.minFPS,
        timestamp: Date.now()
      });
    }

    // 检查延迟
    if (metrics.averageLatency > thresholds.maxLatency) {
      this.triggerAlert({
        type: 'latency',
        severity: metrics.averageLatency > thresholds.maxLatency * 2 ? 'critical' : 'warning',
        message: `处理延迟过高: ${Math.round(metrics.averageLatency)}ms`,
        value: metrics.averageLatency,
        threshold: thresholds.maxLatency,
        timestamp: Date.now()
      });
    }
  }

  /**
   * 触发性能警报
   */
  private triggerAlert(alert: PerformanceAlert): void {
    this.alertCallbacks.forEach(callback => {
      try {
        callback(alert);
      } catch (error) {
        console.error('Error in performance alert callback:', error);
      }
    });
  }

  /**
   * 估算CPU使用率（简化实现）
   */
  private estimateCPUUsage(): number {
    // 这是一个简化的CPU使用率估算
    // 实际实现可能需要更复杂的方法
    const start = performance.now();
    let iterations = 0;
    const maxTime = 5; // 5ms测试时间

    while (performance.now() - start < maxTime) {
      iterations++;
    }

    // 基于迭代次数估算CPU负载
    const baselineIterations = 100000; // 基准迭代次数
    const usage = Math.max(0, Math.min(100, 100 - (iterations / baselineIterations) * 100));
    
    return Math.round(usage);
  }

  /**
   * 清理资源
   */
  dispose(): void {
    this.stopMonitoring();
    this.alertCallbacks = [];
  }
}

// 导出默认实例
export const performanceMonitor = new PerformanceMonitor();