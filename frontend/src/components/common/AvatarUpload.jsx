import { useState, useRef, useCallback } from "react";
import API from "../../api";               // adjust path if your api file is elsewhere
import { toast } from "react-toastify";

/* -----------------------------------------------------
   Helper: turns a relative path like /static/photos/1.png
   into a full URL like http://127.0.0.1:8000/static/photos/1.png
   using your API base URL.
   ----------------------------------------------------- */
const resolveImageUrl = (url) => {
  if (!url) return "";
  if (url.startsWith("http")) return url;         // already absolute
  // Remove any trailing "/api/v1" (or similar) from the baseURL
  const baseURL =
    (API.defaults.baseURL || "http://127.0.0.1:8000").replace(
      /\/api\/v1$/,
      ""
    );
  return baseURL + url;
};

export default function AvatarUpload({ employeeId, currentUrl, onUpload }) {
  // Initialize preview with the resolved absolute URL
  const [preview, setPreview] = useState(resolveImageUrl(currentUrl));
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(false);
  const fileInputRef = useRef(null);

  const handleFile = useCallback(
    async (file) => {
      if (!file) return;

      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
      ];
      if (!allowedTypes.includes(file.type)) {
        toast.error("Only JPEG, PNG, GIF, WebP allowed");
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Image must be under 2 MB");
        return;
      }

      setError(false);

      // Local preview (temporary, but we'll replace with real URL later)
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(file);

      const formData = new FormData();
      formData.append("file", file);

      setUploading(true);
      setProgress(0);

      try {
        const res = await API.post(
          `/employees/${employeeId}/photo`,
          formData,
          {
            headers: { "Content-Type": "multipart/form-data" },
            onUploadProgress: (progressEvent) => {
              const percent = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              setProgress(percent);
            },
          }
        );

        // Backend returns a relative path, e.g., "/static/photos/emp_1.png"
        const relativeImageUrl = res.data.profile_image;
        // Convert it to an absolute URL so it works everywhere
        const absoluteImageUrl = resolveImageUrl(relativeImageUrl);

        // Notify the parent component (ProfilePage) with the absolute URL
        if (onUpload) onUpload(absoluteImageUrl);

        // Update preview to the confirmed image
        setPreview(absoluteImageUrl);
        toast.success("Photo uploaded successfully");
      } catch (err) {
        setError(true);
        toast.error(err.response?.data?.detail || "Upload failed");
        // Revert to the previous image
        setPreview(resolveImageUrl(currentUrl));
      } finally {
        setUploading(false);
      }
    },
    [employeeId, currentUrl, onUpload]
  );

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e) => e.preventDefault(), []);
  const handleClick = () => fileInputRef.current?.click();

  // If there's no employee ID yet, show a helpful message
  if (!employeeId) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400 py-4 text-sm">
        Please save your profile first before uploading an image.
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative group">
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={handleClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && handleClick()}
          className="relative w-28 h-28 rounded-full border-2 border-dashed transition-all duration-300 cursor-pointer
            bg-gray-50 dark:bg-gray-900/60 hover:bg-gray-100 dark:bg-gray-700
            border-gray-300 hover:border-indigo-400
            group-hover:shadow-lg group-hover:scale-105
            focus:outline-none focus:ring-4 focus:ring-indigo-200
            overflow-hidden"
        >
          {preview ? (
            <img
              src={preview}
              alt="Avatar preview"
              className="w-full h-full object-cover rounded-full"
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500 group-hover:text-indigo-500 transition-colors">
              <CameraIcon className="w-8 h-8 mb-1" />
              <span className="text-xs font-medium">Add Photo</span>
            </div>
          )}

          {uploading && (
            <div className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center">
              <Spinner className="w-7 h-7 text-white mb-1" />
              <span className="text-white text-sm font-semibold">
                {progress}%
              </span>
            </div>
          )}

          {error && !uploading && (
            <div className="absolute inset-0 bg-red-500/20 rounded-full flex items-center justify-center">
              <ExclamationIcon className="w-7 h-7 text-red-500" />
            </div>
          )}
        </div>

        {preview && !uploading && !error && (
          <div className="absolute bottom-1 right-1 bg-indigo-600 rounded-full p-1.5 shadow-md group-hover:opacity-100 opacity-0 transition-opacity">
            <PencilIcon className="w-4 h-4 text-white" />
          </div>
        )}
      </div>

      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={(e) => {
          if (e.target.files?.[0]) handleFile(e.target.files[0]);
          e.target.value = ""; // allow re‑upload of the same file
        }}
        hidden
      />

      <div className="text-center text-sm text-gray-500 dark:text-gray-400">
        {uploading ? (
          <span className="font-medium text-indigo-600">Uploading...</span>
        ) : (
          <>
            <span className="font-medium">Drag & drop</span> or{" "}
            <button
              type="button"
              onClick={handleClick}
              className="text-indigo-600 font-medium hover:underline"
            >
              browse
            </button>
          </>
        )}
      </div>

      {uploading && (
        <div className="w-full max-w-[160px] bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <p className="text-xs text-gray-400 dark:text-gray-500">JPG, PNG, GIF or WebP. Max 2 MB.</p>
    </div>
  );
}

/* ---------- Inline SVG icons ---------- */
function CameraIcon({ className }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-2l-2-2H9L7 7H5a2 2 0 00-2 2z"
      />
      <circle cx="12" cy="13" r="3" strokeWidth="1.5" />
    </svg>
  );
}

function Spinner({ className }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

function PencilIcon({ className }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
      />
    </svg>
  );
}

function ExclamationIcon({ className }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M12 9v2m0 4h.01M12 3a9 9 0 110 18 9 9 0 010-18z"
      />
    </svg>
  );
}