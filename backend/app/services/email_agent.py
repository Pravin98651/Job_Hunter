"""
Email service using smtplib to send automated notifications and daily digests.
For a production environment, you would use SendGrid, Mailgun, or AWS SES via their APIs.
Here we'll use a local mock or a real SMTP server like Gmail if configured.
"""
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings

logger = logging.getLogger(__name__)

# Fallback fake SMTP port if no real credentials are provided
MOCK_SMTP_PORT = 1025 

def send_email(to_email: str, subject: str, body: str, html: bool = False) -> bool:
    """Send an email to a specific user.
    If no SMTP credentials are provided, it simply logs the email.
    """
    if not to_email:
        logger.warning("[email] No recipient address provided. Skipping.")
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.SMTP_FROM_EMAIL if hasattr(settings, "SMTP_FROM_EMAIL") and settings.SMTP_FROM_EMAIL else "agent@antigravity.ai"
    msg["To"] = to_email

    if html:
        msg.attach(MIMEText(body, "html"))
    else:
        msg.attach(MIMEText(body, "plain"))

    # Check if we have actual SMTP credentials configured in the environment
    smtp_host = getattr(settings, "SMTP_HOST", None)
    smtp_port = getattr(settings, "SMTP_PORT", None)
    smtp_user = getattr(settings, "SMTP_USER", None)
    smtp_password = getattr(settings, "SMTP_PASSWORD", None)

    try:
        if smtp_host and smtp_port:
            logger.info(f"[email] Connecting to SMTP server {smtp_host}:{smtp_port}")
            with smtplib.SMTP(smtp_host, smtp_port) as server:
                server.starttls()
                if smtp_user and smtp_password:
                    server.login(smtp_user, smtp_password)
                server.send_message(msg)
            logger.info(f"[email] Successfully sent email to {to_email}")
            return True
        else:
            # Development/Mock mode
            logger.info(f"[email] (MOCK MODE) Would send email to {to_email}")
            logger.info(f"Subject: {subject}")
            logger.info(f"Body: {body[:200]}...")
            return True
            
    except Exception as e:
        logger.error(f"[email] Failed to send email to {to_email}: {e}", exc_info=True)
        return False
