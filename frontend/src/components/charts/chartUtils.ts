import type { ReactNode } from 'react'

export type ChartRow = Record<string, string | number | null | undefined>

export interface ChartSeries {
  key: string
  label: string
  color?: string
}

export interface BaseChartProps {
  title: string
  data: ChartRow[]
  xKey: string
  yKeys: ChartSeries[]
  height?: number
  subtitle?: string
  action?: ReactNode
  className?: string
}

export const CHART_PALETTE = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)']

export function seriesColor(series: ChartSeries, index: number): string {
  return series.color ?? CHART_PALETTE[index % CHART_PALETTE.length]
}

export function numeric(row: ChartRow, key: string): number {
  const value = row[key]
  const parsed = typeof value === 'number' ? value : Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}
