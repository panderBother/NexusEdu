/**
 * WebRTC 连麦功能测试设置
 */

import { beforeEach, vi } from 'vitest'

// Mock WebRTC APIs
beforeEach(() => {
  // Mock RTCPeerConnection
  global.RTCPeerConnection = vi.fn().mockImplementation(() => ({
    localDescription: null,
    remoteDescription: null,
    signalingState: 'stable',
    iceConnectionState: 'new',
    connectionState: 'new',
    iceGatheringState: 'new',
    
    createOffer: vi.fn().mockResolvedValue({ type: 'offer', sdp: 'mock-sdp' }),
    createAnswer: vi.fn().mockResolvedValue({ type: 'answer', sdp: 'mock-sdp' }),
    setLocalDescription: vi.fn().mockResolvedValue(undefined),
    setRemoteDescription: vi.fn().mockResolvedValue(undefined),
    addIceCandidate: vi.fn().mockResolvedValue(undefined),
    addTrack: vi.fn().mockReturnValue({}),
    removeTrack: vi.fn(),
    getTransceivers: vi.fn().mockReturnValue([]),
    getSenders: vi.fn().mockReturnValue([]),
    getReceivers: vi.fn().mockReturnValue([]),
    getStats: vi.fn().mockResolvedValue(new Map()),
    close: vi.fn(),
    
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  })) as any

  // Mock RTCSessionDescription
  global.RTCSessionDescription = vi.fn().mockImplementation((init) => init) as any

  // Mock RTCIceCandidate
  global.RTCIceCandidate = vi.fn().mockImplementation((init) => init) as any

  // Mock getUserMedia
  global.navigator.mediaDevices = {
    getUserMedia: vi.fn().mockResolvedValue({
      id: 'mock-stream-id',
      active: true,
      getTracks: vi.fn().mockReturnValue([
        {
          id: 'audio-track',
          kind: 'audio',
          enabled: true,
          stop: vi.fn()
        },
        {
          id: 'video-track',
          kind: 'video',
          enabled: true,
          stop: vi.fn()
        }
      ]),
      getAudioTracks: vi.fn().mockReturnValue([
        {
          id: 'audio-track',
          kind: 'audio',
          enabled: true,
          stop: vi.fn()
        }
      ]),
      getVideoTracks: vi.fn().mockReturnValue([
        {
          id: 'video-track',
          kind: 'video',
          enabled: true,
          stop: vi.fn()
        }
      ]),
      addTrack: vi.fn(),
      removeTrack: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }),
    enumerateDevices: vi.fn().mockResolvedValue([])
  } as any

  // Mock WebSocket
  global.WebSocket = vi.fn().mockImplementation(() => ({
    readyState: WebSocket.OPEN,
    send: vi.fn(),
    close: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  })) as any
})
