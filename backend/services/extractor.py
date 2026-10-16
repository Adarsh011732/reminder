import os
import re
import json
from datetime import datetime, timedelta
import pytz
import dateparser
from email.utils import parsedate_to_datetime
from bs4 import BeautifulSoup
from dotenv import load_dotenv

load_dotenv()

IST = pytz.timezone("Asia/Kolkata")

def safe_parse_sent_date(date_str: str) -> datetime:
    """Safely parses any date string format (RFC 2822, ISO 8601, or natural text)."""
    if not date_str:
        return datetime.now(IST)
    try:
        dt = parsedate_to_datetime(str(date_str))
        if dt:
            if dt.tzinfo is None:
                return IST.localize(dt)
            return dt.astimezone(IST)
    except Exception:
        pass
    
    try:
        clean_str = str(date_str).replace("Z", "+00:00")
        dt = datetime.fromisoformat(clean_str)
        if dt.tzinfo is None:
            return IST.localize(dt)
        return dt.astimezone(IST)
    except Exception:
        pass

    try:
        p = dateparser.parse(str(date_str), settings={'TIMEZONE': 'Asia/Kolkata', 'RETURN_AS_TIMEZONE_AWARE': True})
        if p:
            return p
    except Exception:
        pass

    return datetime.now(IST)

def compute_urgency_tier(deadline) -> str:
    """Calculates 🟢 green, 🟡 yellow, 🔴 red tier based on hours remaining."""
    if not deadline:
        return "green"
    
    if isinstance(deadline, str):
        deadline = safe_parse_sent_date(deadline)

    now = datetime.now(pytz.utc)
    if deadline.tzinfo is None:
        deadline = pytz.utc.localize(deadline)
    else:
        deadline = deadline.astimezone(pytz.utc)
    
    delta = deadline - now
    hours = delta.total_seconds() / 3600.0

    if hours < 0:
        return "overdue"
    elif hours <= 48:
        return "red"
    elif hours <= 168: # 7 days
        return "yellow"
    else:
        return "green"

def extract_links_and_text(html_or_text: str):
    """Strips noisy HTML tags and extracts prominent, full actionable links."""
    soup = BeautifulSoup(html_or_text, "html.parser")
    links = []
    
    # Extract links from anchor tags
    for a in soup.find_all('a', href=True):
        href = a['href'].strip()
        if href.startswith(('http://', 'https://')):
            if any(k in href.lower() for k in ['forms.gle/', 'docs.google.com/forms', 'forms.office.com/', 'unstop.com/', 'hackerearth.com/', 'github.com/']):
                links.append(href)
            elif 'drive.google.com' in href.lower() or 'forms' in href.lower():
                links.append(href)

    # General regex for full URLs with paths (prevent matching bare forms.gle or forms.gle/)
    url_pattern = r'https?://(?:forms\.gle/[A-Za-z0-9_-]{5,}|docs\.google\.com/forms/d/[^\s"\'<>]+|forms\.office\.com/r/[A-Za-z0-9_-]+|unstop\.com/[^\s"\'<>]+|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/[^\s"\'<>]+)'
    raw_urls = re.findall(url_pattern, html_or_text)
    for u in raw_urls:
        u_clean = u.rstrip('.,;:)>\'"')
        if len(u_clean) > 16 and u_clean not in links:
            links.append(u_clean)

    # Filter out broken or truncated links
    valid_links = [
        l for l in links
        if not l.endswith('forms.gle/') and not l.endswith('forms.gle')
        and not l.endswith('forms.office.com') and not l.endswith('forms.office.com/')
    ]

    clean_text = soup.get_text(separator=' ', strip=True)
    return clean_text, valid_links

def parse_relative_date(text: str, base_date: datetime = None) -> tuple[datetime | None, str | None]:
    """Uses dateparser with IST settings to resolve relative date expressions."""
    if not base_date:
        base_date = datetime.now(IST)
    elif base_date.tzinfo is None:
        base_date = IST.localize(base_date)

    date_patterns = [
        r"(?:last date|deadline|submit by|register before|register by|fill by|closes on|due date|scheduled on|on or before)[\s:]*([^\n\.,;]{4,45})",
        r"(?:by|before)\s+([0-9]{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+(?:\s+[0-9]{4})?(?:\s+at\s+[0-9]{1,2}(?::[0-9]{2})?\s*(?:am|pm|AM|PM)?)?)",
        r"(?:by|before)\s+(tomorrow|today|tonight|this sunday|next monday|this friday)(?:\s+(?:at\s+)?[0-9]{1,2}(?::[0-9]{2})?\s*(?:am|pm|AM|PM)?)?"
    ]
    
    raw_matched = None
    for pattern in date_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            raw_matched = match.group(1).strip()
            break

    if raw_matched:
        parsed = dateparser.parse(
            raw_matched,
            settings={
                'RELATIVE_BASE': base_date.replace(tzinfo=None),
                'TIMEZONE': 'Asia/Kolkata',
                'RETURN_AS_TIMEZONE_AWARE': True,
                'PREFER_DATES_FROM': 'future'
            }
        )
        if parsed:
            return parsed, raw_matched

    return None, None

