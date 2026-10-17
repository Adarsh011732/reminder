const axios = require('axios');
require('dotenv').config();

// Calculate urgency tier based on hours remaining
function computeUrgencyTier(deadline) {
  if (!deadline) return 'green';

  const d = new Date(deadline);
  if (isNaN(d.getTime())) return 'green';

  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 0) {
    return 'overdue';
  } else if (diffHours <= 48) {
    return 'red';
  } else if (diffHours <= 168) { // 7 days
    return 'yellow';
  } else {
    return 'green';
  }
}

// Extract links and clean text
function extractLinksAndText(htmlOrText) {
  if (!htmlOrText) return { cleanText: '', links: [] };

  // Strip HTML tags
  let cleanText = htmlOrText.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();

  const links = [];
  // Regex for actionable form and registration URLs
  const urlPattern = /https?:\/\/(?:forms\.gle\/[A-Za-z0-9_-]{5,}|docs\.google\.com\/forms\/d\/[^\s"'<>]+|forms\.office\.com\/r\/[A-Za-z0-9_-]+|unstop\.com\/[^\s"'<>]+|oncampus\.tcs\.com\/[^\s"'<>]+|hackerrank\.com\/[^\s"'<>]+|codechef\.com\/[^\s"'<>]+|leetcode\.com\/[^\s"'<>]+|swayam\.gov\.in\/[^\s"'<>]+|nptel\.ac\.in\/[^\s"'<>]+|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\/[^\s"'<>]+)/gi;
  
  let match;
  while ((match = urlPattern.exec(htmlOrText)) !== null) {
    let u = match[0].replace(/[.,;:)>\'"]+$/, '');
    if (u.length > 16 && !links.includes(u)) {
      if (!u.endsWith('forms.gle/') && !u.endsWith('forms.gle') && !u.endsWith('forms.office.com') && !u.endsWith('forms.office.com/')) {
        links.push(u);
      }
    }
  }

  return { cleanText, links };
}

// Check if an email is purely non-actionable noise, external promotional spam, or non-academic platform digest
function isNonActionableEmail(subject, sender, body) {
  const sub = (subject || '').toLowerCase().trim();
  const from = (sender || '').toLowerCase().trim();
  const text = (body || '').toLowerCase().trim();

  // 1. Empty or trivial content
  if (sub === 'fwd:' || sub === 're:' || (sub.length < 5 && text.length < 30)) {
    return true;
  }

  // 2. Google / Microsoft / Apple Security alerts and login notifications
  if (
    from.includes('no-reply@accounts.google.com') ||
    from.includes('accountprotection.microsoft.com') ||
    from.includes('security@') ||
    from.includes('verify@') ||
    from.includes('authenticator@') ||
    from.includes('noreply@google.com')
  ) {
    if (
      sub.includes('security alert') ||
      sub.includes('sign-in') ||
      sub.includes('new login') ||
      sub.includes('verification code') ||
      sub.includes('access granted') ||
      sub.includes('password')
    ) {
      return true;
    }
  }

  // 3. OTP & 2-Factor Authentication Emails
  if (
    sub.includes('your otp') ||
    sub.includes('verification code') ||
    sub.includes('one-time password') ||
    /\botp\b/i.test(sub) ||
    sub.includes('2-step verification') ||
    sub.includes('two-factor')
  ) {
    return true;
  }

  // 4. Automated transactional receipts / invoices / delivery status / banking
  if (
    sub.includes('receipt for') ||
    sub.includes('invoice #') ||
    sub.includes('order confirmed') ||
    sub.includes('delivery status notification') ||
    sub.includes('mail delivery failed') ||
    sub.includes('undelivered mail') ||
    sub.includes('transaction alert') ||
    sub.includes('account statement')
  ) {
    return true;
  }

  // 5. Third-party marketing / promotional platforms where student used college email
  const externalPlatforms = [
    'unstop.news', 'unstop.com', 'internshala.com', 'geeksforgeeks.org', 'gfg.org',
    'coursera.org', 'udemy.com', 'edx.org', 'simplilearn.com', 'greatlearning.in',
    'naukri.com', 'indeed.com', 'shine.com', 'foundit.in', 'monster.com',
    'swiggy.com', 'zomato.com', 'amazon.in', 'amazon.com', 'flipkart.com', 'myntra.com',
    'uber.com', 'ola.com', 'canva.com', 'figma.com', 'notion.so', 'grammarly.com',
    'spotify.com', 'netflix.com', 'medium.com', 'quora.com', 'discord.com', 'reddit.com',
    'linkedin.com', 'facebookmail.com', 'instagram.com', 'twitter.com', 'x.com'
  ];

  if (externalPlatforms.some(domain => from.includes(domain))) {
    if (!from.includes('.edu') && !from.includes('.ac.in') && !from.includes('.edu.in')) {
      return true;
    }
  }

  // 6. Generic promotional & marketing senders
  if (
    from.includes('noreply@unstop.news') ||
    from.includes('news@') ||
    from.includes('newsletter@') ||
    from.includes('promotions@') ||
    from.includes('marketing@') ||
    from.includes('digest@') ||
    from.includes('campaign@') ||
    from.includes('offers@')
  ) {
    return true;
  }

  // 7. Clickbait marketing phrases in subject from external registrations
  if (
    sub.includes('cash prize inr') ||
    sub.includes('prize pool up for grabs') ||
    sub.includes('grab internship &') ||
    sub.includes('discount') ||
    sub.includes('% off') ||
    sub.includes('weekly digest') ||
    sub.includes('exclusive invite')
  ) {
    return true;
  }

  return false;
}

// Smart relative date parser in IST
function parseRelativeDate(text, baseDate = new Date()) {
  const lower = text.toLowerCase();
  
  if (lower.includes('tomorrow')) {
    const d = new Date(baseDate.getTime());
    d.setDate(d.getDate() + 1);
    
    const timeMatch = lower.match(/(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1], 10);
      const mins = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      const ampm = timeMatch[3].toLowerCase();
      if (ampm === 'pm' && hours < 12) hours += 12;
      if (ampm === 'am' && hours === 12) hours = 0;
      d.setHours(hours, mins, 0, 0);
    } else {
      d.setHours(17, 0, 0, 0);
    }
    return {
      date: d,
      rawText: 'Tomorrow 5:00 PM'
    };
  }

  if (lower.includes('day after tomorrow')) {
    const d = new Date(baseDate.getTime());
    d.setDate(d.getDate() + 2);
    d.setHours(23, 59, 0, 0);
    return {
      date: d,
      rawText: 'Day after tomorrow 11:59 PM'
    };
  }

  if (lower.includes('sunday')) {
    const d = new Date(baseDate.getTime());
    const day = d.getDay();
    const daysUntilSunday = (7 - day) % 7 || 7;
    d.setDate(d.getDate() + daysUntilSunday);
    d.setHours(23, 59, 0, 0);
    return {
      date: d,
      rawText: 'Sunday 11:59 PM'
    };
  }

  const dateMatch = lower.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)(?:\s+(\d{4}))?(?:\s+at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?)?/i);
  if (dateMatch) {
    const day = parseInt(dateMatch[1], 10);
    const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    const monthStr = dateMatch[2].substring(0, 3).toLowerCase();
    const monthIndex = monthNames.indexOf(monthStr);
    const year = dateMatch[3] ? parseInt(dateMatch[3], 10) : baseDate.getFullYear();
    
    let hours = 18;
    let mins = 0;
    if (dateMatch[4]) {
      hours = parseInt(dateMatch[4], 10);
      mins = dateMatch[5] ? parseInt(dateMatch[5], 10) : 0;
      const ampm = (dateMatch[6] || '').toLowerCase();
      if (ampm === 'pm' && hours < 12) hours += 12;
      if (ampm === 'am' && hours === 12) hours = 0;
    }

    if (monthIndex !== -1) {
      const d = new Date(year, monthIndex, day, hours, mins, 0);
      return {
        date: d,
        rawText: dateMatch[0]
      };
    }
  }

  // Default fallback: 3 days window
  const defaultDate = new Date(baseDate.getTime() + 3 * 24 * 3600 * 1000);
  defaultDate.setHours(18, 0, 0, 0);
  return {
    date: defaultDate,
    rawText: 'In 3 Days'
  };
}

