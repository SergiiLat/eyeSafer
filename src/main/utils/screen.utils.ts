import { screen } from 'electron'
import type { DisplayInfo } from '../../shared/types'

export function getAllDisplays(): DisplayInfo[] {
  const primary = screen.getPrimaryDisplay()
  return screen.getAllDisplays().map(display => ({
    id: display.id,
    bounds: display.bounds,
    scaleFactor: display.scaleFactor,
    isPrimary: display.id === primary.id
  }))
}

export function getScaledBounds(display: DisplayInfo): {
  x: number
  y: number
  width: number
  height: number
} {
  return {
    x: display.bounds.x,
    y: display.bounds.y,
    width: Math.round(display.bounds.width * display.scaleFactor),
    height: Math.round(display.bounds.height * display.scaleFactor)
  }
}
