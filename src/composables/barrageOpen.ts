import {  ref } from 'vue';
import type { Ref } from 'vue';

import BarrageRenderer from '../../lib/index';

export default function useBarrageOpen(barrageRenderer: Ref<BarrageRenderer | undefined>) {
  const barrageOpen = ref(true);

  const barrageOpenChange = (isOpen: boolean) => {
    barrageRenderer.value?.switch(isOpen);
  };

  return {
    barrageOpen,
    barrageOpenChange,
  }
}
