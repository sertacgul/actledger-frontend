/**
 * SplashScreen - Corporate welcome animation for the ActLedger platform.
 *
 * Renders a full-viewport overlay with a staged entrance animation:
 *   1. Background fades in, glowing ring pulses
 *   2. SVG logo mark draws itself stroke-by-stroke
 *   3. Wordmark types in, tagline fades up
 *   4. Loading bar fills, then the whole screen fades out
 *   5. `onComplete` fires so the parent can unmount
 *
 * CSS-only animations - no runtime animation library required.
 */

import { useEffect, useRef, useState } from 'react'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SplashScreenProps {
  /** Called once the full animation sequence has finished */
  onComplete?: () => void
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const BG      = '#0a0f1e'
const CYAN    = '#22d3ee'
const WHITE   = '#ffffff'

// Total visible animation time (ms) - the fade-out adds ~400 ms on top.
const STAGE_DELAY_LOGO       = 300   // logo strokes begin drawing
const STAGE_DELAY_GLOW       = 600   // outer rings start pulsing
const STAGE_DELAY_WORDMARK   = 1200  // wordmark fades in
const STAGE_DELAY_TAGLINE    = 1700  // tagline fades in
const STAGE_DELAY_BAR        = 800   // loading bar starts filling
const STAGE_DELAY_FADEOUT    = 2700  // whole screen fades out
const TOTAL_DURATION         = 3100  // onComplete fires

/* ------------------------------------------------------------------ */
/*  Inline keyframes (injected once)                                   */
/* ------------------------------------------------------------------ */

const KEYFRAMES = `
@keyframes splash-draw {
  to { stroke-dashoffset: 0; }
}
@keyframes splash-fade-in {
  from { opacity: 0; transform: translateY(8px) scale(0.96); }
  to   { opacity: 1; transform: translateY(0)   scale(1); }
}
@keyframes splash-fade-in-up {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes splash-scale-in {
  from { opacity: 0; transform: scale(0.6); }
  to   { opacity: 1; transform: scale(1); }
}
@keyframes splash-dot-pop {
  0%   { opacity: 0; r: 0; }
  60%  { opacity: 1; r: 4.2; }
  100% { opacity: 1; r: 3.2; }
}
@keyframes splash-ring-pulse {
  0%   { transform: scale(0.85); opacity: 0; }
  40%  { opacity: 0.18; }
  100% { transform: scale(1.6);  opacity: 0; }
}
@keyframes splash-ring-pulse-slow {
  0%   { transform: scale(0.9); opacity: 0; }
  50%  { opacity: 0.10; }
  100% { transform: scale(2.0);  opacity: 0; }
}
@keyframes splash-bar-fill {
  from { width: 0%; }
  to   { width: 100%; }
}
@keyframes splash-shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
@keyframes splash-particle-float {
  0%   { transform: translateY(0) scale(1);   opacity: 0; }
  20%  { opacity: 0.7; }
  100% { transform: translateY(-120px) scale(0.3); opacity: 0; }
}
@keyframes splash-grid-fade {
  from { opacity: 0; }
  to   { opacity: 0.04; }
}
@keyframes splash-screen-exit {
  from { opacity: 1; }
  to   { opacity: 0; }
}
@keyframes splash-line-scan {
  0%   { top: -2px; opacity: 0; }
  10%  { opacity: 0.12; }
  90%  { opacity: 0.12; }
  100% { top: 100%; opacity: 0; }
}
`

/* ------------------------------------------------------------------ */
/*  Particles                                                          */
/* ------------------------------------------------------------------ */

const PARTICLES = Array.from({ length: 14 }, (_, i) => ({
  id: i,
  left: `${8 + Math.random() * 84}%`,
  size: 2 + Math.random() * 3,
  delay: 0.4 + Math.random() * 1.6,
  duration: 2 + Math.random() * 1.5,
  color: i % 3 === 0 ? CYAN : `rgba(255,255,255,${0.25 + Math.random() * 0.25})`,
}))

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [exiting, setExiting] = useState(false)
  const styleRef = useRef<HTMLStyleElement | null>(null)

  // Inject keyframes once, clean up on unmount
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = KEYFRAMES
    document.head.appendChild(style)
    styleRef.current = style
    return () => { style.remove() }
  }, [])

  // Stage timers
  useEffect(() => {
    const t1 = setTimeout(() => setExiting(true), STAGE_DELAY_FADEOUT)
    const t2 = setTimeout(() => onComplete?.(), TOTAL_DURATION)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [onComplete])

  /* ---- Stroke lengths (approximate, for dasharray) ---- */
  const leftStrokeLen  = 55   // M7 38 L19 8 L24 22
  const rightStrokeLen = 55   // M19 8 L31 38 L41 28
  const crossbarLen    = 13   // M13.5 26 L26 26

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: `radial-gradient(ellipse 80% 60% at 50% 45%, #111c3a 0%, ${BG} 70%)`,
        overflow: 'hidden',
        ...(exiting
          ? { animation: 'splash-screen-exit 400ms ease-in forwards' }
          : { opacity: 1 }),
      }}
    >
      {/* ---- Ambient grid background ---- */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            `linear-gradient(rgba(34,211,238,0.07) 1px, transparent 1px),
             linear-gradient(90deg, rgba(34,211,238,0.07) 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
          animation: `splash-grid-fade 1s ${STAGE_DELAY_LOGO}ms ease-out forwards`,
          opacity: 0,
        }}
      />

      {/* ---- Scanning line effect ---- */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          height: 1,
          background: `linear-gradient(90deg, transparent, ${CYAN}44, transparent)`,
          animation: `splash-line-scan 2.4s 0.5s ease-in-out forwards`,
          opacity: 0,
          top: -2,
        }}
      />

      {/* ---- Floating particles ---- */}
      {PARTICLES.map((p) => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            bottom: '30%',
            left: p.left,
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: p.color,
            opacity: 0,
            animation: `splash-particle-float ${p.duration}s ${p.delay}s ease-out forwards`,
            pointerEvents: 'none',
          }}
        />
      ))}

      {/* ---- Glow rings behind logo ---- */}
      <div style={{ position: 'relative', marginBottom: 32 }}>
        {/* Outer ring 1 */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: 160,
            height: 160,
            marginTop: -80,
            marginLeft: -80,
            borderRadius: '50%',
            border: `1.5px solid ${CYAN}`,
            opacity: 0,
            animation: `splash-ring-pulse 2s ${STAGE_DELAY_GLOW}ms ease-out infinite`,
          }}
        />
        {/* Outer ring 2 (offset phase) */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: 160,
            height: 160,
            marginTop: -80,
            marginLeft: -80,
            borderRadius: '50%',
            border: `1px solid ${CYAN}`,
            opacity: 0,
            animation: `splash-ring-pulse-slow 2.6s ${STAGE_DELAY_GLOW + 400}ms ease-out infinite`,
          }}
        />
        {/* Inner steady glow */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: 120,
            height: 120,
            marginTop: -60,
            marginLeft: -60,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${CYAN}18 0%, transparent 70%)`,
            opacity: 0,
            animation: `splash-fade-in 0.8s ${STAGE_DELAY_GLOW}ms ease-out forwards`,
          }}
        />

        {/* ---- SVG Logo ---- */}
        <div
          style={{
            position: 'relative',
            width: 88,
            height: 88,
            opacity: 0,
            animation: `splash-scale-in 0.7s ${STAGE_DELAY_LOGO}ms cubic-bezier(0.16,1,0.3,1) forwards`,
            filter: `drop-shadow(0 0 18px ${CYAN}55)`,
          }}
        >
          <svg
            viewBox="0 0 48 48"
            width={88}
            height={88}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-label="ActLedger logo"
            role="img"
          >
            {/* Left ascending stroke - white (Act) */}
            <path
              d="M 7 38 L 19 8 L 24 22"
              stroke={WHITE}
              strokeWidth="3.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              style={{
                strokeDasharray: leftStrokeLen,
                strokeDashoffset: leftStrokeLen,
                animation: `splash-draw 0.8s ${STAGE_DELAY_LOGO + 100}ms ease-out forwards`,
              }}
            />

            {/* Right descending stroke + check - cyan (Ledger) */}
            <path
              d="M 19 8 L 31 38 L 41 28"
              stroke={CYAN}
              strokeWidth="3.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              style={{
                strokeDasharray: rightStrokeLen,
                strokeDashoffset: rightStrokeLen,
                animation: `splash-draw 0.8s ${STAGE_DELAY_LOGO + 300}ms ease-out forwards`,
              }}
            />

            {/* Crossbar */}
            <path
              d="M 13.5 26 L 26 26"
              stroke={WHITE}
              strokeWidth="2.8"
              strokeLinecap="round"
              style={{
                opacity: 0.9,
                strokeDasharray: crossbarLen,
                strokeDashoffset: crossbarLen,
                animation: `splash-draw 0.5s ${STAGE_DELAY_LOGO + 600}ms ease-out forwards`,
              }}
            />

            {/* Accent dot */}
            <circle
              cx="42"
              cy="14"
              r="3.2"
              fill={CYAN}
              style={{
                opacity: 0,
                animation: `splash-dot-pop 0.4s ${STAGE_DELAY_LOGO + 800}ms cubic-bezier(0.34,1.56,0.64,1) forwards`,
              }}
            />
          </svg>
        </div>
      </div>

      {/* ---- Wordmark ---- */}
      <div
        style={{
          opacity: 0,
          animation: `splash-fade-in 0.6s ${STAGE_DELAY_WORDMARK}ms ease-out forwards`,
          display: 'flex',
          alignItems: 'baseline',
          gap: 1,
          userSelect: 'none',
        }}
      >
        <span
          style={{
            fontSize: 36,
            fontWeight: 800,
            letterSpacing: '-0.03em',
            color: WHITE,
            lineHeight: 1,
          }}
        >
          Act
        </span>
        <span
          style={{
            fontSize: 36,
            fontWeight: 800,
            letterSpacing: '-0.03em',
            color: CYAN,
            lineHeight: 1,
          }}
        >
          Ledger
        </span>
      </div>

      {/* ---- Tagline ---- */}
      <p
        style={{
          marginTop: 14,
          fontSize: 13,
          fontWeight: 500,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.45)',
          opacity: 0,
          animation: `splash-fade-in-up 0.6s ${STAGE_DELAY_TAGLINE}ms ease-out forwards`,
          userSelect: 'none',
        }}
      >
        Operasyonel M\u00fckemmellik Sistemi
      </p>

      {/* ---- Loading bar ---- */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 3,
          background: 'rgba(255,255,255,0.04)',
        }}
      >
        {/* Fill */}
        <div
          style={{
            height: '100%',
            width: 0,
            background: `linear-gradient(90deg, ${CYAN}00, ${CYAN}, ${CYAN}00)`,
            animation: `splash-bar-fill 1.8s ${STAGE_DELAY_BAR}ms cubic-bezier(0.4,0,0.2,1) forwards`,
          }}
        />
        {/* Shimmer overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.25) 50%, transparent 100%)`,
            backgroundSize: '200% 100%',
            animation: `splash-shimmer 1.2s ${STAGE_DELAY_BAR}ms linear infinite`,
            opacity: 0.5,
          }}
        />
      </div>
    </div>
  )
}
