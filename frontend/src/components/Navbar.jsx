import React from 'react';
import { Mail, Sparkles, Calendar, Bell, RefreshCw, User, LogOut, LayoutGrid, ListFilter } from 'lucide-react';

export default function Navbar({
  currentUser,
  onLogout,
  onOpenPlayground,
  onOpenConnectMailbox,
  onOpenCalendarHub,
  pushEnabled,
  onTogglePush,
  onSyncMailbox,
  isSyncing,
  viewMode,
  onToggleViewMode,
  activeCount
}) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#1c1c1c] bg-black/90 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Animated Brand Logo */}
        <div className="flex items-center gap-3 group cursor-pointer">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-[#0e0e0e] border border-[#2a2a2a] group-hover:border-white transition-all overflow-hidden shadow-lg">
            
            {/* Ambient rotating scanner beam animation */}
            <div className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent_0deg,transparent_270deg,rgba(255,255,255,0.4)_360deg)] animate-[spin_4s_linear_infinite] pointer-events-none"></div>

            {/* Inner Emblem */}
            <div className="w-7 h-7 rounded-xl bg-white text-black font-black flex items-center justify-center text-sm z-10 transition-transform group-hover:scale-105 shadow-md">
              D
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base sm:text-lg tracking-tight text-white uppercase group-hover:text-neutral-200 transition-colors">
                DEADLINE<span className="text-neutral-500">RADAR</span>
              </span>
              <span className="text-[9px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-neutral-900 text-neutral-300 border border-neutral-800">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 hidden sm:block">Campus Mailbox AI Urgency Engine</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* User Account Badge */}
          {currentUser && (
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#121212] border border-[#242424] text-xs text-neutral-300">
              <User className="w-3.5 h-3.5 text-neutral-400" />
              <span className="font-mono truncate max-w-[170px]">{currentUser.email}</span>
            </div>
          )}

          {/* Quick Rescan Mail */}
          <button
            onClick={onOpenConnectMailbox}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-white text-black hover:bg-neutral-200 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-sm"
          >
            <Mail className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sync Mailbox</span>
          </button>

          {/* AI Simulator */}
          <button
            onClick={onOpenPlayground}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-[#141414] hover:bg-[#1f1f1f] text-neutral-200 border border-[#2a2a2a] hover:border-neutral-500 transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-neutral-400" />
            <span className="hidden md:inline">Simulator</span>
          </button>

          {/* Browser Push Notifications Quick Toggle */}
          <button
            onClick={onTogglePush}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
              pushEnabled
                ? 'bg-[#121820] text-sky-300 border-sky-800/80 hover:border-sky-500'
                : 'bg-[#141414] text-neutral-400 border-[#2a2a2a] hover:text-neutral-200 hover:border-neutral-500'
            }`}
            title={pushEnabled ? 'Push notifications active (Click to toggle)' : 'Enable browser push notifications'}
          >
            <div className="relative">
              <Bell className="w-3.5 h-3.5" />
              {pushEnabled && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-sky-400 animate-pulse"></span>
              )}
            </div>
            <span className="hidden md:inline">{pushEnabled ? 'Push ON' : 'Push Alerts'}</span>
          </button>

          {/* Google Calendar Hub */}
          <button
            onClick={onOpenCalendarHub}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-[#141414] hover:bg-[#1f1f1f] text-neutral-200 border border-[#2a2a2a] hover:border-neutral-500 transition-all cursor-pointer"
            title="Google Calendar & iCal Export Hub"
          >
            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">Calendar Hub</span>
          </button>

          {/* View Mode Toggle */}
          {onToggleViewMode && (
            <button
              onClick={onToggleViewMode}
              className="p-2 rounded-xl bg-[#141414] hover:bg-[#1f1f1f] text-neutral-300 border border-[#2a2a2a] hover:border-neutral-500 transition-all cursor-pointer"
              title={viewMode === 'grid' ? 'Switch to Compact List View' : 'Switch to Grid View'}
            >
              {viewMode === 'grid' ? (
                <ListFilter className="w-3.5 h-3.5" />
              ) : (
                <LayoutGrid className="w-3.5 h-3.5" />
              )}
            </button>
          )}

          {/* Refresh / Sync Button */}
          <button
            onClick={onSyncMailbox}
            disabled={isSyncing}
            className="p-2 rounded-xl bg-[#141414] hover:bg-[#1f1f1f] text-neutral-300 border border-[#2a2a2a] hover:border-neutral-500 transition-all cursor-pointer disabled:opacity-50"
            title="Refresh Board"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-white' : ''}`} />
          </button>

          {/* Logout / Switch Account */}
          {currentUser && (
            <button
              onClick={onLogout}
              className="p-2 rounded-xl bg-[#141414] hover:bg-red-950/40 text-neutral-400 hover:text-red-300 border border-[#2a2a2a] hover:border-red-800 transition-all cursor-pointer"
              title="Logout / Switch Mailbox"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}

        </div>

      </div>
    </header>
  );
}
