from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class ExtractionRequest(BaseModel):
    subject: str = Field(..., description="Subject line of the email")
    sender: str = Field(..., description="Sender name / email address")
    body: str = Field(..., description="Full text or cleaned HTML body")
    sent_at: Optional[str] = Field(None, description="ISO timestamp of when email was sent")

class ExtractedTaskSchema(BaseModel):
    is_actionable: bool
    title: str
    category: str = "other" # form, placement, hackathon, assignment, feedback, event, exam
    action_required: str
    deadline_iso: Optional[datetime] = None
    deadline_text_raw: Optional[str] = None
    deadline_exact: bool = True
    primary_link: Optional[str] = None
    priority_score: int = 3
    confidence: float = 0.95
    reasoning: Optional[str] = None

class DeadlineTaskResponse(BaseModel):
    id: int
    title: str
    category: str
    action_required: str
    deadline_iso: Optional[datetime]
    deadline_text_raw: Optional[str]
    deadline_exact: bool
    primary_link: Optional[str]
    sender: Optional[str]
    source_subject: Optional[str]
    raw_snippet: Optional[str]
    urgency_tier: str
    status: str
    priority_score: int
    confidence: float
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class TaskActionRequest(BaseModel):
    action: str # "done", "snooze_24h", "reactivate", "delete"

class DashboardStats(BaseModel):
    total_active: int
    critical_count: int # Red (<48h)
    approaching_count: int # Yellow (2-7d)
    normal_count: int # Green (>7d)
    completed_count: int
    streak_days: int
    categories_breakdown: dict

class TelegramAlertTestRequest(BaseModel):
    task_id: int
    custom_message: Optional[str] = None
    bot_token: Optional[str] = None
    chat_id: Optional[str] = None

class MailboxConnectRequest(BaseModel):
    email: str = Field(..., description="Your college or personal email address")
    app_password: str = Field(..., description="App Password or mailbox password")
    imap_server: str = Field("imap.gmail.com", description="IMAP server hostname")
    port: int = Field(993, description="IMAP port with SSL")
    max_emails: int = Field(15, description="Number of recent emails to scan (5-50)")
    search_query: str = Field("ALL", description="IMAP search criteria (ALL, UNSEEN, etc.)")

class MailboxTestRequest(BaseModel):
    email: str
    app_password: str
    imap_server: str = "imap.gmail.com"
    port: int = 993

