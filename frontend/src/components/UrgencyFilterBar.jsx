import React from 'react';
import { Search, SlidersHorizontal, ArrowUpDown, Clock, Flame, Star, X, LayoutGrid, ListFilter } from 'lucide-react';

const CATEGORIES = [
  { id: 'all', label: 'All Items' },
  { id: 'registration', label: 'Registrations (CodeVita / Portals)' },
  { id: 'hackathon', label: 'Hackathons & SIH' },
  { id: 'placement', label: 'Internships & T&P' },
  { id: 'feedback', label: 'IQAC Feedback' },
  { id: 'assignment', label: 'Lab Assignments' },
  { id: 'event', label: 'Club & Events' },
];

export default function UrgencyFilterBar({
  selectedCategory,
  onSelectCategory,
  sortBy,
  onSortChange,
  searchQuery,
  onSearchChange,
  taskCount,
  viewMode = 'grid',
  onToggleViewMode
}) {
  const getSortIcon = () => {
    switch (sortBy) {
      case 'urgency':
        return <Flame className="w-3.5 h-3.5 text-white shrink-0" />;
      case 'deadline':
        return <Clock className="w-3.5 h-3.5 text-white shrink-0" />;
      case 'priority':
        return <Star className="w-3.5 h-3.5 text-white shrink-0" />;
      default:
        return <ArrowUpDown className="w-3.5 h-3.5 text-white shrink-0" />;
    }
  };

  return (
    <div className="space-y-3.5 mb-8">
      
      {/* Search & Sorting Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search company, professor, or subject..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-9 py-2.5 bg-[#0a0a0a] border border-[#222222] rounded-xl text-xs sm:text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-white transition-all font-sans"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-white cursor-pointer transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Right Controls: View Toggle, Sort & Count */}
        <div className="flex items-center gap-2">
          
          {/* View Mode Toggle (Grid vs List) */}
          {onToggleViewMode && (
            <div className="flex items-center p-1 rounded-xl bg-[#0a0a0a] border border-[#222222]">
              <button
                type="button"
                onClick={() => viewMode !== 'grid' && onToggleViewMode()}
                className={`p-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                  viewMode === 'grid' ? 'bg-white text-black font-bold shadow-sm' : 'text-neutral-400 hover:text-white'
                }`}
                title="Bento Grid View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => viewMode !== 'list' && onToggleViewMode()}
                className={`p-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                  viewMode === 'list' ? 'bg-white text-black font-bold shadow-sm' : 'text-neutral-400 hover:text-white'
                }`}
                title="Compact List View"
              >
                <ListFilter className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Enhanced Clean Monochrome Sort Dropdown with Dynamic Icon */}
          <div className="flex items-center gap-2 px-3 py-2 bg-[#0a0a0a] border border-[#222222] rounded-xl text-xs text-neutral-300 hover:border-neutral-500 transition-colors">
            {getSortIcon()}
            <span className="text-neutral-500 hidden sm:inline font-medium">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
              className="bg-transparent text-white focus:outline-none cursor-pointer font-semibold pr-1"
            >
              <option value="urgency" className="bg-[#121212] text-white">Critical Urgency</option>
              <option value="deadline" className="bg-[#121212] text-white">Soonest Deadline</option>
              <option value="priority" className="bg-[#121212] text-white">Highest Priority</option>
            </select>
          </div>

          <div className="px-3 py-2 rounded-xl bg-[#0a0a0a] border border-[#222222] text-xs font-mono text-neutral-300 font-semibold whitespace-nowrap">
            {taskCount} Deadlines
          </div>

        </div>

      </div>

      {/* Category Filter Pills (Clean Black & White) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.id;

          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isSelected
                  ? 'bg-white text-black shadow-sm font-bold'
                  : 'bg-[#0e0e0e] text-neutral-400 hover:text-white hover:bg-[#161616] border border-[#202020]'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

    </div>
  );
}

