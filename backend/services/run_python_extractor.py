import sys
import json
import asyncio
import os

# Add root directory to sys.path so backend.services can be imported
root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

try:
    from backend.services.extractor import extract_deadline_from_email
except ImportError:
    # Direct import fallback
    from extractor import extract_deadline_from_email

async def main():
    try:
        input_data = json.load(sys.stdin)
        subject = input_data.get("subject", "")
        sender = input_data.get("sender", "")
        body = input_data.get("body", "")
        sent_at = input_data.get("sent_at", None)

        result = await extract_deadline_from_email(
            subject=subject,
            sender=sender,
            body=body,
            sent_at=sent_at
        )

        # Ensure datetime is serialized to ISO string
        if "deadline_iso" in result and hasattr(result["deadline_iso"], "isoformat"):
            result["deadline_iso"] = result["deadline_iso"].isoformat()

        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({
            "is_actionable": False,
            "error": str(e)
        }))

if __name__ == "__main__":
    asyncio.run(main())
