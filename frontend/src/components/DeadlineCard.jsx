import React, { useState, useEffect } from 'react';
import { ExternalLink, Check, Clock, FileText, Calendar, Building, Sparkles, Briefcase, Trophy, ClipboardList, Code2, FormInput, GraduationCap } from 'lucide-react';
import confetti from 'canvas-confetti';
import { getGoogleCalendarUrl } from '../utils/notificationService';

export default function DeadlineCard({ task, onAction, onOpenDetails }) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0, isPast: false, formatted: '' });
  const [isDoneLoading, setIsDoneLoading] = useState(false);

  useEffect(() => {
    if (!task.deadline_iso) return;

    const updateTimer = () => {
      const target = new Date(task.deadline_iso).getTime();
      const now = new Date().getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, isPast: true, formatted: 'Expired / Overdue' });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      let formatted = '';
      if (days > 0) {
        formatted = `${days}d ${hours}h ${minutes}m`;
      } else {
        formatted = `${String(hours).padStart(2, '0')}h : ${String(minutes).padStart(2, '0')}m : ${String(seconds).padStart(2, '0')}s`;
      }

      setTimeLeft({ hours, minutes, seconds, isPast: false, formatted });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [task.deadline_iso]);

  const triggerConfetti = () => {
    confetti({
      particleCount: 60,
      spread: 60,
      origin: { y: 0.7 }
    });
  };

  const handleMarkDone = async (e) => {
    e.stopPropagation();
    setIsDoneLoading(true);
    triggerConfetti();
    await onAction(task.id, task.status === 'done' ? 'reactivate' : 'done');
    setIsDoneLoading(false);
  };

  const urgencyPipMap = {
    red: { pipClass: 'pip-red', label: 'Critical (<48h)', borderLeft: 'border-l-[4px] border-l-red-500' },
    yellow: { pipClass: 'pip-yellow', label: 'Approaching', borderLeft: 'border-l-[4px] border-l-yellow-500' },
    green: { pipClass: 'pip-green', label: 'Upcoming', borderLeft: 'border-l-[4px] border-l-emerald-500' },
    overdue: { pipClass: 'pip-red', label: 'Overdue', borderLeft: 'border-l-[4px] border-l-red-600' }
  };

  const currentUrgency = urgencyPipMap[task.urgency_tier] || urgencyPipMap.green;
  const isDone = task.status === 'done';

  const getCleanLink = (link) => {
    if (!link) return null;
    let clean = link.trim();
    if (clean === 'https://forms.gle' || clean === 'https://forms.gle/') {
      return 'https://forms.google.com';
    }
    if (clean.startsWith('http://') || clean.startsWith('https://')) {
      return clean;
    }
    return `https://${clean}`;
  };

  const directLink = getCleanLink(task.primary_link);

  // Category Icon & Badge
  const getCategoryMeta = (cat) => {
    switch ((cat || '').toLowerCase()) {
      case 'registration':
        return { icon: Sparkles, label: 'Platform / Registration', color: 'text-cyan-300' };
      case 'placement':
        return { icon: Briefcase, label: 'Placement Drive', color: 'text-amber-300' };
      case 'hackathon':
        return { icon: Trophy, label: 'Hackathon / SIH', color: 'text-purple-300' };
      case 'feedback':
        return { icon: ClipboardList, label: 'IQAC Feedback', color: 'text-rose-400' };
      case 'assignment':
        return { icon: Code2, label: 'Lab Assignment', color: 'text-emerald-300' };
      case 'exam':
        return { icon: GraduationCap, label: 'Exam / Hall Ticket', color: 'text-orange-300' };
      case 'event':
        return { icon: FormInput, label: 'Event / Seminar', color: 'text-indigo-300' };
      default:
        return { icon: FormInput, label: task.category || 'Notice', color: 'text-neutral-300' };
    }
  };

  const catMeta = getCategoryMeta(task.category);
  const CatIcon = catMeta.icon;

  const calendarUrl = getGoogleCalendarUrl(task);

  return (
    <div
      onClick={() => onOpenDetails && onOpenDetails(task)}
      className={`rounded-2xl p-5 bw-card transition-colors duration-200 flex flex-col justify-between cursor-pointer group ${
        isDone ? 'opacity-40 bg-[#050505] border-[#181818] border-l-[4px] border-l-neutral-700' : `${currentUrgency.borderLeft} hover:border-[#38383e]`
      }`}
    >
      <div>
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex flex-wrap items-center gap-2">
            {!isDone ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#141414] text-neutral-200 border border-[#262626]">
                <span className={`w-2 h-2 rounded-full ${currentUrgency.pipClass}`}></span>
                {currentUrgency.label}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#141414] text-neutral-400 border border-[#262626]">
                <Check className="w-3 h-3 text-white" />
                Done
              </span>
            )}

            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#161616] text-neutral-300 border border-[#262626]">
              <CatIcon className={`w-3 h-3 ${catMeta.color}`} />
              <span>{catMeta.label}</span>
            </span>
          </div>

          {/* Countdown Clock */}
          {!isDone && task.deadline_iso && (
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-[#000000] border border-[#262626] text-white shrink-0">
              <Clock className={`w-3.5 h-3.5 ${task.urgency_tier === 'red' ? 'text-red-400 animate-pulse' : 'text-neutral-400'}`} />
              <span className={timeLeft.isPast ? 'text-red-400' : 'text-white'}>
                {timeLeft.formatted}
              </span>
            </div>
          )}
        </div>

        {/* Task Title */}
        <h3 className={`text-base font-bold text-white tracking-tight leading-snug mb-2 group-hover:text-neutral-200 transition-colors ${isDone ? 'line-through text-neutral-500' : ''}`}>
          {task.title}
        </h3>

        {/* Action Directive */}
        <div className="flex items-center gap-2 text-xs font-semibold text-neutral-300 mb-3.5 bg-[#101014] p-2.5 rounded-xl border border-[#1e1e24]">
          <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0"></span>
          <span className="truncate">{task.action_required}</span>
        </div>

        {/* Meta details */}
        <div className="flex flex-wrap items-center gap-y-1.5 gap-x-4 text-xs text-neutral-400 mb-3">
          {task.sender && (
            <div className="flex items-center gap-1.5 truncate max-w-[210px]">
              <Building className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
              <span className="truncate">{task.sender}</span>
            </div>
          )}
          {task.deadline_text_raw && (
            <div className="flex items-center gap-1.5 text-neutral-300 font-mono text-[11px]">
              <Calendar className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
              <span>{task.deadline_text_raw}</span>
            </div>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-3 border-t border-[#1a1a1a] flex flex-wrap items-center justify-between gap-2 mt-auto">
        <div className="flex items-center gap-2">
          {directLink && (
            <a
              href={directLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg bg-white text-black hover:bg-neutral-200 transition-all cursor-pointer shadow-sm"
            >
              <span>Open Form</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}

          {/* 1-Click Google Calendar Sync Button */}
          {task.deadline_iso && !isDone && (
            <a
              href={getGoogleCalendarUrl()}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 rounded-lg bg-[#141414] hover:bg-[#202020] text-neutral-400 hover:text-white border border-[#282828] transition-all cursor-pointer"
              title="Add to Google Calendar"
            >
              <Calendar className="w-3.5 h-3.5" />
            </a>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetails && onOpenDetails(task);
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-[#141414] hover:bg-[#1f1f1f] text-neutral-300 border border-[#282828] hover:border-neutral-500 transition-all cursor-pointer"
          >
            <FileText className="w-3 h-3" />
            <span>Details</span>
          </button>
        </div>

        <button
          type="button"
          onClick={handleMarkDone}
          disabled={isDoneLoading}
          className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer active:scale-95 ${
            isDone
              ? 'bg-[#181818] hover:bg-[#222222] text-neutral-300 border border-[#2a2a2a]'
              : 'bg-[#1a1a1a] hover:bg-white hover:text-black text-white border border-[#333333]'
          }`}
        >
          <Check className="w-3.5 h-3.5" />
          <span>{isDone ? 'Reactivate' : 'Done'}</span>
        </button>
      </div>

    </div>
  );
}

