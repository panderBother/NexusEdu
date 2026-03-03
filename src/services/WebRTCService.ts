
export type RemoteStreamCallback = (stream: MediaStream, info?: any) => void;
import Player from 'xgplayer';
import 'xgplayer/dist/index.min.css';
import FlvPlugin from 'xgplayer-flv'; // FLV 直播必备插件

export class WebRTCService {
  private pc: RTCPeerConnection | null =null;
  private localStream:MediaStream | null =null;
  private remoteCallback :RemoteStreamCallback | null =null;
  private srsHost:string;
  private FlvPlayer: Player | null = null;
  
  // 连麦功能：管理多个 PeerConnection
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  
  constructor(srsHot='http://101.35.16.42:1985'){
    this.srsHost=srsHot.replace(/\/+$/, '')
  }
  private CreatePC() {
    if(this.pc) return;
    const config:RTCConfiguration={
      iceServers: [
      {urls: 'stun:stun.l.google.com:19302' }
      ],
      /**
       * 媒体流捆绑策略，max-bundle表示 
       * “尽可能把所有音视频轨道（Audio/Video）都捆绑到同一个传输通道（同一个 UDP/TCP 连接）里”。
       * 
       * 作用：
           减少连接数：原本音视频需要各自建立独立的传输通道，现在共用一个，降低网络开销；
           简化协商：SDP 协商和 ICE 候选只需处理一个通道，提升连接效率。
       */
      bundlePolicy: "max-bundle", 
      /**
       * RTCP 复用策略，require表示 “强制把 RTCP（媒体控制报文，比如丢包反馈、关键帧请求）和 
       * RTP（媒体数据报文）复用在同一个端口 / 连接里传输”。
作用：
减少端口占用：原本 RTP 和 RTCP 需要各自占一个端口，现在共用一个端口，简化网络配置；
提升兼容性：几乎所有现代 WebRTC 终端都支持 RTCP 复用，强制开启可避免协商失败。
       */
      rtcpMuxPolicy: "require", 
    }
    this.pc=new RTCPeerConnection(config);
  
    this.pc.ontrack =(ev)=>{
      const stream =(ev.streams && ev.streams[0])?ev.streams[0]:new MediaStream([ev.track]);
      if(this.remoteCallback) this.remoteCallback(stream,ev)
    }
    this.pc.onconnectionstatechange =() =>{
    console.log('PC State:' ,this.pc?.connectionState)
  }
  }
    setRemoteStreamHandler(cb: RemoteStreamCallback) {
    this.remoteCallback = cb;
  }
  async addLocalStream(stream:MediaStream){
    this.CreatePC();
    this.localStream=stream;
    this.pc?.getSenders().forEach(s=>{
      try{this.pc?.removeTrack(s)}catch{console.log("移除轨道异常")}
    })
    stream.getTracks().forEach(track=>{
      try {
        this.pc?.addTrack(track,stream)
      } catch (error) {
        console.warn(error)
      }
    })
  }
  // 主播：向 SRS publish（浏览器 -> SRS）
  async publishToSRS(app='live',streamId='stream1'):Promise<String | null> {
    if(!this.pc) this.CreatePC();
    if(!this.pc) return null;
    try {
      const offer =await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
       // 等待 ICE candidate 收集完成以便 sdp 包含候选（或超时）
      // await this.waitIceGatherComplete(this.pc,5000);
      const localDesc=this.pc.localDescription!;
      const url = `${this.srsHost}/rtc/v1/publish/${encodeURIComponent(app)}/${encodeURIComponent(streamId)}`;
      const body = {sdp:localDesc.sdp,
        streamurl:`webrtc://101.35.16.42/${encodeURIComponent(app)}/${encodeURIComponent(streamId)}`,
        api:url
      };
      console.log('body',body)
      const res=await fetch(url,{
        method:'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(5000), // 设置 5 秒超时
      })
      if(!res.ok)throw new Error(`SRS publish HTTP ${res.status}`)
        const data=await res.json()
      if(!data||!data.sdp) throw new Error('SRS publish 没有返回 sdp')
        const answer ={type:'answer' ,sdp: data.sdp};
        await this.pc.setRemoteDescription( answer as RTCSessionDescriptionInit)
        return url;
    } catch (error) {
      console.error('publishToSRS failed', error);
      return null;
    }
  }
    // 观众拉流
    async playFromSRS(app='live',streamId='stream1'):Promise<MediaStream | null> {
      if(!this.pc) this.CreatePC();
      if(!this.pc) return null;
      if(!this.localStream) this.localStream=new MediaStream()
      
      try {
        // 使用 Promise 等待轨道添加
        const trackPromise = new Promise<void>((resolve, reject) => {
          let trackCount = 0;
          const timeout = setTimeout(() => {
            if (trackCount === 0) {
              reject(new Error('等待轨道超时'));
            } else {
              resolve();
            }
          }, 10000); // 10秒超时

          this.pc!.ontrack = (event) => {
            console.log("监听到的轨道", event.track);
            this.localStream?.addTrack(event.track);
            trackCount++;
            
            // 通常视频流会有音频和视频两个轨道，等待至少一个轨道
            if (trackCount >= 1) {
              clearTimeout(timeout);
              resolve();
            }
          };
        });

        this.pc.onicecandidate = (event)=>{
          if(event.candidate){
            console.log('Local ICE Candidate:', event.candidate)
          }
        }
        
        const offer = await this.pc.createOffer({offerToReceiveAudio:true,offerToReceiveVideo: true})
        await this.pc.setLocalDescription(offer);
        console.log('已创建 Offer，正在请求 SRS 服务器拉流...')
        
        const localDesc = this.pc.localDescription!;
        const url = `${this.srsHost}/rtc/v1/play/${encodeURIComponent(app)}/${encodeURIComponent(streamId)}`;
        const body = {
           sdp:localDesc.sdp,
           streamurl:`webrtc://101.35.16.42/${encodeURIComponent(app)}/${encodeURIComponent(streamId)}`,
           api:url
        };
        console.log('body',body)
        
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal:AbortSignal.timeout(5000)
        });
        
