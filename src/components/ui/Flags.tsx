export function FlagTR({ size = 20 }: { size?: number }) {
  const h = size * 0.667
  return (
    <svg viewBox="0 0 30 20" width={size} height={h} className="inline-block flex-shrink-0 rounded-[2px]" style={{ verticalAlign: 'middle' }}>
      <rect width="30" height="20" fill="#E30A17" rx="2" />
      <circle cx="12.5" cy="10" r="5.5" fill="#fff" />
      <circle cx="14" cy="10" r="4.5" fill="#E30A17" />
      <polygon points="17.5,10 15.2,7 15.8,10 15.2,13" fill="#fff" />
    </svg>
  )
}

export function FlagUS({ size = 20 }: { size?: number }) {
  const h = size * 0.667
  return (
    <svg viewBox="0 0 30 20" width={size} height={h} className="inline-block flex-shrink-0 rounded-[2px]" style={{ verticalAlign: 'middle' }}>
      <rect width="30" height="20" fill="#fff" rx="2" />
      {[0, 3.08, 6.15, 9.23, 12.31, 15.38, 18.46].map((y, i) => (
        <rect key={i} y={y} width="30" height="1.54" fill="#B22234" />
      ))}
      <rect width="12" height="10.77" fill="#3C3B6E" />
      {/* Stars (simplified 3 rows) */}
      {[2, 5.4, 8.8].map((y, row) =>
        [1.5, 4, 6.5, 9, 11].map((x, col) => (
          <circle key={`${row}-${col}`} cx={x} cy={y} r="0.55" fill="#fff" />
        ))
      )}
    </svg>
  )
}
