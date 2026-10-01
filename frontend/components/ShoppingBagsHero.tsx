export function ShoppingBagsHero({ className = '' }: { className?: string }) {
  return (
    <div className={`relative flex items-end justify-center select-none ${className}`}>
      {/* Floating Confetti Elements */}
      <div className="absolute -top-6 left-4 w-3 h-3 rounded-full bg-[#FFD600] animate-bounce opacity-80" />
      <div className="absolute -top-3 right-6 w-2.5 h-2.5 bg-[#3B82F6] rotate-45 animate-pulse" />
      <div className="absolute top-8 -left-3 w-3 h-2 bg-[#FF0B6B] rounded-xs rotate-12" />
      <div className="absolute top-12 -right-4 w-3 h-3 bg-[#10B981] rounded-full opacity-90" />
      <div className="absolute -bottom-2 left-10 w-2 h-2 bg-[#8B5CF6] rotate-45" />
      <div className="absolute -bottom-1 right-12 w-2.5 h-2.5 bg-[#FF8A00] rounded-full" />

      {/* SVG Container for the 6 Shopping Bags Lineup */}
      <svg
        viewBox="0 0 760 420"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto max-h-[340px] sm:max-h-[380px] drop-shadow-2xl"
      >
        <defs>
          {/* Shadow filters */}
          <filter id="bag-shadow" x="-10%" y="-10%" width="120%" height="130%">
            <feDropShadow dx="0" dy="12" stdDeviation="10" floodColor="#000000" floodOpacity="0.25" />
          </filter>
          
          {/* Bag Gradients */}
          {/* 1. Yellow Bag */}
          <linearGradient id="grad-yellow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFE144" />
            <stop offset="70%" stopColor="#FFC800" />
            <stop offset="100%" stopColor="#E6A800" />
          </linearGradient>
          <linearGradient id="grad-yellow-side" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#D99B00" />
            <stop offset="100%" stopColor="#B38000" />
          </linearGradient>

          {/* 2. Blue Bag */}
          <linearGradient id="grad-blue" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="70%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#1D4ED8" />
          </linearGradient>
          <linearGradient id="grad-blue-side" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1E40AF" />
            <stop offset="100%" stopColor="#172554" />
          </linearGradient>

          {/* 3. Main Center Pink Bag */}
          <linearGradient id="grad-pink" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF2E83" />
            <stop offset="60%" stopColor="#FF0B6B" />
            <stop offset="100%" stopColor="#D40050" />
          </linearGradient>
          <linearGradient id="grad-pink-side" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#B80044" />
            <stop offset="100%" stopColor="#8A0033" />
          </linearGradient>

          {/* 4. Orange Bag */}
          <linearGradient id="grad-orange" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFA64D" />
            <stop offset="70%" stopColor="#FF8A00" />
            <stop offset="100%" stopColor="#E06D00" />
          </linearGradient>
          <linearGradient id="grad-orange-side" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#C45800" />
            <stop offset="100%" stopColor="#964000" />
          </linearGradient>

          {/* 5. Purple Bag */}
          <linearGradient id="grad-purple" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#A78BFA" />
            <stop offset="70%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#6D28D9" />
          </linearGradient>
          <linearGradient id="grad-purple-side" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#5B21B6" />
            <stop offset="100%" stopColor="#4C1D95" />
          </linearGradient>

          {/* 6. Green Bag */}
          <linearGradient id="grad-green" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34D399" />
            <stop offset="70%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <linearGradient id="grad-green-side" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#047857" />
            <stop offset="100%" stopColor="#064E3B" />
          </linearGradient>
        </defs>

        {/* ── 1. Yellow Bag (Far Left) ── */}
        <g transform="translate(30, 80)">
          {/* Handles */}
          <path d="M40 70 C40 10, 85 10, 85 70" stroke="#FFE144" strokeWidth="6" strokeLinecap="round" fill="none" />
          <path d="M46 70 C46 16, 79 16, 79 70" stroke="#D99B00" strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.6" />
          {/* Main Body */}
          <polygon points="20,70 105,70 120,320 5,320" fill="url(#grad-yellow)" />
          {/* Side Fold */}
          <polygon points="105,70 135,55 150,305 120,320" fill="url(#grad-yellow-side)" />
          {/* Top rim highlight */}
          <polygon points="20,70 105,70 135,55 50,55" fill="#FFF280" opacity="0.4" />
        </g>

        {/* ── 2. Blue Bag (Mid Left) ── */}
        <g transform="translate(115, 50)">
          {/* Handles */}
          <path d="M45 65 C45 0, 95 0, 95 65" stroke="#93C5FD" strokeWidth="7" strokeLinecap="round" fill="none" />
          <path d="M52 65 C52 8, 88 8, 88 65" stroke="#1E40AF" strokeWidth="5.5" strokeLinecap="round" fill="none" opacity="0.6" />
          {/* Main Body */}
          <polygon points="22,65 118,65 135,350 5,350" fill="url(#grad-blue)" />
          {/* Side Fold */}
          <polygon points="118,65 152,48 168,332 135,350" fill="url(#grad-blue-side)" />
          {/* Rim */}
          <polygon points="22,65 118,65 152,48 55,48" fill="#BAE6FD" opacity="0.4" />
        </g>

        {/* ── 6. Green Bag (Far Right - rendered behind) ── */}
        <g transform="translate(560, 90)">
          {/* Handles */}
          <path d="M35 60 C35 5, 75 5, 75 60" stroke="#6EE7B7" strokeWidth="6" strokeLinecap="round" fill="none" />
          {/* Main Body */}
          <polygon points="15,60 95,60 110,310 0,310" fill="url(#grad-green)" />
          {/* Side Fold */}
          <polygon points="95,60 120,45 135,295 110,310" fill="url(#grad-green-side)" />
        </g>

        {/* ── 5. Purple Bag (Mid Right - rendered behind) ── */}
        <g transform="translate(470, 60)">
          {/* Handles */}
          <path d="M40 65 C40 5, 88 5, 88 65" stroke="#C4B5FD" strokeWidth="6.5" strokeLinecap="round" fill="none" />
          {/* Main Body */}
          <polygon points="18,65 110,65 125,340 2,340" fill="url(#grad-purple)" />
          {/* Side Fold */}
          <polygon points="110,65 140,50 155,325 125,340" fill="url(#grad-purple-side)" />
        </g>

        {/* ── 4. Orange Bag (Near Right) ── */}
        <g transform="translate(390, 40)">
          {/* Handles */}
          <path d="M48 65 C48 -5, 105 -5, 105 65" stroke="#FED7AA" strokeWidth="7" strokeLinecap="round" fill="none" />
          <path d="M56 65 C56 4, 97 4, 97 65" stroke="#C45800" strokeWidth="5.5" strokeLinecap="round" fill="none" opacity="0.6" />
          {/* Main Body */}
          <polygon points="25,65 130,65 148,360 5,360" fill="url(#grad-orange)" />
          {/* Side Fold */}
          <polygon points="130,65 168,48 185,342 148,360" fill="url(#grad-orange-side)" />
          {/* Top Rim */}
          <polygon points="25,65 130,65 168,48 60,48" fill="#FFF" opacity="0.3" />
        </g>

        {/* ── 3. MAIN CENTER PINK BAG (Prominent Foreground) ── */}
        <g transform="translate(195, 10)" filter="url(#bag-shadow)">
          {/* Prominent Pink Loop Handles */}
          <path d="M65 70 C65 -25, 155 -25, 155 70" stroke="#FF80B2" strokeWidth="10" strokeLinecap="round" fill="none" />
          <path d="M75 70 C75 -12, 145 -12, 145 70" stroke="#B80044" strokeWidth="7.5" strokeLinecap="round" fill="none" opacity="0.75" />
          
          {/* Front Face */}
          <polygon points="28,70 190,70 215,395 0,395" fill="url(#grad-pink)" />
          
          {/* Side 3D Perspective Panel */}
          <polygon points="190,70 245,45 270,370 215,395" fill="url(#grad-pink-side)" />
          
          {/* Glossy top edge reflection */}
          <polygon points="28,70 190,70 245,45 80,45" fill="#FFF" opacity="0.45" />

          {/* Text: "Shop Local ♡" in elegant white calligraphy style */}
          <g transform="translate(108, 230) rotate(-6)">
            <text
              x="0"
              y="-25"
              textAnchor="middle"
              fontFamily="'Caveat', cursive, sans-serif"
              fontSize="48"
              fontWeight="bold"
              fill="#FFFFFF"
              letterSpacing="1"
            >
              Shop
            </text>
            <text
              x="0"
              y="22"
              textAnchor="middle"
              fontFamily="'Caveat', cursive, sans-serif"
              fontSize="52"
              fontWeight="bold"
              fill="#FFFFFF"
              letterSpacing="1"
            >
              Local ♡
            </text>
          </g>

          {/* Bottom subtle crease highlight */}
          <line x1="20" y1="385" x2="195" y2="385" stroke="#FF66A1" strokeWidth="2" opacity="0.6" />
        </g>
      </svg>
    </div>
  )
}
