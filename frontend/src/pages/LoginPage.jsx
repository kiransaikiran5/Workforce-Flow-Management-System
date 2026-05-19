// LoginPage.jsx – Workforce Flow Management System (self‑contained, working)
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../api";
import { toast } from "react-toastify";
import Button from "../components/common/Button";
import Input from "../components/common/Input";
import Card from "../components/common/Card";

export default function LoginPage() {
  const [mode, setMode] = useState("login");   // "login" | "forgot" | "reset"

  // Login fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);

  // Forgot / Reset fields
  const [resetEmail, setResetEmail] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Password visibility toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const navigate = useNavigate();

  // ─────────── LOGIN ───────────
  const handleLogin = async (e) => {
    e.preventDefault();

    const errs = {};
    if (!email.trim()) errs.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = "Invalid email format";
    if (!password) errs.password = "Password is required";
    else if (password.length < 6) errs.password = "Minimum 6 characters";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    try {
      // 1) Authenticate (form‑urlencoded)
      const params = new URLSearchParams();
      params.append("username", email);
      params.append("password", password);

      const query = remember ? "?remember=true" : "";
      const res = await API.post(`/auth/login${query}`, params, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      const { access_token } = res.data;

      // 2) Store token in the correct storage (based on "Remember Me")
      const storage = remember ? localStorage : sessionStorage;
      storage.setItem("token", access_token);

      // 3) Fetch user profile
      const meRes = await API.get("/auth/me", {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      const userData = meRes.data.data || meRes.data;

      // 4) Store user in the same storage
      storage.setItem("user", JSON.stringify(userData));
      if (userData.role) localStorage.setItem("role", userData.role.toLowerCase()); // role always local for quick access

      toast.success("Welcome back!");

      // 5) Redirect to the single /dashboard route – RoleDashboard picks the right component
      window.location.href = "/dashboard";
    } catch (err) {
      const status = err.response?.status;
      const detail = err.response?.data?.detail || "";

      if (status === 401 || /invalid|incorrect|wrong/i.test(detail)) {
        setErrors((prev) => ({
          ...prev,
          password: detail || "Invalid email or password",
        }));
      } else {
        toast.error(detail || "Login failed");
      }
    } finally {
      setLoading(false);
    }
  };

  // ─────────── FORGOT PASSWORD ───────────
  const handleForgot = async (e) => {
    e.preventDefault();
    if (!resetEmail.trim()) return toast.error("Enter your email");
    setLoading(true);
    try {
      await API.post("/auth/forgot-password", { email: resetEmail });
      toast.success("Reset token sent to email");
      setMode("reset");
    } catch (err) {
      toast.error(err.response?.data?.detail || "User not found");
    } finally {
      setLoading(false);
    }
  };

  // ─────────── RESET PASSWORD ───────────
  const handleReset = async (e) => {
    e.preventDefault();
    if (!token.trim() || !newPassword.trim()) return toast.error("All fields required");
    if (newPassword.length < 6) return toast.error("Minimum 6 characters");
    setLoading(true);
    try {
      await API.post("/auth/reset-password", {
        token,
        new_password: newPassword,
      });
      toast.success("Password reset successful! Please log in.");
      setMode("login");
      setToken("");
      setNewPassword("");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Invalid or expired token");
    } finally {
      setLoading(false);
    }
  };

  // ─────────── RENDER ───────────
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800/80 backdrop-blur-md rounded-3xl shadow-xl p-8 md:p-10 border border-white/50">
        {/* Logo / Branding */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Workforce Flow Management</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {mode === "login" && "Sign in to continue"}
            {mode === "forgot" && "Forgot your password?"}
            {mode === "reset" && "Reset your password"}
          </p>
        </div>

        {/* ====================== LOGIN FORM ====================== */}
        {mode === "login" && (
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrors((prev) => ({ ...prev, email: "" }));
                }}
                className={`w-full px-4 py-3 border ${
                  errors.email ? "border-red-400 ring-1 ring-red-400" : "border-gray-200 dark:border-gray-700"
                } rounded-xl focus:ring-2 focus:ring-indigo-400 focus:border-transparent outline-none transition`}
                placeholder="you@example.com"
              />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrors((prev) => ({ ...prev, password: "" }));
                  }}
                  className={`w-full px-4 py-3 pr-12 border ${
                    errors.password ? "border-red-400 ring-1 ring-red-400" : "border-gray-200 dark:border-gray-700"
                  } rounded-xl focus:ring-2 focus:ring-indigo-400 focus:border-transparent outline-none transition`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                Remember Me
              </label>
              <button
                type="button"
                onClick={() => { setMode("forgot"); setErrors({}); }}
                className="text-sm text-indigo-600 hover:underline font-medium"
              >
                Forgot Password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-xl font-semibold text-white transition-all duration-200 ${
                loading
                  ? "bg-indigo-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-indigo-600 to-blue-600 hover:shadow-lg hover:scale-[1.02]"
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                "Sign In"
              )}
            </button>

            <p className="text-center text-sm text-gray-600 dark:text-gray-400">
              Don't have an account?{" "}
              <Link to="/signup" className="text-indigo-600 font-medium hover:underline">
                Create one
              </Link>
            </p>
          </form>
        )}

        {/* ====================== FORGOT PASSWORD FORM ====================== */}
        {mode === "forgot" && (
          <form onSubmit={handleForgot} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
              <input
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:border-transparent outline-none transition"
                placeholder="you@example.com"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-yellow-500 to-amber-500 hover:shadow-lg hover:scale-[1.02] transition disabled:opacity-60"
            >
              {loading ? "Sending..." : "Send Reset Token"}
            </button>
            <div className="text-center">
              <button
                type="button"
                onClick={() => setMode("login")}
                className="text-sm text-indigo-600 hover:underline font-medium"
              >
                Back to Login
              </button>
            </div>
          </form>
        )}

        {/* ====================== RESET PASSWORD FORM ====================== */}
        {mode === "reset" && (
          <form onSubmit={handleReset} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reset Token</label>
              <input
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:border-transparent outline-none transition"
                placeholder="Paste the token from email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Password</label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:border-transparent outline-none transition"
                  placeholder="At least 6 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  {showNewPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-green-500 to-emerald-500 hover:shadow-lg hover:scale-[1.02] transition disabled:opacity-60"
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
            <div className="text-center">
              <button
                type="button"
                onClick={() => setMode("forgot")}
                className="text-sm text-indigo-600 hover:underline font-medium"
              >
                Try a different email
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}