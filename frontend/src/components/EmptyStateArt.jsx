import React from 'react';
import { CheckCircle2, Sparkles, RefreshCw } from 'lucide-react';

export default function EmptyStateArt({ onResetFilter, onTriggerSync, isSyncing }) {
  return (
    <div className="rounded-3xl border border-[#222222] bg-[#0a0a0c]/80 backdrop-blur-2xl p-10 sm:p-14 text-center max-w-xl mx-auto my-12 shadow-2xl animate-fade-in flex flex-col items-center">
      
      {/* Visual Badge Icon */}
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shadow-inner">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 animate-pulse" />
        </div>
        <div className="absolute -top-1 -right-1 p-1 rounded-full bg-white text-black shadow-lg">
          <Sparkles className="w-4 h-4" />
        </div>
      </div>

      <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight mb-2">
        Radar All Clear!
      </h3>
      
      <p className="text-xs sm:text-sm text-neutral-400 max-w-md leading-relaxed mb-6">
        You're completely caught up. There are no pending deadlines or mandatory compliance notices in this category.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {onTriggerSync && (
          <button
            type="button"
            onClick={onTriggerSync}
            disabled={isSyncing}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-white text-black hover:bg-neutral-200 transition-all cursor-pointer flex items-center gap-2 shadow-lg disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Scanning Mailbox...' : 'Scan Latest 30 Days'}</span>
          </button>
        )}

        {onResetFilter && (
          <button
            type="button"
            onClick={onResetFilter}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#141414] hover:bg-[#1f1f1f] text-neutral-300 border border-[#2c2c2c] transition-all cursor-pointer"
          >
            View All Active Tasks
          </button>
        )}
      </div>

    </div>
  );
}
