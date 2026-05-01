import { Badge } from '@/components/ui/badge'
import { Submission } from '@/types'

interface SubmissionBadgeProps {
  status: Submission['status']
}

export function SubmissionBadge({ status }: SubmissionBadgeProps) {
  const getStatusColor = (status: Submission['status']) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      case 'pending_review':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: Submission['status']) => {
    switch (status) {
      case 'approved':
        return 'Approved'
      case 'rejected':
        return 'Rejected'
      case 'pending_review':
        return 'Pending Review'
      default:
        return status
    }
  }

  return (
    <Badge className={getStatusColor(status)}>
      {getStatusText(status)}
    </Badge>
  )
}
