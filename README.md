# Workforce Flow Management System

A full‑stack enterprise application for workforce management, HR attrition prediction, AI‑driven analytics, and real‑time monitoring. Built with **FastAPI** (backend), **React** (frontend), and **PostgreSQL**.

---

## ✨ Features

### Core HR Modules
- Employee CRUD, department & role management
- Attendance tracking, leave management (apply / approve)
- One‑to‑one chat, document upload, email notifications
- Role‑based dashboards (Admin, HR, Employee)

### HR Attrition Intelligence (Phases 1‑3)
- **Attrition Prediction Engine** – Upload CSV/Excel datasets and get risk scores (High / Medium / Low)
- **Advanced Analytics** – Turnover stats, heatmaps, yearly trends, department‑wise summaries
- **AI Forecasting Dashboard** – Long‑term predictions using linear regression, year‑over‑year comparisons
- **Real‑Time Monitoring** – Live activity feed, high‑risk alerts, risk change logs
- **Smart Notification & Alert Engine** – Rule‑based alerts (risk escalation, department surge, persistent high risk)
- **HR Decision Support** – AI‑generated retention recommendations, department health insights
- **Workforce Stability Engine** – Stability scores, retention forecasts, trend indicators
- **Export Reports** – Download filtered data as Excel / PDF

---

# Technology Stack

## Backend
- Core: FastAPI (Python 3.12+)
- Database: PostgreSQL with SQLAlchemy ORM
- Machine Learning: Scikit-learn, Pandas, NumPy
- Authentication: OAuth2 with JWT (Jose)
- Email: SMTP (smtplib) with email logging
- File Handling: python-multipart
- Reports: ReportLab (PDF), OpenPyXL (Excel)

## Frontend
- Framework: React 18 with Vite
- Routing: React Router v6
- Styling: Tailwind CSS
- State Management: Zustand
- HTTP Client: Axios
- Charts: Recharts
- Notifications: react-toastify
- Icons: Lucide React
- CSS Processing: PostCSS + Autoprefixer

## Backend setup
- cd backend
- python -m venv venv
# On Windows:
- venv\Scripts\activate
# On macOS/Linux:
- source venv/bin/activate

## Install required packages:
- pip install -r ../requirements.txt

## Run Backend Server
uvicorn app.main:app --reload

## Frontend setup

- cd frontend
- npm install
- npm start
