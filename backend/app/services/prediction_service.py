import pandas as pd
import joblib
import os
import json
from io import BytesIO
from sqlalchemy.orm import Session
from app.models.attrition_prediction import AttritionPrediction
from app.models.employee_model import Employee
from app.models.dataset_upload import DatasetUpload
from app.models.failed_record import FailedRecord
from app.models.high_risk_alert import HighRiskAlert
from app.models.risk_change_log import RiskChangeLog
from app.services.notification_service import send_high_risk_alert_notification
from app.services.smart_alert_service import generate_smart_alerts   # ✅ Phase 3 Module 4
from app.utils.activity_logger import log_activity
from datetime import datetime, timezone

MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "ml")
model = joblib.load(os.path.join(MODEL_DIR, "attrition_model.pkl"))
scaler = joblib.load(os.path.join(MODEL_DIR, "attrition_scaler.pkl"))
features = joblib.load(os.path.join(MODEL_DIR, "attrition_features.pkl"))
cat_cols = joblib.load(os.path.join(MODEL_DIR, "attrition_cat_cols.pkl"))
encoders = joblib.load(os.path.join(MODEL_DIR, "attrition_encoders.pkl"))


def _create_monitoring_records(
    db: Session,
    pred: AttritionPrediction,
    employee,
    alerts_list: list
):
    """
    Create RiskChangeLog and HighRiskAlert records.
    Collect newly created alerts in alerts_list for later email notification.
    Log activity for high-risk alerts (Module 9).
    """
    # 1. Risk change log and category‑change alert
    if employee:
        previous_pred = (
            db.query(AttritionPrediction)
            .filter(
                AttritionPrediction.employee_id == employee.id,
                AttritionPrediction.id != pred.id,
            )
            .order_by(AttritionPrediction.predicted_at.desc())
            .first()
        )

        prev_score = previous_pred.risk_score if previous_pred else None
        prev_cat = previous_pred.risk_category if previous_pred else None

        if prev_cat is None:
            change_type = "new_prediction"
        elif prev_cat != pred.risk_category:
            change_type = "category_changed"
        else:
            change_type = "score_updated"

        log = RiskChangeLog(
            employee_id=employee.id,
            previous_risk_score=prev_score,
            new_risk_score=pred.risk_score,
            previous_category=prev_cat,
            new_category=pred.risk_category,
            change_type=change_type,
        )
        db.add(log)

        # Category changed to High → alert
        if change_type == "category_changed" and pred.risk_category == "High":
            alert = HighRiskAlert(
                employee_id=employee.id,
                prediction_id=pred.id,
                alert_type="risk_increased",
                message=(
                    f"Employee {employee.name} moved from {prev_cat} to "
                    f"High risk. Score: {pred.risk_score:.2f}"
                ),
                severity="high",
            )
            db.add(alert)
            alerts_list.append(alert)

            # ✅ Module 9: log activity
            log_activity(
                db=db,
                user_email=employee.email if employee else "system",
                action="High Risk Alert",
                module="HighRisk",
                target=employee.name if employee else pred.identifier,
                details=f"Risk score: {pred.risk_score:.2f}, Category: {pred.risk_category}"
            )

    # 2. High‑risk detected alert (for any new High prediction)
    if pred.risk_category == "High":
        existing_alert = (
            db.query(HighRiskAlert)
            .filter(
                HighRiskAlert.prediction_id == pred.id,
                HighRiskAlert.alert_type == "high_risk_detected",
            )
            .first()
        )
        if not existing_alert:
            alert = HighRiskAlert(
                employee_id=employee.id if employee else None,
                prediction_id=pred.id,
                alert_type="high_risk_detected",
                message=(
                    f"High attrition risk detected for identifier {pred.identifier}. "
                    f"Risk score: {pred.risk_score:.2f}"
                ),
                severity="high",
            )
            db.add(alert)
            alerts_list.append(alert)

            # ✅ Module 9: log activity
            log_activity(
                db=db,
                user_email=employee.email if employee else "system",
                action="High Risk Alert",
                module="HighRisk",
                target=employee.name if employee else pred.identifier,
                details=f"Risk score: {pred.risk_score:.2f}, Category: {pred.risk_category}"
            )


