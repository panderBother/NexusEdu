import { defineStore } from "pinia";
import {ref} from 'vue'
export default defineStore('stream', ()=>{
  const remoteStream=ref<MediaStream | null>(null)
  const setRemoteStream = (stream:MediaStream)=>{
    remoteStream.value=stream
  }
  return {remoteStream,setRemoteStream}
})