def is_non_actionable_email(subject: str, sender: str, body: str) -> bool:
    """Detects security alerts, OTPs, receipts, third-party marketing, and non-academic platforms."""
    sub = (subject or "").lower().strip()
    frm = (sender or "").lower().strip()
    txt = (body or "").lower().strip()

    if sub in ["fwd:", "re:"] or (len(sub) < 5 and len(txt) < 30):
        return True

    if any(k in frm for k in ["no-reply@accounts.google.com", "accountprotection.microsoft.com", "security@", "verify@", "authenticator@", "noreply@google.com"]):
        if any(k in sub for k in ["security alert", "sign-in", "new login", "verification code", "access granted", "password"]):
            return True

    if any(k in sub for k in ["your otp", "verification code", "one-time password", "2-step verification", "two-factor"]):
        return True

    if any(k in sub for k in ["receipt for", "invoice #", "order confirmed", "delivery status notification", "mail delivery failed", "undelivered mail", "transaction alert", "account statement"]):
        return True

    external_platforms = [
        "unstop.news", "unstop.com", "internshala.com", "geeksforgeeks.org", "gfg.org",
        "coursera.org", "udemy.com", "edx.org", "simplilearn.com", "greatlearning.in",
        "naukri.com", "indeed.com", "shine.com", "foundit.in", "monster.com",
        "swiggy.com", "zomato.com", "amazon.in", "amazon.com", "flipkart.com", "myntra.com",
        "uber.com", "ola.com", "canva.com", "figma.com", "notion.so", "grammarly.com",
        "spotify.com", "netflix.com", "medium.com", "quora.com", "discord.com", "reddit.com",
        "linkedin.com", "facebookmail.com", "instagram.com", "twitter.com", "x.com"
    ]

    if any(k in frm for k in external_platforms):
        if not any(k in frm for k in [".edu", ".ac.in", ".edu.in"]):
            return True

    if any(k in frm for k in ["noreply@unstop.news", "news@", "newsletter@", "promotions@", "marketing@", "digest@", "campaign@", "offers@"]):
        return True

    if any(k in sub for k in ["cash prize inr", "prize pool up for grabs", "grab internship &", "discount", "% off", "weekly digest", "exclusive invite"]):
        return True

    return False

def rule_based_fallback_extractor(subject: str, sender: str, body: str, sent_at: str = None) -> dict:
    """High-accuracy heuristic fallback when LLM API is offline or key missing."""
    clean_text, links = extract_links_and_text(body)
    full_content = f"{subject}\n{clean_text}"
    
    if is_non_actionable_email(subject, sender, clean_text):
        return {
            "is_actionable": False,
            "title": subject.strip() or "Non-Actionable Notification",
            "category": "other",
            "is_mandatory": False,
            "action_required": "No action required",
            "deadline_iso": None,
            "deadline_text_raw": None,
            "deadline_exact": False,
            "primary_link": None,
            "priority_score": 1,
            "confidence": 0.99,
            "reasoning": "Filtered out as non-actionable system notification / security alert / spam"
        }

    category = "other"
    priority = 3
    is_mandatory = False

    # Classification Hierarchy
    if re.search(r'faculty feedback|iqac|naac|student satisfaction survey|course exit survey|curriculum feedback|mid-semester feedback|end-semester feedback|feedback odd semester|feedback even semester', full_content, re.IGNORECASE):
        category = "feedback"
        priority = 5
        is_mandatory = True
    elif re.search(r'smart india hackathon|\bsih\b|hackathon|ideathon|innotech|programmer of the month|competitive coding contest|coding contest|coding competition|devpost|codefest|hack-a-thon', full_content, re.IGNORECASE):
        category = "hackathon"
        priority = 4
    elif re.search(r'codevita|tcs codevita|hackwithinfy|infytq|skillsprint|bootcamp|register for platform|registrations open|portal registration|nptel|swayam|superset|tcs nextstep|hackerearth|leetcode contest|codechef|apaar id|abc id|aicte portal|scholarship registration', full_content, re.IGNORECASE):
        category = "registration"
        priority = 4
    elif re.search(r'placement drive|training & placement|training and placement|t&p cell|campus drive|campus hiring|campus recruitment|shortlisted students|interview schedule|on-campus drive|off-campus drive|package lpa|job offer|pre-placement talk|drive registration', full_content, re.IGNORECASE):
        category = "placement"
        priority = 5
    elif re.search(r'hall ticket|admit card|exam form|examination schedule|back paper|end semester exam|mid term exam|datesheet|exam fee', full_content, re.IGNORECASE):
        category = "exam"
        priority = 5
        is_mandatory = True
    elif re.search(r'lab assignment|assignment #|practical file|assignment submission|github classroom|viva voce|lab code submission|project review submission', full_content, re.IGNORECASE):
        category = "assignment"
        priority = 4
    elif re.search(r'blood donation|debate & awareness|voices of change|technocrats|club orientation|guest lecture|seminar|webinar|symposium|cultural fest|sports meet', full_content, re.IGNORECASE):
        category = "event"
        priority = 2
    elif re.search(r'forms\.gle|docs\.google\.com/forms|google form|forms\.office\.com', full_content, re.IGNORECASE):
        category = "form"
        priority = 3

    # Primary link
    primary_link = links[0] if links else None
    
    # Date extraction with safe parser
    base_dt = safe_parse_sent_date(sent_at)
    parsed_date, raw_date_text = parse_relative_date(full_content, base_dt)

    if not parsed_date:
        if "tomorrow" in full_content.lower():
            parsed_date = (base_dt + timedelta(days=1)).replace(hour=17, minute=0, second=0)
            raw_date_text = "Tomorrow 5:00 PM"
        elif "sunday" in full_content.lower():
            days_ahead = (6 - base_dt.weekday()) % 7
            if days_ahead == 0:
                days_ahead = 7
            parsed_date = (base_dt + timedelta(days=days_ahead)).replace(hour=23, minute=59, second=0)
            raw_date_text = "This Sunday 11:59 PM"
        else:
            parsed_date = (base_dt + timedelta(days=3)).replace(hour=18, minute=0, second=0)
            raw_date_text = "In 3 Days"

    # Action detection
    action = "Review announcement details"
    if category == "feedback" or is_mandatory:
        action = "Fill mandatory compliance form"
    elif category == "hackathon":
        action = "Register team on Hackathon / SIH portal"
    elif category == "registration":
        action = "Complete platform / contest registration"
    elif category == "placement":
        action = "Register for placement / internship drive"
    elif category == "exam":
        action = "Download hall ticket / Submit exam form"
    elif category == "assignment":
        action = "Submit assignment / lab code before deadline"
    elif category == "event":
        action = "Review event / workshop registration"
    elif primary_link:
        action = "Complete and submit form"

    is_actionable = bool(
        primary_link or any(k in full_content.lower() for k in [
            "deadline", "submit", "register", "form", "due date", "last date",
            "scheduled on", "registrations open", "participate", "contest",
            "hackathon", "internship", "placement", "feedback", "assignment",
            "bootcamp", "drive", "survey", "hall ticket", "exam", "blood donation",
            "workshop", "symposium", "paper"
        ])
    )

    return {
        "is_actionable": is_actionable,
        "title": subject.strip() or "Campus Action Notice",
        "category": category,
        "is_mandatory": is_mandatory,
        "action_required": action,
        "deadline_iso": parsed_date,
        "deadline_text_raw": raw_date_text,
        "deadline_exact": bool(raw_date_text),
        "primary_link": primary_link,
        "priority_score": priority,
        "confidence": 0.95,
        "reasoning": "Multi-tiered rule regex & classification engine"
    }

