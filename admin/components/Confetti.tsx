// Confetti & Party Popper effect component

export function Confetti({ active }: { active: boolean }) {
  if (!active) return null

  const colors = [
    '#d4a017', // Gold
    '#f3d48a', // Soft gold
    '#9b1c32', // Crimson
    '#ffffff', // Sparkle white
    '#ffd700', // Metallic yellow
    '#ff4757', // Festive red
    '#2ed573', // Emerald green
    '#ffa502', // Orange gold
  ]

  // Standard falling confetti shower
  const topShower = Array.from({ length: 90 }, (_, i) => ({
    id: `top-${i}`,
    left: `${(i * 11.3) % 100}%`,
    width: i % 4 === 0 ? 12 : i % 3 === 0 ? 8 : 5,
    height: i % 2 === 0 ? 16 : 9,
    color: colors[i % colors.length],
    delay: (i * 0.025).toFixed(2),
    duration: (2.2 + (i % 6) * 0.35).toFixed(2),
    drift: `${((i % 7) - 3) * 35}px`,
  }))

  // Left party popper blast
  const leftPopper = Array.from({ length: 45 }, (_, i) => ({
    id: `left-${i}`,
    color: colors[i % colors.length],
    width: i % 3 === 0 ? 10 : 6,
    height: i % 2 === 0 ? 14 : 7,
    delay: (i * 0.015).toFixed(2),
    duration: (2.0 + (i % 4) * 0.3).toFixed(2),
    rx: `${(i * 9) % 300}px`,
    ry: `${-((i * 12) % 250)}px`,
  }))

  // Right party popper blast
  const rightPopper = Array.from({ length: 45 }, (_, i) => ({
    id: `right-${i}`,
    color: colors[i % colors.length],
    width: i % 3 === 0 ? 10 : 6,
    height: i % 2 === 0 ? 14 : 7,
    delay: (i * 0.015).toFixed(2),
    duration: (2.0 + (i % 4) * 0.3).toFixed(2),
    rx: `${(i * 9) % 300}px`,
    ry: `${-((i * 12) % 250)}px`,
  }))

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden">
      {/* Top Shower */}
      {topShower.map((p) => (
        <span
          key={p.id}
          className="absolute top-0"
          style={
            {
              left: p.left,
              width: `${p.width}px`,
              height: `${p.height}px`,
              backgroundColor: p.color,
              animation: `confetti-fall ${p.duration}s cubic-bezier(0.25, 1, 0.5, 1) ${p.delay}s both`,
              '--drift': p.drift,
            } as React.CSSProperties
          }
        />
      ))}

      {/* Left Cannon Popper */}
      {leftPopper.map((p) => (
        <span
          key={p.id}
          className="absolute bottom-0 left-0"
          style={
            {
              width: `${p.width}px`,
              height: `${p.height}px`,
              backgroundColor: p.color,
              animation: `popper-left ${p.duration}s cubic-bezier(0.12, 0.8, 0.32, 1) ${p.delay}s both`,
              '--rx': p.rx,
              '--ry': p.ry,
            } as React.CSSProperties
          }
        />
      ))}

      {/* Right Cannon Popper */}
      {rightPopper.map((p) => (
        <span
          key={p.id}
          className="absolute bottom-0 right-0"
          style={
            {
              width: `${p.width}px`,
              height: `${p.height}px`,
              backgroundColor: p.color,
              animation: `popper-right ${p.duration}s cubic-bezier(0.12, 0.8, 0.32, 1) ${p.delay}s both`,
              '--rx': p.rx,
              '--ry': p.ry,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  )
}
