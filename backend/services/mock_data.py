from datetime import datetime, timedelta
import pytz

IST = pytz.timezone("Asia/Kolkata")

SAMPLE_STUDENT_EMAILS = [
    {
        "id": "email_tp_01",
        "subject": "CRITICAL: Microsoft Campus Placement Drive 2026 - Registration Link Inside",
        "sender": "Training & Placement Cell <placement@college.edu>",
        "snippet": "Dear Final Year Students, Microsoft is visiting our campus for Software Engineer roles (CTC: 44 LPA). All eligible students must fill the registration form before tomorrow 5:00 PM. Late submissions will strictly not be entertained.",
        "body": """Dear Final Year Students,

Greetings from Training & Placement Cell!

Microsoft is visiting our campus for the FTE Software Development Engineer role (Eligible: B.Tech CSE / IT / ECE with CGPA > 7.5).

Kindly complete your registration and upload your latest updated resume on the portal link below:
https://forms.google.com

Last Date & Time for Submission: Tomorrow at 5:00 PM IST sharp.
Resume format: FullName_RollNo.pdf

Note: Any student who fails to register by the deadline will be permanently barred from the drive.

Warm regards,
Head, Training & Placement Cell""",
        "sent_hours_ago": 2,
        "urgency": "red",
        "deadline_hours": 17
    },
    {
        "id": "email_fb_02",
        "subject": "Mandatory Faculty Feedback Survey - Odd Semester 2026 (IQAC)",
        "sender": "IQAC Cell <iqac.feedback@college.edu>",
        "snippet": "Dear Students, Student feedback submission for all enrolled theory and laboratory courses is now active on the ERP portal. Submission is mandatory to download your hall ticket.",
        "body": """Dear Students,

As per NAAC/IQAC directives, the Course Exit & Faculty Feedback Survey is now open for all 2nd, 3rd, and 4th-year engineering students.

Please complete the feedback for all subject faculties using this portal:
https://forms.google.com

Deadline: Sunday, 4th October at 11:59 PM.
Hall tickets for mid-term examinations will only be generated after 100% feedback completion.

Dean of Academic Affairs""",
        "sent_hours_ago": 6,
        "urgency": "yellow",
        "deadline_hours": 72
    },
    {
        "id": "email_hack_03",
        "subject": "Smart India Hackathon (SIH 2026) - Internal College Nomination Round",
        "sender": "Innovation & Incubation Cell <iic@college.edu>",
        "snippet": "Teams intending to represent our college in SIH 2026 must submit their 3-slide PPT executive summary on the internal Unstop nomination portal.",
        "body": """Attention Innovators!

The internal screening round for Smart India Hackathon (SIH 2026) has been announced.
Each team must comprise 6 members with at least one female member.

Submit your idea abstract, problem statement ID, and team deck here:
https://unstop.com/hackathons/sih-internal-college-screening-2026

Registration closes on: 10th October 2026 at 6:00 PM.
Shortlisted teams will pitch in the Central Auditorium on 12th October.

Prof. S. K. Sharma
Convener, Innovation Cell""",
        "sent_hours_ago": 12,
        "urgency": "green",
        "deadline_hours": 240
    },
    {
        "id": "email_lab_04",
        "subject": "CS304: Distributed Systems Lab Assignment #4 Submission",
        "sender": "Prof. R. Mukherjee <mukherjee.cs@college.edu>",
        "snippet": "Lab assignment 4 on Raft Consensus Algorithm is due in 36 hours. Push your GitHub repository links to Google Classroom.",
        "body": """Class,

Please ensure you push all unit tests and implementation for the Raft Consensus Leader Election assignment to your private GitHub repos.

Submission link:
https://forms.gle/LabAssignment4DistributedSys

Strict deadline: Day after tomorrow at 11:59 PM.
Late penalty: 20% deduction per 12 hours.

Regards,
Prof. Mukherjee""",
        "sent_hours_ago": 1,
        "urgency": "red",
        "deadline_hours": 36
    },
    {
        "id": "email_club_05",
        "subject": "IEEE Student Branch - Tech Symposium Call for Papers",
        "sender": "IEEE Student Chapter <ieee.sb@college.edu>",
        "snippet": "Submit your 2-page extended abstracts for the Annual State Student Research Symposium. Selected papers receive full travel grants.",
        "body": """Hello Researchers & Tech Enthusiasts,

The IEEE Student Branch invites paper submissions for the 14th National Student Symposium on AI & Cybernetics.

Abstract Submission Portal:
https://docs.google.com/forms/d/e/1FAIpQLSeIEEEAbstractPortal2026/viewform

Important Dates:
- Abstract Deadline: 18th October 2026
- Acceptance Notification: 24th October 2026

Best Paper Award: INR 25,000 Cash Prize + Certificate of Excellence.

Team IEEE""",
        "sent_hours_ago": 18,
        "urgency": "green",
        "deadline_hours": 360
    }
]

