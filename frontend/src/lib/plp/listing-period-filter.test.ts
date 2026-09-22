import { describe, expect, it } from 'vitest'

import {
  isListingPeriodMonthVisible,
  isListingSeasonVisible,
  listingMonthKey,
  listingPeriodChipLabel,
  listingPeriodControls,
  parseListingPeriodSelection,
} from './listing-period-filter'

const now = new Date('2026-09-18T12:00:00.000Z')

describe('isListingPeriodMonthVisible', () => {
  it('hides past months of the current year', () => {
    expect(isListingPeriodMonthVisible({ year: 2026, month: 3, now, count: 4 })).toBe(false)
    expect(isListingPeriodMonthVisible({ year: 2026, month: 9, now, count: 4 })).toBe(true)
    expect(isListingPeriodMonthVisible({ year: 2026, month: 12, now, count: 4 })).toBe(true)
  })

  it('hides months with no future activities unless selected', () => {
    expect(isListingPeriodMonthVisible({ year: 2026, month: 11, now, count: 0 })).toBe(false)
    expect(
      isListingPeriodMonthVisible({ year: 2026, month: 11, now, count: 0, selected: true }),
    ).toBe(true)
  })

  it('keeps a selected past month visible so it can be cleared', () => {
    expect(
      isListingPeriodMonthVisible({ year: 2026, month: 3, now, count: 0, selected: true }),
    ).toBe(true)
  })

  it('shows months in a later year when they still have sessions', () => {
    expect(isListingPeriodMonthVisible({ year: 2027, month: 1, now, count: 2 })).toBe(true)
  })
})

describe('isListingSeasonVisible', () => {
  it('hides voorjaar once every month in it is past', () => {
    expect(
      isListingSeasonVisible({
        months: [1, 2, 3, 4, 5, 6],
        year: 2026,
        now,
        monthCount: () => 2,
      }),
    ).toBe(false)
  })

  it('shows najaar when a remaining month has activities', () => {
    expect(
      isListingSeasonVisible({
        months: [7, 8, 9, 10, 11, 12],
        year: 2026,
        now,
        monthCount: (month) => (month === 10 ? 3 : 0),
      }),
    ).toBe(true)
  })
})

describe('listingMonthKey', () => {
  it('pads the month', () => {
    expect(listingMonthKey(2026, 9)).toBe('2026-09')
  })
})

describe('listingPeriodControls', () => {
  it('lists each month once across years', () => {
    const controls = listingPeriodControls({
      monthCounts: {
        '2026-09': 3,
        '2026-12': 1,
        '2027-01': 2,
        '2027-09': 1,
        '2030-01': 1,
      },
      now,
    })

    expect(controls.seasons.map((season) => season.key)).toEqual(['voorjaar', 'najaar'])
    expect(controls.months.map((month) => month.value)).toEqual([1, 9, 12])
  })

  it('selects January without a year heading', () => {
    const controls = listingPeriodControls({
      monthCounts: { '2026-09': 1, '2030-01': 2 },
      periodStart: '2027-01-01',
      periodEnd: '2027-01-31',
      now,
    })

    expect(parseListingPeriodSelection('2027-01-01', '2027-01-31')).toEqual({
      kind: 'month',
      month: 1,
    })
    expect(controls.months).toEqual([
      { value: 1, label: 'Jan', selected: true },
      { value: 9, label: 'Sep', selected: false },
    ])
    expect(listingPeriodChipLabel('2027-01-01', '2027-01-31')).toBe('Jan')
    expect(listingPeriodChipLabel('2026-01-01', '2026-06-30')).toBe('Voorjaar')
  })
})
