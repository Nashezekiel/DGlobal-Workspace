import { useState, useRef, useEffect } from 'react'
import { memo } from 'react'

interface LazyImageProps {
  src: string
  alt: string
  className?: string
  placeholder?: string
}

export const LazyImage = memo(function LazyImage({ 
  src, 
  alt, 
  className = '', 
  placeholder = 'bg-gray-200' 
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isInView, setIsInView] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )

    if (imgRef.current) {
      observer.observe(imgRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <div ref={imgRef} className={`relative ${className}`}>
      {!isLoaded && (
        <div className={`absolute inset-0 ${placeholder} animate-pulse rounded`} />
      )}
      {isInView && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={src}
          alt={alt}
          className={`${className} transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setIsLoaded(true)}
        />
      )}
    </div>
  )
})
