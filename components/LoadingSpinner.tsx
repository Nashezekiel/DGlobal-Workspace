import { memo } from 'react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export const LoadingSpinner = memo(function LoadingSpinner({ 
  size = 'md', 
  className = '' 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  }

  return (
    <div className={`animate-spin rounded-full border-2 border-gray-300 border-t-purple-600 ${sizeClasses[size]} ${className}`} />
  )
})

interface FullPageLoadingProps {
  message?: string
}

export const FullPageLoading = memo(function FullPageLoading({ 
  message = 'Loading...' 
}: FullPageLoadingProps) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-50">
      <div className="text-center">
        <LoadingSpinner size="lg" className="mx-auto mb-4" />
        <p className="text-gray-600 font-medium">{message}</p>
      </div>
    </div>
  )
})

interface ButtonLoadingProps {
  isLoading: boolean
  children: React.ReactNode
  className?: string
}

export const ButtonLoading = memo(function ButtonLoading({ 
  isLoading, 
  children, 
  className = '' 
}: ButtonLoadingProps) {
  return (
    <button 
      className={`relative ${className}`}
      disabled={isLoading}
    >
      {isLoading && (
        <LoadingSpinner size="sm" className="absolute left-2" />
      )}
      <span className={isLoading ? 'ml-6' : ''}>{children}</span>
    </button>
  )
})
