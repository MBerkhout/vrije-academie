export {}

declare global {
  interface Window {
    HubSpotCallsToActions?: {
      refresh: () => void
      close: (id: number) => void
      closeAll: () => void
    }
    hsCallsToActionsReady?: Array<() => void>
  }
}
