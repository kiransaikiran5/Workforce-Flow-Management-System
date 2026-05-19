import React, { useEffect, useState } from "react";
import api from "../api";
import { toast } from "react-toastify";

const HRInterventionPage = () => {
  const [interventions, setInterventions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState({
    employee_id: "",
    action_type: "meeting",
    status: "planned",
    notes: "",
  });
  const [selectedIntervention, setSelectedIntervention] = useState(null);
  const [feedbackText, setFeedbackText] = useState("");

  // Fetch interventions
  const fetchInterventions = async () => {
    try {
      const res = await api.get("/interventions/");
      setInterventions(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error("Failed to load interventions");
      setInterventions([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch employees – robust extraction with console debug
  const fetchEmployees = async () => {
    try {
      const res = await api.get("/employees/?limit=100");   // get all (or a large number)
      console.log("🔍 Employee API response:", res.data);     // debug

      let employeeList = [];

      if (Array.isArray(res.data)) {
        employeeList = res.data;
      } else if (res.data && Array.isArray(res.data.employees)) {
        employeeList = res.data.employees;
      } else if (res.data && Array.isArray(res.data.data)) {
        employeeList = res.data.data;
      } else if (res.data && Array.isArray(res.data.results)) {
        employeeList = res.data.results;
      } else {
        console.warn("⚠️ Unknown employee response format – check the console output above.");
      }

      setEmployees(employeeList);
    } catch {
      toast.error("Failed to fetch employees");
      setEmployees([]);
    }
  };

  useEffect(() => {
    fetchInterventions();
    fetchEmployees();
  }, []);

  const handleCreate = async () => {
    try {
      await api.post("/interventions/", {
        employee_id: parseInt(form.employee_id),
        action_type: form.action_type,
        status: form.status,
        notes: form.notes,
      });
      toast.success("Intervention created");
      setShowCreate(false);
      setForm({ employee_id: "", action_type: "meeting", status: "planned", notes: "" });
      fetchInterventions();
    } catch {
      toast.error("Failed to create intervention");
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await api.put(`/interventions/${id}`, { status: newStatus });
      toast.success("Status updated");
      fetchInterventions();
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleAddFeedback = async () => {
    if (!selectedIntervention || !feedbackText.trim()) return;
    try {
      await api.post("/interventions/feedback", {
        intervention_id: selectedIntervention.id,
        feedback_text: feedbackText,
      });
      toast.success("Feedback added");
      setFeedbackText("");
      const res = await api.get(`/interventions/${selectedIntervention.id}/feedback`);
      setSelectedIntervention(prev => ({ ...prev, feedbackList: res.data }));
    } catch {
      toast.error("Failed to submit feedback");
    }
  };

  const viewFeedback = async (intervention) => {
    try {
      const res = await api.get(`/interventions/${intervention.id}/feedback`);
      setSelectedIntervention({ ...intervention, feedbackList: res.data });
    } catch {
      toast.error("Failed to load feedback");
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold dark:text-white">HR Interventions</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
        >
          + New Intervention
        </button>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">New Intervention</h2>
            <select
              className="border rounded px-3 py-2 w-full mb-3 dark:bg-gray-700"
              value={form.employee_id}
              onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
            >
              <option value="">Select Employee</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.name || emp.email} ({emp.email})</option>
              ))}
            </select>
            <select
              className="border rounded px-3 py-2 w-full mb-3 dark:bg-gray-700"
              value={form.action_type}
              onChange={(e) => setForm({ ...form, action_type: e.target.value })}
            >
              <option value="meeting">Meeting</option>
              <option value="email">Email</option>
              <option value="call">Call</option>
              <option value="review">Review</option>
            </select>
            <textarea
              placeholder="Notes (optional)"
              className="border rounded px-3 py-2 w-full mb-3 dark:bg-gray-700"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
              <button onClick={handleCreate} className="bg-indigo-600 text-white px-4 py-2 rounded-lg">Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Interventions table */}
      {loading ? (
        <div className="animate-pulse space-y-3">
          {[1,2,3].map((i) => (
            <div key={i} className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
          ))}
        </div>
      ) : interventions.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">No interventions recorded.</p>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left">Employee</th>
                <th className="px-4 py-3 text-left">HR</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Notes</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {interventions.map((inter) => (
                <tr key={inter.id} className="border-b dark:border-gray-700">
                  <td className="px-4 py-3">{inter.employee_name}</td>
                  <td className="px-4 py-3">{inter.hr_name}</td>
                  <td className="px-4 py-3 capitalize">{inter.action_type}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={inter.status} />
                  </td>
                  <td className="px-4 py-3 max-w-xs truncate">{inter.notes || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleStatusChange(inter.id, "completed")}
                        className="text-green-600 hover:underline text-xs"
                        disabled={inter.status === "completed"}
                      >Complete</button>
                      <button
                        onClick={() => handleStatusChange(inter.id, "cancelled")}
                        className="text-red-600 hover:underline text-xs"
                        disabled={inter.status === "cancelled"}
                      >Cancel</button>
                      <button
                        onClick={() => viewFeedback(inter)}
                        className="text-blue-600 hover:underline text-xs"
                      >Feedback</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Feedback modal */}
      {selectedIntervention && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-lg w-full max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Feedback for {selectedIntervention.employee_name}</h2>
              <button onClick={() => setSelectedIntervention(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>
            {selectedIntervention.feedbackList?.length > 0 ? (
              <ul className="space-y-3">
                {selectedIntervention.feedbackList.map((fb) => (
                  <li key={fb.id} className="border-b pb-2">
                    <p className="text-sm">{fb.feedback_text}</p>
                    <p className="text-xs text-gray-500">{new Date(fb.created_at).toLocaleString()}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">No feedback yet.</p>
            )}
            <div className="mt-4">
              <textarea
                className="border rounded px-3 py-2 w-full dark:bg-gray-700"
                placeholder="Add feedback..."
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
              />
              <button
                onClick={handleAddFeedback}
                className="mt-2 bg-indigo-600 text-white px-4 py-2 rounded"
              >
                Submit Feedback
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const colors = {
    planned: "bg-gray-200 text-gray-700",
    in_progress: "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || ""}`}>
      {status}
    </span>
  );
};

export default HRInterventionPage;