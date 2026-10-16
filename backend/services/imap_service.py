import imaplib
import email
from email.header import decode_header
import re
from datetime import datetime
import pytz
from typing import List, Dict, Any, Optional
from bs4 import BeautifulSoup
from .extractor import extract_deadline_from_email, compute_urgency_tier, safe_parse_sent_date
from ..models import DeadlineTask, EmailLog
from sqlalchemy.orm import Session

IST = pytz.timezone("Asia/Kolkata")

def clean_header_text(header_value: str) -> str:
    """Decodes email headers that might be encoded in MIME format (e.g. =?utf-8?B?...?=)."""
    if not header_value:
        return ""
    try:
        decoded_fragments = decode_header(header_value)
        text_parts = []
        for fragment, encoding in decoded_fragments:
            if isinstance(fragment, bytes):
                try:
                    text_parts.append(fragment.decode(encoding or "utf-8", errors="ignore"))
                except Exception:
                    text_parts.append(fragment.decode("latin1", errors="ignore"))
            else:
                text_parts.append(str(fragment))
        return " ".join(text_parts).strip()
    except Exception:
        return str(header_value).strip()

def extract_body_from_email_message(msg: email.message.Message) -> str:
    """Extracts plain text or clean text from HTML email body."""
    body_content = ""
    html_content = ""

    try:
        if msg.is_multipart():
            for part in msg.walk():
                content_type = part.get_content_type()
                content_disposition = str(part.get("Content-Disposition"))

                if "attachment" not in content_disposition:
                    payload = part.get_payload(decode=True)
                    if not payload:
                        continue
                    charset = part.get_content_charset() or "utf-8"
                    try:
                        decoded = payload.decode(charset, errors="ignore")
                    except Exception:
                        decoded = payload.decode("latin1", errors="ignore")

                    if content_type == "text/plain" and not body_content:
                        body_content = decoded
                    elif content_type == "text/html":
                        html_content = decoded
        else:
            payload = msg.get_payload(decode=True)
            if payload:
                charset = msg.get_content_charset() or "utf-8"
                try:
                    decoded = payload.decode(charset, errors="ignore")
                except Exception:
                    decoded = payload.decode("latin1", errors="ignore")
                
                if msg.get_content_type() == "text/html":
                    html_content = decoded
                else:
                    body_content = decoded

        if not body_content and html_content:
            soup = BeautifulSoup(html_content, "html.parser")
            body_content = soup.get_text(separator="\n", strip=True)
    except Exception as e:
        print(f"Error extracting email body: {e}")

    return body_content or html_content or ""

def test_imap_connection(email_address: str, app_password: str, server: str = "imap.gmail.com", port: int = 993) -> Dict[str, Any]:
    """Tests if IMAP credentials are valid."""
    try:
        mail = imaplib.IMAP4_SSL(server, port, timeout=12)
        mail.login(email_address.strip(), app_password.strip())
        mail.select("INBOX", readonly=True)
        status, response = mail.status("INBOX", "(MESSAGES UNSEEN)")
        mail.logout()
        return {
            "success": True,
            "message": "Connected successfully to your mailbox!",
            "details": str(response)
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Connection failed: {str(e)}",
            "hint": "For Gmail / Google Workspace, please use an App Password (not your normal Google password). Make sure 2-Step Verification is enabled."
        }

