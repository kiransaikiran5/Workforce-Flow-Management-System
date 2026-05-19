import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler, LabelEncoder
import joblib

# Use the classic IBM HR Attrition dataset (you need the CSV file)
df = pd.read_csv("WA_Fn-UseC_-HR-Employee-Attrition.csv")

features = [
    "Age", "BusinessTravel", "Department", "DistanceFromHome",
    "Education", "EducationField", "EnvironmentSatisfaction",
    "JobInvolvement", "JobLevel", "JobRole", "JobSatisfaction",
    "MaritalStatus", "MonthlyIncome", "NumCompaniesWorked",
    "OverTime", "PercentSalaryHike", "PerformanceRating",
    "RelationshipSatisfaction", "StockOptionLevel",
    "TotalWorkingYears", "TrainingTimesLastYear",
    "WorkLifeBalance", "YearsAtCompany",
    "YearsInCurrentRole", "YearsSinceLastPromotion",
    "YearsWithCurrManager"
]
target = "Attrition"

X = df[features].copy()
y = df[target].map({"Yes": 1, "No": 0})

cat_cols = X.select_dtypes(include="object").columns.tolist()
encoders = {}
for col in cat_cols:
    le = LabelEncoder()
    X[col] = le.fit_transform(X[col])
    encoders[col] = le

scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

model = LogisticRegression(max_iter=1000)
model.fit(X_scaled, y)

# Save all required objects
joblib.dump(model, "attrition_model.pkl")
joblib.dump(scaler, "attrition_scaler.pkl")
joblib.dump(features, "attrition_features.pkl")
joblib.dump(cat_cols, "attrition_cat_cols.pkl")
joblib.dump(encoders, "attrition_encoders.pkl")
print("Model saved.")