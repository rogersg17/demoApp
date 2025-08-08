import React from 'react'

export interface SparklineProps {
  data: number[]
  width?: number
  height?: number
  stroke?: string
  strokeWidth?: number
  fill?: string
  showArea?: boolean
  min?: number
  max?: number
  ariaLabel?: string
}

function getMinMax(values: number[]): { min: number; max: number } {
  if (!values.length) return { min: 0, max: 1 }
  let min = values[0]
  let max = values[0]
  for (const v of values) {
    if (v < min) min = v
    if (v > max) max = v
  }
  if (min === max) {
    // Avoid flatline scaling issues
    const pad = Math.abs(min || 1) * 0.1
    return { min: min - pad, max: max + pad }
  }
  return { min, max }
}

export const Sparkline: React.FC<SparklineProps> = ({
  data,
  width = 160,
  height = 48,
  stroke = '#0ea5e9',
  strokeWidth = 2,
  fill = 'rgba(14,165,233,0.15)',
  showArea = true,
  min,
  max,
  ariaLabel = 'sparkline chart'
}) => {
  const n = data.length
  if (n === 0) return <svg width={width} height={height} role="img" aria-label={ariaLabel} />
  if (n === 1) {
    return (
      <svg width={width} height={height} role="img" aria-label={ariaLabel}>
        <circle cx={width - 4} cy={height / 2} r={2} fill={stroke} />
      </svg>
    )
  }

  const { min: dmin, max: dmax } = getMinMax(data)
  const yMin = min ?? dmin
  const yMax = max ?? dmax
  const dx = width / (n - 1)
  const scaleY = (v: number) => {
    // invert y axis: higher values closer to top
    const t = (v - yMin) / (yMax - yMin || 1)
    return height - t * height
  }

  const points: Array<[number, number]> = data.map((v, i) => [i * dx, scaleY(v)])

  const polyline = points.map(([x, y]) => `${x},${y}`).join(' ')

  const areaPath = `M 0 ${height} L ${points.map(([x, y]) => `${x} ${y}`).join(' ')} L ${width} ${height} Z`

  return (
    <svg width={width} height={height} role="img" aria-label={ariaLabel}>
      {showArea && <path d={areaPath} fill={fill} stroke="none" />}
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
        points={polyline}
      />
    </svg>
  )
}

export default Sparkline
