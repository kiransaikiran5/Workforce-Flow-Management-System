import { useState, useEffect, useCallback } from "react";
import API from "../api";
import { toast } from "react-toastify";
import DataTable from "../components/common/DataTable";
import Breadcrumbs from "../components/common/Breadcrumbs";
import ErrorState from "../components/common/ErrorState";
import SkeletonLoader from "../components/common/SkeletonLoader";

// ── Pagination (client‑side, optional) ────────────
function Pagination({ page, perPage, total, onChange }) {
  const totalPages = Math.ceil(total / perPage);
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between mt-6 px-1">
      <span className="text-sm text-gray-500 dark:text-gray-400">
        Page {page} of {totalPages} ({total} total)
      </span>
      <div className="flex gap-2">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600
                     disabled:opacity-40 disabled:cursor-not-allowed
                     hover:bg-gray-50 dark:hover:bg-gray-700
                     text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 transition"
        >
          Previous
        </button>
        <button
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
          className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600
                     disabled:opacity-40 disabled:cursor-not-allowed
                     hover:bg-gray-50 dark:hover:bg-gray-700
                     text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 transition"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default function AlertEmailHistory() {
  const [emails, setEmails] = useState([]);         // all emails from API
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const perPage = 20;

  const fetchEmails = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Backend returns a plain array (List[AlertEmailItem])
      const res = await API.get("/notifications/alert-emails");
      const data = res.data;
      setEmails(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError("Failed to load alert email history.");
      toast.error("Could not load alert emails");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  // Client‑side pagination
  const total = emails.length;
  const start = (page - 1) * perPage;
  const paginatedEmails = emails.slice(start, start + perPage);

  const columns = [
    { key: "recipient", label: "Recipient" },
    { key: "subject", label: "Subject" },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            row.status === "sent"
              ? "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200"
              : row.status === "failed"
              ? "bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200"
              : "bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200"
          }`}
        >
          {row.status || "sent"}
        </span>
      ),
    },
    {
      key: "created_at",
      label: "Sent At",
      render: (row) =>
        row.created_at
          ? new Date(row.created_at).toLocaleString()
          : "—",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <Breadcrumbs
        items={[
          { href: "/dashboard", label: "Dashboard" },
          { label: "Alert Email History" },
        ]}
      />

      <div>
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
          Alert Email History
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Emails sent for high attrition risk alerts
        </p>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={fetchEmails} />
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="p-6">
              <SkeletonLoader rows={6} columns={columns.length} />
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={paginatedEmails}
              emptyMessage="No alert emails have been sent yet."
            />
          )}
        </div>
      )}

      {!loading && !error && (
        <Pagination page={page} perPage={perPage} total={total} onChange={setPage} />
      )}
    </div>
  );
}