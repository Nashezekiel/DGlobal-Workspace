'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, ZoomIn } from 'lucide-react'

interface ImageLightboxProps {
  src: string
  alt?: string
  className?: string
}

/**
 * Thumbnail that opens a full-screen lightbox when clicked.
 * The overlay is rendered via a React Portal so it is never clipped by a
 * parent element's overflow, transform, or z-index stacking context.
 */
export function ImageLightbox({ src, alt = 'Image', className }: ImageLightboxProps) {
  const [open, setOpen] = useState(false)
  // createPortal requires the DOM to be available; track mount state
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  // Portal: rendered straight into <body>, never clipped by admin layout
  const overlay =
    open && mounted
      ? createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Image preview"
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setOpen(false)}
          >
            <div
              className="relative flex flex-col items-center max-w-5xl w-full"
              onClick={e => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={() => setOpen(false)}
                aria-label="Close image preview"
                className="absolute -top-10 right-0 flex items-center gap-1.5 text-white/75 hover:text-white transition-colors text-sm font-medium"
              >
                <X className="h-5 w-5" />
                <span className="hidden sm:inline">Close</span>
                <kbd className="hidden sm:inline text-[10px] bg-white/15 rounded px-1 py-0.5 ml-0.5">Esc</kbd>
              </button>

              {/* Full-size image */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={alt}
                className="max-h-[85vh] w-auto max-w-full rounded-xl shadow-2xl object-contain"
              />

              <p className="mt-3 text-[11px] text-white/40 select-none">
                Click outside the image to close
              </p>
            </div>
          </div>,
          document.body
        )
      : null

  return (
    <>
      {/* ── Thumbnail ──────────────────────────────────────────────────────── */}
      <div
        role="button"
        tabIndex={0}
        title="Click to enlarge"
        onClick={() => setOpen(true)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') setOpen(true)
        }}
        className={`relative cursor-zoom-in group ${className ?? ''}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="w-full max-h-64 object-contain bg-gray-50"
        />
        {/* Hover zoom hint */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center pointer-events-none rounded-b-md">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/55 rounded-full p-2.5">
            <ZoomIn className="h-5 w-5 text-white" />
          </div>
        </div>
      </div>

      {overlay}
    </>
  )
}
