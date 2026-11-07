import { fetchHandles } from './mixed-journey.js'

export function defaultSetup() {
  return { handles: fetchHandles() }
}

export { fetchHandles as setupHandles }
