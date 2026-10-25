declare module 'pannellum'

interface PannellumHotSpot {
  id: string
  pitch: number
  yaw: number
  type: 'info' | 'scene'
  cssClass?: string
  createTooltipFunc?: (div: HTMLDivElement, args: unknown) => void
  createTooltipArgs?: unknown
  clickHandlerFunc?: (event: MouseEvent, args: unknown) => void
  clickHandlerArgs?: unknown
}

interface PannellumViewer {
  on(event: string, listener: (...args: unknown[]) => void): PannellumViewer
  off(event: string, listener: (...args: unknown[]) => void): PannellumViewer
  getHfov(): number
  setHfov(value: number, animated?: boolean | number): PannellumViewer
  lookAt(pitch: number, yaw: number, hfov: number, animated?: boolean | number): PannellumViewer
  stopMovement(): void
  resize(): PannellumViewer
  destroy(): void
  addHotSpot(hotSpot: PannellumHotSpot): PannellumViewer
  removeHotSpot(id: string): boolean
  mouseEventToCoords(event: MouseEvent): [number, number]
}

interface Window {
  pannellum: {
    viewer(container: HTMLElement, config: {
      type: 'equirectangular'
      panorama: string
      autoLoad: boolean
      hfov: number
      minHfov: number
      maxHfov: number
      showControls: boolean
      escapeHTML: boolean
      strings: Record<string, string>
    }): PannellumViewer
  }
}
