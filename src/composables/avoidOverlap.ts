import {  ref } from 'vue';
import type { Ref } from 'vue';
import BarrageRenderer from '../../lib/index';

export default function useAvoidOverlap(barrageRenderer: Ref<BarrageRenderer | undefined>) {
  const avoidOverlap = ref(true);
  const avoidOverlapChange = () => {
    barrageRenderer.value?.setRenderConfig({
      avoidOverlap: avoidOverlap.value,
    });
  }

  return {
    avoidOverlap,
    avoidOverlapChange,
  }
}
