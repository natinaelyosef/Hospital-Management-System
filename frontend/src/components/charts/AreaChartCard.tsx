import { useId } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartShell, ChartTooltip } from './ChartShell'
import { seriesColor, type BaseChartProps } from './chartUtils'

export function AreaChartCard({ title, data, xKey, yKeys, height = 260, subtitle, action, className }: BaseChartProps) {
  const gradientId = useId().replace(/[^a-zA-Z0-9]/g, "")
  return (
    <ChartShell title={title} subtitle={subtitle} action={action} height={height} className={className}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <defs>
            {yKeys.map((series, index) => (
              <linearGradient key={series.key} id={`${gradientId}-${series.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={seriesColor(series, index)} stopOpacity={0.35} />
                <stop offset="100%" stopColor={seriesColor(series, index)} stopOpacity={0.02} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey={xKey}
            tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: 'var(--border)' }}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={46}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--muted-foreground)', strokeDasharray: '4 4' }} />
          {yKeys.map((series, index) => (
            <Area
              key={series.key}
              type="monotone"
              dataKey={series.key}
              name={series.label}
              stroke={seriesColor(series, index)}
              strokeWidth={2.5}
              fill={`url(#${gradientId}-${series.key})`}
              fillOpacity={1}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </ChartShell>
  )
}

export default AreaChartCard
