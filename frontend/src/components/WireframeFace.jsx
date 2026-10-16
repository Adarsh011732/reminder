import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2, Clock, Sparkles, Activity, ShieldAlert } from 'lucide-react';

export default function WireframeFace({ urgencyState = 'good', criticalCount = 0, approachingCount = 0 }) {
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setPulse((prev) => !prev);
    }, urgencyState === 'critical' ? 700 : 1500);
    return () => clearInterval(interval);
  }, [urgencyState]);

  // Configurations based on urgency
  const configs = {
    critical: {
      color: '#ff3333',
      glow: '0 0 20px rgba(255, 51, 51, 0.4)',
      title: 'CRITICAL ALERT',
      statusText: `${criticalCount} Deadline${criticalCount > 1 ? 's' : ''} Due in <48h!`,
      advice: 'Immediate submission required to prevent campus penalties.',
      pipClass: 'pip-red',
      badgeBg: 'bg-red-950/40 border-red-800/60 text-red-300',
      eyeScale: 1.25,
      mouthPath: "M 32 68 Q 50 58 68 68" // Tense / flat
    },
    average: {
      color: '#ffcc00',
      glow: '0 0 20px rgba(255, 204, 0, 0.3)',
      title: 'MODERATE URGENCY',
      statusText: `${approachingCount} Approaching Deadline${approachingCount > 1 ? 's' : ''}`,
      advice: 'Review required Google Forms and schedule submissions.',
      pipClass: 'pip-yellow',
      badgeBg: 'bg-amber-950/40 border-amber-800/60 text-amber-300',
      eyeScale: 1.05,
      mouthPath: "M 35 66 Q 50 66 65 66" // Neutral
    },
    good: {
      color: '#00e676',
      glow: '0 0 20px rgba(0, 230, 118, 0.3)',
      title: 'ALL CLEAR',
      statusText: 'No Immediate Deadlines',
      advice: 'All mandatory compliance forms & deadlines are up to date.',
      pipClass: 'pip-green',
      badgeBg: 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300',
      eyeScale: 1.0,
      mouthPath: "M 32 64 Q 50 76 68 64" // Calm smile
    }
  };

  const current = configs[urgencyState] || configs.good;

  return (
    <div className="rounded-2xl bw-card p-5 border-[#222222] flex flex-col items-center text-center relative overflow-hidden transition-all duration-300 hover:border-[#383838]">
      
      {/* Background Wireframe Grid Accent */}
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:12px_12px] opacity-40 pointer-events-none"></div>

      {/* Top Status Header */}
      <div className="w-full flex items-center justify-between gap-2 mb-3 z-10">
        <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider uppercase text-neutral-400">
          <Activity className="w-3.5 h-3.5 text-white animate-pulse" />
          <span>AI Urgency Radar</span>
        </div>
        <span className={`w-2.5 h-2.5 rounded-full ${current.pipClass}`}></span>
      </div>

      {/* Animated Wireframe Cybernetic Face SVG */}
      <div className="relative my-2 flex items-center justify-center">
        
        {/* Pulsing Aura Rings */}
        <div
          className={`absolute w-32 h-32 rounded-full border border-dashed transition-all duration-500 ${
            pulse ? 'scale-110 opacity-30' : 'scale-95 opacity-10'
          }`}
          style={{ borderColor: current.color }}
        ></div>

        <div
          className={`absolute w-24 h-24 rounded-full border transition-all duration-700 ${
            pulse ? 'scale-105 opacity-40' : 'scale-90 opacity-15'
          }`}
          style={{ borderColor: current.color }}
        ></div>

        {/* Wireframe Face Vector */}
        <svg
          width="110"
          height="110"
          viewBox="0 0 100 100"
          className="z-10 transition-transform duration-300 hover:scale-105"
        >
          {/* Head Poly Contour */}
          <polygon
            points="50,6 88,24 88,68 50,94 12,68 12,24"
            fill="rgba(10, 10, 10, 0.9)"
            stroke={current.color}
            strokeWidth="1.8"
            strokeDasharray={urgencyState === 'critical' ? '4,2' : 'none'}
            style={{ filter: `drop-shadow(${current.glow})` }}
          />

          {/* Internal Wireframe Geodesic Lines */}
          <line x1="50" y1="6" x2="50" y2="94" stroke={current.color} strokeWidth="0.6" strokeOpacity="0.4" />
          <line x1="12" y1="24" x2="88" y2="68" stroke={current.color} strokeWidth="0.6" strokeOpacity="0.3" />
          <line x1="12" y1="68" x2="88" y2="24" stroke={current.color} strokeWidth="0.6" strokeOpacity="0.3" />
          <line x1="12" y1="46" x2="88" y2="46" stroke={current.color} strokeWidth="0.8" strokeOpacity="0.5" />

          {/* Left Eye */}
          <circle
            cx="34"
            cy="42"
            r={3.5 * current.eyeScale}
            fill={current.color}
            className="animate-pulse"
          />
          <circle
            cx="34"
            cy="42"
            r="8"
            fill="none"
            stroke={current.color}
            strokeWidth="0.8"
            strokeDasharray="2,2"
          />

          {/* Right Eye */}
          <circle
            cx="66"
            cy="42"
            r={3.5 * current.eyeScale}
            fill={current.color}
            className="animate-pulse"
          />
          <circle
            cx="66"
            cy="42"
            r="8"
            fill="none"
            stroke={current.color}
            strokeWidth="0.8"
            strokeDasharray="2,2"
          />

          {/* Brow Lines */}
          {urgencyState === 'critical' ? (
            <>
              <line x1="26" y1="32" x2="42" y2="36" stroke={current.color} strokeWidth="1.8" />
              <line x1="74" y1="32" x2="58" y2="36" stroke={current.color} strokeWidth="1.8" />
            </>
          ) : (
            <>
              <line x1="26" y1="34" x2="42" y2="34" stroke={current.color} strokeWidth="1.2" />
              <line x1="74" y1="34" x2="58" y2="34" stroke={current.color} strokeWidth="1.2" />
            </>
          )}

          {/* Animated Mouth Contour */}
          <path
            d={current.mouthPath}
            fill="none"
            stroke={current.color}
            strokeWidth="2.2"
            strokeLinecap="round"
          />

          {/* Nose node */}
          <polygon points="50,46 47,56 53,56" fill={current.color} fillOpacity="0.6" />
        </svg>
      </div>

      {/* Dynamic Status Callout */}
      <div className="mt-3 z-10 w-full">
        <div className={`p-2.5 rounded-xl border text-xs font-bold ${current.badgeBg} flex items-center justify-center gap-1.5 shadow-sm`}>
          <span>{current.statusText}</span>
        </div>
        <p className="text-[11px] text-neutral-400 mt-2 leading-tight">
          {current.advice}
        </p>
      </div>

    </div>
  );
}
