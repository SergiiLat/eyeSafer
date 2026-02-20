/// <reference types="svelte" />
/// <reference types="vite/client" />

import type { StimulationTrigger } from '../../shared/types'

declare global {
  interface Window {
    overlay: {
      onTrigger(callback: (trigger: StimulationTrigger) => void): () => void
      complete(): void
      onTwentyTrigger(callback: () => void): () => void
      twentyDone(): void
    }
  }
}
