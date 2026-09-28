import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { ChartShell, ChartTooltip } from './ChartShell'
import { CHART_PALETTE, numeric, type BaseChartProps, type ChartRow } from './chartUtils'

export interface PieChartCardProps extends BaseChartProps {
  donut?: boolean
  showLegend?: boolean
  centerLabel?: string
}

function toPieData(data: ChartRow[], xKey: string, valueKey: string): ChartRow[] {
  return data.map((row) => ({ ...row, __value: numeric(row, valueKey), __name: String(row[xKey] ?? '') }))
}

export function PieChartCard({
  title,
  data,
  xKey,
  yKeys,
  height = 260,
  subtitle,
  action,
  className,
  donut = true,
  showLegend = true,
  centerLabel,
}: PieChartCardProps) {
  const valueKey = yKeys[0]?.key ?? 'value'
  const rows = toPieData(data, xKey, valueKey)

  return (
    <ChartShell
      title={title}
      subtitle={subtitle}
      action={action}
      height={height}
      className={className}
      legend={
        showLegend && rows.length > 0 ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-2">
            {rows.map((row, index) => (
              <span key={String(row.__name)} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: CHART_PALETTE[index % CHART_PALETTE.length] }}
                />
                {String(row.__name)}
              </span>
            ))}
          </div>
        ) : undefined
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={rows}
            dataKey="__value"
            nameKey="__name"
            cx="50%"
            cy="50%"
            outerRadius={donut ? 82 : 92}
            innerRadius={donut ? 52 : 0}
            paddingAngle={2}
            strokeWidth={2}
            stroke="var(--card)"
          >
            {rows.map((_, index) => (
              <Cell key={index} fill={CHART_PALETTE[index % CHART_PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
          {centerLabel && (
            <text
              x="50%"
              y="50%"
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-muted-foreground"
              style={{ fontSize: 11 }}
            >
              {centerLabel}
            </text>
          )}
        </PieChart>
      </ResponsiveContainer>    </ChartShell>
  )
}

export default PieChartCard
