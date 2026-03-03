/**
 * Voice Chat Feature - Public API
 */

// Services
export { VoiceChatManager } from './services/VoiceChatManager'
export { SignalingClient } from './services/SignalingClient'
export { PeerConnectionManager } from './services/PeerConnectionManager'
export { SRSApiClient } from './services/SRSApiClient'
export { ErrorHandler, withRetry } from './services/ErrorHandler'
export { PerformanceOptimizer } from './services/PerformanceOptimizer'

// Store
export { useVoiceChatStore } from './stores/voiceChatStore'

// Components
export { default as VoiceChatPanel } from './components/VoiceChatPanel.vue'
export { default as MediaControls } from './components/MediaControls.vue'
export { default as ParticipantGrid } from './components/ParticipantGrid.vue'
export { default as ParticipantCard } from './components/ParticipantCard.vue'

// Types
export type {
  UserRole,
  ConnectionState,
  NetworkQuality,
  NetworkQualityLevel,
  RequestStatus,
  Participant,
  JoinRequest,
  CurrentUser,
  VoiceChatEvent,
  SignalingEvent,
  SignalingMessage,
  WebRTCConfig,
  AudioConstraints,
  VideoConstraints,
  MediaConstraints,
  PublishParams,
  PublishResponse,
  PlayParams,
  PlayResponse,
  ErrorCategory,
  VoiceChatError,
  RetryConfig,
  EventHandler,
  SignalingEventHandler
} from './types'

// Constants
export {
  SRS_SERVER_URL,
  MAX_PARTICIPANTS,
  CONNECTION_TIMEOUT,
  REQUEST_TIMEOUT,
  ERROR_CODES,
  ERROR_MESSAGES
} from './constants'
