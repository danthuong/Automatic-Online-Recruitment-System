import type { ApplicationStatus } from '@/types/job'

interface ApplicationStatusBadgeProps {
  status: ApplicationStatus
  className?: string
}

const statusLabels: Record<ApplicationStatus, string> = {
  pending: 'Pending',
  screening: 'Screening',
  screening_passed: 'Screening Passed',
  screening_failed: 'Screening Failed',
  scheduled: 'Scheduled',
  test_completed: 'Test Completed',
  offered: 'Offered',
  rejected: 'Rejected',
}

const statusClasses: Record<ApplicationStatus, string> = {
  pending: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  screening: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  screening_passed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  screening_failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  test_completed: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  offered: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

export function ApplicationStatusBadge({ status, className }: ApplicationStatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClasses[status] || statusClasses.pending} ${className || ''}`}
    >
      {statusLabels[status] || status}
    </span>
  )
}
