import { useEffect, useState } from "react";
import API from "../api";
import { toast } from "react-toastify";

function EmployeeProfile() {
  const [user, setUser] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [passwords, setPasswords] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  // ==========================================
  // FETCH PROFILE
  // ==========================================
  const fetchProfile = async () => {
    try {
      setLoading(true);

      const res = await API.get("/auth/me");

      setUser(res.data);

    } catch (err) {
      console.error(err);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // ==========================================
  // UPDATE PROFILE
  // ==========================================
  const handleUpdate = async () => {
    try {
      if (!user?.employee?.id) {
        return toast.error("Employee not found");
      }

      setSaving(true);

      await API.put(`/employees/${user.employee.id}`, {
        name: user.name,
        department: user.employee.department,
        role: user.employee.role,
      });

      toast.success("Profile updated successfully");

    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.detail || "Update failed"
      );
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // CHANGE PASSWORD
  // ==========================================
  const handlePasswordChange = async () => {
    try {
      if (!passwords.newPassword) {
        return toast.error("Enter new password");
      }

      if (passwords.newPassword.length < 6) {
        return toast.error(
          "Password must be at least 6 characters"
        );
      }

      if (
        passwords.newPassword !==
        passwords.confirmPassword
      ) {
        return toast.error("Passwords do not match");
      }

      setSaving(true);

      await API.post("/auth/reset-password", {
        token: user.email,
        new_password: passwords.newPassword,
      });

      toast.success("Password updated");

      setPasswords({
        newPassword: "",
        confirmPassword: "",
      });

    } catch (err) {
      console.error(err);
      toast.error("Password update failed");
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // LOADING
  // ==========================================
  if (loading) {
    return (
      <div className="p-6 text-gray-500 dark:text-gray-400">
        Loading profile...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6 text-red-500">
        Failed to load profile
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">
          Employee Profile
        </h1>

        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Manage your account information
        </p>
      </div>

      {/* PROFILE CARD */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6">

        <div className="flex items-center gap-4 mb-6">

          <div className="w-16 h-16 rounded-full bg-blue-500 text-white flex items-center justify-center text-2xl font-bold">
            {user.name?.charAt(0)?.toUpperCase()}
          </div>

          <div>
            <h2 className="text-xl font-semibold">
              {user.name}
            </h2>

            <p className="text-gray-500 dark:text-gray-400">
              {user.email}
            </p>
          </div>

        </div>

        {/* INFO GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* NAME */}
          <div>
            <label className="text-sm text-gray-500 dark:text-gray-400">
              Full Name
            </label>

            <input
              className="border mt-1 p-3 rounded-lg w-full focus:ring-2 focus:ring-blue-400 outline-none"
              value={user.name || ""}
              onChange={(e) =>
                setUser({
                  ...user,
                  name: e.target.value,
                })
              }
            />
          </div>

          {/* EMAIL */}
          <div>
            <label className="text-sm text-gray-500 dark:text-gray-400">
              Email Address
            </label>

            <input
              disabled
              className="border mt-1 p-3 rounded-lg w-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
              value={user.email || ""}
            />
          </div>

          {/* DEPARTMENT */}
          <div>
            <label className="text-sm text-gray-500 dark:text-gray-400">
              Department
            </label>

            <input
              className="border mt-1 p-3 rounded-lg w-full focus:ring-2 focus:ring-blue-400 outline-none"
              value={user.employee?.department || ""}
              onChange={(e) =>
                setUser({
                  ...user,
                  employee: {
                    ...user.employee,
                    department: e.target.value,
                  },
                })
              }
            />
          </div>

          {/* ROLE */}
          <div>
            <label className="text-sm text-gray-500 dark:text-gray-400">
              Role
            </label>

            <input
              disabled
              className="border mt-1 p-3 rounded-lg w-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
              value={user.employee?.role || user.role}
            />
          </div>

          {/* EMPLOYEE ID */}
          <div>
            <label className="text-sm text-gray-500 dark:text-gray-400">
              Employee ID
            </label>

            <input
              disabled
              className="border mt-1 p-3 rounded-lg w-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
              value={user.employee?.id || ""}
            />
          </div>

        </div>

        {/* SAVE BUTTON */}
        <button
          onClick={handleUpdate}
          disabled={saving}
          className="mt-6 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl transition"
        >
          {saving ? "Saving..." : "Update Profile"}
        </button>

      </div>

      {/* PASSWORD SECTION */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6">

        <h2 className="text-xl font-semibold mb-4">
          Change Password
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          <div>
            <label className="text-sm text-gray-500 dark:text-gray-400">
              New Password
            </label>

            <input
              type="password"
              className="border mt-1 p-3 rounded-lg w-full focus:ring-2 focus:ring-blue-400 outline-none"
              value={passwords.newPassword}
              onChange={(e) =>
                setPasswords({
                  ...passwords,
                  newPassword: e.target.value,
                })
              }
            />
          </div>

          <div>
            <label className="text-sm text-gray-500 dark:text-gray-400">
              Confirm Password
            </label>

            <input
              type="password"
              className="border mt-1 p-3 rounded-lg w-full focus:ring-2 focus:ring-blue-400 outline-none"
              value={passwords.confirmPassword}
              onChange={(e) =>
                setPasswords({
                  ...passwords,
                  confirmPassword: e.target.value,
                })
              }
            />
          </div>

        </div>

        <button
          onClick={handlePasswordChange}
          disabled={saving}
          className="mt-6 bg-gray-900 hover:bg-black text-white px-6 py-3 rounded-xl transition"
        >
          {saving ? "Updating..." : "Change Password"}
        </button>

      </div>

    </div>
  );
}

export default EmployeeProfile;