import React from 'react'
import { cn } from '@/renderer/lib/utils'

interface IntroLogoProps {
  className?: string
  animated?: boolean
  size?: number
}

export function IntroLogo({ className, animated = false, size = 200 }: IntroLogoProps) {
  const centerX = 100
  const centerY = 100
  const radius = 70

  const outerPoints = Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 2
    return {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    }
  })

  const hexagonPath = outerPoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ') + ' Z'

  const innerRadius = radius * 0.5
  const innerPoints = Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 2
    return {
      x: centerX + innerRadius * Math.cos(angle),
      y: centerY + innerRadius * Math.sin(angle),
    }
  })

  const innerHexagonPath = innerPoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ') + ' Z'

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      className={cn(animated && 'logo-breathe', className)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* HCMUT Blue gradient */}
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#032D91" />
          <stop offset="100%" stopColor="#1488DB" />
        </linearGradient>

        {/* Soft glow for dark mode */}
        <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Outer Hexagon - HCMUT branding */}
      <path
        d={hexagonPath}
        stroke="url(#logoGradient)"
        strokeWidth="2"
        fill="none"
        className={animated ? 'stroke-draw' : ''}
      />

      {/* Inner decorative hexagon */}
      <path
        d={innerHexagonPath}
        stroke="url(#logoGradient)"
        strokeWidth="1.5"
        strokeOpacity="0.6"
        fill="none"
        className={animated ? 'stroke-draw-delay-1' : ''}
      />

      {/* Lotus petals - stylized */}
      <g className={animated ? 'lotus-bloom' : ''}>
        {/* Center lotus petals */}
        {[0, 60, 120, 180, 240, 300].map((angle, i) => {
          const rad = (angle * Math.PI) / 180
          const petalLength = 25
          const petalWidth = 8
          const cx = centerX + 15 * Math.cos(rad)
          const cy = centerY + 15 * Math.sin(rad)
          
          const tipX = centerX + petalLength * Math.cos(rad)
          const tipY = centerY + petalLength * Math.sin(rad)
          
          const perpRad = rad + Math.PI / 2
          const leftX = cx + (petalWidth / 2) * Math.cos(perpRad)
          const leftY = cy + (petalWidth / 2) * Math.sin(perpRad)
          const rightX = cx + (petalWidth / 2) * Math.cos(perpRad + Math.PI)
          const rightY = cy + (petalWidth / 2) * Math.sin(perpRad + Math.PI)
          
          return (
            <path
              key={i}
              d={`M ${leftX} ${leftY} Q ${tipX} ${tipY} ${rightX} ${rightY} Q ${cx} ${cy} ${leftX} ${leftY}`}
              fill="url(#logoGradient)"
              fillOpacity="0.8"
              className="transition-all duration-300"
            />
          )
        })}

        {/* Inner lotus petals (smaller) */}
        {[30, 90, 150, 210, 270, 330].map((angle, i) => {
          const rad = (angle * Math.PI) / 180
          const petalLength = 18
          const petalWidth = 6
          const cx = centerX + 8 * Math.cos(rad)
          const cy = centerY + 8 * Math.sin(rad)
          
          const tipX = centerX + petalLength * Math.cos(rad)
          const tipY = centerY + petalLength * Math.sin(rad)
          
          const perpRad = rad + Math.PI / 2
          const leftX = cx + (petalWidth / 2) * Math.cos(perpRad)
          const leftY = cy + (petalWidth / 2) * Math.sin(perpRad)
          const rightX = cx + (petalWidth / 2) * Math.cos(perpRad + Math.PI)
          const rightY = cy + (petalWidth / 2) * Math.sin(perpRad + Math.PI)
          
          return (
            <path
              key={`inner-${i}`}
              d={`M ${leftX} ${leftY} Q ${tipX} ${tipY} ${rightX} ${rightY} Q ${cx} ${cy} ${leftX} ${leftY}`}
              fill="url(#logoGradient)"
              fillOpacity="0.95"
              className="transition-all duration-300"
            />
          )
        })}

        {/* Center dot */}
        <circle
          cx={centerX}
          cy={centerY}
          r="6"
          fill="url(#logoGradient)"
        />
      </g>

      {/* Connecting lines from hexagon to lotus */}
      {outerPoints.map((point, i) => (
        <line
          key={`line-${i}`}
          x1={point.x}
          y1={point.y}
          x2={centerX + innerRadius * 0.8 * Math.cos((Math.PI / 3) * i - Math.PI / 2)}
          y2={centerY + innerRadius * 0.8 * Math.sin((Math.PI / 3) * i - Math.PI / 2)}
          stroke="url(#logoGradient)"
          strokeWidth="1"
          strokeOpacity="0.4"
          strokeDasharray="4 4"
          className={animated ? 'stroke-draw-delay-2' : ''}
        />
      ))}
    </svg>
  )
}
