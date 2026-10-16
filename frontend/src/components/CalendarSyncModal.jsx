import React, { useState } from 'react';
import { X, Calendar, Download, ExternalLink, Check, Shield, Clock, ChevronDown } from 'lucide-react';
import {
  downloadIcsFile,
  getGoogleCalendarUrl
} from '../utils/notificationService';

export default function CalendarSyncModal({
  isOpen,
  onClose,
  tasks = [],
  selectedTask = null
}) {
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const activeTasksWithDeadlines = tasks.filter(t => t.deadline_iso && t.status === 'active');
  const [chosenTaskId, setChosenTaskId] = useState(null);

  if (!isOpen) return null;

  const currentChosenTask = chosenTaskId
    ? tasks.find(t => t.id === chosenTaskId)
    : (selectedTask || (activeTasksWithDeadlines.length > 0 ? activeTasksWithDeadlines[0] : null));

  const handleDownloadAllIcs = () => {
    const success = downloadIcsFile(activeTasksWithDeadlines, 'college_deadlines.ics');
    if (success) {
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fade-in">
      <div className="relative w-full max-w-2xl bg-[#0a0a0c] border border-[#26262a] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1c1c20] flex items-center justify-between bg-[#000000]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white text-black font-bold shadow-md">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Google Calendar &amp; iCal Hub
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                  Direct Sync
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                1-Click Google Calendar event generator and universal .ics calendar export
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-[#1a1a1e] transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Section 1: 1-Click Google Calendar Sync */}
          <div className="p-5 rounded-2xl bg-[#101014] border border-[#222226] space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-[#181820] border border-[#2a2a34] text-emerald-400 shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-white">Google Calendar 1-Click Sync</h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Directly adds academic deadlines to Google Calendar with pre-configured 24-hour and 2-hour phone alarms.
                </p>
              </div>
            </div>

            {/* Notice Selector Dropdown if multiple notices exist */}
            {activeTasksWithDeadlines.length > 1 && (
              <div>
                <label className="block text-[11px] font-medium text-neutral-400 mb-1.5">
                  Select Notice / Deadline to Sync:
                </label>
                <div className="relative">
                  <select
                    value={currentChosenTask?.id || ''}
                    onChange={(e) => setChosenTaskId(Number(e.target.value))}
                    className="w-full bg-[#09090b] border border-[#26262a] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-white transition-colors appearance-none font-sans"
                  >
                    {activeTasksWithDeadlines.map((t) => (
                      <option key={t.id} value={t.id} className="bg-[#121216] text-white">
                        [{t.category.toUpperCase()}] {t.title.substring(0, 65)} {t.deadline_text_raw ? `(${t.deadline_text_raw})` : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-neutral-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            )}

            {currentChosenTask && currentChosenTask.deadline_iso ? (
              <div className="p-3.5 rounded-xl bg-[#09090b] border border-[#1e1e24] flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">{currentChosenTask.title}</p>
                  <p className="text-[11px] text-neutral-400 font-mono mt-0.5 flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-neutral-500" />
                    <span>{currentChosenTask.deadline_text_raw || 'Due soon'}</span>
                  </p>
                </div>
                <a
                  href={getGoogleCalendarUrl(currentChosenTask)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-white text-black hover:bg-neutral-200 text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <span>Add to Google Calendar</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            ) : (
              <div className="text-xs text-neutral-500 italic p-3 rounded-xl bg-[#09090b] border border-[#1e1e24]">
                No active deadline with an action date currently available.
              </div>
            )}
          </div>

          {/* Section 2: Universal Calendar Export (.ics File) */}
          <div className="p-5 rounded-2xl bg-[#101014] border border-[#222226] space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-[#181820] border border-[#2a2a34] text-purple-400 shrink-0">
                <Download className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-white">Universal Calendar Export (.ics)</h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Export all <b>{activeTasksWithDeadlines.length} active deadlines</b> into a standard <code>.ics</code> calendar file. Compatible with Apple Calendar (iOS/macOS), Google Calendar, Outlook, and mobile calendar apps.
                </p>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleDownloadAllIcs}
                disabled={activeTasksWithDeadlines.length === 0}
                className="w-full py-3 rounded-xl text-xs font-bold bg-[#18181f] hover:bg-white hover:text-black text-white border border-[#2a2a34] transition-all cursor-pointer disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {downloadSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Downloaded college_deadlines.ics!</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Download All Deadlines (.ics Calendar File)</span>
                  </>
                )}
              </button>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-[#1c1c20] flex items-center justify-between bg-[#000000]">
          <div className="flex items-center gap-1.5 text-[11px] text-neutral-400">
            <Shield className="w-3.5 h-3.5 text-neutral-500" />
            <span>100% Native Calendar Integration &bull; No API Keys Required</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-white text-black hover:bg-neutral-200 transition-all cursor-pointer shadow-sm"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
}