async def extract_deadline_from_email(subject: str, sender: str, body: str, sent_at: str = None) -> dict:
    """
    Extracts structured task schema from an email using Gemini 2.5 Flash if GEMINI_API_KEY is available,
    or smoothly defaults to the rule-based extractor.
    """
    if is_non_actionable_email(subject, sender, body):
        return {
            "is_actionable": False,
            "title": (subject or "").strip(),
            "category": "other",
            "is_mandatory": False,
            "action_required": "No action required",
            "deadline_iso": None,
            "deadline_text_raw": None,
            "deadline_exact": False,
            "primary_link": None,
            "priority_score": 1,
            "confidence": 0.99,
            "reasoning": "Non-actionable system notification / security alert"
        }

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return rule_based_fallback_extractor(subject, sender, body, sent_at)

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key)
        clean_text, links = extract_links_and_text(body)
        
        prompt = f"""
You are an expert student assistant AI specialized in college notices. Analyze this email and determine if it requires student action, deadline tracking, or form submission.

Email Metadata:
- Subject: {subject}
- Sender: {sender}
- Date Header: {sent_at or 'Current'}
- Links Found: {json.dumps(links)}

Email Content:
{clean_text[:4000]}

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

Return ONLY a valid JSON object matching this schema:
{{
  "is_actionable": true | false,
  "title": "Clear concise student task title",
  "category": "registration" | "hackathon" | "placement" | "feedback" | "exam" | "assignment" | "event" | "form" | "other",
  "is_mandatory": true | false,
  "action_required": "Specific action required (e.g. Fill feedback form, Register team, Submit PDF)",
  "deadline_iso": "YYYY-MM-DDTHH:MM:SS+05:30" (or null if not specified),
  "deadline_text_raw": "Original date text found in email",
  "deadline_exact": true | false,
  "primary_link": "URL to form/portal if present or null",
  "priority_score": 1 to 5,
  "confidence": 0.0 to 1.0,
  "reasoning": "Brief reason"
}}
"""
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json"
            )
        )
        parsed = json.loads(response.text)
        
        if parsed.get("deadline_iso"):
            try:
                parsed["deadline_iso"] = safe_parse_sent_date(parsed["deadline_iso"])
            except Exception:
                pass
        
        if not parsed.get("primary_link") and links:
            parsed["primary_link"] = links[0]

        return parsed
    except Exception as e:
        print(f"Gemini API fallback to rule engine: {e}")
        return rule_based_fallback_extractor(subject, sender, body, sent_at)
