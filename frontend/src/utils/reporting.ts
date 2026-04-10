export type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'custom'

export interface DateRange {
  startDate: string
  endDate: string
}

const toIsoDate = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const getDateRangeForPeriod = (period: ReportPeriod): DateRange => {
  const today = new Date()
  const end = new Date(today)
  const start = new Date(today)

  if (period === 'daily') {
    // same day
  } else if (period === 'weekly') {
    start.setDate(start.getDate() - 6)
  } else if (period === 'monthly') {
    start.setDate(start.getDate() - 29)
  }

  return {
    startDate: toIsoDate(start),
    endDate: toIsoDate(end),
  }
}

export const isDateWithinRange = (value: string | null | undefined, startDate: string, endDate: string): boolean => {
  if (!value || !startDate || !endDate) return false

  const date = new Date(value)
  const start = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T23:59:59`)

  if (Number.isNaN(date.getTime()) || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return false
  }

  return date >= start && date <= end
}

export const filterByDateRange = <T>(
  items: T[],
  dateSelector: (item: T) => string | null | undefined,
  startDate: string,
  endDate: string
): T[] => items.filter((item) => isDateWithinRange(dateSelector(item), startDate, endDate))

const toCsvCell = (value: unknown) => {
  const text = value === null || value === undefined ? '' : String(value)
  const escaped = text.replace(/"/g, '""')
  return `"${escaped}"`
}

export const downloadCsv = (filename: string, rows: Record<string, unknown>[]) => {
  if (!rows.length) return

  const headers = Object.keys(rows[0])
  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => toCsvCell(row[header])).join(',')),
  ]

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.setAttribute('download', filename)
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}
