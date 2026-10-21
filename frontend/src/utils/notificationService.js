/**
 * Browser Push Notification Service for Student Deadline Radar
 * Handles permission requests, native desktop notifications, Service Worker fallback,
 * and in-app visual alert event broadcasting.
 * All untrusted URLs are sanitized before use in window.open, notification data, or ICS files.
 */

import { safeExternalUrl, safeIcsText } from './safeUrl';

// Play subtle, elegant 2-tone notification chime via Web Audio API
export function playNotificationChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(880, now + 0.12);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now + 0.1);
    osc1.stop(now + 0.35);
    osc2.stop(now + 0.35);
  } catch (e) {
    // AudioContext blocked or unsupported, fail silently
  }
}

// Register service worker if available in browser
export async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      return reg;
    } catch (err) {
      console.warn('Service worker registration error:', err.message);
    }
  }
  return null;
}

// Request notification permission from browser
export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    return {
      supported: false,
      granted: false,
      message: 'Browser notifications are not supported in this browser.'
    };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      await registerServiceWorker();
    }
    return {
      supported: true,
      granted: permission === 'granted',
      status: permission,
      message: permission === 'granted'
        ? 'Notifications enabled! You will receive instant alerts for critical deadlines.'
        : 'Notification permission denied or dismissed.'
    };
  } catch (err) {
    return {
      supported: true,
      granted: false,
      status: 'denied',
      message: err.message
    };
  }
}

// Get current notification permission state
export function getNotificationPermissionState() {
  if (!('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission; // 'default', 'granted', 'denied'
}

/**
 * Dispatches a notification across all available channels:
 * 1. Native Desktop/Mobile Notification (via Service Worker or Window Notification API)
 * 2. In-App Interactive Toast Banner (broadcast to React UI)
 * 3. Audio Chime
 */
export async function dispatchPushNotification({ title, body, icon = '/favicon.svg', tag, data, task }) {
  // Always trigger sound & in-app banner for guaranteed visibility (even if Windows Focus Assist suppresses OS toasts)
  playNotificationChime();

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('in-app-alert', {
      detail: {
        title,
        body,
        data,
        task,
        timestamp: Date.now()
      }
    }));
  }

  // Attempt native OS notification if permission was granted
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      // Priority 1: Service Worker (supported on Android Chrome, macOS, and Windows PWA)
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        if (reg && reg.showNotification) {
          await reg.showNotification(title, {
            body,
            icon,
            badge: icon,
            tag: tag || `deadline_${Date.now()}`,
            renotify: true,
            data
          });
          return true;
        }
      }

      // Priority 2: Standard Window Notification constructor
      const notif = new Notification(title, {
        body,
        icon,
        badge: icon,
        tag: tag || `deadline_${Date.now()}`,
        renotify: true,
        data
      });

      notif.onclick = function () {
        window.focus();
        const openTarget = safeExternalUrl(data?.url);
        if (openTarget) {
          window.open(openTarget, '_blank', 'noopener,noreferrer');
        }
        notif.close();
      };
      return true;
    } catch (err) {
      console.warn('Native notification suppressed or blocked:', err.message);
    }
  }

  return true;
}

// Helper to trigger test notification
export function triggerTestNotification(task) {
  const title = task?.title ? `🚨 Urgent: ${task.title}` : '🔔 Deadline Radar Alert Active';
  const body = task
    ? `Action: ${task.action_required || 'Immediate directive'}\nDue: ${task.deadline_text_raw || 'Action date approaching'}`
    : 'Your browser push notifications are active and ready to alert you on critical academic dates.';

  return dispatchPushNotification({
    title,
    body,
    tag: 'radar_alert',
    data: { url: safeExternalUrl(task?.primary_link) || window.location.origin },
    task
  });
}

// Generate .ics (iCalendar) file string for a single task or array of tasks
export function generateIcsCalendar(tasks) {
  const taskList = Array.isArray(tasks) ? tasks : [tasks];
  const validTasks = taskList.filter(t => t && t.deadline_iso);

  if (validTasks.length === 0) return null;

  const formatDateToICS = (date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Deadline Radar//Student Notice Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Academic Deadlines'
  ];

  validTasks.forEach((task) => {
    const safeHref = safeExternalUrl(task.primary_link);
    const deadline = new Date(task.deadline_iso);
    const startDate = new Date(deadline.getTime() - 60 * 60 * 1000);
    const endDate = deadline;
    const now = new Date();

    lines.push(
      'BEGIN:VEVENT',
      `UID:deadline_${task.id}_${now.getTime()}@deadlineradar.local`,
      `DTSTAMP:${formatDateToICS(now)}`,
      `DTSTART:${formatDateToICS(startDate)}`,
      `DTEND:${formatDateToICS(endDate)}`,
      `SUMMARY:[Deadline] ${safeIcsText(task.title)}`,
      `DESCRIPTION:${safeIcsText(task.action_required || '')}\\nSender: ${safeIcsText(task.sender || 'College')}\\nLink: ${safeIcsText(task.primary_link || 'ERP Portal')}`,
      safeHref ? `URL:${safeHref}` : `LOCATION:${safeIcsText(task.sender || 'Campus')}`,
      'STATUS:CONFIRMED',
      'BEGIN:VALARM',
      'TRIGGER:-PT24H',
      'ACTION:DISPLAY',
      'DESCRIPTION:Reminder: Deadline tomorrow',
      'END:VALARM',
      'BEGIN:VALARM',
      'TRIGGER:-PT2H',
      'ACTION:DISPLAY',
      'DESCRIPTION:Urgent: Deadline in 2 hours',
      'END:VALARM',
      'END:VEVENT'
    );
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

// Trigger browser file download of .ics
export function downloadIcsFile(tasks, filename = 'academic_deadlines.ics') {
  const icsData = generateIcsCalendar(tasks);
  if (!icsData) return false;

  const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return true;
}

// Generate Google Calendar 1-Click URL
export function getGoogleCalendarUrl(task) {
  if (!task || !task.deadline_iso) return '#';
  const d = new Date(task.deadline_iso);
  const startStr = d.toISOString().replace(/-|:|\.\d\d\d/g, '');
  const endStr = new Date(d.getTime() + 3600000).toISOString().replace(/-|:|\.\d\d\d/g, '');
  const title = encodeURIComponent(`[Deadline] ${task.title}`);
  const details = encodeURIComponent(
    `Action: ${task.action_required}\nLink: ${task.primary_link || 'ERP Portal'}\nSender: ${task.sender || 'College'}`
  );
  const location = encodeURIComponent(task.primary_link || task.sender || 'Campus');
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startStr}/${endStr}&details=${details}&location=${location}`;
}
