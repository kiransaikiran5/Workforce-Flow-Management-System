import React, { useEffect, useState } from "react";
import api from "../api";                             // adjust path if needed
import { toast } from "react-toastify";

const DatasetManagementPage = () => {
  const [uploads, setUploads] = useState([]);
  const [selectedUpload, setSelectedUpload] = useState(null);
  const [failures, setFailures] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch upload history
  const fetchUploads = async () => {
    try {
      const res = await api.get("/predictions/uploads");
      setUploads(res.data);
    } catch {
      toast.error("Failed to load upload history");
    } finally {
      setLoading(false);
    }
  };

  // Fetch failed records for a specific upload
  const fetchFailures = async (uploadId) => {
    try {
      const res = await api.get(`/predictions/uploads/${uploadId}/failures`);
      setFailures(res.data);
    } catch {
      toast.error("Failed to load failed records");
    }
  };

  useEffect(() => {
    fetchUploads();
  }, []);

  // Open modal and load failures if there are any
  const handleViewErrors = (upload) => {
    setSelectedUpload(upload);
    if (upload.failed_records > 0) {
      fetchFailures(upload.id);
    } else {
      setFailures([]);   // no individual row failures
    }
  };

  // Helper to format raw data (truncated JSON)
  const truncateRaw = (raw, maxLen = 60) => {
    if (!raw) return "—";
    return raw.length > maxLen ? raw.substring(0, maxLen) + "…" : raw;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 dark:text-white">
        Dataset Management
      </h1>

      {loading ? (
        // Loading skeleton
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse bg-gray-200 dark:bg-gray-700 h-8 rounded"
            />
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700 text-left">
              <tr>
                <th className="py-3 px-4">Filename</th>
                <th className="py-3 px-4">Upload Date</th>
                <th className="py-3 px-4">Total</th>
                <th className="py-3 px-4">Success</th>
                <th className="py-3 px-4">Failed</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {uploads.map((upload) => (
                <tr
                  key={upload.id}
                  className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750"
                >
                  <td className="py-3 px-4">{upload.filename}</td>
                  <td className="py-3 px-4">
                    {new Date(upload.upload_date).toLocaleString()}
                  </td>
                  <td className="py-3 px-4">{upload.total_records}</td>
                  <td className="py-3 px-4 text-green-600">
                    {upload.success_records}
                  </td>
                  <td className="py-3 px-4 text-red-600">
                    {upload.failed_records}
                  </td>
                  <td className="py-3 px-4 capitalize">{upload.status}</td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => handleViewErrors(upload)}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      View Errors
                    </button>
                  </td>
                </tr>
              ))}
              {uploads.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-500">
                    No dataset uploads yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Error / details modal */}
      {selectedUpload && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedUpload(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold dark:text-white">
                Failed Records for {selectedUpload.filename}
              </h2>
              <button
                onClick={() => setSelectedUpload(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl leading-none"
              >
                &times;
              </button>
            </div>

            {/* Case 1: Individual failed rows exist */}
            {failures.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left border-b dark:border-gray-700">
                      <th className="py-2 px-3">Row</th>
                      <th className="py-2 px-3">Error</th>
                      <th className="py-2 px-3">Raw Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {failures.map((f) => (
                      <tr key={f.id} className="border-t dark:border-gray-700">
                        <td className="py-2 px-3">{f.row_index}</td>
                        <td className="py-2 px-3 text-red-600">
                          {f.error_message}
                        </td>
                        <td className="py-2 px-3 text-xs text-gray-500 max-w-xs truncate">
                          {truncateRaw(f.raw_data)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : selectedUpload.status === "failed" && selectedUpload.error_summary ? (
              // Case 2: Entire file failed (e.g., missing columns) – show overall error
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mt-2">
                <p className="text-red-700 dark:text-red-300 font-medium mb-1">
                  Upload failed:
                </p>
                <p className="text-sm text-red-600 dark:text-red-400">
                  {selectedUpload.error_summary}
                </p>
              </div>
            ) : (
              // Case 3: No errors at all
              <p className="text-gray-500 dark:text-gray-400 py-4 text-center">
                No failed records for this upload.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DatasetManagementPage;