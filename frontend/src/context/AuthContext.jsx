// context/AuthContext.js
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import API from "../api";

// ── Restore token immediately (before any component renders) ──
const storedToken = localStorage.getItem("token") || sessionStorage.getItem("token");
if (storedToken) {
  API.defaults.headers.common["Authorization"] = `Bearer ${storedToken}`;
}

const AuthContext = createContext();

export function AuthProvider({ children }) {
  // ✅ Synchronously restore token and user from storage
  const [token, setToken] = useState(storedToken || null);
  const [user, setUser] = useState(() => {
    try {
      const storedUser = localStorage.getItem("user") || sessionStorage.getItem("user");
      return storedUser ? JSON.parse(storedUser) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);

  // ────────── Login (returns user so the caller can redirect) ──────────
  const login = async (email, password, remember = false) => {
    // 1. Authenticate
    const formData = new URLSearchParams();
    formData.append("username", email);
    formData.append("password", password);

    const rememberParam = remember ? "?remember=true" : "";
    const res = await API.post(`/auth/login${rememberParam}`, formData, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    const { access_token, refresh_token } = res.data;
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem("token", access_token);
    if (refresh_token) storage.setItem("refresh_token", refresh_token);

    // Update header and state
    API.defaults.headers.common["Authorization"] = `Bearer ${access_token}`;
    setToken(access_token);

    // 2. Fetch basic user info
    const authRes = await API.get("/auth/me");
    const basicUser = authRes.data.data || authRes.data;

    // 3. Optionally fetch employee profile for profile_image etc.
    let finalUser = { ...basicUser };
    try {
      const empRes = await API.get("/employees/me");
      finalUser = {
        ...finalUser,
        profile_image: empRes.data.profile_image || "",
        employee: empRes.data,
      };
    } catch (err) {
      console.warn("Could not fetch employee profile after login", err);
    }

    // 4. Persist and update state
    storage.setItem("user", JSON.stringify(finalUser));
    if (finalUser.role) localStorage.setItem("role", finalUser.role);
    setUser(finalUser);

    return finalUser;   // ✅ return the user so LoginPage can navigate
  };

  // ────────── Logout ──────────
  const logout = useCallback(() => {
    delete API.defaults.headers.common["Authorization"];
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    sessionStorage.clear();
  }, []);

  // ────────── Update user ──────────
  const updateUser = useCallback((updatedFields) => {
    setUser((prev) => {
      const merged = { ...prev, ...updatedFields };
      const storage = localStorage.getItem("token") ? localStorage : sessionStorage;
      storage.setItem("user", JSON.stringify(merged));
      if (merged.role) localStorage.setItem("role", merged.role);
      return merged;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);