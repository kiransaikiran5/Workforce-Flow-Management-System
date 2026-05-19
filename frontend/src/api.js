// api.js
import axios from "axios";

const API = axios.create({
  baseURL: "http://127.0.0.1:8000",
});

// ---------- REQUEST INTERCEPTOR (unchanged) ----------
API.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem("token") ||
      sessionStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ---------- REFRESH LOGIC (shared promise) ----------
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  failedQueue = [];
};

// ---------- RESPONSE INTERCEPTOR ----------
API.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      // Prevent retrying if we are already refreshing or if the request was to /auth/refresh itself
      if (originalRequest.url === "/auth/refresh") {
        // The refresh itself failed → logout immediately
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = "/login";
        return Promise.reject(error);
      }

      if (!isRefreshing) {
        isRefreshing = true;
        originalRequest._retry = true;

        const refreshToken =
          localStorage.getItem("refresh_token") ||
          sessionStorage.getItem("refresh_token");

        if (!refreshToken) {
          // No refresh token → forced logout
          localStorage.clear();
          sessionStorage.clear();
          window.location.href = "/login";
          return Promise.reject(error);
        }

        try {
          const form = new URLSearchParams();
          form.append("refresh_token", refreshToken);

          const res = await API.post("/auth/refresh", form, {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
          });

          const newToken = res.data.access_token;

          if (localStorage.getItem("refresh_token")) {
            localStorage.setItem("token", newToken);
          } else {
            sessionStorage.setItem("token", newToken);
          }

          // Update the current request and retry all queued requests
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          processQueue(null, newToken);
          return API(originalRequest);
        } catch (refreshError) {
          // Refresh failed → clear everything and logout
          processQueue(refreshError, null);
          localStorage.clear();
          sessionStorage.clear();
          window.location.href = "/login";
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      } else {
        // Another request is already refreshing the token → queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return API(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }
    }

    return Promise.reject(error);
  }
);

export default API;