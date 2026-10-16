/**
 * Browser Push Notification Service for Student Deadline Radar
 * Handles permission requests, native desktop notifications, and deadline alerts.
 */

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
    return {
      supported: true,
      granted: permission === 'granted',
      status: permission,
      message: permission === 'granted'
        ? 'Notifications enabled! You will receive alerts for critical deadlines.'
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

// Dispatch a desktop push notification
export function dispatchPushNotification({ title, body, icon = '/favicon.ico', tag, data }) {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return false;
  }

  try {
    const notif = new Notification(title, {
      body,
      icon,
      badge: icon,
      tag: tag || `deadline_${Date.now()}`,
      renotify: true,
      requireInteraction: false,
      data
    });

    notif.onclick = function () {
      window.focus();
      if (data?.url) {
        window.open(data.url, '_blank');
      }
      notif.close();
    };

    return true;
  } catch (err) {
    console.warn('Failed to send browser notification:', err);
    return false;
  }
}

// Helper to trigger test notification
export function triggerTestNotification(task) {
  const title = task?.title ? `🚨 Urgent: ${task.title}` : '🔔 Deadline Radar Alert Active';
  const body = task
    ? `Action: ${task.action_required}\nDue: ${task.deadline_text_raw || 'Soon'}\nDepartment: ${task.sender || 'College'}`
    : 'Your browser push notifications are active and ready to alert you on critical academic dates.';

  return dispatchPushNotification({
    title,
    body,
    tag: 'test_alert',
    data: { url: task?.primary_link || window.location.href }
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
    const deadline = new Date(task.deadline_iso);
    const startDate = new Date(deadline.getTime() - 60 * 60 * 1000); // 1 hr before
    const endDate = deadline;
    const now = new Date();

    lines.push(
      'BEGIN:VEVENT',
      `UID:deadline_${task.id}_${now.getTime()}@deadlineradar.local`,
      `DTSTAMP:${formatDateToICS(now)}`,
      `DTSTART:${formatDateToICS(startDate)}`,
      `DTEND:${formatDateToICS(endDate)}`,
      `SUMMARY:[Deadline] ${task.title.replace(/\n/g, ' ')}`,
      `DESCRIPTION:${(task.action_required || '').replace(/\n/g, ' ')}\\nSender: ${(task.sender || 'College').replace(/\n/g, ' ')}\\nLink: ${(task.primary_link || 'ERP Portal').replace(/\n/g, ' ')}`,
      task.primary_link ? `URL:${task.primary_link}` : `LOCATION:${task.sender || 'Campus'}`,
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
