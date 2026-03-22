/**
 * Worker 离屏渲染模块导出
 */

export { WorkerManager } from './worker-manager';
export { CompatibilityLayer } from './compatibility-layer';
export { MessageProtocol } from './message-protocol';

export {
  MessageType,
  WorkerErrorType,
  type Message,
  type WorkerConfig,
  type WorkerBarrageData,
  type WorkerError,
  type WorkerState,
  type InitPayload,
  type AddBarragePayload,
  type RemoveBarragePayload,
  type UpdateConfigPayload,
  type ResizePayload,
  type ErrorPayload
} from './types';

// 检查浏览器支持
export function checkWorkerSupport(): boolean {
  return (
    typeof Worker !== 'undefined' &&
    typeof OffscreenCanvas !== 'undefined' &&
    HTMLCanvasElement.prototype.transferControlToOffscreen !== undefined
  );
}

// 创建 Worker 管理器实例
export function createWorkerManager(): WorkerManager {
  return new WorkerManager();
}

// 创建兼容性层实例
export function createCompatibilityLayer(): CompatibilityLayer {
  return new CompatibilityLayer();
}