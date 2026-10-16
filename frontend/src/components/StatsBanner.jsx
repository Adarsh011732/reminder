import React from 'react';
import { AlertCircle, Clock, CalendarDays, Flame, CheckCircle2 } from 'lucide-react';

export default function StatsBanner({ stats, selectedUrgency, onSelectUrgency }) {
  const cards = [
    {
      id: 'red',
      label: 'Critical / <48 Hours',
      count: stats?.critical_count || 0,
      icon: AlertCircle,
      pipClass: 'pip-red',
      subText: 'Requires immediate action',
      borderGlow: 'hover:border-neutral-400'
    },
    {
      id: 'yellow',
      label: 'Approaching / 2-7 Days',
      count: stats?.approaching_count || 0,
      icon: Clock,
      pipClass: 'pip-yellow',
      subText: 'On daily morning radar',
      borderGlow: 'hover:border-neutral-400'
    },
    {
      id: 'green',
      label: 'Upcoming / >7 Days',
      count: stats?.normal_count || 0,
      icon: CalendarDays,
      pipClass: 'pip-green',
      subText: 'Weekly summary queue',
      borderGlow: 'hover:border-neutral-400'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-8">
      {cards.map((card) => {
        const Icon = card.icon;
        const isSelected = selectedUrgency === card.id;

        return (
          <button
            key={card.id}
            onClick={() => onSelectUrgency(isSelected ? 'all' : card.id)}
            className={`text-left p-4 sm:p-5 rounded-2xl bw-card ${card.borderGlow} transition-all duration-200 cursor-pointer hover:scale-[1.01] ${
              isSelected ? 'bw-card-active ring-1 ring-white' : ''
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-neutral-400 flex items-center gap-2">
                {card.pipClass && <span className={`w-2 h-2 rounded-full ${card.pipClass}`}></span>}
                {card.label}
              </span>
              <div className="p-1.5 rounded-lg bg-[#1a1a1a] text-neutral-300">
                <Icon className="w-3.5 h-3.5 text-white" />
              </div>
            </div>

            <div className="flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black text-white tracking-tight font-mono">
                {card.count}
              </span>
            </div>
            <p className="text-[11px] text-neutral-500 mt-1 truncate">{card.subText}</p>
          </button>
        );
      })}
    </div>
  );
}
