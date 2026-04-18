import { ref } from "vue";
import type { Ref } from "vue";

import BarrageRenderer from "../../lib/index";

export default function useBarrageOpen(
  barrageRenderer: Ref<BarrageRenderer | undefined>,
) {
  const barrageOpen = ref(true);

  const barrageOpenChange = (isOpen: boolean | Event) => {
    const checked =
      typeof isOpen === "boolean"
        ? isOpen
        : ((isOpen.target as HTMLInputElement)?.checked ?? false);
    barrageRenderer.value?.switch(checked);
  };

  return {
    barrageOpen,
    barrageOpenChange,
  };
}
