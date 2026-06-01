import type { AgendaFilterState } from '@/app/(main)/agenda/_state/url'
import {
  removeFilter as removeAgendaFilter,
  serializeFilterState as serializeAgendaState,
} from '@/app/(main)/agenda/_state/url'
import type { PlpFilterState } from '@/app/(main)/ons-aanbod/_state/url'
import {
  removeFilter as removePlpFilter,
  serializeFilterState as serializePlpState,
} from '@/app/(main)/ons-aanbod/_state/url'

export const AGENDA_BASE_PATH = '/agenda'

export function isAgendaBasePath(basePath: string): boolean {
  return basePath === AGENDA_BASE_PATH
}

export function resolveFilterSerialize(basePath: string) {
  if (isAgendaBasePath(basePath)) {
    return (state: PlpFilterState) => serializeAgendaState(state as AgendaFilterState)
  }
  return serializePlpState
}

export function resolveFilterRemove(basePath: string) {
  if (isAgendaBasePath(basePath)) {
    return (state: PlpFilterState, key: keyof PlpFilterState, value?: string) =>
      removeAgendaFilter(state as AgendaFilterState, key as keyof AgendaFilterState, value) as PlpFilterState
  }
  return removePlpFilter
}