async def fetch_and_process_real_emails(
    email_address: str,
    app_password: str,
    server: str = "imap.gmail.com",
    port: int = 993,
    max_emails: int = 15,
    search_query: str = "ALL",
    db: Session = None
) -> Dict[str, Any]:
    """
    Connects to user's real mailbox via IMAP, fetches recent emails,
    analyzes them with Gemini Flash / rule extractor, and saves actionable deadlines.
    """
    try:
        mail = imaplib.IMAP4_SSL(server, port, timeout=15)
        mail.login(email_address.strip(), app_password.strip())
        mail.select("INBOX", readonly=True)

        status, message_numbers = mail.search(None, search_query)
        if status != "OK":
            mail.logout()
            return {"success": False, "message": "Failed to search inbox folder."}

        email_ids = message_numbers[0].split()
        if not email_ids:
            mail.logout()
            return {
                "success": True,
                "fetched_count": 0,
                "actionable_count": 0,
                "message": "No emails found matching search criteria."
            }

        # Fetch latest N emails
        recent_ids = email_ids[-max_emails:]
        recent_ids.reverse() # newest first

        processed_emails = []
        actionable_tasks = []

        for e_id in recent_ids:
            try:
                status, data = mail.fetch(e_id, "(RFC822)")
                if status != "OK" or not data or not data[0]:
                    continue

                raw_email = data[0][1]
                msg = email.message_from_bytes(raw_email)

                subject = clean_header_text(msg.get("Subject", "No Subject"))
                sender = clean_header_text(msg.get("From", "Unknown Sender"))
                date_raw = str(msg.get("Date", ""))
                message_id = msg.get("Message-ID", f"msg_{e_id.decode()}")

                # Check if this email was already logged
                if db:
                    existing_log = db.query(EmailLog).filter(EmailLog.message_id == message_id).first()
                    if existing_log:
                        continue

                body_text = extract_body_from_email_message(msg)
                if not body_text.strip():
                    continue

                # Run AI extractor with safe date parsing
                extracted = await extract_deadline_from_email(
                    subject=subject,
                    sender=sender,
                    body=body_text[:4000],
                    sent_at=date_raw
                )

                is_actionable = extracted.get("is_actionable", False)
                created_task_id = None

                if is_actionable and db:
                    deadline_val = extracted.get("deadline_iso")
                    if isinstance(deadline_val, str):
                        deadline_val = safe_parse_sent_date(deadline_val)

                    urgency = compute_urgency_tier(deadline_val) if deadline_val else "green"

                    # Normalize deadline_val to naive UTC for SQLite
                    if deadline_val and deadline_val.tzinfo is not None:
                        deadline_val = deadline_val.astimezone(pytz.utc).replace(tzinfo=None)

                    new_task = DeadlineTask(
                        title=extracted.get("title", subject),
                        category=extracted.get("category", "other"),
                        action_required=extracted.get("action_required", "Review announcement"),
                        deadline_iso=deadline_val,
                        deadline_text_raw=extracted.get("deadline_text_raw"),
                        deadline_exact=extracted.get("deadline_exact", True),
                        primary_link=extracted.get("primary_link"),
                        sender=sender,
                        source_subject=subject,
                        raw_snippet=body_text[:300],
                        urgency_tier=urgency,
                        status="active",
                        priority_score=extracted.get("priority_score", 3),
                        confidence=extracted.get("confidence", 0.95),
                        email_thread_id=message_id
                    )
                    db.add(new_task)
                    db.commit()
                    db.refresh(new_task)
                    created_task_id = new_task.id
                    actionable_tasks.append(new_task)

                # Log email entry
                if db:
                    log_entry = EmailLog(
                        message_id=message_id,
                        sender=sender,
                        subject=subject,
                        is_actionable=is_actionable,
                        extracted_task_id=created_task_id,
                        raw_body=body_text[:500]
                    )
                    db.add(log_entry)
                    db.commit()

                processed_emails.append({
                    "subject": subject,
                    "sender": sender,
                    "is_actionable": is_actionable,
                    "extracted": extracted
                })

            except Exception as item_err:
                print(f"Error processing email {e_id}: {item_err}")
                continue

        mail.logout()

        return {
            "success": True,
            "total_scanned": len(processed_emails),
            "actionable_found": len(actionable_tasks),
            "processed_items": processed_emails,
            "message": f"Successfully scanned {len(processed_emails)} emails. Found {len(actionable_tasks)} actionable deadlines!"
        }

    except imaplib.IMAP4.error as e:
        return {
            "success": False,
            "message": f"IMAP Authentication Error: {str(e)}. For Gmail / College Google Workspace, generate an App Password with 2-Step Verification enabled."
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Mailbox scan error: {str(e)}"
        }
