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
import {
  removeVathuisFilter,
  serializeVathuisFilterState,
  type VathuisFilterState,
} from '@/app/(main)/va-thuis/_state/url'
import { VATHUIS_CATALOG_PATH } from '@/lib/routes'

export const AGENDA_BASE_PATH = '/agenda'

export function isAgendaBasePath(basePath: string): boolean {
  return basePath === AGENDA_BASE_PATH
}

export function isVathuisCatalogPath(basePath: string): boolean {
  return basePath === VATHUIS_CATALOG_PATH
}

function toVathuisFilterState(state: PlpFilterState): VathuisFilterState {
  return {
    q: state.q,
    sort: state.sort as VathuisFilterState['sort'],
    categories: state.categories,
    teachers: state.teachers,
  }
}

export function resolveFilterSerialize(basePath: string) {
  if (isAgendaBasePath(basePath)) {
    return (state: PlpFilterState) => serializeAgendaState(state as AgendaFilterState)
  }
  if (isVathuisCatalogPath(basePath)) {
    return (state: PlpFilterState) => serializeVathuisFilterState(toVathuisFilterState(state))
  }
  return serializePlpState
}

export function resolveFilterRemove(basePath: string) {
  if (isAgendaBasePath(basePath)) {
    return (state: PlpFilterState, key: keyof PlpFilterState, value?: string) =>
      removeAgendaFilter(state as AgendaFilterState, key as keyof AgendaFilterState, value) as PlpFilterState
  }
  if (isVathuisCatalogPath(basePath)) {
    return (state: PlpFilterState, key: keyof PlpFilterState, value?: string) =>
      removeVathuisFilter(
        toVathuisFilterState(state),
        key as keyof VathuisFilterState,
        value
      ) as PlpFilterState
  }
  return removePlpFilter
}
