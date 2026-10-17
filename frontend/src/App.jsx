/**
 * ============================================================================
 * Student Deadline Radar - Main Application Dashboard
 * ============================================================================
 * Features:
 * - Real-time task lists separated into Active, Approaching, Critical, and Archive
 * - Tri-color urgency classification (🔴 Red: <48h, 🟡 Yellow: <7d, 🟢 Green: >7d)
 * - Mailbox synchronization modal with IMAP background ingestion
 * - Single-email AI parsing dialog with Gemini 1.5 Flash extraction
 * - Telegram alert test dispatch and native browser push notifications
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import StatsBanner from './components/StatsBanner';
import UrgencyFilterBar from './components/UrgencyFilterBar';
import DeadlineCard from './components/DeadlineCard';
import CompactListView from './components/CompactListView';
import ShimmerSkeleton from './components/ShimmerSkeleton';
import EmptyStateArt from './components/EmptyStateArt';
import EmailParserModal from './components/EmailParserModal';
import ConnectMailboxModal from './components/ConnectMailboxModal';
import CalendarSyncModal from './components/CalendarSyncModal';
import NoticeDetailModal from './components/NoticeDetailModal';
import AnimatedBackground from './components/AnimatedBackground';
import UrgencySphere from './components/UrgencySphere';
import LoginPage from './components/LoginPage';
import { requestNotificationPermission, triggerTestNotification } from './utils/notificationService';
import { Sparkles, Mail, ShieldCheck, Inbox, RefreshCw, CheckCircle2, AlertTriangle, GraduationCap, Briefcase, Code2, Calendar, Archive, RotateCcw, Check, Bell, X } from 'lucide-react';
import { apiFetch } from './utils/apiClient';

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('student_radar_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [activeTasks, setActiveTasks] = useState([]);
  const [doneTasks, setDoneTasks] = useState([]);
  const [stats, setStats] = useState(() => {
    try {
      const saved = localStorage.getItem('student_radar_stats');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [sampleEmails, setSampleEmails] = useState([]);
  const [loading, setLoading] = useState(!stats);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncToast, setSyncToast] = useState(null);

  // Push Notifications state
  const [pushEnabled, setPushEnabled] = useState(() => {
    try {
      return localStorage.getItem('student_radar_push_enabled') === 'true';
    } catch {
      return false;
    }
  });

  // Density View Mode ('grid' | 'list')
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem('student_radar_view_mode') || 'grid';
    } catch {
      return 'grid';
    }
  });

  const toggleViewMode = () => {
    const nextMode = viewMode === 'grid' ? 'list' : 'grid';
    setViewMode(nextMode);
    try {
      localStorage.setItem('student_radar_view_mode', nextMode);
    } catch (e) {
      console.warn('Could not save view mode:', e);
    }
  };

  // Group & Sorting
  const [activeGroup, setActiveGroup] = useState('all'); // 'all', 'academic', 'career', 'competitions', 'completed'
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedUrgency, setSelectedUrgency] = useState('all');
  const [sortBy, setSortBy] = useState('urgency'); // urgency, deadline, priority
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Modals
  const [isPlaygroundOpen, setIsPlaygroundOpen] = useState(false);
  const [isConnectMailboxOpen, setIsConnectMailboxOpen] = useState(false);
  const [isCalendarHubOpen, setIsCalendarHubOpen] = useState(false);
  const [selectedDetailTask, setSelectedDetailTask] = useState(null);
  const [inAppAlert, setInAppAlert] = useState(null);

  // Debounce search input to avoid request spamming (250ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Register Service Worker on initial mount
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
    }

    const handleInAppAlert = (e) => {
      if (e.detail) {
        setInAppAlert(e.detail);
        setTimeout(() => {
          setInAppAlert((curr) => (curr?.timestamp === e.detail.timestamp ? null : curr));
        }, 6000);
      }
    };

    window.addEventListener('in-app-alert', handleInAppAlert);
    return () => window.removeEventListener('in-app-alert', handleInAppAlert);
  }, []);

  // Fetch initial tasks and stats
  const fetchData = async () => {
    try {
      const [activeRes, doneRes, statsRes, samplesRes] = await Promise.all([
        apiFetch(`/api/deadlines?status=active&category=${selectedCategory}&urgency=${selectedUrgency}&search=${encodeURIComponent(debouncedSearch)}`),
        apiFetch(`/api/deadlines?status=done`),
        apiFetch('/api/stats'),
        apiFetch('/api/sample-emails')
      ]);

      if (activeRes.ok) {
        const activeData = await activeRes.json();
        setActiveTasks(activeData);
      }
      if (doneRes.ok) {
        const doneData = await doneRes.json();
        setDoneTasks(doneData);
      }
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
        try {
          localStorage.setItem('student_radar_stats', JSON.stringify(statsData));
        } catch (e) {}
      }
      if (samplesRes.ok) {
        const samplesData = await samplesRes.json();
        setSampleEmails(samplesData);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [currentUser, selectedCategory, selectedUrgency, debouncedSearch]);

  // Push notifications auto-check on critical deadlines
  useEffect(() => {
    if (pushEnabled && activeTasks.length > 0) {
      const critical = activeTasks.filter(t => t.urgency_tier === 'red' || t.urgency_tier === 'overdue');
      if (critical.length > 0) {
        const lastNotifKey = 'last_notif_time';
        const lastTime = parseInt(localStorage.getItem(lastNotifKey) || '0', 10);
        if (Date.now() - lastTime > 2 * 60 * 60 * 1000) {
          triggerTestNotification(critical[0]);
          localStorage.setItem(lastNotifKey, String(Date.now()));
        }
      }
    }
  }, [activeTasks, pushEnabled]);

  // Seamless 1-Click Background Mailbox Sync
  const handleBackgroundMailboxSync = async () => {
    setIsSyncing(true);
    setSyncToast({ type: 'info', message: 'Scanning college mailbox in background...' });

    try {
      if (currentUser && currentUser.app_password) {
        const res = await apiFetch('/api/mailbox/fetch-real-emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: currentUser.email,
            app_password: currentUser.app_password,
            imap_server: currentUser.imap_server || 'imap.gmail.com',
            port: currentUser.port || 993,
            max_emails: 20,
            search_query: 'ALL'
          })
        });

        const data = await res.json();
        if (res.ok) {
          setSyncToast({
            type: 'success',
            message: `Scan complete: ${data.actionable_found || 0} new deadlines detected!`
          });
        } else {
          setSyncToast({
            type: 'error',
            message: data.detail?.message || 'Sync encountered an error.'
          });
        }
      } else {
        setSyncToast({ type: 'success', message: 'Radar boards refreshed!' });
      }

      await fetchData();
    } catch (err) {
      setSyncToast({ type: 'error', message: `Sync error: ${err.message}` });
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncToast(null), 4000);
    }
  };

  // Handle task actions (Done, Snooze, Reactivate)
  const handleTaskAction = async (taskId, action) => {
    try {
      const res = await apiFetch(`/api/deadlines/${taskId}/action`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error('Action failed:', err);
    }
  };

  // Toggle Push Notifications handler
  const handleTogglePush = async (explicitState) => {
    const nextState = typeof explicitState === 'boolean' ? explicitState : !pushEnabled;
    if (nextState) {
      const result = await requestNotificationPermission();
      if (result.granted) {
        setPushEnabled(true);
        localStorage.setItem('student_radar_push_enabled', 'true');
        setSyncToast({ type: 'success', message: '🔔 Desktop & In-App push notifications active!' });
        setTimeout(() => setSyncToast(null), 3500);
        triggerTestNotification(activeTasks[0]);
      } else {
        setPushEnabled(false);
        localStorage.setItem('student_radar_push_enabled', 'false');
        setSyncToast({ type: 'error', message: '⚠️ Notification permission blocked or denied in browser settings.' });
        setTimeout(() => setSyncToast(null), 4500);
        setIsCalendarHubOpen(true);
      }
    } else {
      setPushEnabled(false);
      localStorage.setItem('student_radar_push_enabled', 'false');
      setSyncToast({ type: 'info', message: '🔕 Push notifications paused.' });
      setTimeout(() => setSyncToast(null), 3000);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('student_radar_user');
    setCurrentUser(null);
  };

  // When clicking on a stat banner card, reset category filter to ensure task is visible
  const handleUrgencyBannerClick = (urgencyKey) => {
    setSelectedUrgency(selectedUrgency === urgencyKey ? 'all' : urgencyKey);
    setSelectedCategory('all');
    setActiveGroup('all');
  };

  // Sort helper
  const sortList = (list) => {
    return [...list].sort((a, b) => {
      if (sortBy === 'urgency') {
        const urgencyWeight = { overdue: 4, red: 3, yellow: 2, green: 1 };
        return (urgencyWeight[b.urgency_tier] || 0) - (urgencyWeight[a.urgency_tier] || 0);
      } else if (sortBy === 'deadline') {
        if (!a.deadline_iso) return 1;
        if (!b.deadline_iso) return -1;
        return new Date(a.deadline_iso) - new Date(b.deadline_iso);
      } else if (sortBy === 'priority') {
        return (b.priority_score || 3) - (a.priority_score || 3);
      }
      return 0;
    });
  };

  // Group segregation for Active Tasks
  const registrationTasks = sortList(activeTasks.filter(t => 
    t.category === 'registration' || 
    t.title.toLowerCase().includes('codevita') || 
    t.title.toLowerCase().includes('nptel') || 
    t.title.toLowerCase().includes('swayam') || 
    t.title.toLowerCase().includes('bootcamp') || 
    t.title.toLowerCase().includes('skillsprint') ||
    t.title.toLowerCase().includes('portal')
  ));

  const competitionTasks = sortList(activeTasks.filter(t => 
    (t.category === 'hackathon' || 
    t.title.toLowerCase().includes('hackathon') || 
    t.title.toLowerCase().includes('sih') ||
    t.title.toLowerCase().includes('innotech') ||
    t.title.toLowerCase().includes('competitive coding') ||
    t.title.toLowerCase().includes('programmer of the month')) &&
    t.category !== 'registration'
  ));

  const careerTasks = sortList(activeTasks.filter(t => 
    (t.category === 'placement' || 
    t.title.toLowerCase().includes('placement') || 
    t.title.toLowerCase().includes('drive') || 
    t.title.toLowerCase().includes('internship')) &&
    !t.title.toLowerCase().includes('sih') &&
    !t.title.toLowerCase().includes('hackathon') &&
    !t.title.toLowerCase().includes('codevita')
  ));

  const academicTasks = sortList(activeTasks.filter(t => 
    t.category === 'feedback' || 
    t.category === 'assignment' || 
    t.category === 'exam' || 
    t.category === 'form' || 
    t.title.toLowerCase().includes('feedback') || 
    t.title.toLowerCase().includes('iqac') || 
    t.title.toLowerCase().includes('hall ticket') ||
    t.title.toLowerCase().includes('lab')
  ));

  const eventTasks = sortList(activeTasks.filter(t => 
    (t.category === 'event' || 
    t.title.toLowerCase().includes('blood donation') ||
    t.title.toLowerCase().includes('symposium') ||
    t.title.toLowerCase().includes('voices of change') ||
    t.title.toLowerCase().includes('technocrats')) &&
    t.category !== 'registration' &&
    t.category !== 'hackathon'
  ));

  // Urgency state for 3D Dot Sphere
  const criticalCount = stats?.critical_count ?? activeTasks.filter(t => t.urgency_tier === 'red' || t.urgency_tier === 'overdue').length;
  const approachingCount = stats?.approaching_count ?? activeTasks.filter(t => t.urgency_tier === 'yellow').length;
  let overallUrgencyState = 'loading';
  if (stats || !loading) {
    if (criticalCount > 0) {
      overallUrgencyState = 'critical';
    } else if (approachingCount > 0) {
      overallUrgencyState = 'average';
    } else {
      overallUrgencyState = 'good';
    }
  }

  // If not logged in, render clean Login Portal
  if (!currentUser) {
    return (
      <div className="relative min-h-screen bg-black text-white selection:bg-neutral-800 selection:text-white">
        <AnimatedBackground />
        <LoginPage
          onLoginSuccess={(user) => {
            setCurrentUser(user);
            fetchData();
          }}
          onGuestLogin={(user) => {
            setCurrentUser(user);
            fetchData();
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans relative selection:bg-neutral-800 selection:text-white pb-20">
      
      {/* Ambient Particle Mesh */}
      <AnimatedBackground />

      {/* Top Navbar with Animated Radar Logo */}
      <Navbar
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenPlayground={() => setIsPlaygroundOpen(true)}
        onOpenConnectMailbox={() => setIsConnectMailboxOpen(true)}
        onOpenCalendarHub={() => setIsCalendarHubOpen(true)}
        pushEnabled={pushEnabled}
        onTogglePush={handleTogglePush}
        onSyncMailbox={handleBackgroundMailboxSync}
        isSyncing={isSyncing}
        viewMode={viewMode}
        onToggleViewMode={toggleViewMode}
        activeCount={activeTasks.length}
      />

      {/* Floating Background Sync Toast */}
      {syncToast && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-[#0e0e0e] border border-white/20 text-white shadow-2xl animate-slide-down text-xs">
          {syncToast.type === 'error' ? (
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <span className="font-semibold">{syncToast.message}</span>
        </div>
      )}

      {/* Floating Urgent In-App Push Notification Alert */}
      {inAppAlert && (
        <div className="fixed top-20 right-4 sm:right-6 z-50 max-w-sm w-full p-4 rounded-2xl bg-[#0e0e12] border border-amber-500/50 text-white shadow-2xl animate-slide-down flex items-start gap-3 backdrop-blur-xl">
          <div className="p-2.5 rounded-xl bg-amber-950/80 text-amber-400 border border-amber-800 shrink-0">
            <Bell className="w-4 h-4 animate-bounce" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs font-bold text-white truncate">{inAppAlert.title}</h4>
              <button
                type="button"
                onClick={() => setInAppAlert(null)}
                className="text-neutral-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[11px] text-neutral-300 whitespace-pre-line mt-1 line-clamp-3 leading-relaxed">
              {inAppAlert.body}
            </p>
            {inAppAlert.task?.primary_link && (
              <a
                href={inAppAlert.task.primary_link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-400 hover:text-sky-300 mt-2 underline"
              >
                <span>Open Registration Form &rarr;</span>
              </a>
            )}
          </div>
        </div>
      )}

      {/* Main Dashboard */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10 space-y-8">
        
        {/* Top Header & 3D Dot Sphere */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pb-6 border-b border-[#1c1c1c]">
          <div className="lg:col-span-8 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#121212] border border-[#262626] text-neutral-300 text-xs font-semibold">
              <span className={`w-2 h-2 rounded-full ${criticalCount > 0 ? 'pip-red' : (approachingCount > 0 ? 'pip-yellow' : 'pip-green')}`}></span>
              <span>Mailbox Linked: <code className="font-mono text-white">{currentUser.email}</code></span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white uppercase font-sans">
              DEADLINE <span className="shimmer-text">COMMAND RADAR</span>
            </h1>

            <p className="text-xs sm:text-sm text-neutral-400 max-w-xl leading-relaxed">
              Segmented student dashboard tracking platform registrations (TCS CodeVita), academic compliance, campus placement drives, and hackathons with live urgency countdowns.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                onClick={handleBackgroundMailboxSync}
                disabled={isSyncing}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-black hover:bg-neutral-200 text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Scanning Mailbox...' : 'Refresh / Scan Mailbox'}</span>
              </button>

              <button
                onClick={() => setIsCalendarHubOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#141414] hover:bg-[#1e1e1e] text-neutral-200 border border-[#2a2a2a] text-xs font-semibold transition-all cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                <span>Google Calendar Hub</span>
              </button>

              <button
                onClick={() => setIsPlaygroundOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#141414] hover:bg-[#1e1e1e] text-neutral-200 border border-[#2a2a2a] text-xs font-semibold transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-neutral-400" />
                <span>AI Simulator</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-4 flex justify-center">
            <UrgencySphere
              urgencyState={overallUrgencyState}
              criticalCount={criticalCount}
              approachingCount={approachingCount}
              isLoading={loading && !stats}
            />
          </div>
        </div>

        {/* Analytics Banner */}
        <StatsBanner
          stats={stats}
          selectedUrgency={selectedUrgency}
          onSelectUrgency={handleUrgencyBannerClick}
        />

        {/* Section Group Switcher Pills with Completed & Archive Section */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-2">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveGroup('all')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeGroup === 'all'
                  ? 'bg-white text-black shadow-md'
                  : 'bg-[#0f0f0f] text-neutral-400 hover:text-white border border-[#222222]'
              }`}
            >
              All Active ({activeTasks.length})
            </button>

            {/* NEW: Registrations & Platforms */}
            <button
              onClick={() => setActiveGroup('registrations')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                activeGroup === 'registrations'
                  ? 'bg-white text-black shadow-md'
                  : 'bg-[#0f0f0f] text-neutral-400 hover:text-white border border-[#222222]'
              }`}
            >
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>Registrations & Portals ({registrationTasks.length})</span>
            </button>

            {/* Hackathons & SIH */}
            <button
              onClick={() => setActiveGroup('competitions')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                activeGroup === 'competitions'
                  ? 'bg-white text-black shadow-md'
                  : 'bg-[#0f0f0f] text-neutral-400 hover:text-white border border-[#222222]'
              }`}
            >
              <Code2 className="w-4 h-4 text-purple-400" />
              <span>Hackathons & SIH ({competitionTasks.length})</span>
            </button>

            {/* Placements */}
            <button
              onClick={() => setActiveGroup('career')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                activeGroup === 'career'
                  ? 'bg-white text-black shadow-md'
                  : 'bg-[#0f0f0f] text-neutral-400 hover:text-white border border-[#222222]'
              }`}
            >
              <Briefcase className="w-4 h-4 text-amber-400" />
              <span>Career & Placements ({careerTasks.length})</span>
            </button>

            {/* Academic & IQAC */}
            <button
              onClick={() => setActiveGroup('academic')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                activeGroup === 'academic'
                  ? 'bg-white text-black shadow-md'
                  : 'bg-[#0f0f0f] text-neutral-400 hover:text-white border border-[#222222]'
              }`}
            >
              <GraduationCap className="w-4 h-4 text-emerald-400" />
              <span>Academic & Feedback ({academicTasks.length})</span>
            </button>

            {/* Campus Events & Seminars */}
            <button
              onClick={() => setActiveGroup('events')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                activeGroup === 'events'
                  ? 'bg-white text-black shadow-md'
                  : 'bg-[#0f0f0f] text-neutral-400 hover:text-white border border-[#222222]'
              }`}
            >
              <Calendar className="w-4 h-4 text-indigo-400" />
              <span>Events & Clubs ({eventTasks.length})</span>
            </button>

            {/* Completed & Archive Section Tab */}
            <button
              onClick={() => setActiveGroup('completed')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                activeGroup === 'completed'
                  ? 'bg-white text-black shadow-md'
                  : 'bg-[#0f0f0f] text-neutral-400 hover:text-white border border-[#222222]'
              }`}
            >
              <Archive className="w-4 h-4" />
              <span>Completed ({doneTasks.length})</span>
            </button>
          </div>
        </div>

        {/* Filters & Sorting with Density View Mode Toggle */}
        {activeGroup !== 'completed' && (
          <UrgencyFilterBar
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            sortBy={sortBy}
            onSortChange={setSortBy}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            taskCount={activeTasks.length}
            viewMode={viewMode}
            onToggleViewMode={toggleViewMode}
          />
        )}

        {/* --- MAIN DISPLAY --- */}

        {loading ? (
          <ShimmerSkeleton count={6} />
        ) : activeGroup === 'completed' ? (
          /* COMPLETED & ARCHIVED SECTION VIEW */
          <section className="p-6 rounded-3xl bg-[#090909] border border-[#222222] space-y-5 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-[#1c1c1c]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-white text-black font-bold">
                  <Archive className="w-4 h-4 text-black" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    Completed & Archived Deadlines
                  </h2>
                  <p className="text-xs text-neutral-400">Review completed submissions or reactivate any task checked by mistake</p>
                </div>
              </div>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-950/40 px-3 py-1 rounded-xl border border-emerald-800">
                {doneTasks.length} Completed
              </span>
            </div>

            {doneTasks.length === 0 ? (
              <div className="text-center py-12 text-neutral-500 text-xs">
                No completed tasks yet. Tasks you mark as done will appear here.
              </div>
            ) : viewMode === 'list' ? (
              <CompactListView
                tasks={doneTasks}
                onAction={handleTaskAction}
                onOpenDetails={(t) => setSelectedDetailTask(t)}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {doneTasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-5 rounded-2xl bg-[#050505] border border-[#222222] flex flex-col justify-between opacity-80 hover:opacity-100 transition-all"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-400">
                          <Check className="w-3.5 h-3.5" />
                          <span>Submitted / Done</span>
                        </span>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-[#181818] text-neutral-400 border border-[#262626]">
                          {task.category}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-white mb-1 leading-snug line-through text-neutral-400">
                        {task.title}
                      </h3>
                      <p className="text-xs text-neutral-400 mb-3">
                        {task.action_required}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-[#1a1a1a] flex items-center justify-between gap-2 mt-auto">
                      <button
                        onClick={() => setSelectedDetailTask(task)}
                        className="text-xs text-neutral-400 hover:text-white underline cursor-pointer"
                      >
                        View Notice
                      </button>

                      <button
                        onClick={() => handleTaskAction(task.id, 'reactivate')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg bg-[#141414] hover:bg-white hover:text-black text-neutral-200 border border-[#2a2a2a] transition-all cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reactivate Task</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : activeTasks.length === 0 ? (
          <EmptyStateArt
            onResetFilter={() => {
              setSelectedCategory('all');
              setSelectedUrgency('all');
              setSearchQuery('');
              setActiveGroup('all');
            }}
            onTriggerSync={handleBackgroundMailboxSync}
            isSyncing={isSyncing}
          />
        ) : (
          <div className="space-y-10">
            
            {/* GROUP 1: Platform & Contest Registrations (TCS CodeVita, Portals, Bootcamps) */}
            {(activeGroup === 'all' || activeGroup === 'registrations') && registrationTasks.length > 0 && (
              <section className="p-6 rounded-3xl bg-[#090909] border border-[#222222] space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#1c1c1c]">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-white text-black font-bold">
                      <Sparkles className="w-4 h-4 text-black" />
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                        Platform & Coding Contest Registrations
                      </h2>
                      <p className="text-xs text-neutral-400">TCS CodeVita, NPTEL registrations, Unstop challenges, and tech skill bootcamps</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-cyan-400 bg-cyan-950/40 px-3 py-1 rounded-xl border border-cyan-800">
                    {registrationTasks.length} Registration{registrationTasks.length > 1 ? 's' : ''}
                  </span>
                </div>

                {viewMode === 'list' ? (
                  <CompactListView
                    tasks={registrationTasks}
                    onAction={handleTaskAction}
                    onOpenDetails={(t) => setSelectedDetailTask(t)}
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {registrationTasks.map((task) => (
                      <DeadlineCard
                        key={task.id}
                        task={task}
                        onAction={handleTaskAction}
                        onOpenDetails={(t) => setSelectedDetailTask(t)}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* GROUP 2: Hackathons, SIH & Innotech */}
            {(activeGroup === 'all' || activeGroup === 'competitions') && competitionTasks.length > 0 && (
              <section className="p-6 rounded-3xl bg-[#090909] border border-[#222222] space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#1c1c1c]">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-white text-black font-bold">
                      <Code2 className="w-4 h-4 text-black" />
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                        Hackathons &amp; Smart India Hackathon (SIH)
                      </h2>
                      <p className="text-xs text-neutral-400">Smart India Hackathon screening, Innotech project exhibition, and competitive coding contests</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-purple-400 bg-purple-950/40 px-3 py-1 rounded-xl border border-purple-800">
                    {competitionTasks.length} Event{competitionTasks.length > 1 ? 's' : ''}
                  </span>
                </div>

                {viewMode === 'list' ? (
                  <CompactListView
                    tasks={competitionTasks}
                    onAction={handleTaskAction}
                    onOpenDetails={(t) => setSelectedDetailTask(t)}
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {competitionTasks.map((task) => (
                      <DeadlineCard
                        key={task.id}
                        task={task}
                        onAction={handleTaskAction}
                        onOpenDetails={(t) => setSelectedDetailTask(t)}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* GROUP 3: Career & Placement Drives */}
            {(activeGroup === 'all' || activeGroup === 'career') && careerTasks.length > 0 && (
              <section className="p-6 rounded-3xl bg-[#090909] border border-[#222222] space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#1c1c1c]">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-white text-black font-bold">
                      <Briefcase className="w-4 h-4 text-black" />
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                        Placement &amp; Internship Drives (T&amp;P Cell)
                      </h2>
                      <p className="text-xs text-neutral-400">Campus hiring notices, company registrations, and resume upload forms</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-amber-400 bg-amber-950/40 px-3 py-1 rounded-xl border border-amber-800">
                    {careerTasks.length} Drive{careerTasks.length > 1 ? 's' : ''}
                  </span>
                </div>

                {viewMode === 'list' ? (
                  <CompactListView
                    tasks={careerTasks}
                    onAction={handleTaskAction}
                    onOpenDetails={(t) => setSelectedDetailTask(t)}
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {careerTasks.map((task) => (
                      <DeadlineCard
                        key={task.id}
                        task={task}
                        onAction={handleTaskAction}
                        onOpenDetails={(t) => setSelectedDetailTask(t)}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* GROUP 4: Academic, Feedback & Labs */}
            {(activeGroup === 'all' || activeGroup === 'academic') && academicTasks.length > 0 && (
              <section className="p-6 rounded-3xl bg-[#090909] border border-[#222222] space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#1c1c1c]">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-white text-black font-bold">
                      <GraduationCap className="w-4 h-4 text-black" />
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                        Academic &amp; Faculty Feedback Requirements
                      </h2>
                      <p className="text-xs text-neutral-400">Mandatory IQAC faculty forms, course exit surveys, and lab assignment submissions</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-emerald-400 bg-emerald-950/40 px-3 py-1 rounded-xl border border-emerald-800">
                    {academicTasks.length} Task{academicTasks.length > 1 ? 's' : ''}
                  </span>
                </div>

                {viewMode === 'list' ? (
                  <CompactListView
                    tasks={academicTasks}
                    onAction={handleTaskAction}
                    onOpenDetails={(t) => setSelectedDetailTask(t)}
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {academicTasks.map((task) => (
                      <DeadlineCard
                        key={task.id}
                        task={task}
                        onAction={handleTaskAction}
                        onOpenDetails={(t) => setSelectedDetailTask(t)}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* GROUP 5: Campus Events & Club Seminars */}
            {(activeGroup === 'all' || activeGroup === 'events') && eventTasks.length > 0 && (
              <section className="p-6 rounded-3xl bg-[#090909] border border-[#222222] space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#1c1c1c]">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-white text-black font-bold">
                      <Calendar className="w-4 h-4 text-black" />
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                        Campus Events, Seminars &amp; Workshops
                      </h2>
                      <p className="text-xs text-neutral-400">Blood donation drives, technical club symposiums, and leadership debate sessions</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-indigo-400 bg-indigo-950/40 px-3 py-1 rounded-xl border border-indigo-800">
                    {eventTasks.length} Event{eventTasks.length > 1 ? 's' : ''}
                  </span>
                </div>

                {viewMode === 'list' ? (
                  <CompactListView
                    tasks={eventTasks}
                    onAction={handleTaskAction}
                    onOpenDetails={(t) => setSelectedDetailTask(t)}
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {eventTasks.map((task) => (
                      <DeadlineCard
                        key={task.id}
                        task={task}
                        onAction={handleTaskAction}
                        onOpenDetails={(t) => setSelectedDetailTask(t)}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}

          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="w-full border-t border-[#1a1a1a] bg-[#050505]/90 py-8 mt-20 text-center text-xs text-neutral-500 relative z-10">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-mono">
            <span className="w-2 h-2 rounded-full pip-green"></span>
            <span className="text-neutral-400">IMAP Mail Ingestion &amp; Gemini AI Engine Live</span>
          </div>
          <p className="text-neutral-500">Student Deadline Radar &bull; Black &amp; White Pro Edition</p>
        </div>
      </footer>

      {/* Notice Detail Modal */}
      <NoticeDetailModal
        task={selectedDetailTask}
        isOpen={Boolean(selectedDetailTask)}
        onClose={() => setSelectedDetailTask(null)}
        onAction={handleTaskAction}
        onOpenCalendarHub={() => setIsCalendarHubOpen(true)}
      />

      {/* Connect Mailbox Modal */}
      <ConnectMailboxModal
        isOpen={isConnectMailboxOpen}
        onClose={() => setIsConnectMailboxOpen(false)}
        onSyncComplete={fetchData}
      />

      {/* AI Playground Modal */}
      <EmailParserModal
        isOpen={isPlaygroundOpen}
        onClose={() => setIsPlaygroundOpen(false)}
        onTaskCreated={fetchData}
        sampleEmails={sampleEmails}
      />

      {/* Google Calendar Hub */}
      <CalendarSyncModal
        tasks={activeTasks}
        selectedTask={selectedDetailTask}
        isOpen={isCalendarHubOpen}
        onClose={() => setIsCalendarHubOpen(false)}
      />

    </div>
  );
}
