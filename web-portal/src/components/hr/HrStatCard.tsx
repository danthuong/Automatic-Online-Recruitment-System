interface HrStatCardProps {
  label: string
  value: string | number
  description?: string
  trend?: {
    value: number
    positive: boolean
  }
  className?: string
}

export function HrStatCard({ label, value, description, className }: HrStatCardProps) {
  return (
    <div className={`bg-card rounded-xl border border-border p-5 ${className || ''}`}>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
      {description && (
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  )
}
