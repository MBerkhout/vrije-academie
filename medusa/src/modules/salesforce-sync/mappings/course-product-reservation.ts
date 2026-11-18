import type { SfCourseProductShape } from "./course-product"

export const SF_RESERVATION_OBJECT = "B25__Reservation__c"

/** One row from `Reservations__r` on `vaProduct__c`. */
export type SfReservationShape = {
  Id?: string
  B25__Title__c?: string | null
  B25__Start__c?: string | null
  B25__End__c?: string | null
  Sequence__c?: number | null
  Type_Of_Session__c?: string | null
  First_Last_Session__c?: string | null
  Address__c?: string | null
  Substitute__c?: boolean | null
  Teacher__c?: string | null
  Teacher__r?: { Name?: string | null } | null
  Room__r?: { Name?: string | null } | null
  B25__Status__r?: { Name?: string | null } | null
}

export type SfReservationsSubquery = {
  totalSize?: number
  done?: boolean
  records?: SfReservationShape[]
}

const CANCELLED_STATUSES = new Set(["Geannuleerd", "Afgelast"])

function optionalUrl(value: string | null | undefined): string | null {
  const trimmed = (value ?? "").trim()
  return trimmed.length ? trimmed : null
}

export function courseProductLiveUrl(sf: SfCourseProductShape): string | null {
  return optionalUrl(sf.Zoom_Link__c as string | null | undefined)
}

export function courseProductRecordingUrl(sf: SfCourseProductShape): string | null {
  return optionalUrl(sf.Link_Zoom_Recording__c as string | null | undefined)
}

export function reservationRecordsFromChild(
  child: Record<string, unknown>
): SfReservationShape[] {
  const raw = child.Reservations__r as SfReservationsSubquery | undefined
  return raw?.records ?? []
}

export function isReservationCancelled(reservation: SfReservationShape): boolean {
  const status = reservation.B25__Status__r?.Name?.trim()
  if (!status) return false
  return CANCELLED_STATUSES.has(status)
}

export type MappedEventItemDate = {
  salesforce_id: string
  start_at: Date | null
  end_at: Date | null
  title: string | null
  sequence: number | null
  session_type: string | null
  location_name: string | null
  room_name: string | null
  address: string | null
  instructor_name: string | null
  instructor_salesforce_id: string | null
  is_substitute: boolean
}

export function mapReservationToEventItemDate(
  reservation: SfReservationShape
): MappedEventItemDate | null {
  const salesforceId = reservation.Id?.trim()
  if (!salesforceId) return null
  if (isReservationCancelled(reservation)) return null

  const startAt = reservation.B25__Start__c ? new Date(reservation.B25__Start__c) : null
  const endAt = reservation.B25__End__c ? new Date(reservation.B25__End__c) : null
  const sequence =
    typeof reservation.Sequence__c === "number" && Number.isFinite(reservation.Sequence__c)
      ? reservation.Sequence__c
      : null

  return {
    salesforce_id: salesforceId,
    start_at: startAt,
    end_at: endAt,
    title: reservation.B25__Title__c?.trim() || null,
    sequence,
    session_type: reservation.Type_Of_Session__c?.trim() || null,
    location_name: null,
    room_name: reservation.Room__r?.Name?.trim() || null,
    address: reservation.Address__c?.trim() || null,
    instructor_name: reservation.Teacher__r?.Name?.trim() || null,
    instructor_salesforce_id: reservation.Teacher__c?.trim() || null,
    is_substitute: Boolean(reservation.Substitute__c),
  }
}

export function mapReservationsForEventItem(
  child: Record<string, unknown>
): MappedEventItemDate[] {
  const mapped = reservationRecordsFromChild(child)
    .map(mapReservationToEventItemDate)
    .filter((row): row is MappedEventItemDate => Boolean(row))

  mapped.sort((a, b) => {
    if (a.sequence != null && b.sequence != null && a.sequence !== b.sequence) {
      return a.sequence - b.sequence
    }
    const aTime = a.start_at?.getTime() ?? Infinity
    const bTime = b.start_at?.getTime() ?? Infinity
    return aTime - bTime
  })

  return mapped
}

/** Stable fingerprint slice per reservation row (import skip-if-unchanged). */
export function reservationFingerprintSlice(
  reservation: SfReservationShape
): Record<string, unknown> | null {
  if (!reservation.Id || isReservationCancelled(reservation)) return null
  return {
    Id: reservation.Id,
    B25__Title__c: reservation.B25__Title__c,
    B25__Start__c: reservation.B25__Start__c,
    B25__End__c: reservation.B25__End__c,
    Sequence__c: reservation.Sequence__c,
    Type_Of_Session__c: reservation.Type_Of_Session__c,
    Address__c: reservation.Address__c,
    Substitute__c: reservation.Substitute__c,
    Teacher__c: reservation.Teacher__c,
    Room__r: reservation.Room__r?.Name ?? null,
    Teacher__r: reservation.Teacher__r?.Name ?? null,
    B25__Status__r: reservation.B25__Status__r?.Name ?? null,
  }
}