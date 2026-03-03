<template>
  <div>
    <h2>FLV 播放器示例</h2>
    <!-- 播放远程 FLV 直播流 -->
    <FlvPlayer 
      url="http://101.35.16.42:8080/live/stream1.flv"
      :autoplay="true"
      :muted="true"
      :isLive="true"
      width="100%"
      height="540"
    />

    <!-- 播放本地 FLV 文件（需先通过 input 选择文件） -->
  </div>
</template>

<script setup>
import { ref } from 'vue';
import FlvPlayer from '../test/FLVTest.vue';

const localFlvUrl = ref('');
// 选择本地 FLV 文件
const handleFileSelect = (e) => {
  const file = e.target.files[0];
  if (file) {
    localFlvUrl.value = URL.createObjectURL(file);
  }
};
</script>