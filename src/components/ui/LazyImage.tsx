import { useRef, useState, useEffect } from 'react'

interface LazyImageProps {
  src: string
  alt?: string
  fallback?: string
  className?: string
  width?: number
  height?: number
}

export default function LazyImage({ src, alt = '', fallback, className, width, height }: LazyImageProps) {
  const imgRef = useRef<HTMLImageElement>(null)
  const [loaded, setLoaded] = useState(false)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = imgRef.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setInView(true); observer.disconnect() }
    }, { rootMargin: '200px' })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <img
      ref={imgRef}
      src={inView ? src : undefined}
      alt={alt}
      width={width}
      height={height}
      className={className}
      style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.2s', background: loaded ? undefined : '#e2e8f0' }}
      onLoad={() => setLoaded(true)}
      onError={e => { if (fallback) (e.target as HTMLImageElement).src = fallback }}
    />
  )
}
