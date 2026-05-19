from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.db.database import Base, engine

# ── Models (unchanged except removed task / upload‑history) ─────────
from app.models import (
    user_model,
    employee_model,
    notification_model,
    audit_log_model,
    email_log,
    chat_message,
    # ✅ new models
    leave_request,
    attendance_record,
    document,
    department_model,
)
from app.models.activity_model import Activity

# ── Routes (removed old, added new) ─────────────────────────────────
from app.routes import (
    auth_routes,
    employee_routes,          # still used – Employee CRUD
    notification_routes,
    report_routes,            # still used – Reports
    admin_routes,             # Admin Dashboard
    chat_routes,
    # ✅ new routes
    leave_routes,
    attendance_routes,
    document_routes,
    department_routes,
)

from app.routes import audit_log_routes
from app.routes import activity_routes
from app.routes import prediction_routes
from app.routes.analytics_routes import router as analytics_router
from app.routes.monitoring_routes import router as monitoring_router
# from app.routes.notification_routes import router as notification_router
from app.routes.intervention_routes import router as intervention_router
from app.routes.attrition_report_routes import router as attrition_report_router
from app.routes.attrition_activity_routes import router as attrition_activity_router

from app.routes.risk_analysis_routes import router as risk_analysis_router
from app.routes.forecast_enhanced_routes import router as forecast_enhanced_router
from app.routes.live_monitoring_routes import router as live_monitoring_router
from app.routes.recommendation_routes import router as recommendation_router
from app.routes.stability_routes import router as stability_router


# ── FastAPI App ──────────────────────────────────────────────────────
app = FastAPI(
    title="Workforce Flow Management System",
    description="API for workforce management, employee operations, communication and workflow handling.",
    version="1.0.0"
)

# ── CORS ────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Static Files ────────────────────────────────────────────────────
app.mount("/static", StaticFiles(directory="static"), name="static")

# ── Create database tables ──────────────────────────────────────────
Base.metadata.create_all(bind=engine)

# ── Include Routers (order doesn't matter) ───────────────────────────
app.include_router(auth_routes.router, prefix="/auth", tags=["Auth"])
app.include_router(employee_routes.router, prefix="/employees", tags=["Employees"])
app.include_router(notification_routes.router, prefix="/notifications", tags=["Notifications"])
app.include_router(report_routes.router, prefix="/reports", tags=["Reports"])
app.include_router(admin_routes.router)
app.include_router(chat_routes.router)
app.include_router(audit_log_routes.router, tags=["Audit Logs"])

# ✅ New routers
app.include_router(leave_routes.router, prefix="/leave", tags=["Leave"])
app.include_router(attendance_routes.router, prefix="/attendance", tags=["Attendance"])
app.include_router(document_routes.router, prefix="/documents", tags=["Documents"])
app.include_router(department_routes.router, prefix="/departments", tags=["Departments"])
app.include_router(activity_routes.router)

app.include_router(prediction_routes.router)
app.include_router(analytics_router)
app.include_router(monitoring_router)
app.include_router(intervention_router)
app.include_router(attrition_report_router)
app.include_router(attrition_activity_router)

# phase 3 
app.include_router(risk_analysis_router)
app.include_router(forecast_enhanced_router)
app.include_router(live_monitoring_router)
app.include_router(recommendation_router)
app.include_router(stability_router)


@app.get("/")
def root():
    return {"message": "Workforce Flow Management System API"}

@app.get("/health")
def health_check():
    return {"status": "healthy and running"}
