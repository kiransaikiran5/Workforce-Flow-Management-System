# app/utils/email_service.py

import os
import smtplib
import logging

from datetime import datetime, timezone
from typing import Optional, List

from dotenv import load_dotenv

from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from sqlalchemy.orm import Session

from fastapi import BackgroundTasks

from jinja2 import Environment, FileSystemLoader, select_autoescape


load_dotenv()

logger = logging.getLogger(__name__)

# =========================================================
# SMTP CONFIG
# =========================================================

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))

SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")

# =========================================================
# JINJA TEMPLATE CONFIG
# =========================================================

template_env = Environment(
    loader=FileSystemLoader("app/templates/emails"),
    autoescape=select_autoescape(["html", "xml"])
)

# =========================================================
# TEXT EMAIL TEMPLATES
# =========================================================

REGISTRATION_TEMPLATE = """
Hello {name},

Welcome to Workforce Flow Management System.

Your account has been created successfully.

Email: {email}
Temporary Password: {password}

Department: {department}
Designation: {designation}
Role: {role}

Please login and change your password.

Regards,
WFMS Team
"""

RESET_TEMPLATE = """
Hello {name},

A password reset request was received.

Reset Token:
{token}

This token expires in 10 minutes.

Regards,
WFMS Team
"""

LEAVE_APPLIED_TEMPLATE = """
Hello {name},

Your leave request has been submitted.

Leave Type: {leave_type}

From: {start_date}
To: {end_date}

Reason:
{reason}

Status: PENDING

Regards,
WFMS Team
"""

LEAVE_STATUS_TEMPLATE = """
Hello {name},

Your leave request has been {status}.

Leave Type: {leave_type}

From: {start_date}
To: {end_date}

{further_info}

Regards,
WFMS Team
"""

PROFILE_UPDATE_TEMPLATE = """
Hello {name},

Your employee profile has been updated.

Updated Fields:
{fields}

Regards,
WFMS Team
"""

ROLE_CHANGE_TEMPLATE = """
Hello {name},

Your role has been updated.

Old Role: {old_role}
New Role: {new_role}

Regards,
WFMS Team
"""

STATUS_CHANGE_TEMPLATE = """
Hello {name},

Your account status changed.

New Status: {status}

Regards,
WFMS Team
"""

EMPLOYEE_CREATED_TEMPLATE = """
Hello HR,

A new employee has been created.

Name: {name}
Email: {email}
Department: {department}
Designation: {designation}

Regards,
WFMS System
"""

# =========================================================
# TEMPLATE RENDERER
# =========================================================

def render_template(template_name: str, context: dict):
    template = template_env.get_template(template_name)
    return template.render(**context)

# =========================================================
# EMAIL SENDER
# =========================================================

def send_email(
    recipient: str,
    subject: str,
    body: Optional[str] = None,
    html_body: Optional[str] = None
) -> bool:

    try:

        if not SMTP_USER or not SMTP_PASSWORD:
            logger.error("SMTP credentials missing")
            return False

        msg = MIMEMultipart("alternative")

        msg["From"] = SMTP_USER
        msg["To"] = recipient
        msg["Subject"] = subject

        if body:
            msg.attach(
                MIMEText(body, "plain", "utf-8")
            )

        if html_body:
            msg.attach(
                MIMEText(html_body, "html", "utf-8")
            )

        server = smtplib.SMTP(
            SMTP_HOST,
            SMTP_PORT,
            timeout=30
        )

        server.starttls()

        server.login(
            SMTP_USER,
            SMTP_PASSWORD
        )

        server.sendmail(
            SMTP_USER,
            recipient,
            msg.as_string()
        )

        server.quit()

        logger.info("Email sent to %s", recipient)

        return True

    except Exception as e:

        logger.error(
            "Email send failed to %s : %s",
            recipient,
            str(e)
        )

        return False

# =========================================================
# DATABASE LOGGING
# =========================================================

def _get_new_db_session():

    from app.db.database import SessionLocal

    return SessionLocal()

# =========================================================
# MAIN EMAIL LOGGER
# =========================================================

def send_email_logged(
    db: Session,
    recipient: str,
    subject: str,
    body: Optional[str] = None,
    html_template: Optional[str] = None,
    context: Optional[dict] = None,
    background_tasks: Optional[BackgroundTasks] = None
):

    from app.models.email_log import EmailLog

    html_content = None

    if html_template:
        html_content = render_template(
            html_template,
            context or {}
        )

    log = EmailLog(
        recipient=recipient,
        subject=subject,
        body=body or html_template,
        status="pending",
        created_at=datetime.now(timezone.utc)
    )

    db.add(log)
    db.commit()
    db.refresh(log)

    if background_tasks:

        background_tasks.add_task(
            _send_and_update_log,
            log.id,
            recipient,
            subject,
            body,
            html_content
        )

    else:

        success = send_email(
            recipient,
            subject,
            body,
            html_content
        )

        log.status = "sent" if success else "failed"

        if not success:
            log.error_message = "SMTP sending failed"

        db.commit()

