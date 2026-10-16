import React from 'react';
import { Search, RefreshCw, Sparkles, Calendar, LayoutGrid, ListFilter } from 'lucide-react';

export default function FloatingActionDock({
  onOpenCommandPalette,
  onTriggerSync,
  isSyncing,
  onOpenParser,
  onOpenCalendarHub,
  viewMode,
  onToggleViewMode
}) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-fit px-2 py-1.5 rounded-full bg-[#0a0a0c]/85 border border-white/15 shadow-[0_20px_60px_rgba(0,0,0,0.9),0_0_30px_rgba(255,255,255,0.05)] backdrop-blur-2xl flex items-center gap-1 sm:gap-2 animate-slide-down">
      
      {/* Quick Search / Command Palette Button */}
      <button
        type="button"
        onClick={onOpenCommandPalette}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white hover:text-black text-neutral-300 text-xs font-semibold border border-white/5 transition-all cursor-pointer group"
        title="Open Command Palette (Ctrl+K / Cmd+K)"
      >
        <Search className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Search</span>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 group-hover:bg-black/10 group-hover:text-black text-neutral-400">
          ⌘K
        </span>
      </button>

      <div className="w-[1px] h-4 bg-white/10"></div>

      {/* 1-Click Sync Button */}
      <button
        type="button"
        onClick={onTriggerSync}
        disabled={isSyncing}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white hover:text-black text-neutral-300 text-xs font-semibold border border-white/5 transition-all cursor-pointer disabled:opacity-50"
        title="Sync Mailbox (Last 30 Days)"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-sky-400' : ''}`} />
        <span className="hidden md:inline">{isSyncing ? 'Syncing...' : 'Sync (30d)'}</span>
      </button>

      {/* Raw Email Parser Playground */}
      <button
        type="button"
        onClick={onOpenParser}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white hover:text-black text-neutral-300 text-xs font-semibold border border-white/5 transition-all cursor-pointer"
        title="AI Email Parser Playground"
      >
        <Sparkles className="w-3.5 h-3.5" />
        <span className="hidden md:inline">AI Parser</span>
      </button>

      {/* Google Calendar & Alerts Hub */}
      <button
        type="button"
        onClick={onOpenCalendarHub}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white hover:text-black text-neutral-300 text-xs font-semibold border border-white/5 transition-all cursor-pointer"
        title="Google Calendar & Push Alerts Hub"
      >
        <Calendar className="w-3.5 h-3.5" />
        <span className="hidden md:inline">Calendar</span>
      </button>

      <div className="w-[1px] h-4 bg-white/10"></div>

      {/* Density View Mode Toggle */}
      <button
        type="button"
        onClick={onToggleViewMode}
        className="p-1.5 rounded-full bg-white/5 hover:bg-white hover:text-black text-neutral-300 text-xs transition-all cursor-pointer"
        title={viewMode === 'grid' ? 'Switch to Compact List View' : 'Switch to Bento Grid View'}
      >
        {viewMode === 'grid' ? (
          <ListFilter className="w-4 h-4" />
        ) : (
          <LayoutGrid className="w-4 h-4" />
        )}
      </button>

    </div>
  );
}
