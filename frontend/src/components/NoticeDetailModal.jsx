import React from 'react';
import { X, ExternalLink, Calendar, Building, Clock, Check, Download, FileText, ShieldAlert } from 'lucide-react';
import { getGoogleCalendarUrl, downloadIcsFile } from '../utils/notificationService';

export default function NoticeDetailModal({ task, isOpen, onClose, onAction, onOpenCalendarHub }) {
  if (!isOpen || !task) return null;

  const isMandatory = task.category === 'feedback' || task.title.toLowerCase().includes('feedback') || task.title.toLowerCase().includes('iqac') || task.title.toLowerCase().includes('hall ticket');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fade-in">
      <div className="relative w-full max-w-2xl bg-[#0a0a0a] border border-[#262626] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1c1c1c] flex items-center justify-between bg-[#000000]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white text-black font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#181818] text-neutral-300 border border-[#2a2a2a]">
                  {task.category}
                </span>
                {isMandatory && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-950 text-red-400 border border-red-800">
                    Mandatory College Notice
                  </span>
                )}
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight mt-0.5">
                Notice & Form Details
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-[#1a1a1a] transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          
          {/* Title & Action */}
          <div>
            <h3 className="text-lg font-bold text-white leading-snug mb-2">
              {task.title}
            </h3>
            <div className="p-3.5 rounded-xl bg-[#121212] border border-[#242424] text-xs font-semibold text-neutral-200 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-white shrink-0"></span>
              <span>Action Required: {task.action_required}</span>
            </div>
          </div>

          {/* Key Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-[#101010] rounded-xl border border-[#1f1f1f]">
              <div className="text-[10px] uppercase font-bold text-neutral-500 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>Deadline</span>
              </div>
              <p className="font-bold text-white">{task.deadline_text_raw || 'No date specified'}</p>
            </div>

            <div className="p-3 bg-[#101010] rounded-xl border border-[#1f1f1f]">
              <div className="text-[10px] uppercase font-bold text-neutral-500 mb-1 flex items-center gap-1">
                <Building className="w-3.5 h-3.5" />
                <span>Sender / Department</span>
              </div>
              <p className="font-bold text-white truncate">{task.sender || 'Campus Notice'}</p>
            </div>
          </div>

          {/* Form / Direct Link */}
          {task.primary_link && (
            <div className="p-4 rounded-xl bg-[#141414] border border-[#282828] flex items-center justify-between gap-3">
              <div className="truncate">
                <div className="text-[10px] uppercase font-bold text-neutral-400 mb-0.5">Form / Submission URL:</div>
                <div className="text-xs text-white font-mono truncate">{task.primary_link}</div>
              </div>
              <a
                href={task.primary_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-white text-black hover:bg-neutral-200 transition-all shrink-0 shadow-sm"
              >
                <span>Open in New Tab</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {/* Email Content / Excerpt */}
          {task.raw_snippet && (
            <div>
              <div className="text-[11px] uppercase font-bold text-neutral-400 mb-1.5">Original Email Excerpt:</div>
              <div className="p-3.5 rounded-xl bg-[#000000] border border-[#202020] text-xs text-neutral-300 leading-relaxed font-mono whitespace-pre-wrap max-h-44 overflow-y-auto">
                {task.raw_snippet}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-[#1c1c1c] flex flex-wrap items-center justify-between gap-3 bg-[#000000]">
          <div className="flex items-center gap-2">
            {task.deadline_iso && (
              <>
                <a
                  href={getGoogleCalendarUrl(task)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-[#141414] hover:bg-white hover:text-black text-neutral-200 border border-[#2a2a2a] transition-all cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Google Calendar</span>
                </a>

                <button
                  type="button"
                  onClick={() => downloadIcsFile([task], `deadline_${task.id}.ics`)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-[#141414] hover:bg-[#1f1f1f] text-neutral-300 border border-[#2a2a2a] transition-all cursor-pointer"
                  title="Download .ics for Apple Calendar / Outlook"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export .ics</span>
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-neutral-400 hover:text-white cursor-pointer"
            >
              Close
            </button>

            <button
              onClick={() => {
                onAction(task.id, 'done');
                onClose();
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-white text-black hover:bg-neutral-200 transition-all cursor-pointer shadow-sm"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Mark Completed</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
