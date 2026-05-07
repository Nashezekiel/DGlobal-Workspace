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
  const colorMap: Record<string, { bg: string, text: string }> = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600' },
    green: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
    yellow: { bg: 'bg-amber-50', text: 'text-amber-600' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600' },
    red: { bg: 'bg-red-50', text: 'text-red-600' },
    gray: { bg: 'bg-gray-50', text: 'text-gray-600' },
  }

  const activeColor = colorMap[color] || colorMap.gray

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 py-4 pr-4 pl-2 hover:shadow-md transition-all duration-200 motion-safe:animate-fade-up hover:-translate-y-0.5">
      <div className="flex items-center justify-start gap-4">
        <div className="flex items-center">
          <div className={`flex-shrink-0 p-3 rounded-lg ${activeColor.bg}`}>
            <Icon className={`h-6 w-6 ${activeColor.text}`} />
          </div>
          <div className="ml-2">
            <p className="text-xs font-medium text-gray-500">{label}</p>
            <p className="text-lg font-bold text-gray-900 mt-0.5">{count}</p>
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
