import { useEffect, useState, useRef } from "react";
import API from "../api";
import { toast } from "react-toastify";
import Breadcrumbs from "../components/common/Breadcrumbs";
import { useAuth } from "../context/AuthContext";

export default function ProfilePage() {
  const { updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    address: "",
    job_title: "",
    profile_image: "",
  });

  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);

  // ---------- Fetch profile ----------
  const fetchProfile = async (signal) => {
    try {
      const res = await API.get("/employees/me", { signal });
      const emp = res.data;
      setProfile(emp);
      setForm({
        full_name: emp.full_name || "",
        phone: emp.phone || "",
        address: emp.address || "",
        job_title: emp.job_title || "",
        profile_image: emp.profile_image || "",
      });
      if (emp.profile_image) {
        setPreviewUrl(emp.profile_image);
      }
    } catch (err) {
      if (err.name !== "CanceledError" && err.code !== "ERR_CANCELED") {
        toast.error("Failed to load profile");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const abortController = new AbortController();
    setLoading(true);
    fetchProfile(abortController.signal);
    return () => abortController.abort();
  }, []);

  // ---------- Form handlers ----------
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  // ---------- File handling ----------
  const handleFileSelect = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result;
      setForm((prev) => ({
        ...prev,
        profile_image: base64,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePicture = () => {
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setForm((prev) => ({ ...prev, profile_image: "" }));
    // Optional: instantly update sidebar avatar to letter (uncomment if desired)
    // updateUser({ profile_image: "" });
    toast.success("Picture removed (save to apply)");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  // ---------- Save profile ----------
  const handleSave = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.full_name.trim()) errs.full_name = "Full name is required";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    try {
      const res = await API.put("/employees/me", form);
      const updated = res.data;
      setProfile(updated);
      setForm({
        full_name: updated.full_name || "",
        phone: updated.phone || "",
        address: updated.address || "",
        job_title: updated.job_title || "",
        profile_image: updated.profile_image || "",
      });
      setPreviewUrl(updated.profile_image || null);

      // ✅ Immediately update the global user context → sidebar shows new avatar
      updateUser({ profile_image: updated.profile_image || "" });

      toast.success("Profile updated");
    } catch (err) {
      const msg = err.response?.data?.detail || "Update failed";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // ---------- Loading / error states ----------
  if (loading) {
    return (
      <div className="page-container flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-indigo-600" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="page-container flex items-center justify-center h-64">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow text-center max-w-md">
          <div className="text-4xl mb-4">📋</div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">Cannot load profile</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Please check that the backend is running and your employee record exists.
          </p>
          <button
            onClick={() => {
              setLoading(true);
              const abortController = new AbortController();
              fetchProfile(abortController.signal);
            }}
            className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container max-w-3xl mx-auto space-y-6">
      <Breadcrumbs
        items={[
          { href: "/dashboard", label: "Dashboard" },
          { label: "Profile" },
        ]}
      />

      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">My Profile</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Manage your personal information and profile picture.
        </p>
      </div>

      {/* Avatar & Basic Info */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex flex-col sm:flex-row items-center gap-6">
        <div className="flex flex-col items-center gap-3">
          <label
            className="relative group cursor-pointer"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <svg
                  className="w-8 h-8 text-gray-400 dark:text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
              )}
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-white text-xs font-semibold">Change</span>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
                e.target.value = "";
              }}
            />
          </label>

          {previewUrl && (
            <button
              type="button"
              onClick={handleRemovePicture}
              className="text-xs text-red-500 hover:text-red-600 underline"
            >
              Remove picture
            </button>
          )}
        </div>

        <div className="text-center sm:text-left">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
            {profile.full_name || "Your Name"}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{profile.email}</p>
          <div className="mt-2 flex flex-wrap gap-2 justify-center sm:justify-start">
            {profile.system_role && (
              <span className="px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-semibold uppercase tracking-wide border border-indigo-200 dark:border-indigo-700">
                {profile.system_role}
              </span>
            )}
            {profile.department && (
              <span className="px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold uppercase tracking-wide border border-emerald-200 dark:border-emerald-700">
                {profile.department}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Edit Form */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-5">
          Edit Details
        </h3>
        <form onSubmit={handleSave} className="space-y-4">
          <InputField
            label="Full Name *"
            name="full_name"
            value={form.full_name}
            onChange={handleChange}
            error={errors.full_name}
            placeholder="John Doe"
          />
          <InputField
            label="Phone"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            placeholder="+1 234 567 890"
          />
          <InputField
            label="Address"
            name="address"
            value={form.address}
            onChange={handleChange}
            placeholder="123 Main St, City"
          />
          <InputField
            label="Designation"
            name="job_title"
            value={form.job_title}
            onChange={handleChange}
            placeholder="Software Engineer"
          />

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-white transition-all duration-200 ${
                saving
                  ? "bg-indigo-400 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none"
              }`}
            >
              {saving ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function InputField({ label, name, value, onChange, error, placeholder, type = "text" }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full px-4 py-2.5 border ${
          error ? "border-red-400 ring-1 ring-red-400" : "border-gray-200 dark:border-gray-700"
        } rounded-xl focus:ring-2 focus:ring-indigo-400 focus:border-transparent outline-none transition bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500`}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}