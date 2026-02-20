import { join } from 'path'

/**
 * Notification service for audio cues.
 * Native sound playback is deferred to v2 (requires an audio library).
 * This stub provides the interface and path resolution for future use.
 */
export class NotificationService {
  private enabled = true

  setEnabled(enabled: boolean): void {
    this.enabled = enabled
  }

  // Volume stored for future native audio implementation
  setVolume(_volume: number): void {
    // deferred to v2
  }

  getSoundPath(soundId: string): string {
    return join(__dirname, '../../../resources/sounds', `${soundId}.mp3`)
  }

  async playSound(_soundId: string): Promise<void> {
    if (!this.enabled) return
    // Audio playback via Web Audio API is handled in the renderer.
    // Native main-process audio is deferred to v2.
  }
}

export const notificationService = new NotificationService()
