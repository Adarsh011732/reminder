import React, { useState, useEffect, useRef } from 'react';
import { Search, Flame, Clock, CalendarDays, RefreshCw, Sparkles, Calendar, Bell, FileText, CheckCircle2, ArrowRight, X } from 'lucide-react';

export default function CommandPaletteModal({
  isOpen,
  onClose,
  tasks = [],
  onOpenTaskDetails,
  onTriggerSync,
  onOpenParser,
  onOpenCalendarHub,
  onTogglePush,
  onFilterUrgency
}) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Static quick actions
  const staticActions = [
    {
      id: 'action_sync',
      title: 'Sync College Mailbox (Last 30 Days)',
      subtitle: 'Scan and extract new forms and notices',
      icon: RefreshCw,
      handler: () => { onClose(); onTriggerSync(); }
    },
    {
      id: 'action_calendar',
      title: 'Google Calendar & .ics Export Hub',
      subtitle: 'Sync deadlines to Google Calendar or export .ics for Apple/Outlook',
      icon: Calendar,
      handler: () => { onClose(); onOpenCalendarHub(); }
    },
    {
      id: 'action_push',
      title: 'Configure Browser Push Notifications',
      subtitle: 'Enable or test desktop alerts for critical deadlines',
      icon: Bell,
      handler: () => { onClose(); onTogglePush(); }
    },
    {
      id: 'action_parser',
      title: 'Open AI Email Parser Playground',
      subtitle: 'Simulate extraction from raw notice text',
      icon: Sparkles,
      handler: () => { onClose(); onOpenParser(); }
    },
    {
      id: 'filter_critical',
      title: 'Filter: Critical Urgency (<48 Hours)',
      subtitle: 'View only urgent deadlines requiring immediate action',
      icon: Flame,
      handler: () => { onClose(); onFilterUrgency('red'); }
    },
    {
      id: 'filter_approaching',
      title: 'Filter: Approaching (2-7 Days)',
      subtitle: 'View tasks due this week',
      icon: Clock,
      handler: () => { onClose(); onFilterUrgency('yellow'); }
    }
  ];

  // Filter tasks based on query
  const filteredTasks = tasks.filter(t =>
    t.title.toLowerCase().includes(query.toLowerCase()) ||
    (t.sender && t.sender.toLowerCase().includes(query.toLowerCase())) ||
    (t.category && t.category.toLowerCase().includes(query.toLowerCase())) ||
    (t.action_required && t.action_required.toLowerCase().includes(query.toLowerCase()))
  ).slice(0, 8);

  const filteredActions = staticActions.filter(a =>
    a.title.toLowerCase().includes(query.toLowerCase()) ||
    a.subtitle.toLowerCase().includes(query.toLowerCase())
  );

  const allItems = [
    ...filteredTasks.map(t => ({
      type: 'task',
      id: t.id,
      title: t.title,
      subtitle: `${t.category.toUpperCase()} • ${t.action_required}`,
      urgency: t.urgency_tier,
      data: t
    })),
    ...filteredActions.map(a => ({
      type: 'action',
      id: a.id,
      title: a.title,
      subtitle: a.subtitle,
      icon: a.icon,
      handler: a.handler
    }))
  ];

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % (allItems.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + allItems.length) % (allItems.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = allItems[selectedIndex];
      if (selected) {
        if (selected.type === 'task') {
          onClose();
          onOpenTaskDetails(selected.data);
        } else if (selected.type === 'action') {
          selected.handler();
        }
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 sm:pt-28 p-4 bg-black/75 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-2xl bg-[#0a0a0c]/95 border border-white/15 rounded-2xl shadow-[0_25px_80px_rgba(0,0,0,0.95)] overflow-hidden backdrop-blur-3xl animate-slide-down flex flex-col"
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-white/10 bg-[#000000]/60 gap-3">
          <Search className="w-5 h-5 text-neutral-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command, search notice, company, or deadline..."
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent text-sm text-white placeholder-neutral-500 focus:outline-none font-sans"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-md text-neutral-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <div className="flex items-center gap-1 text-[10px] font-mono text-neutral-400 px-2 py-0.5 rounded bg-[#161616] border border-[#2a2a2a] shrink-0">
            <span>ESC</span>
          </div>
        </div>

        {/* Results List */}
        <div className="max-h-[380px] overflow-y-auto p-2 divide-y divide-white/5">
          {allItems.length === 0 ? (
            <div className="py-12 text-center text-neutral-500 text-xs">
              No matching notices or commands found for "{query}"
            </div>
          ) : (
            allItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const isTask = item.type === 'task';

              const urgencyPip =
                item.urgency === 'red' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]' :
                item.urgency === 'yellow' ? 'bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.8)]' :
                'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]';

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    if (isTask) {
                      onClose();
                      onOpenTaskDetails(item.data);
                    } else {
                      item.handler();
                    }
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3.5 py-3 rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-white text-black font-medium shadow-sm'
                      : 'text-neutral-300 hover:bg-[#141418]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {isTask ? (
                      <span className={`w-2 h-2 rounded-full shrink-0 ${urgencyPip}`}></span>
                    ) : (
                      <item.icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-black' : 'text-neutral-400'}`} />
                    )}

                    <div className="min-w-0">
                      <p className={`text-xs font-semibold truncate ${isSelected ? 'text-black' : 'text-white'}`}>
                        {item.title}
                      </p>
                      <p className={`text-[11px] truncate ${isSelected ? 'text-neutral-700' : 'text-neutral-400'}`}>
                        {item.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 pl-3">
                    {isTask && (
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                        isSelected ? 'bg-black/10 text-black' : 'bg-[#181818] text-neutral-400 border border-[#262626]'
                      }`}>
                        Notice
                      </span>
                    )}
                    <ArrowRight className={`w-3.5 h-3.5 ${isSelected ? 'text-black opacity-100' : 'opacity-0'}`} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Navigation Hints */}
        <div className="px-4 py-2.5 bg-[#000000] border-t border-white/10 flex items-center justify-between text-[11px] text-neutral-500 font-mono">
          <div className="flex items-center gap-3">
            <span>&uarr;&darr; to navigate</span>
            <span>&crarr; to select</span>
            <span>ESC to close</span>
          </div>
          <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold">
            Deadline Radar Command
          </span>
        </div>
      </div>
    </div>
  );
}
