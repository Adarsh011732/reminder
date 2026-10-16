import os
from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List, Optional
import pytz

from .database import engine, Base, get_db
from .models import DeadlineTask, EmailLog, UserSettings
from .schemas import (
    ExtractionRequest, ExtractedTaskSchema, DeadlineTaskResponse,
    TaskActionRequest, DashboardStats, TelegramAlertTestRequest,
    MailboxConnectRequest, MailboxTestRequest
)
from .services.extractor import extract_deadline_from_email, compute_urgency_tier
from .services.mock_data import SAMPLE_STUDENT_EMAILS, seed_initial_database
from .services.imap_service import test_imap_connection, fetch_and_process_real_emails

# Create DB tables
Base.metadata.create_all(bind=engine)

# Initialize seed data
db_init = next(get_db())
try:
    seed_initial_database(db_init)
finally:
    db_init.close()

app = FastAPI(
    title="Student Deadline Tracker API",
    version="1.0.0",
    description="Intelligent student mailbox deadline aggregator and urgency alert engine."
)

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "Student Deadline Tracker API",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/api/deadlines", response_model=List[DeadlineTaskResponse])
def get_deadlines(
    status: Optional[str] = "active",
    urgency: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(DeadlineTask)

    if status and status != "all":
        query = query.filter(DeadlineTask.status == status)

    if category and category != "all":
        query = query.filter(DeadlineTask.category == category)

    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (DeadlineTask.title.ilike(search_pattern)) |
            (DeadlineTask.action_required.ilike(search_pattern)) |
            (DeadlineTask.sender.ilike(search_pattern))
        )

    tasks = query.order_by(DeadlineTask.deadline_iso.asc()).all()

    # Dynamically update urgency tier
    for task in tasks:
        if task.deadline_iso and task.status == "active":
            new_urgency = compute_urgency_tier(task.deadline_iso)
            if task.urgency_tier != new_urgency:
                task.urgency_tier = new_urgency
    db.commit()

    if urgency and urgency != "all":
        tasks = [t for t in tasks if t.urgency_tier == urgency]

    return tasks

@app.post("/api/deadlines/parse-raw")
async def parse_raw_email(
    payload: ExtractionRequest,
    auto_save: bool = Query(False, description="Automatically persist the extracted task in DB"),
    db: Session = Depends(get_db)
):
    """
    Simulates / runs the AI extraction engine against raw email content.
    Returns structured JSON with category, deadline, and Google Form link.
    """
    extracted = await extract_deadline_from_email(
        subject=payload.subject,
        sender=payload.sender,
        body=payload.body,
        sent_at=payload.sent_at
    )

    created_task = None
    if auto_save and extracted.get("is_actionable"):
        deadline_val = extracted.get("deadline_iso")
        urgency = compute_urgency_tier(deadline_val) if deadline_val else "green"

        created_task = DeadlineTask(
            title=extracted.get("title", payload.subject),
            category=extracted.get("category", "other"),
            action_required=extracted.get("action_required", "Check email details"),
            deadline_iso=deadline_val,
            deadline_text_raw=extracted.get("deadline_text_raw"),
            deadline_exact=extracted.get("deadline_exact", True),
            primary_link=extracted.get("primary_link"),
            sender=payload.sender,
            source_subject=payload.subject,
            raw_snippet=payload.body[:200],
            urgency_tier=urgency,
            status="active",
            priority_score=extracted.get("priority_score", 3),
            confidence=extracted.get("confidence", 0.95),
            email_thread_id=f"thread_{int(datetime.utcnow().timestamp())}"
        )
        db.add(created_task)
        db.commit()
        db.refresh(created_task)

    return {
        "extracted": extracted,
        "saved_task": created_task
    }

