export const TUTORIAL_KEY = 'space-map-editor-tutorial'

export function tutorialDone() {
  try { return localStorage.getItem(TUTORIAL_KEY) === 'done' } catch { return true }
}

export function markTutorialDone() {
  try { localStorage.setItem(TUTORIAL_KEY, 'done') } catch { /* обучение просто покажется снова */ }
}
