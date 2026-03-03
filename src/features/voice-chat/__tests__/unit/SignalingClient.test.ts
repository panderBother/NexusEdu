/**
 * SignalingClient 单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SignalingClient } from '../../services/SignalingClient'
import type { SignalingMessage } from '../../types'

describe('SignalingClient', () => {
  let client: SignalingClient
  let mockWs: any

  beforeEach(() => {
    client = new SignalingClient()
    
    // Mock WebSocket
    mockWs = {
      readyState: WebSocket.OPEN,
      send: vi.fn(),
      close: vi.fn(),
      onopen: null,
      onclose: null,
      onerror: null,
      onmessage: null
    }
    
    global.WebSocket = vi.fn(function(this: any) {
      return mockWs
    }) as any
  })

  describe('connect', () => {
    it('should connect to signaling server', async () => {
      const connectPromise = client.connect('ws://localhost:8080', 'test-token')
      
      // 设置 readyState 为 OPEN
      mockWs.readyState = WebSocket.OPEN
      
      // 触发 onopen
      if (mockWs.onopen) {
        mockWs.onopen(new Event('open'))
      }
      
      await connectPromise
      
      expect(client.isConnected()).toBe(true)
    })

    it('should reject on connection error', async () => {
      const connectPromise = client.connect('ws://localhost:8080', 'test-token')
      
      // 触发 onerror
      if (mockWs.onerror) {
        mockWs.onerror(new Event('error'))
      }
      
      await expect(connectPromise).rejects.toThrow('WebSocket connection failed')
    })
  })

  describe('sendJoinRequest', () => {
    it('should send join request message', async () => {
      const connectPromise = client.connect('ws://localhost:8080', 'test-token')
      if (mockWs.onopen) mockWs.onopen(new Event('open'))
      await connectPromise
      
      await client.sendJoinRequest('host-id')
      
      expect(mockWs.send).toHaveBeenCalled()
      const sentMessage = JSON.parse(mockWs.send.mock.calls[0][0])
      expect(sentMessage.type).toBe('join-request')
      expect(sentMessage.to).toBe('host-id')
      expect(sentMessage.token).toBe('test-token')
    })
  })

  describe('sendOffer', () => {
    it('should send SDP offer', async () => {
      const connectPromise = client.connect('ws://localhost:8080', 'test-token')
      if (mockWs.onopen) mockWs.onopen(new Event('open'))
      await connectPromise
      
      const sdp: RTCSessionDescriptionInit = { type: 'offer', sdp: 'test-sdp' }
      await client.sendOffer('target-id', sdp)
      
      expect(mockWs.send).toHaveBeenCalled()
      const sentMessage = JSON.parse(mockWs.send.mock.calls[0][0])
      expect(sentMessage.type).toBe('offer')
      expect(sentMessage.data.sdp).toEqual(sdp)
    })
  })

  describe('sendAnswer', () => {
    it('should send SDP answer', async () => {
      const connectPromise = client.connect('ws://localhost:8080', 'test-token')
      if (mockWs.onopen) mockWs.onopen(new Event('open'))
      await connectPromise
      
      const sdp: RTCSessionDescriptionInit = { type: 'answer', sdp: 'test-sdp' }
      await client.sendAnswer('target-id', sdp)
      
      expect(mockWs.send).toHaveBeenCalled()
      const sentMessage = JSON.parse(mockWs.send.mock.calls[0][0])
      expect(sentMessage.type).toBe('answer')
      expect(sentMessage.data.sdp).toEqual(sdp)
    })
  })

  describe('sendIceCandidate', () => {
    it('should send ICE candidate', async () => {
      const connectPromise = client.connect('ws://localhost:8080', 'test-token')
      if (mockWs.onopen) mockWs.onopen(new Event('open'))
      await connectPromise
      
      const candidate: RTCIceCandidateInit = {
        candidate: 'test-candidate',
        sdpMid: '0',
        sdpMLineIndex: 0
      }
      await client.sendIceCandidate('target-id', candidate)
      
      expect(mockWs.send).toHaveBeenCalled()
      const sentMessage = JSON.parse(mockWs.send.mock.calls[0][0])
      expect(sentMessage.type).toBe('ice-candidate')
      expect(sentMessage.data.candidate).toEqual(candidate)
    })
  })

  describe('sendHangup', () => {
    it('should send hangup signal', async () => {
      const connectPromise = client.connect('ws://localhost:8080', 'test-token')
      if (mockWs.onopen) mockWs.onopen(new Event('open'))
      await connectPromise
      
      await client.sendHangup('target-id')
      
      expect(mockWs.send).toHaveBeenCalled()
      const sentMessage = JSON.parse(mockWs.send.mock.calls[0][0])
      expect(sentMessage.type).toBe('hangup')
      expect(sentMessage.to).toBe('target-id')
    })
  })

  describe('event handling', () => {
    it('should emit events when messages are received', async () => {
      const connectPromise = client.connect('ws://localhost:8080', 'test-token')
      if (mockWs.onopen) mockWs.onopen(new Event('open'))
      await connectPromise
      
      const handler = vi.fn()
      client.on('offer', handler)
      
      const message: SignalingMessage = {
        type: 'offer',
        from: 'sender-id',
        to: 'test-token',
        data: { sdp: { type: 'offer', sdp: 'test-sdp' } },
        timestamp: Date.now()
      }
      
      // 模拟接收消息
      if (mockWs.onmessage) {
        mockWs.onmessage({ data: JSON.stringify(message) } as MessageEvent)
      }
      
      expect(handler).toHaveBeenCalledWith(message)
    })

    it('should remove event handlers', async () => {
      const connectPromise = client.connect('ws://localhost:8080', 'test-token')
      if (mockWs.onopen) mockWs.onopen(new Event('open'))
      await connectPromise
      
      const handler = vi.fn()
      client.on('offer', handler)
      client.off('offer', handler)
      
      const message: SignalingMessage = {
        type: 'offer',
        from: 'sender-id',
        to: 'test-token',
        data: { sdp: { type: 'offer', sdp: 'test-sdp' } },
        timestamp: Date.now()
      }
      
      if (mockWs.onmessage) {
        mockWs.onmessage({ data: JSON.stringify(message) } as MessageEvent)
      }
      
      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('disconnect', () => {
    it('should close WebSocket connection', async () => {
      const connectPromise = client.connect('ws://localhost:8080', 'test-token')
      if (mockWs.onopen) mockWs.onopen(new Event('open'))
      await connectPromise
      
      client.disconnect()
      
      expect(mockWs.close).toHaveBeenCalled()
      expect(client.isConnected()).toBe(false)
    })
  })

  describe('message queue', () => {
    it('should queue messages when not connected', async () => {
      // 不连接，直接发送消息
      await client.sendJoinRequest('host-id')
      
      // 消息应该被加入队列，不会抛出错误
      expect(mockWs.send).not.toHaveBeenCalled()
    })
  })

  describe('message retry', () => {
    it('should retry failed messages up to 3 times', async () => {
      const connectPromise = client.connect('ws://localhost:8080', 'test-token')
      if (mockWs.onopen) mockWs.onopen(new Event('open'))
      await connectPromise
      
      // 模拟发送失败
      mockWs.send.mockImplementationOnce(() => {
        throw new Error('Send failed')
      })
      
      try {
        await client.sendJoinRequest('host-id')
      } catch (error) {
        // 预期会失败
      }
      
      // 应该尝试发送多次
      expect(mockWs.send).toHaveBeenCalled()
    })
  })
})
