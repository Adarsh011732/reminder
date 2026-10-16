import React from 'react';

export default function ShimmerSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl p-5 bw-card border-[#1f1f1f] bg-[#0c0c0e]/60 relative overflow-hidden animate-pulse flex flex-col justify-between h-[220px]"
        >
          {/* Shimmer Wave Glow */}
          <div className="absolute inset-0 -translate-x-full animate-[shimmerGlow_2s_infinite] bg-gradient-to-r from-transparent via-white/[0.04] to-transparent pointer-events-none"></div>

          <div>
            {/* Top row */}
            <div className="flex items-center justify-between mb-4">
              <div className="w-24 h-5 rounded-full bg-white/10"></div>
              <div className="w-16 h-5 rounded-md bg-white/5"></div>
            </div>

            {/* Title lines */}
            <div className="w-4/5 h-5 rounded-md bg-white/10 mb-2"></div>
            <div className="w-2/3 h-4 rounded-md bg-white/5 mb-4"></div>

            {/* Action bubble */}
            <div className="w-full h-8 rounded-xl bg-white/5 mb-3"></div>
          </div>

          {/* Footer buttons */}
          <div className="pt-3 border-t border-white/5 flex items-center justify-between">
            <div className="w-20 h-7 rounded-lg bg-white/10"></div>
            <div className="w-16 h-7 rounded-lg bg-white/5"></div>
          </div>
        </div>
      ))}
    </div>
  );
}