def process_and_predict(db: Session, file_bytes: bytes, filename: str) -> dict:
    """
    Process uploaded CSV/Excel, run predictions, store results,
    track dataset upload history, create monitoring records,
    send email notifications for high‑risk alerts,
    and generate smart alerts.
    """
    # 1. Create dataset upload record
    dataset_upload = DatasetUpload(filename=filename, status="processing")
    db.add(dataset_upload)
    db.commit()
    db.refresh(dataset_upload)

    # 2. Read file
    try:
        if filename.endswith(".csv"):
            df = pd.read_csv(BytesIO(file_bytes))
        else:
            df = pd.read_excel(BytesIO(file_bytes))
    except Exception as e:
        dataset_upload.status = "failed"
        dataset_upload.error_summary = f"File read error: {str(e)}"
        db.commit()
        return {"total": 0, "high": 0, "medium": 0, "low": 0}

    # 3. Validate required columns
    missing = set(features) - set(df.columns)
    if missing:
        dataset_upload.status = "failed"
        dataset_upload.error_summary = f"Missing columns: {missing}"
        db.commit()
        return {"total": 0, "high": 0, "medium": 0, "low": 0}

    total_records = len(df)
    success_count = 0
    failed_count = 0
    high_count = 0
    medium_count = 0
    low_count = 0

    # Collect alerts to send emails after commit
    alerts_list = []

    # 4. Process each row
    for idx, row in df.iterrows():
        try:
            row_features = {feat: row[feat] for feat in features}
            X_row = pd.DataFrame([row_features])

            # Encode categoricals safely
            for col in cat_cols:
                if col in X_row.columns:
                    le = encoders[col]
                    X_row[col] = X_row[col].astype(str)
                    known_classes = set(le.classes_)
                    X_row[col] = X_row[col].apply(
                        lambda x: x if x in known_classes else le.classes_[0]
                    )
                    X_row[col] = le.transform(X_row[col])

            X_scaled = scaler.transform(X_row)
            proba = model.predict_proba(X_scaled)[0][1]

            # Risk category
            if proba > 0.7:
                risk_category = "High"
                high_count += 1
            elif proba >= 0.3:
                risk_category = "Medium"
                medium_count += 1
            else:
                risk_category = "Low"
                low_count += 1

            # Determine identifier
            if "Email" in df.columns:
                identifier = str(row["Email"])
            elif "EmployeeNumber" in df.columns:
                identifier = str(row["EmployeeNumber"])
            else:
                identifier = str(idx)

            # Duplicate check
            existing_pred = (
                db.query(AttritionPrediction)
                .filter(AttritionPrediction.identifier == identifier)
                .first()
            )
            if existing_pred:
                failed = FailedRecord(
                    dataset_upload_id=dataset_upload.id,
                    row_index=idx,
                    error_message=f"Duplicate identifier: {identifier}",
                    raw_data=json.dumps(row.to_dict()),
                )
                db.add(failed)
                failed_count += 1
                continue

            # Link to existing employee
            employee = None
            if "Email" in df.columns:
                employee = (
                    db.query(Employee)
                    .filter(Employee.email == identifier)
                    .first()
                )

            # Save prediction
            pred = AttritionPrediction(
                employee_id=employee.id if employee else None,
                identifier=identifier,
                risk_score=round(float(proba), 4),
                risk_category=risk_category,
                features_json=row_features,
                predicted_at=datetime.now(timezone.utc),
                uploaded_file=filename,
            )
            db.add(pred)

            # Module 4: monitoring records (alerts + logs)
            _create_monitoring_records(db, pred, employee, alerts_list)

            success_count += 1

        except Exception as e:
            failed = FailedRecord(
                dataset_upload_id=dataset_upload.id,
                row_index=idx,
                error_message=str(e),
                raw_data=json.dumps(row.to_dict()),
            )
            db.add(failed)
            failed_count += 1

    # 5. Update dataset upload record and commit
    dataset_upload.total_records = total_records
    dataset_upload.success_records = success_count
    dataset_upload.failed_records = failed_count
    dataset_upload.status = "completed"
    db.commit()

    # 6. Module 5: send email notifications for all newly created alerts
    for alert in alerts_list:
        try:
            send_high_risk_alert_notification(db, alert)
        except Exception as e:
            print(f"Failed to send notification for alert {alert.id}: {e}")

    # 7. Phase 3 – Module 4: generate smart alerts
    try:
        generate_smart_alerts(db)
    except Exception as e:
        print(f"Smart alert generation failed: {e}")

    return {
        "total": success_count,
        "high": high_count,
        "medium": medium_count,
        "low": low_count,
    }