        if (!res.ok) throw new Error(`SRS play HTTP ${res.status}`);
        const data = await res.json();
        if(!data||!data.sdp) throw new Error("SRS play 没有返回 sdp")
        
        // 设置远程描述
        await this.pc.setRemoteDescription(new RTCSessionDescription({type:'answer',sdp:data.sdp}))
        console.log('已设置远程描述，等待轨道...')
        
        // 等待轨道添加完成
        await trackPromise;
        
        console.log('拉流成功，轨道已添加', this.localStream, '轨道数量:', this.localStream?.getTracks().length)
        return this.localStream
      } catch (error) {
         console.error('playFromSRS failed', error);
         return null;
      }
    }
    async playFLVSRS(app='live',streamId='stream1',videoEl:HTMLVideoElement,flvUrl?:string):Promise<boolean> {
      try {
        if(!videoEl) {
          console.warn('videoEl is null')
          return false;
        }
        this.stopFlv();
        
        const url = flvUrl ?? `http://101.35.16.42:8080/${encodeURIComponent(app)}/${encodeURIComponent(streamId)}.flv`;
        console.log('开始播放 FLV 流:', url);

        // 检查 flv.js 是否可用
        if (typeof (window as any).flvjs === 'undefined') {
          console.error('flv.js 未加载');
          return false;
        }

        const flvjs = (window as any).flvjs;

        if (!flvjs.isSupported()) {
          console.error('当前浏览器不支持 FLV.js');
          return false;
        }

        // 使用 flv.js 直接播放
        const flvPlayer = flvjs.createPlayer({
          type: 'flv',
          url: url,
          isLive: true,
          hasAudio: true,
          hasVideo: true,
          enableStashBuffer: false,
          stashInitialSize: 128
        }, {
          enableWorker: false,
          enableStashBuffer: false,
          lazyLoad: false,
          lazyLoadMaxDuration: 3 * 60,
          seekType: 'range',
        });

        flvPlayer.attachMediaElement(videoEl);

        // 监听事件
        flvPlayer.on(flvjs.Events.ERROR, (errorType: any, errorDetail: any, errorInfo: any) => {
          console.error('FLV 播放器错误:', errorType, errorDetail, errorInfo);
        });

        flvPlayer.on(flvjs.Events.LOADING_COMPLETE, () => {
          console.log('FLV 加载完成');
        });

        flvPlayer.on(flvjs.Events.MEDIA_INFO, (mediaInfo: any) => {
          console.log('FLV 媒体信息:', mediaInfo);
        });

        // Video 元素事件
        videoEl.onloadedmetadata = () => {
          console.log(`视频元数据加载: ${videoEl.videoWidth}x${videoEl.videoHeight}`);
        };

        videoEl.oncanplay = () => {
          console.log('视频可以播放');
        };

        videoEl.onplaying = () => {
          console.log('✅ 视频正在播放！');
        };

        videoEl.onerror = (e) => {
          console.error('Video 元素错误:', e);
        };

        // 加载并播放
        console.log('正在加载流...');
        flvPlayer.load();
        
        console.log('正在播放...');
        await flvPlayer.play();
        console.log('play() 调用成功');

        this.FlvPlayer = flvPlayer;
        return true;
      } catch (error) {
        console.error('playFLVSRS failed', error);
        this.stopFlv();
        return false;
      }
    } 
    stopFlv() {
      try {
        if (this.FlvPlayer) {
          try { 
            if (this.FlvPlayer.pause) {
              this.FlvPlayer.pause(); 
            }
          } catch {}
          try { 
            if (this.FlvPlayer.unload) {
              this.FlvPlayer.unload(); 
            }
          } catch {}
          try { 
            if (this.FlvPlayer.detachMediaElement) {
              this.FlvPlayer.detachMediaElement(); 
            }
          } catch {}
          try { 
            if (this.FlvPlayer.destroy) {
              this.FlvPlayer.destroy(); 
            }
          } catch (e) { 
            console.warn('FlvPlayer destroy 失败', e); 
          }
          this.FlvPlayer = null;
        }
      } catch (e) {
        console.warn('stopFLV 错误', e);
      }
    }
    stop() {
    try { this.pc?.close(); } catch {}
    this.pc = null;
    this.localStream = null;
    this.remoteCallback = null;
  }
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  // ==================== 连麦功能扩展 ====================

  /**
   * 创建 Peer Connection（连麦专用）
   * @param participantId 参与者 ID
   * @param config RTCConfiguration
   * @returns RTCPeerConnection
   */
  createPeerConnection(participantId: string, config?: RTCConfiguration): RTCPeerConnection {
    // 如果已存在，先关闭
    if (this.peerConnections.has(participantId)) {
      this.closePeerConnection(this.peerConnections.get(participantId)!);
    }

    const defaultConfig: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ],
      iceTransportPolicy: 'all',
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require'
    };

    const pc = new RTCPeerConnection(config || defaultConfig);
    this.peerConnections.set(participantId, pc);

    // 监听连接状态
    pc.onconnectionstatechange = () => {
      console.log(`[${participantId}] Connection state:`, pc.connectionState);
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`[${participantId}] ICE connection state:`, pc.iceConnectionState);
    };

    return pc;
  }

  /**
   * 添加本地流到 PeerConnection
   * @param pc RTCPeerConnection
   * @param stream MediaStream
   */
  addLocalStreamToPeer(pc: RTCPeerConnection, stream: MediaStream): void {
    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream);
    });
  }

  /**
   * 创建 Offer
   * @param pc RTCPeerConnection
   * @returns RTCSessionDescriptionInit
   */
  async createOffer(pc: RTCPeerConnection): Promise<RTCSessionDescriptionInit> {
    const offer = await pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true
    });
    await pc.setLocalDescription(offer);
    return offer;
  }

  /**
   * 创建 Answer
   * @param pc RTCPeerConnection
   * @returns RTCSessionDescriptionInit
   */
  async createAnswer(pc: RTCPeerConnection): Promise<RTCSessionDescriptionInit> {
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    return answer;
  }

  /**
   * 设置远程描述
   * @param pc RTCPeerConnection
   * @param sdp RTCSessionDescriptionInit
   */
  async setRemoteDescription(pc: RTCPeerConnection, sdp: RTCSessionDescriptionInit): Promise<void> {
    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
  }

  /**
   * 添加 ICE 候选
   * @param pc RTCPeerConnection
   * @param candidate RTCIceCandidateInit
   */
  async addIceCandidate(pc: RTCPeerConnection, candidate: RTCIceCandidateInit): Promise<void> {
    await pc.addIceCandidate(new RTCIceCandidate(candidate));
  }

  /**
   * 获取本地媒体流（带音频处理）
   * @param constraints MediaStreamConstraints
   * @returns MediaStream
   */
  async getLocalMediaStream(constraints?: MediaStreamConstraints): Promise<MediaStream> {
    const defaultConstraints: MediaStreamConstraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 48000,
        channelCount: 1
      } as MediaTrackConstraints,
      video: {
        width: { min: 320, ideal: 640, max: 1280 },
        height: { min: 240, ideal: 480, max: 720 },
        frameRate: { min: 15, ideal: 24, max: 30 }
      }
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints || defaultConstraints);
    return stream;
  }

  /**
   * 关闭 PeerConnection
   * @param pc RTCPeerConnection
   */
  closePeerConnection(pc: RTCPeerConnection): void {
    try {
      pc.close();
      // 从 Map 中移除
      for (const [id, connection] of this.peerConnections.entries()) {
        if (connection === pc) {
          this.peerConnections.delete(id);
          break;
        }
      }
    } catch (error) {
      console.error('Failed to close peer connection:', error);
    }
  }

  /**
   * 根据参与者 ID 获取 PeerConnection
   * @param participantId 参与者 ID
   * @returns RTCPeerConnection | undefined
   */
  getPeerConnection(participantId: string): RTCPeerConnection | undefined {
    return this.peerConnections.get(participantId);
  }

  /**
   * 获取连接统计信息
   * @param pc RTCPeerConnection
   * @returns RTCStatsReport
   */
  async getConnectionStats(pc: RTCPeerConnection): Promise<RTCStatsReport> {
    return await pc.getStats();
  }

  /**
   * 关闭所有 PeerConnection
   */
  closeAllPeerConnections(): void {
    this.peerConnections.forEach((pc, id) => {
      try {
        pc.close();
      } catch (error) {
        console.error(`Failed to close peer connection for ${id}:`, error);
      }
    });
    this.peerConnections.clear();
  }
  
}