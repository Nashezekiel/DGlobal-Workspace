import { useEffect, useState } from 'react'
import { memo } from 'react'

interface PerformanceMetrics {
  loadTime: number
  renderTime: number
  memoryUsage: number
  timestamp: number
}

export const PerformanceMonitor = memo(function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null)
  const [isVisible] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart
      const renderTime = performance.now()
      
      // Get memory usage if available
      const memoryInfo = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory
      const memoryUsage = memoryInfo ? memoryInfo.usedJSHeapSize : 0

      setMetrics({
        loadTime,
        renderTime,
        memoryUsage,
        timestamp: Date.now()
      })
    }
  }, [])

  if (!isVisible || !metrics) return null

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-3 rounded-lg text-xs font-mono z-50">
      <div>Load: {(metrics.loadTime / 1000).toFixed(2)}s</div>
      <div>Render: {metrics.renderTime.toFixed(2)}ms</div>
      <div>Memory: {(metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB</div>
    </div>
  )
})

// Hook to toggle performance monitor
export function usePerformanceMonitor() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        setIsVisible(prev => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

  return isVisible
}
