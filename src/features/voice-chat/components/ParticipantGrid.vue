<template>
  <div class="participant-grid" :class="gridClass">
    <ParticipantCard
      v-for="participant in participants"
      :key="participant.id"
      :participant="participant"
      :stream="remoteStreams.get(participant.id)"
      :is-speaking="isSpeaking(participant.id)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import ParticipantCard from './ParticipantCard.vue'
import type { Participant } from '../types'

// Props
interface Props {
  participants: Participant[]
  remoteStreams: Map<string, MediaStream>
}

const props = defineProps<Props>()

// State
const speakingParticipants = ref<Set<string>>(new Set())

// Computed
const gridClass = computed(() => {
  const count = props.participants.length
  if (count === 1) return 'grid-1'
  if (count === 2) return 'grid-2'
  if (count <= 4) return 'grid-4'
  return 'grid-6'
})

// Methods
const isSpeaking = (participantId: string): boolean => {
  return speakingParticipants.value.has(participantId)
}

const detectSpeaking = (participantId: string, stream: MediaStream) => {
  const audioContext = new AudioContext()
  const analyser = audioContext.createAnalyser()
  const source = audioContext.createMediaStreamSource(stream)
  
  source.connect(analyser)
  analyser.fftSize = 256
  
  const bufferLength = analyser.frequencyBinCount
  const dataArray = new Uint8Array(bufferLength)
  
  const checkAudioLevel = () => {
    analyser.getByteFrequencyData(dataArray)
    const average = dataArray.reduce((a, b) => a + b) / bufferLength
    
    if (average > 30) {
      speakingParticipants.value.add(participantId)
    } else {
      speakingParticipants.value.delete(participantId)
    }
  }
  
  const interval = setInterval(checkAudioLevel, 100)
  
  return () => {
    clearInterval(interval)
    audioContext.close()
  }
}

// Lifecycle
const cleanupFunctions: (() => void)[] = []

onMounted(() => {
  // 为每个参与者设置音频检测
  props.participants.forEach(participant => {
    const stream = props.remoteStreams.get(participant.id)
    if (stream) {
      const cleanup = detectSpeaking(participant.id, stream)
      cleanupFunctions.push(cleanup)
    }
  })
})

onUnmounted(() => {
  cleanupFunctions.forEach(cleanup => cleanup())
})
</script>

<style scoped>
.participant-grid {
  display: grid;
  gap: 16px;
  width: 100%;
  height: 100%;
}

.grid-1 {
  grid-template-columns: 1fr;
}

.grid-2 {
  grid-template-columns: repeat(2, 1fr);
}

.grid-4 {
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: repeat(2, 1fr);
}

.grid-6 {
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(2, 1fr);
}

@media (max-width: 768px) {
  .grid-2,
  .grid-4,
  .grid-6 {
    grid-template-columns: 1fr;
  }
}
</style>