@app.patch("/api/deadlines/{task_id}/action", response_model=DeadlineTaskResponse)
def modify_task_status(task_id: int, payload: TaskActionRequest, db: Session = Depends(get_db)):
    task = db.query(DeadlineTask).filter(DeadlineTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if payload.action == "done":
        task.status = "done"
    elif payload.action == "snooze_24h":
        task.status = "snoozed"
        task.snoozed_until = datetime.utcnow() + timedelta(hours=24)
    elif payload.action == "reactivate":
        task.status = "active"
        task.snoozed_until = None
    elif payload.action == "delete":
        db.delete(task)
        db.commit()
        return task
    else:
        raise HTTPException(status_code=400, detail="Invalid action")

    db.commit()
    db.refresh(task)
    return task

@app.get("/api/stats", response_model=DashboardStats)
def get_dashboard_stats(db: Session = Depends(get_db)):
    tasks = db.query(DeadlineTask).all()

    active_tasks = [t for t in tasks if t.status == "active"]
    completed_count = len([t for t in tasks if t.status == "done"])

    critical_count = len([t for t in active_tasks if t.urgency_tier in ("red", "overdue")])
    approaching_count = len([t for t in active_tasks if t.urgency_tier == "yellow"])
    normal_count = len([t for t in active_tasks if t.urgency_tier == "green"])

    categories = {}
    for t in active_tasks:
        categories[t.category] = categories.get(t.category, 0) + 1

    return DashboardStats(
        total_active=len(active_tasks),
        critical_count=critical_count,
        approaching_count=approaching_count,
        normal_count=normal_count,
        completed_count=completed_count,
        streak_days=14, # Example on-time streak
        categories_breakdown=categories
    )

@app.get("/api/sample-emails")
def get_sample_emails():
    """Provides pre-loaded student email scenarios for the simulation playground."""
    return SAMPLE_STUDENT_EMAILS

@app.post("/api/telegram/test-alert")
def send_telegram_alert(payload: TelegramAlertTestRequest, db: Session = Depends(get_db)):
    task = db.query(DeadlineTask).filter(DeadlineTask.id == payload.task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    emoji = "🔴" if task.urgency_tier in ("red", "overdue") else ("🟡" if task.urgency_tier == "yellow" else "🟢")
    due_str = task.deadline_text_raw or (task.deadline_iso.strftime('%d %b %Y, %I:%M %p') if task.deadline_iso else 'No exact date')
    
    formatted_message = f"""{emoji} *DEADLINE RADAR ALERT*
━━━━━━━━━━━━━━━━━━━━
📌 *Task:* {task.title}
⚡ *Action:* {task.action_required}
⏰ *Due Date:* {due_str}
🏢 *Sender:* {task.sender or 'College Notice'}
🔗 *Link:* {task.primary_link or 'Check ERP Portal'}
━━━━━━━━━━━━━━━━━━━━
_Tri-Color Urgency: {task.urgency_tier.upper()}_"""

    telegram_api_result = None
    bot_token = payload.bot_token or os.getenv("TELEGRAM_BOT_TOKEN")
    chat_id = payload.chat_id or os.getenv("TELEGRAM_CHAT_ID")

    if bot_token and chat_id:
        try:
            import httpx
            telegram_url = f"https://api.telegram.org/bot{bot_token.strip()}/sendMessage"
            
            # Inline keyboard buttons
            inline_keyboard = []
            if task.primary_link:
                inline_keyboard.append([{"text": "🔗 Open Form / Portal", "url": task.primary_link}])

            data_payload = {
                "chat_id": chat_id.strip(),
                "text": formatted_message,
                "parse_mode": "Markdown",
            }
            if inline_keyboard:
                data_payload["reply_markup"] = {"inline_keyboard": inline_keyboard}

            with httpx.Client(timeout=10.0) as client:
                resp = client.post(telegram_url, json=data_payload)
                telegram_api_result = resp.json()
                if not resp.is_success:
                    raise Exception(telegram_api_result.get("description", "Failed to send message via Telegram API"))
        except Exception as e:
            telegram_api_result = {"error": str(e)}

    return {
        "status": "success",
        "live_dispatched": bool(bot_token and chat_id and telegram_api_result and telegram_api_result.get("ok")),
        "telegram_api_result": telegram_api_result,
        "formatted_message": formatted_message
    }

@app.post("/api/mailbox/test-connection")
def test_mailbox(payload: MailboxTestRequest):
    """Tests IMAP connection to Gmail / Outlook / College IMAP."""
    result = test_imap_connection(
        email_address=payload.email,
        app_password=payload.app_password,
        server=payload.imap_server,
        port=payload.port
    )
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result)
    return result

@app.post("/api/mailbox/fetch-real-emails")
async def fetch_real_emails(payload: MailboxConnectRequest, db: Session = Depends(get_db)):
    """Connects to real user mailbox, scans recent emails, and extracts deadlines."""
    result = await fetch_and_process_real_emails(
        email_address=payload.email,
        app_password=payload.app_password,
        server=payload.imap_server,
        port=payload.port,
        max_emails=payload.max_emails,
        search_query=payload.search_query,
        db=db
    )
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result)
    return result

