from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Float
from datetime import datetime
from .database import Base

class DeadlineTask(Base):
    __tablename__ = "deadline_tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False, index=True)
    category = Column(String(50), default="other", index=True) # form, placement, hackathon, assignment, feedback, event, exam
    action_required = Column(String(255), nullable=False)
    deadline_iso = Column(DateTime, nullable=True, index=True)
    deadline_text_raw = Column(String(100), nullable=True)
    deadline_exact = Column(Boolean, default=True)
    primary_link = Column(Text, nullable=True)
    sender = Column(String(255), nullable=True)
    source_subject = Column(String(255), nullable=True)
    raw_snippet = Column(Text, nullable=True)
    urgency_tier = Column(String(20), default="green") # green, yellow, red, overdue
    status = Column(String(20), default="active") # active, done, snoozed, dismissed
    priority_score = Column(Integer, default=3) # 1 (low) to 5 (critical)
    confidence = Column(Float, default=0.9)
    email_thread_id = Column(String(100), nullable=True, index=True)
    snoozed_until = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class EmailLog(Base):
    __tablename__ = "email_logs"

    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(String(100), unique=True, index=True)
    sender = Column(String(255), nullable=False)
    subject = Column(String(255), nullable=False)
    received_at = Column(DateTime, default=datetime.utcnow)
    is_actionable = Column(Boolean, default=False)
    extracted_task_id = Column(Integer, nullable=True)
    raw_body = Column(Text, nullable=True)

class UserSettings(Base):
    __tablename__ = "user_settings"

    id = Column(Integer, primary_key=True, index=True)
    telegram_chat_id = Column(String(100), nullable=True)
    telegram_enabled = Column(Boolean, default=True)
    calendar_sync_enabled = Column(Boolean, default=False)
    daily_digest_time = Column(String(10), default="08:00")
    whitelist_senders = Column(Text, default="placement@college.edu,iipc@college.edu,hod.cse@college.edu,notices@college.edu")