// Robust rule-based heuristic extractor with refined student classification taxonomy
function ruleBasedExtractor(subject, sender, body, sentAt = null) {
  const { cleanText, links } = extractLinksAndText(body);
  const fullContent = `${subject}\n${cleanText}`;

  // 1. First check if non-actionable email noise
  if (isNonActionableEmail(subject, sender, cleanText)) {
    return {
      is_actionable: false,
      title: subject.trim() || 'Non-Actionable Notification',
      category: 'other',
      is_mandatory: false,
      action_required: 'No action required',
      deadline_iso: null,
      deadline_text_raw: null,
      deadline_exact: false,
      primary_link: null,
      priority_score: 1,
      confidence: 0.99,
      reasoning: 'Filtered out as non-actionable system notification / security alert / spam'
    };
  }

  let category = 'other';
  let priority = 3;
  let isMandatory = false;

  // 2. High-precision classification hierarchy

  // A. Feedback & Academic Compliance (Highest priority mandatory forms)
  if (/faculty feedback|iqac|naac|student satisfaction survey|course exit survey|curriculum feedback|mid-semester feedback|end-semester feedback|feedback odd semester|feedback even semester/i.test(fullContent)) {
    category = 'feedback';
    priority = 5;
    isMandatory = true;
  }
  // B. Hackathons, SIH, Innotech & Coding Contests
  else if (/smart india hackathon|\bsih\b|hackathon|ideathon|innotech|programmer of the month|competitive coding contest|coding contest|coding competition|devpost|codefest|hack-a-thon/i.test(fullContent)) {
    category = 'hackathon';
    priority = 4;
  }
  // C. Registrations for External Platforms, Coding Competitions (TCS CodeVita, Portals, Bootcamps)
  else if (/codevita|tcs codevita|hackwithinfy|infytq|skillsprint|bootcamp|register for platform|registrations open|portal registration|nptel|swayam|superset|tcs nextstep|hackerearth|leetcode contest|codechef|apaar id|abc id|aicte portal|scholarship registration/i.test(fullContent)) {
    category = 'registration';
    priority = 4;
  }
  // D. T&P Campus Placement & Internship Drives
  else if (/placement drive|training & placement|training and placement|t&p cell|campus drive|campus hiring|campus recruitment|shortlisted students|interview schedule|on-campus drive|off-campus drive|package lpa|job offer|pre-placement talk|drive registration/i.test(fullContent)) {
    category = 'placement';
    priority = 5;
  }
  // E. Exams & Hall Tickets
  else if (/hall ticket|admit card|exam form|examination schedule|back paper|end semester exam|mid term exam|datesheet|exam fee/i.test(fullContent)) {
    category = 'exam';
    priority = 5;
    isMandatory = true;
  }
  // F. Lab Assignments & Coursework
  else if (/lab assignment|assignment #|practical file|assignment submission|github classroom|viva voce|lab code submission|project review submission/i.test(fullContent)) {
    category = 'assignment';
    priority = 4;
  }
  // G. Campus Events, Club Activities, Seminars & Workshops
  else if (/blood donation|debate & awareness|voices of change|technocrats|club orientation|guest lecture|seminar|webinar|symposium|cultural fest|sports meet/i.test(fullContent)) {
    category = 'event';
    priority = 2;
  }
  // H. General Forms
  else if (/forms\.gle|docs\.google\.com\/forms|google form|forms\.office\.com/i.test(fullContent)) {
    category = 'form';
    priority = 3;
  }

  const primaryLink = links.length > 0 ? links[0] : null;
  const baseDate = sentAt ? new Date(sentAt) : new Date();
  const { date: parsedDate, rawText: rawDateText } = parseRelativeDate(fullContent, isNaN(baseDate.getTime()) ? new Date() : baseDate);

  let action = 'Review announcement details';
  if (category === 'feedback' || isMandatory) {
    action = 'Fill mandatory compliance form';
  } else if (category === 'hackathon') {
    action = 'Register team on Hackathon / SIH portal';
  } else if (category === 'registration') {
    action = 'Complete platform / contest registration';
  } else if (category === 'placement') {
    action = 'Register for placement / internship drive';
  } else if (category === 'exam') {
    action = 'Download hall ticket / Submit exam form';
  } else if (category === 'assignment') {
    action = 'Submit assignment / lab code before deadline';
  } else if (category === 'event') {
    action = 'Review event / workshop registration';
  } else if (primaryLink) {
    action = 'Complete and submit form';
  }

  const isActionable = Boolean(
    primaryLink ||
    /deadline|submit|register|form|due date|last date|scheduled on|registrations open|participate|contest|hackathon|internship|placement|feedback|assignment|bootcamp|drive|survey|hall ticket|exam|blood donation|workshop|symposium|paper/i.test(fullContent)
  );

  return {
    is_actionable: isActionable,
    title: subject.trim() || 'Campus Action Notice',
    category,
    is_mandatory: isMandatory,
    action_required: action,
    deadline_iso: parsedDate ? parsedDate.toISOString() : null,
    deadline_text_raw: rawDateText,
    deadline_exact: Boolean(rawDateText),
    primary_link: primaryLink,
    priority_score: priority,
    confidence: 0.95,
    reasoning: 'Multi-tiered rule regex & classification engine'
  };
}

