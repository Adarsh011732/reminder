import React from 'react';
import { ExternalLink, Check, Clock, FileText, Calendar, Building, ChevronRight } from 'lucide-react';
import { safeExternalUrl } from '../utils/safeUrl';

export default function CompactListView({ tasks = [], onAction, onOpenDetails }) {
  if (tasks.length === 0) return null;

  const hrefFor = (task) => (task && task.primary_link ? safeExternalUrl(task.primary_link) : null);

  return (
    <div className="rounded-2xl border border-[#222222] bg-[#0a0a0c]/80 backdrop-blur-xl overflow-hidden shadow-2xl divide-y divide-[#1a1a1a] mb-12 animate-fade-in">
      {tasks.map((task) => {
        const isDone = task.status === 'done';
        const isCritical = task.urgency_tier === 'red' || task.urgency_tier === 'overdue';
        const isApproaching = task.urgency_tier === 'yellow';

        const leftAccent = isDone
          ? 'border-l-neutral-600'
          : isCritical
          ? 'border-l-red-500 bg-red-950/10'
          : isApproaching
          ? 'border-l-yellow-400 bg-yellow-950/5'
          : 'border-l-emerald-400';

        const pipClass = isDone
          ? 'bg-neutral-600'
          : isCritical
          ? 'pip-red'
          : isApproaching
          ? 'pip-yellow'
          : 'pip-green';

        return (
          <div
            key={task.id}
            onClick={() => onOpenDetails && onOpenDetails(task)}
            className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3 border-l-[4px] ${leftAccent} hover:bg-[#121216] transition-all cursor-pointer group`}
          >
            {/* Left: Indicator, Title, & Tags */}
            <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1 sm:mt-0 ${pipClass}`}></span>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <h4 className={`text-sm font-bold text-white tracking-tight truncate group-hover:text-neutral-200 ${isDone ? 'line-through text-neutral-500' : ''}`}>
                    {task.title}
                  </h4>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#181818] text-neutral-400 border border-[#262626] shrink-0">
                    {task.category}
                  </span>
                </div>
                <p className="text-xs text-neutral-400 truncate">
                  {task.action_required} &bull; <span className="text-neutral-500">{task.sender || 'College Notice'}</span>
                </p>
              </div>
            </div>

            {/* Right: Date, Form Link, & Actions */}
            <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#1c1c1c]">
              {task.deadline_text_raw && (
                <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-neutral-300 bg-[#121212] px-2.5 py-1 rounded-lg border border-[#222222]">
                  <Clock className="w-3.5 h-3.5 text-neutral-400" />
                  <span>{task.deadline_text_raw}</span>
                </div>
              )}

              {hrefFor(task) && (
                <a
                  href={hrefFor(task)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white text-black hover:bg-neutral-200 transition-all flex items-center gap-1 shrink-0"
                >
                  <span>Form</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAction(task.id, isDone ? 'reactivate' : 'done');
                }}
                className={`p-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                  isDone
                    ? 'bg-[#181818] border-[#2c2c2c] text-neutral-400 hover:text-white'
                    : 'bg-[#141414] border-[#2c2c2c] text-white hover:bg-white hover:text-black'
                }`}
                title={isDone ? 'Reactivate' : 'Mark as Done'}
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
