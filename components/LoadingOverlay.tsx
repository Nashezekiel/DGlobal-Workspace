'use client'

import { memo } from 'react'
import { LoadingSpinner } from './LoadingSpinner'

interface LoadingOverlayProps {
  isLoading: boolean
  message?: string
  transparent?: boolean
}

export const LoadingOverlay = memo(function LoadingOverlay({ 
  isLoading, 
  message = 'Loading...', 
  transparent = false 
}: LoadingOverlayProps) {
  if (!isLoading) return null

  return (
    <div className={`fixed inset-0 flex items-center justify-center z-50 ${
      transparent ? 'bg-white/60 backdrop-blur-sm' : 'bg-white/90'
    }`}>
      <div className="text-center">
        <LoadingSpinner size="lg" className="mx-auto mb-4" />
        <p className="text-gray-700 font-medium">{message}</p>
      </div>
    </div>
  )
})

interface PageLoadingProps {
  message?: string
}

export const PageLoading = memo(function PageLoading({ 
  message = 'Loading...' 
}: PageLoadingProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <LoadingSpinner size="lg" className="mx-auto mb-4 text-purple-600" />
        <p className="text-gray-600 font-medium">{message}</p>
      </div>
    </div>
  )
})
