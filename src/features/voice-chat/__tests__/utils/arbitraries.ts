/**
 * Fast-check 自定义生成器（Arbitraries）
 * 用于生成测试数据
 */

import fc from 'fast-check'
import type {
  Participant,
  JoinRequest,
  NetworkQuality,
  CurrentUser,
  SignalingMessage,
  VoiceChatError
} from '../../types'

// 生成网络质量数据
export const networkQualityArbitrary = (): fc.Arbitrary<NetworkQuality> =>
  fc.record({
    level: fc.constantFrom('excellent', 'good', 'fair', 'poor'),
    packetLoss: fc.double({ min: 0, max: 1 }),
    jitter: fc.double({ min: 0, max: 500 }),
    rtt: fc.double({ min: 0, max: 1000 })
  })

// 生成参与者数据
export const participantArbitrary = (): fc.Arbitrary<Participant> =>
  fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 50 }),
    role: fc.constantFrom('host', 'audience'),
    audioEnabled: fc.boolean(),
    videoEnabled: fc.boolean(),
    connectionState: fc.constantFrom(
      'new',
      'connecting',
      'connected',
      'disconnected',
      'failed',
      'closed'
    ),
    networkQuality: networkQualityArbitrary()
  })

// 生成连麦请求数据
export const joinRequestArbitrary = (): fc.Arbitrary<JoinRequest> =>
  fc.record({
    id: fc.uuid(),
    userId: fc.uuid(),
    userName: fc.string({ minLength: 1, maxLength: 50 }),
    timestamp: fc.integer({ min: Date.now() - 60000, max: Date.now() }),
    status: fc.constantFrom('pending', 'accepted', 'rejected', 'expired')
  })

// 生成当前用户数据
export const currentUserArbitrary = (): fc.Arbitrary<CurrentUser> =>
  fc.record({
    id: fc.uuid(),
    role: fc.constantFrom('host', 'audience'),
    audioEnabled: fc.boolean(),
    videoEnabled: fc.boolean()
  })

// 生成信令消息数据
export const signalingMessageArbitrary = (): fc.Arbitrary<SignalingMessage> =>
  fc.record({
    type: fc.constantFrom(
      'connected',
      'disconnected',
      'join-request',
      'offer',
      'answer',
      'ice-candidate',
      'hangup',
      'error'
    ),
    from: fc.uuid(),
    to: fc.uuid(),
    data: fc.anything(),
    timestamp: fc.integer({ min: Date.now() - 60000, max: Date.now() })
  })

// 生成错误数据
export const voiceChatErrorArbitrary = (): fc.Arbitrary<VoiceChatError> =>
  fc.record({
    code: fc.string({ minLength: 3, maxLength: 20 }),
    message: fc.string({ minLength: 10, maxLength: 200 }),
    category: fc.constantFrom('connection', 'permission', 'signaling', 'state', 'media'),
    severity: fc.constantFrom('low', 'medium', 'high', 'critical'),
    recoverable: fc.boolean(),
    context: fc.dictionary(fc.string(), fc.anything()),
    timestamp: fc.integer({ min: Date.now() - 60000, max: Date.now() })
  })

// 生成参与者列表（最多 6 人）
export const participantListArbitrary = (): fc.Arbitrary<Participant[]> =>
  fc.array(participantArbitrary(), { minLength: 0, maxLength: 6 })

// 生成 SDP 字符串
export const sdpArbitrary = (): fc.Arbitrary<string> =>
  fc.constant('v=0\r\no=- 0 0 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n')

// 生成 ICE 候选
export const iceCandidateArbitrary = (): fc.Arbitrary<RTCIceCandidateInit> =>
  fc.record({
    candidate: fc.string(),
    sdpMid: fc.option(fc.string(), { nil: null }),
    sdpMLineIndex: fc.option(fc.integer({ min: 0, max: 10 }), { nil: null })
  })
