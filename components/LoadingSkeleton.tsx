import { memo } from 'react'

interface LoadingSkeletonProps {
  className?: string
  lines?: number
  height?: string
}

export const LoadingSkeleton = memo(function LoadingSkeleton({ 
  className = '', 
  lines = 1, 
  height = 'h-4' 
}: LoadingSkeletonProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`${height} bg-gray-200 rounded animate-pulse`}
          style={{
            animationDelay: `${i * 0.1}s`,
            animationDuration: '1.5s'
          }}
        />
      ))}
    </div>
  )
})

export const CardSkeleton = memo(function CardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gray-200 rounded-lg animate-pulse" />
          <div className="space-y-2">
            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
            <div className="h-6 w-16 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
        <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
      </div>
      <LoadingSkeleton lines={2} height="h-3" />
    </div>
  )
})

export const StatusCardSkeleton = memo(function StatusCardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gray-200 rounded-lg animate-pulse" />
          <div className="space-y-2">
            <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
            <div className="h-8 w-12 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
        <div className="h-6 w-12 bg-gray-200 rounded animate-pulse" />
      </div>
    </div>
  )
})