# =========================================================
# BACKGROUND TASK
# =========================================================

def _send_and_update_log(
    log_id: int,
    recipient: str,
    subject: str,
    body: Optional[str],
    html_content: Optional[str]
):

    from app.models.email_log import EmailLog

    db = _get_new_db_session()

    try:

        success = send_email(
            recipient,
            subject,
            body,
            html_content
        )

        log = db.query(EmailLog).filter(
            EmailLog.id == log_id
        ).first()

        if log:

            log.status = "sent" if success else "failed"

            if not success:
                log.error_message = "SMTP sending failed"

            db.commit()

    except Exception as e:

        logger.error(
            "Background email task failed: %s",
            str(e)
        )

        log = db.query(EmailLog).filter(
            EmailLog.id == log_id
        ).first()

        if log:

            log.status = "failed"
            log.error_message = str(e)

            db.commit()

    finally:
        db.close()

# =========================================================
# CONVENIENCE FUNCTIONS
# =========================================================

def send_registration_email(
    db: Session,
    email: str,
    name: str,
    password: str,
    department: str = "N/A",
    designation: str = "N/A",
    role: str = "employee",
    background_tasks: BackgroundTasks = None
):

    body = REGISTRATION_TEMPLATE.format(
        name=name,
        email=email,
        password=password,
        department=department,
        designation=designation,
        role=role
    )

    send_email_logged(
        db,
        email,
        "Welcome to WFMS",
        body,
        background_tasks=background_tasks
    )

def send_password_reset_email(
    db: Session,
    email: str,
    name: str,
    token: str,
    background_tasks: BackgroundTasks = None
):

    body = RESET_TEMPLATE.format(
        name=name,
        token=token
    )

    send_email_logged(
        db,
        email,
        "Password Reset",
        body,
        background_tasks=background_tasks
    )

def send_leave_applied_email(
    db: Session,
    email: str,
    name: str,
    leave_type: str,
    start_date: str,
    end_date: str,
    reason: str,
    background_tasks: BackgroundTasks = None
):

    body = LEAVE_APPLIED_TEMPLATE.format(
        name=name,
        leave_type=leave_type,
        start_date=start_date,
        end_date=end_date,
        reason=reason or "N/A"
    )

    send_email_logged(
        db,
        email,
        "Leave Request Submitted",
        body,
        background_tasks=background_tasks
    )

def send_leave_status_change_email(
    db: Session,
    email: str,
    name: str,
    leave_type: str,
    start_date: str,
    end_date: str,
    status: str,
    background_tasks: BackgroundTasks = None
):

    further_info = ""

    if status.lower() == "approved":
        further_info = "Enjoy your leave."

    elif status.lower() == "rejected":
        further_info = "Please contact HR."

    body = LEAVE_STATUS_TEMPLATE.format(
        name=name,
        leave_type=leave_type,
        start_date=start_date,
        end_date=end_date,
        status=status.upper(),
        further_info=further_info
    )

    send_email_logged(
        db,
        email,
        f"Leave {status.capitalize()}",
        body,
        background_tasks=background_tasks
    )

def send_profile_update_email(
    db: Session,
    email: str,
    name: str,
    updated_fields: str,
    background_tasks: BackgroundTasks = None
):

    body = PROFILE_UPDATE_TEMPLATE.format(
        name=name,
        fields=updated_fields
    )

    send_email_logged(
        db,
        email,
        "Profile Updated",
        body,
        background_tasks=background_tasks
    )

def send_role_change_email(
    db: Session,
    email: str,
    name: str,
    old_role: str,
    new_role: str,
    background_tasks: BackgroundTasks = None
):

    body = ROLE_CHANGE_TEMPLATE.format(
        name=name,
        old_role=old_role,
        new_role=new_role
    )

    send_email_logged(
        db,
        email,
        "Role Changed",
        body,
        background_tasks=background_tasks
    )

def send_status_change_email(
    db: Session,
    email: str,
    name: str,
    status: str,
    background_tasks: BackgroundTasks = None
):

    body = STATUS_CHANGE_TEMPLATE.format(
        name=name,
        status=status
    )

    send_email_logged(
        db,
        email,
        "Account Status Updated",
        body,
        background_tasks=background_tasks
    )

def send_new_employee_notification_to_hr(
    db: Session,
    hr_emails: List[str],
    name: str,
    email: str,
    department: str,
    designation: str,
    background_tasks: BackgroundTasks = None
):

    body = EMPLOYEE_CREATED_TEMPLATE.format(
        name=name,
        email=email,
        department=department,
        designation=designation
    )

    for hr_email in hr_emails:

        send_email_logged(
            db,
            hr_email,
            "New Employee Created",
            body,
            background_tasks=background_tasks
        )