def seed_initial_database(db):
    """Populates the database with initial rich mock tasks if empty."""
    from ..models import DeadlineTask
    
    if db.query(DeadlineTask).count() > 0:
        return

    now = datetime.now(pytz.utc)

    initial_tasks = [
        DeadlineTask(
            title="Microsoft Campus Placement Drive 2026 - Registration",
            category="placement",
            action_required="Fill Google Form & upload resume (FullName_RollNo.pdf)",
            deadline_iso=now + timedelta(hours=17),
            deadline_text_raw="Tomorrow 5:00 PM",
            deadline_exact=True,
            primary_link="https://forms.gle/MsftPlacement2026Drive",
            sender="placement@college.edu",
            source_subject="CRITICAL: Microsoft Campus Placement Drive 2026 - Registration Link Inside",
            raw_snippet="FTE SDE role (CTC: 44 LPA). All eligible students must fill form before tomorrow 5:00 PM.",
            urgency_tier="red",
            status="active",
            priority_score=5,
            confidence=0.98,
            email_thread_id="thread_msft_01"
        ),
        DeadlineTask(
            title="CS304: Raft Consensus Lab Assignment #4",
            category="assignment",
            action_required="Submit GitHub repository link & unit test logs",
            deadline_iso=now + timedelta(hours=36),
            deadline_text_raw="Day after tomorrow 11:59 PM",
            deadline_exact=True,
            primary_link="https://forms.gle/LabAssignment4DistributedSys",
            sender="mukherjee.cs@college.edu",
            source_subject="CS304: Distributed Systems Lab Assignment #4 Submission",
            raw_snippet="Lab assignment 4 on Raft Consensus Algorithm is due in 36 hours.",
            urgency_tier="red",
            status="active",
            priority_score=4,
            confidence=0.95,
            email_thread_id="thread_cs304_04"
        ),
        DeadlineTask(
            title="IQAC Mandatory Faculty Feedback Survey - Odd Sem 2026",
            category="feedback",
            action_required="Complete course exit & faculty rating on ERP form",
            deadline_iso=now + timedelta(days=3, hours=4),
            deadline_text_raw="Sunday 11:59 PM",
            deadline_exact=True,
            primary_link="https://docs.google.com/forms/d/e/1FAIpQLScX90FeedbackIQAC/viewform",
            sender="iqac.feedback@college.edu",
            source_subject="Mandatory Faculty Feedback Survey - Odd Semester 2026 (IQAC)",
            raw_snippet="Submission is mandatory to download mid-term examination hall ticket.",
            urgency_tier="yellow",
            status="active",
            priority_score=4,
            confidence=0.96,
            email_thread_id="thread_iqac_02"
        ),
        DeadlineTask(
            title="Smart India Hackathon (SIH 2026) Internal Nomination",
            category="hackathon",
            action_required="Submit 3-slide PPT executive summary & team roster on Unstop",
            deadline_iso=now + timedelta(days=10),
            deadline_text_raw="10th October 6:00 PM",
            deadline_exact=True,
            primary_link="https://unstop.com/hackathons/sih-internal-college-screening-2026",
            sender="iic@college.edu",
            source_subject="Smart India Hackathon (SIH 2026) - Internal College Nomination Round",
            raw_snippet="Teams intending to represent our college in SIH 2026 must submit abstract.",
            urgency_tier="green",
            status="active",
            priority_score=4,
            confidence=0.94,
            email_thread_id="thread_sih_03"
        ),
        DeadlineTask(
            title="IEEE Annual State Symposium Call for Papers",
            category="event",
            action_required="Submit 2-page extended research abstract",
            deadline_iso=now + timedelta(days=15),
            deadline_text_raw="18th October 2026",
            deadline_exact=True,
            primary_link="https://docs.google.com/forms/d/e/1FAIpQLSeIEEEAbstractPortal2026/viewform",
            sender="ieee.sb@college.edu",
            source_subject="IEEE Student Branch - Tech Symposium Call for Papers",
            raw_snippet="Call for papers for 14th National Student Symposium. Cash prize INR 25,000.",
            urgency_tier="green",
            status="active",
            priority_score=3,
            confidence=0.91,
            email_thread_id="thread_ieee_05"
        )
    ]

    for task in initial_tasks:
        db.add(task)
    db.commit()
