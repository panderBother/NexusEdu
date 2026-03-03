import { defineStore } from "pinia";
import { ref } from "vue";
export default defineStore('hls', ()=>{
  const videoRef=ref<HTMLVideoElement | null>(null)
  const setVideoRef = (video:HTMLVideoElement)=>{
    videoRef.value=video
  }
  return {videoRef,setVideoRef}
})