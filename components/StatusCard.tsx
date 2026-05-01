import { LucideIcon } from 'lucide-react'
import { memo } from 'react'

interface StatusCardProps {
  icon: LucideIcon
  label: string
  count: number
  color: string
  trend?: {
    value: number
    isPositive: boolean
  }
}

export const StatusCard = memo(function StatusCard({ icon: Icon, label, count, color, trend }: StatusCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow duration-200 motion-safe:animate-fade-up">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className={`flex-shrink-0 p-3 rounded-lg ${color.replace('text-', 'bg-').replace('-600', '-100')}`}>
            <Icon className={`h-6 w-6 ${color}`} />
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-600">{label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{count}</p>
          </div>
        </div>
        {trend && (
          <div className={`flex items-center text-sm font-medium ${
            trend.isPositive ? 'text-green-600' : 'text-red-600'
          }`}>
            <span className="mr-1">
              {trend.isPositive ? '+' : '-'}{trend.value}%
            </span>
            <svg 
              className={`w-4 h-4 ${trend.isPositive ? 'rotate-0' : 'rotate-180'}`} 
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>
    </div>
  )
})
