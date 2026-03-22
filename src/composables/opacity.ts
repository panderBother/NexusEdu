import { ref } from 'vue';
import type { Ref } from 'vue';
import BarrageRenderer from '../../lib/index';

export default function useOpacity(barrageRenderer: Ref<BarrageRenderer | undefined>) {
  const opacity = ref(100);
  const opacityChange = () => {
    barrageRenderer.value?.setRenderConfig({
      opacity: opacity.value / 100
    });
  };

  return {
    opacity,
    opacityChange,
  }
}
