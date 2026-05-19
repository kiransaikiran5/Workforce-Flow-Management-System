from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from app.models.attrition_prediction import AttritionPrediction
from app.models.employee_model import Employee
from app.models.high_risk_alert import HighRiskAlert
from app.services.notification_service import send_high_risk_alert_notification
from datetime import datetime, timezone, timedelta
from typing import List

def generate_smart_alerts(db: Session):
    """
    Runs all smart alert rules. Call this after a new prediction upload
    or on a schedule.
    Returns list of newly created alerts.
    """
    new_alerts = []

    # Rule 1 – Risk Escalation: employee's risk score increased by >0.3 since last prediction
    new_alerts += _check_risk_escalation(db)

    # Rule 2 – Department Surge: >50% of a department's employees are High risk
    new_alerts += _check_department_surge(db)

    # Rule 3 – Persistent High Risk: employee has been High in the last 3 predictions
    new_alerts += _check_persistent_high_risk(db)

    # Send emails for new alerts
    for alert in new_alerts:
        send_high_risk_alert_notification(db, alert)

    return new_alerts

def _check_risk_escalation(db: Session) -> List[HighRiskAlert]:
    """Detect employees whose risk score jumped by >0.3 compared to their previous prediction."""
    alerts = []
    # Get all employees who have at least two predictions
    employees_with_multiple = (
        db.query(AttritionPrediction.employee_id, func.count(AttritionPrediction.id).label('cnt'))
        .filter(AttritionPrediction.employee_id != None)
        .group_by(AttritionPrediction.employee_id)
        .having(func.count(AttritionPrediction.id) >= 2)
        .all()
    )

    for emp_id, _ in employees_with_multiple:
        # Get two most recent predictions for this employee
        preds = (
            db.query(AttritionPrediction)
            .filter(AttritionPrediction.employee_id == emp_id)
            .order_by(desc(AttritionPrediction.predicted_at))
            .limit(2)
            .all()
        )
        if len(preds) < 2:
            continue
        latest = preds[0]
        previous = preds[1]
        increase = latest.risk_score - previous.risk_score
        if increase > 0.3:
            emp = db.query(Employee).get(emp_id)
            message = (
                f"Risk escalation: {emp.name if emp else 'Employee'} "
                f"increased from {previous.risk_score:.2f} to {latest.risk_score:.2f}"
            )
            # Avoid duplicate alerts of the same type for the same employee/prediction
            existing = db.query(HighRiskAlert).filter(
                HighRiskAlert.employee_id == emp_id,
                HighRiskAlert.category == "risk_escalation",
                HighRiskAlert.prediction_id == latest.id
            ).first()
            if not existing:
                alert = HighRiskAlert(
                    employee_id=emp_id,
                    prediction_id=latest.id,
                    alert_type="risk_escalation",
                    message=message,
                    severity="high",
                    priority="high",
                    category="risk_escalation",
                    created_at=datetime.now(timezone.utc)
                )
                db.add(alert)
                alerts.append(alert)
    db.commit()
    return alerts

def _check_department_surge(db: Session) -> List[HighRiskAlert]:
    """Detect departments where >50% of employees are currently High risk."""
    alerts = []
    # Get all departments that have at least one prediction
    dept_high_counts = (
        db.query(
            Employee.department,
            func.count(Employee.id).label('total'),
            func.sum(
                func.case(
                    (AttritionPrediction.risk_category == "High", 1),
                    else_=0
                )
            ).label('high_count')
        )
        .join(AttritionPrediction, AttritionPrediction.employee_id == Employee.id)
        .filter(Employee.department != None)
        .group_by(Employee.department)
        .all()
    )

    for dept, total, high_count in dept_high_counts:
        if total > 0 and (high_count / total) > 0.5:
            message = (
                f"Department {dept} surge: {high_count} out of {total} employees "
                f"are high risk ({(high_count/total)*100:.1f}%)"
            )
            # Avoid duplicate: check if an active alert for this department and category exists today
            existing = db.query(HighRiskAlert).filter(
                HighRiskAlert.category == "department_surge",
                HighRiskAlert.message.like(f"%Department {dept} surge%"),
                HighRiskAlert.created_at >= datetime.now(timezone.utc) - timedelta(days=1)
            ).first()
            if not existing:
                alert = HighRiskAlert(
                    employee_id=None,
                    prediction_id=None,
                    alert_type="department_surge",
                    message=message,
                    severity="critical",
                    priority="high",
                    category="department_surge",
                    created_at=datetime.now(timezone.utc)
                )
                db.add(alert)
                alerts.append(alert)
    db.commit()
    return alerts

def _check_persistent_high_risk(db: Session) -> List[HighRiskAlert]:
    """Detect employees who have been High risk in their last 3 consecutive predictions."""
    alerts = []
    # Get employees with at least 3 predictions
    emp_ids = (
        db.query(AttritionPrediction.employee_id)
        .filter(AttritionPrediction.employee_id != None)
        .group_by(AttritionPrediction.employee_id)
        .having(func.count(AttritionPrediction.id) >= 3)
        .all()
    )
    for (emp_id,) in emp_ids:
        # Get last 3 predictions
        preds = (
            db.query(AttritionPrediction)
            .filter(AttritionPrediction.employee_id == emp_id)
            .order_by(desc(AttritionPrediction.predicted_at))
            .limit(3)
            .all()
        )
        if len(preds) < 3:
            continue
        if all(p.risk_category == "High" for p in preds):
            emp = db.query(Employee).get(emp_id)
            message = (
                f"Persistent high risk: {emp.name if emp else 'Employee'} "
                f"has been High for the last 3 predictions."
            )
            existing = db.query(HighRiskAlert).filter(
                HighRiskAlert.employee_id == emp_id,
                HighRiskAlert.category == "persistent_high_risk",
                HighRiskAlert.prediction_id == preds[0].id
            ).first()
            if not existing:
                alert = HighRiskAlert(
                    employee_id=emp_id,
                    prediction_id=preds[0].id,
                    alert_type="persistent_high_risk",
                    message=message,
                    severity="critical",
                    priority="high",
                    category="persistent_high_risk",
                    created_at=datetime.now(timezone.utc)
                )
                db.add(alert)
                alerts.append(alert)
    db.commit()
    return alerts