// Full AI extraction engine with Gemini Flash + rule-based fallback
async function extractDeadlineFromEmail(subject, sender, body, sentAt = null, userProvidedKey = null) {
  // Check if non-actionable before calling LLM
  if (isNonActionableEmail(subject, sender, body)) {
    return {
      is_actionable: false,
      title: subject.trim(),
      category: 'other',
      is_mandatory: false,
      action_required: 'No action required',
      deadline_iso: null,
      deadline_text_raw: null,
      deadline_exact: false,
      primary_link: null,
      priority_score: 1,
      confidence: 0.99,
      reasoning: 'Non-actionable system notification / security alert',
      engine: 'Heuristic Filter',
      is_ai: false
    };
  }

  const apiKey = (userProvidedKey || process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    const fallback = ruleBasedExtractor(subject, sender, body, sentAt);
    fallback.engine = 'Heuristic Regex Engine (Instant)';
    fallback.is_ai = false;
    return fallback;
  }

  try {
    const { cleanText, links } = extractLinksAndText(body);
    const prompt = `
You are an expert student assistant AI for an engineering college deadline tracker. Analyze this email and determine if it requires student action, deadline tracking, or form registration.

Email Metadata:
- Subject: ${subject}
- Sender: ${sender}
- Date Header: ${sentAt || 'Current'}
- Links Found: ${JSON.stringify(links)}

Email Content:
${cleanText.substring(0, 3500)}

Important Classification Taxonomy:
- "registration": Registration for competitive platforms (TCS CodeVita, HackWithInfy, Unstop, NPTEL, SkillSprint, Bootcamp registration, Portals)
- "hackathon": Smart India Hackathon (SIH), Innotech, Hackathons, Ideathons, Coding Contests, Competitive Coding
- "placement": Campus recruitment drives by T&P Cell, company job applications, interview shortlists
- "feedback": Faculty feedback, IQAC, NAAC, course exit surveys, student satisfaction surveys (MANDATORY)
- "exam": Hall ticket distribution, exam form filling, examination fee, back paper registration
- "assignment": Lab assignments, practical files, coding homework
- "event": Club activities, blood donation camps, guest lectures, debate workshops
- "form": General Google Forms / Microsoft Forms
- "other": General college notices

If this email is a security alert, OTP, invoice, delivery notification, or purely informational with NO student action required, set "is_actionable": false.

Return ONLY a valid JSON object matching:
{
  "is_actionable": true,
  "title": "Clean, descriptive student task title",
  "category": "registration" | "hackathon" | "placement" | "feedback" | "exam" | "assignment" | "event" | "form" | "other",
  "is_mandatory": false,
  "action_required": "Concise imperative action directive",
  "deadline_iso": "YYYY-MM-DDTHH:MM:SSZ",
  "deadline_text_raw": "Original date text found in email",
  "deadline_exact": true,
  "primary_link": "URL to form/portal if present or null",
  "priority_score": 1,
  "confidence": 0.96,
  "reasoning": "Brief justification"
}
`;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          response_mime_type: "application/json"
        }
      },
      { timeout: 4500 }
    );

    const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) {
      const parsed = JSON.parse(text);
      if (!parsed.primary_link && links.length > 0) {
        parsed.primary_link = links[0];
      }
      parsed.engine = 'Google Gemini 1.5 Flash AI';
      parsed.is_ai = true;
      return parsed;
    }
  } catch (err) {
    const errorDetail = err.response?.data?.error?.message || err.message;
    console.warn(`Gemini API error (${errorDetail}), fallback to heuristic engine.`);
  }

  const ruleResult = ruleBasedExtractor(subject, sender, body, sentAt);
  ruleResult.engine = 'Heuristic Regex Engine (Fallback)';
  ruleResult.is_ai = false;
  return ruleResult;
}

module.exports = {
  computeUrgencyTier,
  extractLinksAndText,
  parseRelativeDate,
  isNonActionableEmail,
  ruleBasedExtractor,
  extractDeadlineFromEmail
};
