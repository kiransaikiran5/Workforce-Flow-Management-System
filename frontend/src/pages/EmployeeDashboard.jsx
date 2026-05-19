// pages/EmployeeDashboard.jsx
import { useEffect, useState } from "react";
import API from "../api";
import { toast } from "react-toastify";
import AvatarUpload from "../components/common/AvatarUpload";
import ActivityFeed from "../components/common/ActivityFeed";

const TABS = [
  { key: "profile", label: "Profile" },
  { key: "activity", label: "Activity" },
  { key: "settings", label: "Settings" },
];

export default function EmployeeDashboard() {
  const [activeTab, setActiveTab] = useState("profile");
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    designation: "",
    profile_image: "",
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await API.get("/employees/me");
      const emp = res.data;
      if (!emp) {
        toast.error("Profile data not found");
        return;
      }
      setProfile(emp);
      setForm({
        name: emp.name || "",
        phone: emp.phone || "",
        address: emp.address || "",
        designation: emp.designation || "",
        profile_image: emp.profile_image || "",
      });
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.detail || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = (url) => {
    setForm((prev) => ({ ...prev, profile_image: url }));
    setProfile((prev) => (prev ? { ...prev, profile_image: url } : prev));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = "Full name is required";
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    try {
      setSaving(true);
      const res = await API.put("/employees/me", form);
      const updated = res.data;
      setProfile(updated);
      setForm({
        name: updated.name || "",
        phone: updated.phone || "",
        address: updated.address || "",
        designation: updated.designation || "",
        profile_image: updated.profile_image || "",
      });
      toast.success("Profile updated successfully");
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.detail || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="bg-white dark:bg-gray-800 shadow rounded-xl p-6">
          <p className="text-red-500 font-medium">Failed to load profile data</p>
          <button
            onClick={fetchProfile}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const ProfileContent = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex flex-col items-center">
          <AvatarUpload
            employeeId={profile?.id}
            currentUrl={form.profile_image}
            onUpload={handleAvatarUpload}
          />
          <h2 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">
            {profile?.name || "Employee"}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{profile?.email}</p>
          <div className="mt-3 flex flex-wrap gap-2 justify-center">
            {profile?.department && (
              <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                {profile.department}
              </span>
            )}
            {profile?.system_role && (
              <span className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold capitalize">
                {profile.system_role}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="lg:col-span-2">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6">Edit Profile</h3>
          <form onSubmit={handleSave} className="space-y-5">
            <InputField label="Full Name *" name="name" value={form.name} onChange={handleChange} error={errors.name} placeholder="Enter full name" />
            <InputField label="Phone" name="phone" value={form.phone} onChange={handleChange} placeholder="Phone number" />
            <InputField label="Address" name="address" value={form.address} onChange={handleChange} placeholder="Address" />
            <InputField label="Job Title" name="designation" value={form.designation} onChange={handleChange} placeholder="Job title" />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className={`px-6 py-2.5 rounded-xl text-white font-semibold transition ${
                  saving ? "bg-indigo-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"
                }`}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  const ActivityContent = () => (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
      <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Recent Activity</h3>
      <ActivityFeed admin={false} limit={20} />
    </div>
  );

  // ── Updated Settings Content with Password Reset Flow ──
  const SettingsContent = () => {
    const [prefs, setPrefs] = useState({ email_high_risk_alerts: true, email_weekly_summary: false });
    const [prefLoading, setPrefLoading] = useState(true);
    const [sendingReset, setSendingReset] = useState(false);

    // Reset password states
    const [resetToken, setResetToken] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [resetting, setResetting] = useState(false);

    useEffect(() => {
      const fetchPrefs = async () => {
        try {
          const res = await API.get("/notifications/preferences");
          setPrefs(res.data);
        } catch {
          toast.error("Could not load notification preferences");
        } finally {
          setPrefLoading(false);
        }
      };
      fetchPrefs();
    }, []);

    const togglePreference = async (key) => {
      const updated = { ...prefs, [key]: !prefs[key] };
      setPrefs(updated); // optimistic
      try {
        await API.put("/notifications/preferences", { [key]: updated[key] });
        toast.success("Preference updated");
      } catch {
        setPrefs(prefs); // revert on failure
        toast.error("Failed to update preference");
      }
    };

    const handleSendResetToken = async () => {
      try {
        setSendingReset(true);
        await API.post("/auth/forgot-password", { email: profile.email });
        toast.success("Reset token sent to your email. Enter it below.");
        setResetToken(""); // clear fields for new attempt
        setNewPassword("");
      } catch {
        toast.error("Could not send reset token");
      } finally {
        setSendingReset(false);
      }
    };

    const handleResetPassword = async () => {
      if (!resetToken.trim() || !newPassword.trim()) {
        return toast.error("Token and new password are required");
      }
      if (newPassword.length < 6) {
        return toast.error("Password must be at least 6 characters");
      }
      try {
        setResetting(true);
        await API.post("/auth/reset-password", {
          token: resetToken.trim(),
          new_password: newPassword,
        });
        toast.success("Password reset successful! You can now log in with the new password.");
        setResetToken("");
        setNewPassword("");
      } catch (err) {
        toast.error(err.response?.data?.detail || "Invalid or expired token");
      } finally {
        setResetting(false);
      }
    };

    return (
      <div className="space-y-8">
        {/* Notification Preferences */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Notification Preferences</h3>
          {prefLoading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-white">High Risk Alerts</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Receive email when a high‑risk employee is detected</p>
                </div>
                <button
                  onClick={() => togglePreference("email_high_risk_alerts")}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    prefs.email_high_risk_alerts ? "bg-indigo-600" : "bg-gray-300 dark:bg-gray-600"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      prefs.email_high_risk_alerts ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-white">Weekly Summary</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Receive a weekly email summary of attrition trends</p>
                </div>
                <button
                  onClick={() => togglePreference("email_weekly_summary")}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    prefs.email_weekly_summary ? "bg-indigo-600" : "bg-gray-300 dark:bg-gray-600"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      prefs.email_weekly_summary ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Change Password (with inline reset flow) */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Change Password</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            A reset token will be sent to <strong>{profile.email}</strong>. You can then enter the token and your new password below.
          </p>

          {/* Step 1: Send token */}
          <div className="mb-6">
            <button
              onClick={handleSendResetToken}
              disabled={sendingReset}
              className={`px-5 py-2.5 rounded-xl font-medium text-white transition ${
                sendingReset ? "bg-indigo-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"
              }`}
            >
              {sendingReset ? "Sending Token..." : "Send Reset Token"}
            </button>
          </div>

          {/* Step 2: Enter token and new password */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reset Token</label>
              <input
                type="text"
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value)}
                placeholder="Paste the token from your email"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <button
              onClick={handleResetPassword}
              disabled={resetting}
              className={`px-5 py-2.5 rounded-xl font-medium text-white transition ${
                resetting ? "bg-green-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
              }`}
            >
              {resetting ? "Resetting..." : "Reset Password"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900/60">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-indigo-600">My Workspace</h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 px-5 text-sm font-medium border-b-2 transition ${
                activeTab === tab.key
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-indigo-600"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "profile" && <ProfileContent />}
        {activeTab === "activity" && <ActivityContent />}
        {activeTab === "settings" && <SettingsContent />}
      </main>
    </div>
  );
}

function InputField({ label, name, value, onChange, error, placeholder }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      <input
        type="text"
        name={name}
        value={value || ""}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full px-4 py-2.5 rounded-xl border outline-none transition bg-white dark:bg-gray-700 dark:text-white ${
          error
            ? "border-red-400 ring-2 ring-red-200"
            : "border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-indigo-400"
        }`}
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}