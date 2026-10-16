import React, { useState, useEffect } from 'react';

export default function StickAnimation() {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStage((prev) => (prev + 1) % 4);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full max-w-[340px] h-[230px] mx-auto flex flex-col items-center justify-center select-none">
      
      {/* Background Soft Ambient Light Spheres (Monochrome) */}
      <div className="absolute w-56 h-56 bg-white/[0.04] rounded-full blur-3xl pointer-events-none -top-4 -left-4"></div>
      <div className="absolute w-44 h-44 bg-white/[0.03] rounded-full blur-3xl pointer-events-none -bottom-4 -right-4"></div>

      <svg width="320" height="215" viewBox="0 0 320 215" className="z-10 overflow-visible">
        
        {/* Subtle Ambient Radar Rings */}
        <circle cx="210" cy="120" r="45" fill="none" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="1" strokeDasharray="3 4" />
        <circle cx="210" cy="120" r="75" fill="none" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1" strokeDasharray="4 6" />

        {/* Notification Popup above Laptop (Stages 1, 2, 3) */}
        {(stage >= 1) && (
          <g className="animate-slide-down">
            <rect
              x="160"
              y="18"
              width="142"
              height="44"
              rx="12"
              fill="#121212"
              stroke="#333333"
              strokeWidth="1.2"
            />
            <circle cx="180" cy="40" r="7" fill="#ef4444" />
            <path d="M 176 40 L 184 40" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
            
            <text x="196" y="34" fill="#ffffff" fontSize="10" fontWeight="bold" fontFamily="sans-serif">
              DEADLINE ALERT
            </text>
            <text x="196" y="49" fill="#a3a3a3" fontSize="9" fontFamily="sans-serif">
              Form Closes Today 5 PM
            </text>
          </g>
        )}

        {/* Lightbulb "Aha!" Moment above Student Head (Stages 2, 3) */}
        {(stage >= 2) && (
          <g className="animate-fade-in">
            <circle cx="78" cy="24" r="10" fill="#ffffff" />
            <path d="M 73 35 L 83 35" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 78 9 L 78 4" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
            <path d="M 63 15 L 58 11" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
            <path d="M 93 15 L 98 11" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
            <path d="M 74 24 Q 78 20 82 24" fill="none" stroke="#000000" strokeWidth="1.8" strokeLinecap="round" />
          </g>
        )}

        {/* Success checkmark badge (Stage 3) */}
        {stage === 3 && (
          <g className="animate-fade-in">
            <circle cx="245" cy="98" r="11" fill="#10b981" />
            <path d="M 240 98 L 243 101 L 250 94" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        )}

        {/* Desk Setup */}
        <line x1="20" y1="175" x2="300" y2="175" stroke="#334155" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="55" y1="175" x2="50" y2="210" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />
        <line x1="265" y1="175" x2="270" y2="210" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />

        {/* Laptop Base & Screen */}
        <polygon points="145,173 225,173 232,175 138,175" fill="#94a3b8" />
        <polygon points="160,112 235,115 225,173 150,173" fill="#0f172a" stroke="#cbd5e1" strokeWidth="2" />
        
        {/* Glowing Screen Lines */}
        <line x1="168" y1="130" x2="215" y2="132" stroke="#38bdf8" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="166" y1="142" x2="205" y2="144" stroke="#818cf8" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="164" y1="154" x2="212" y2="156" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" />

        {/* Coffee Mug with subtle steam */}
        <rect x="250" y="153" width="16" height="20" rx="3" fill="#1e293b" stroke="#cbd5e1" strokeWidth="1.5" />
        <path d="M 266 158 Q 272 163 266 168" fill="none" stroke="#cbd5e1" strokeWidth="1.5" />
        <path d="M 255 146 Q 257 141 254 136" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M 261 148 Q 263 143 260 138" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.2" strokeLinecap="round" />

        {/* Student Figure */}
        <circle cx="78" cy="72" r="18" fill="#1e1e24" stroke="#ffffff" strokeWidth="2.2" />
        <path d="M 62 67 Q 78 51 94 67" fill="#ffffff" />

        {/* Student Face */}
        {stage >= 2 ? (
          <>
            <circle cx="83" cy="71" r="2.2" fill="#ffffff" />
            <circle cx="91" cy="73" r="2.2" fill="#ffffff" />
            <path d="M 83 80 Q 88 86 93 80" fill="none" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />
          </>
        ) : (
          <>
            <line x1="83" y1="71" x2="87" y2="72" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />
            <line x1="90" y1="73" x2="94" y2="74" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />
            <line x1="84" y1="80" x2="90" y2="80" stroke="#ffffff" strokeWidth="1.5" />
          </>
        )}

        {/* Body */}
        <path
          d="M 58 90 Q 78 85 98 90 L 100 142 L 56 142 Z"
          fill="#1e293b"
          stroke="#ffffff"
          strokeWidth="2"
        />

        {/* Arms Reaching to Keyboard */}
        <path
          d={stage >= 2 ? "M 86 102 Q 115 122 152 166" : "M 86 102 Q 110 135 146 168"}
          fill="none"
          stroke="#ffffff"
          strokeWidth="2.6"
          strokeLinecap="round"
        />

        {/* Ergonomic Chair */}
        <line x1="48" y1="88" x2="54" y2="158" stroke="#475569" strokeWidth="3.5" strokeLinecap="round" />
        <rect x="46" y="142" width="54" height="8" rx="3" fill="#334155" stroke="#475569" strokeWidth="1" />
        <line x1="74" y1="150" x2="74" y2="198" stroke="#475569" strokeWidth="3.5" />
        <line x1="56" y1="198" x2="92" y2="198" stroke="#475569" strokeWidth="3.5" strokeLinecap="round" />

      </svg>
    </div>
  );
}
