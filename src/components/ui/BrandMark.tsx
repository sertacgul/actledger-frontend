/**
 * ActLedger brandmark - custom SVG icon + wordmark.
 *
 * The mark is a stylized "A" formed from two ascending strokes whose
 * crossbar continues to the right as a check / ledger entry, ending with
 * an accent dot. The two strokes echo the wordmark color split:
 *   - left stroke = white (Act)
 *   - right stroke + dot = cyan (Ledger)
 * The negative space inside the "A" doubles as an upward arrow.
 */

interface Props {
  /** Optional version string shown next to the wordmark */
  version?: string
  /** Render only the icon (no wordmark) */
  iconOnly?: boolean
  /** Pixel size for the icon */
  size?: number
  /** Force a color theme - defaults to dark sidebar context */
  variant?: 'dark' | 'light'
}

const WHITE = '#ffffff'
const CYAN  = '#22d3ee' // matches the cyan-400 used in the wordmark

export default function BrandMark({
  version, iconOnly = false, size = 32, variant = 'dark',
}: Props) {
  const isDark = variant === 'dark'
  const wordmarkBase = isDark ? 'text-white' : 'text-slate-900'
  const versionTone  = isDark ? 'text-slate-400' : 'text-slate-500'

  return (
    <div className="flex items-center gap-2.5">
      {/* Icon */}
      <div
        className="relative flex items-center justify-center flex-shrink-0"
        style={{ width: size, height: size }}
      >
        <svg
          viewBox="0 0 48 48"
          width={size}
          height={size}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="ActLedger logo"
          role="img"
        >
          {/* Left ascending stroke of the "A" - white (Act) */}
          <path
            d="M 7 38 L 19 8 L 24 22"
            stroke={WHITE}
            strokeWidth="3.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />

          {/* Right descending stroke of the "A" continuing into a ledger
              entry / check - cyan (Ledger) */}
          <path
            d="M 19 8 L 31 38 L 41 28"
            stroke={CYAN}
            strokeWidth="3.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />

          {/* Crossbar of the A (the ledger line) */}
          <path
            d="M 13.5 26 L 26 26"
            stroke={WHITE}
            strokeWidth="2.8"
            strokeLinecap="round"
            opacity="0.9"
          />

          {/* Accent dot - the "act" / completion mark */}
          <circle cx="42" cy="14" r="3.2" fill={CYAN} />
        </svg>
      </div>

      {/* Wordmark */}
      {!iconOnly && (
        <div className="flex items-baseline gap-2 min-w-0">
          <span
            className={`text-[18px] font-extrabold tracking-tight leading-none ${wordmarkBase}`}
            style={{ letterSpacing: '-0.02em' }}
          >
            Act<span style={{ color: CYAN }}>Ledger</span>
          </span>
          {version && (
            <span className={`text-[10px] font-mono font-semibold uppercase tracking-wide ${versionTone}`}>
              v{version}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
