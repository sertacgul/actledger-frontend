import { useMemo } from 'react'
import { useAuth } from '../../context/AuthContext'
import { ROLE_LABELS } from '../../types'

/**
 * Full-screen diagonal watermark showing the logged-in user's identity.
 * - On screen: subtle, semi-transparent (does not block interaction)
 * - On print:  clearly visible for audit/traceability
 */
export default function Watermark() {
  const { user } = useAuth()

  const timestamp = useMemo(() => {
    return new Date().toLocaleString('tr-TR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }, [])

  if (!user) return null

  const lines = [
    user.name,
    user.email,
    ROLE_LABELS[user.role],
    timestamp,
  ]

  // Repeat the stamp across a grid of positions
  const positions: Array<{ top: string; left: string }> = []
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 4; col++) {
      positions.push({
        top:  `${row * 22 + 5}%`,
        left: `${col * 28 + 2}%`,
      })
    }
  }

  return (
    <div
      aria-hidden="true"
      className="watermark-root"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      {positions.map((pos, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: pos.top,
            left: pos.left,
            transform: 'rotate(-30deg)',
            transformOrigin: 'center center',
            userSelect: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          {lines.map((line, j) => (
            <p
              key={j}
              style={{
                margin: 0,
                lineHeight: 1.5,
                fontSize: '10px',
                fontFamily: 'ui-monospace, monospace',
                fontWeight: 500,
                color: 'rgba(100, 116, 139, 0.12)',   /* screen: very subtle */
                letterSpacing: '0.03em',
              }}
              className="watermark-line"
            >
              {line}
            </p>
          ))}
        </div>
      ))}

      <style>{`
        @media print {
          .watermark-root {
            position: fixed !important;
            inset: 0 !important;
            z-index: 9999 !important;
          }
          .watermark-line {
            color: rgba(30, 41, 59, 0.22) !important;
            font-size: 11px !important;
          }
        }
      `}</style>
    </div>
  )
}
